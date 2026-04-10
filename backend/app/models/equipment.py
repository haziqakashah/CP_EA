from datetime import datetime
import json

from app import db


class AuditedEquipment(db.Model):
    """Equipment registered for a specific audit/building."""

    __tablename__ = 'audited_equipment'

    id = db.Column(db.Integer, primary_key=True)
    audit_id = db.Column(db.Integer, db.ForeignKey('audits.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    equipment_type = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(255))
    notes = db.Column(db.Text)
    profile_template = db.Column(db.String(100))
    thresholds_json = db.Column(db.Text)
    preferred_plots_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def _decode_json(value, fallback):
        if not value:
            return fallback
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            return fallback

    def to_dict(self):
        return {
            'id': self.id,
            'audit_id': self.audit_id,
            'name': self.name,
            'equipment_type': self.equipment_type,
            'location': self.location,
            'notes': self.notes,
            'profile_template': self.profile_template,
            'thresholds': self._decode_json(self.thresholds_json, {}),
            'preferred_plots': self._decode_json(self.preferred_plots_json, {}),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
