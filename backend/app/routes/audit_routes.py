import json

from flask import Blueprint, request, jsonify
from app import db
from app.models import Audit, AuditedEquipment, EnergyMeasurement
from app.services.profile_templates import PROFILE_TEMPLATES, normalize_profile_type, serialize_template_defaults

bp = Blueprint('audits', __name__, url_prefix='/api/audits')


def _evaluate_thresholds(summary_entry, thresholds):
    threshold = thresholds.get(summary_entry['measurement_type']) if thresholds else None
    if not threshold:
        return {'status': 'no_threshold', 'message': 'No threshold configured'}

    issues = []
    if threshold.get('min') is not None and summary_entry['min'] < threshold['min']:
        issues.append(f"Min below {threshold['min']}")
    if threshold.get('max') is not None and summary_entry['max'] > threshold['max']:
        issues.append(f"Max above {threshold['max']}")

    if issues:
        return {'status': 'warning', 'message': '; '.join(issues)}

    return {'status': 'ok', 'message': 'Within threshold'}


def _build_audit_dashboard(audit):
    equipment_items = [item.to_dict() for item in audit.equipment]
    measurements = EnergyMeasurement.query.filter_by(audit_id=audit.id).all()
    profile_cards = []

    for item in equipment_items:
        item_measurements = [m for m in measurements if m.equipment_label == item['name']]
        measurement_types = sorted({m.measurement_type for m in item_measurements})
        import_batches = sorted({m.import_batch for m in item_measurements if m.import_batch})
        summary = []

        for measurement_type in measurement_types:
            type_measurements = [m for m in item_measurements if m.measurement_type == measurement_type]
            if not type_measurements:
                continue

            values = [m.value for m in type_measurements]
            summary_entry = {
                'measurement_type': measurement_type,
                'count': len(values),
                'min': min(values),
                'max': max(values),
                'avg': sum(values) / len(values),
                'unit': type_measurements[0].unit,
                'threshold': item.get('thresholds', {}).get(measurement_type)
            }
            summary_entry['threshold_status'] = _evaluate_thresholds(summary_entry, item.get('thresholds', {}))
            summary.append(summary_entry)

        profile_cards.append({
            'profile': item,
            'measurement_types': measurement_types,
            'import_batches': import_batches,
            'summary': summary,
            'latest_batch': import_batches[-1] if import_batches else None
        })

    return {
        'audit': audit.to_dict(),
        'profile_count': len(profile_cards),
        'batch_count': len({m.import_batch for m in measurements if m.import_batch}),
        'profiles': profile_cards
    }

@bp.route('', methods=['GET'])
def get_audits():
    """Get all audits"""
    try:
        audits = Audit.query.all()
        return jsonify([audit.to_dict() for audit in audits]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/templates', methods=['GET'])
def get_profile_templates():
    """Expose profile templates to help the UI offer sensible defaults."""
    try:
        return jsonify(PROFILE_TEMPLATES), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>', methods=['GET'])
def get_audit(audit_id):
    """Get a specific audit"""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404
        return jsonify(audit.to_dict()), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('', methods=['POST'])
def create_audit():
    """Create a new audit"""
    try:
        data = request.get_json()
        
        if not data or 'name' not in data:
            return jsonify({'error': 'Name is required'}), 400
        
        audit = Audit(
            name=data['name'],
            description=data.get('description'),
            building_name=data.get('building_name'),
            auditor_name=data.get('auditor_name')
        )
        
        db.session.add(audit)
        db.session.commit()
        
        return jsonify(audit.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:audit_id>', methods=['PUT'])
def update_audit(audit_id):
    """Update an audit"""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404
        
        data = request.get_json()
        
        audit.name = data.get('name', audit.name)
        audit.description = data.get('description', audit.description)
        audit.building_name = data.get('building_name', audit.building_name)
        audit.auditor_name = data.get('auditor_name', audit.auditor_name)
        
        db.session.commit()
        
        return jsonify(audit.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/<int:audit_id>', methods=['DELETE'])
def delete_audit(audit_id):
    """Delete an audit"""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404
        
        db.session.delete(audit)
        db.session.commit()
        
        return jsonify({'message': 'Audit deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>/equipment', methods=['GET'])
def get_audit_equipment(audit_id):
    """Get registered equipment for an audit."""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        return jsonify([item.to_dict() for item in audit.equipment]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>/equipment', methods=['POST'])
def create_equipment(audit_id):
    """Register equipment for a building audit."""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        data = request.get_json()
        if not data or not data.get('name') or not data.get('equipment_type'):
            return jsonify({'error': 'Equipment name and type are required'}), 400

        template_defaults = serialize_template_defaults(data['equipment_type'])

        equipment = AuditedEquipment(
            audit_id=audit_id,
            name=data['name'].strip(),
            equipment_type=normalize_profile_type(data['equipment_type']),
            location=data.get('location'),
            notes=data.get('notes'),
            profile_template=template_defaults['profile_template'],
            thresholds_json=data.get('thresholds_json') or template_defaults['thresholds_json'],
            preferred_plots_json=data.get('preferred_plots_json') or template_defaults['preferred_plots_json']
        )

        db.session.add(equipment)
        db.session.commit()

        return jsonify(equipment.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>/equipment/<int:equipment_id>', methods=['DELETE'])
def delete_equipment(audit_id, equipment_id):
    """Delete a registered piece of equipment."""
    try:
        equipment = AuditedEquipment.query.filter_by(id=equipment_id, audit_id=audit_id).first()
        if not equipment:
            return jsonify({'error': 'Equipment not found'}), 404

        db.session.delete(equipment)
        db.session.commit()

        return jsonify({'message': 'Equipment deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>/dashboard', methods=['GET'])
def get_audit_dashboard(audit_id):
    """Return a building-level dashboard summarizing all profiles."""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        return jsonify(_build_audit_dashboard(audit)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>/report', methods=['GET'])
def get_audit_report(audit_id):
    """Return a lightweight report payload for export."""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        dashboard = _build_audit_dashboard(audit)
        findings = []
        for profile in dashboard['profiles']:
            for summary in profile['summary']:
                if summary['threshold_status']['status'] == 'warning':
                    findings.append({
                        'profile_name': profile['profile']['name'],
                        'measurement_type': summary['measurement_type'],
                        'message': summary['threshold_status']['message']
                    })

        return jsonify({
            'report_generated_for': audit.building_name or audit.name,
            'audit': audit.to_dict(),
            'dashboard': dashboard,
            'findings': findings
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
