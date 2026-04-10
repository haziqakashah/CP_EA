import os
from uuid import uuid4

from flask import Blueprint, jsonify, request
from werkzeug.utils import secure_filename

from app import db
from app.models import Audit, EnergyMeasurement
from app.services.data_processor import DataProcessor

bp = Blueprint('data', __name__, url_prefix='/api/data')

ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}
UPLOAD_TOKENS = {}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def save_uploaded_file(file_storage):
    from config import Config

    filename = secure_filename(file_storage.filename)
    token = uuid4().hex
    stored_filename = f'{token}_{filename}'
    filepath = os.path.join(Config.UPLOAD_FOLDER, stored_filename)
    file_storage.save(filepath)
    UPLOAD_TOKENS[token] = filepath
    return token, filepath, filename


@bp.route('/preview', methods=['POST'])
def preview_data():
    """Upload a workbook/CSV and return its tabs and columns for manual mapping."""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        audit_id = request.form.get('audit_id')
        if not audit_id:
            return jsonify({'error': 'audit_id is required'}), 400

        audit = Audit.query.get(int(audit_id))
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Use CSV or Excel'}), 400

        token, filepath, original_filename = save_uploaded_file(file)
        processor = DataProcessor()
        preview = processor.preview_file(filepath, audit.equipment)

        return jsonify({
            'upload_token': token,
            'filename': original_filename,
            'preview': preview
        }), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/import', methods=['POST'])
def import_data():
    """Import only the selected sheet/column mappings from a previously uploaded file."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        audit_id = data.get('audit_id')
        upload_token = data.get('upload_token')
        selections = data.get('selections', [])
        cleanup_options = data.get('cleanup_options', {})
        import_batch = data.get('import_batch')

        if not audit_id or not upload_token:
            return jsonify({'error': 'audit_id and upload_token are required'}), 400

        audit = Audit.query.get(int(audit_id))
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        filepath = UPLOAD_TOKENS.get(upload_token)
        if not filepath or not os.path.exists(filepath):
            return jsonify({'error': 'Uploaded file could not be found. Please preview it again.'}), 404

        if not import_batch:
            upload_name = os.path.basename(filepath)
            import_batch = f'Import {upload_name}'

        processor = DataProcessor()
        measurements, import_summary = processor.import_selection(
            filepath,
            int(audit_id),
            selections,
            cleanup_options=cleanup_options,
            import_batch=import_batch
        )

        for measurement in measurements:
            db.session.add(measurement)

        db.session.commit()

        return jsonify({
            'message': f'Successfully imported {len(measurements)} measurements',
            'measurement_count': len(measurements),
            'import_batch': import_batch,
            'import_summary': import_summary
        }), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>', methods=['GET'])
def get_audit_data(audit_id):
    """Get all measurements for an audit."""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        measurements = EnergyMeasurement.query.filter_by(audit_id=audit_id).all()

        return jsonify({
            'audit_id': audit_id,
            'measurement_count': len(measurements),
            'measurements': [m.to_dict() for m in measurements]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>/summary', methods=['GET'])
def get_audit_summary(audit_id):
    """Get summary statistics for an audit."""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        measurements = EnergyMeasurement.query.filter_by(audit_id=audit_id).all()

        if not measurements:
            return jsonify({
                'audit_id': audit_id,
                'summary': {}
            }), 200

        equipment_thresholds = {
            item.name: item.to_dict().get('thresholds', {})
            for item in audit.equipment
        }

        summary = {}
        for measurement in measurements:
            key = f"{measurement.equipment_label or measurement.equipment_type}_{measurement.measurement_type}_{measurement.source_sheet or 'default'}_{measurement.import_batch or 'default'}"
            if key not in summary:
                threshold = equipment_thresholds.get(measurement.equipment_label or '', {}).get(measurement.measurement_type)
                summary[key] = {
                    'equipment_type': measurement.equipment_type,
                    'equipment_label': measurement.equipment_label,
                    'measurement_type': measurement.measurement_type,
                    'unit': measurement.unit,
                    'source_sheet': measurement.source_sheet,
                    'import_batch': measurement.import_batch,
                    'threshold': threshold,
                    'count': 0,
                    'min': float('inf'),
                    'max': float('-inf'),
                    'avg': 0,
                    'sum': 0,
                    'threshold_status': {'status': 'no_threshold', 'message': 'No threshold configured'}
                }

            summary[key]['count'] += 1
            summary[key]['min'] = min(summary[key]['min'], measurement.value)
            summary[key]['max'] = max(summary[key]['max'], measurement.value)
            summary[key]['sum'] += measurement.value

        for key in summary:
            summary[key]['avg'] = summary[key]['sum'] / summary[key]['count']
            threshold = summary[key]['threshold']
            if threshold:
                issues = []
                if threshold.get('min') is not None and summary[key]['min'] < threshold['min']:
                    issues.append(f"Min below {threshold['min']}")
                if threshold.get('max') is not None and summary[key]['max'] > threshold['max']:
                    issues.append(f"Max above {threshold['max']}")

                summary[key]['threshold_status'] = (
                    {'status': 'warning', 'message': '; '.join(issues)}
                    if issues else
                    {'status': 'ok', 'message': 'Within threshold'}
                )

        return jsonify({
            'audit_id': audit_id,
            'summary': summary
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>/batches', methods=['GET'])
def get_import_batches(audit_id):
    """List upload batches for an audit with lightweight counts."""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        measurements = EnergyMeasurement.query.filter_by(audit_id=audit_id).all()
        batches = {}

        for measurement in measurements:
            batch = measurement.import_batch or 'Imported data'
            if batch not in batches:
                batches[batch] = {
                    'name': batch,
                    'count': 0,
                    'items': set(),
                    'measurement_types': set()
                }

            batches[batch]['count'] += 1
            batches[batch]['items'].add(measurement.equipment_label or measurement.equipment_type)
            batches[batch]['measurement_types'].add(measurement.measurement_type)

        return jsonify([
            {
                'name': batch['name'],
                'count': batch['count'],
                'items': sorted(batch['items']),
                'measurement_types': sorted(batch['measurement_types'])
            }
            for batch in batches.values()
        ]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>/batches/rename', methods=['PATCH'])
def rename_import_batch(audit_id):
    """Rename an existing import batch."""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        data = request.get_json()
        old_name = data.get('old_name') if data else None
        new_name = data.get('new_name') if data else None

        if not old_name or not new_name:
            return jsonify({'error': 'old_name and new_name are required'}), 400

        measurements = EnergyMeasurement.query.filter_by(audit_id=audit_id, import_batch=old_name).all()
        if not measurements:
            return jsonify({'error': 'Import batch not found'}), 404

        for measurement in measurements:
            measurement.import_batch = new_name

        db.session.commit()
        return jsonify({'message': 'Import batch renamed', 'name': new_name}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:audit_id>/batches', methods=['DELETE'])
def delete_import_batch(audit_id):
    """Delete all measurements from a selected import batch."""
    try:
        audit = Audit.query.get(audit_id)
        if not audit:
            return jsonify({'error': 'Audit not found'}), 404

        data = request.get_json()
        batch_name = data.get('name') if data else None
        if not batch_name:
            return jsonify({'error': 'Batch name is required'}), 400

        measurements = EnergyMeasurement.query.filter_by(audit_id=audit_id, import_batch=batch_name).all()
        if not measurements:
            return jsonify({'error': 'Import batch not found'}), 404

        deleted_count = len(measurements)
        for measurement in measurements:
            db.session.delete(measurement)

        db.session.commit()
        return jsonify({'message': 'Import batch deleted', 'deleted_count': deleted_count}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
