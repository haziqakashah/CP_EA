from app import db
from datetime import datetime

class Audit(db.Model):
    """Model for energy audits"""
    __tablename__ = 'audits'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    building_name = db.Column(db.String(255))
    auditor_name = db.Column(db.String(255))
    audit_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    measurements = db.relationship('EnergyMeasurement', backref='audit', lazy=True, cascade='all, delete-orphan')
    equipment = db.relationship('AuditedEquipment', backref='audit', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'building_name': self.building_name,
            'auditor_name': self.auditor_name,
            'audit_date': self.audit_date.isoformat() if self.audit_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'measurement_count': len(self.measurements),
            'equipment_count': len(self.equipment),
            'equipment': [item.to_dict() for item in self.equipment]
        }
