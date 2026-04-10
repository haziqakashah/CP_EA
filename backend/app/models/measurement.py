from app import db
from datetime import datetime

class EnergyMeasurement(db.Model):
    """Model for energy measurements (temperature, power, flow)"""
    __tablename__ = 'measurements'
    
    id = db.Column(db.Integer, primary_key=True)
    audit_id = db.Column(db.Integer, db.ForeignKey('audits.id'), nullable=False)
    
    # Measurement metadata
    equipment_type = db.Column(db.String(100), nullable=False)  # e.g., 'chiller', 'pump'
    equipment_label = db.Column(db.String(255))  # e.g., 'Chiller 1', 'AHU-2'
    measurement_type = db.Column(db.String(100), nullable=False)  # e.g., 'temperature', 'power', 'flow'
    unit = db.Column(db.String(50))  # e.g., 'C', 'kW', 'L/min'
    source_sheet = db.Column(db.String(255))
    source_column = db.Column(db.String(255))
    import_batch = db.Column(db.String(255))
    
    # Data point
    timestamp = db.Column(db.DateTime, nullable=False)
    value = db.Column(db.Float, nullable=False)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'audit_id': self.audit_id,
            'equipment_type': self.equipment_type,
            'equipment_label': self.equipment_label,
            'measurement_type': self.measurement_type,
            'unit': self.unit,
            'source_sheet': self.source_sheet,
            'source_column': self.source_column,
            'import_batch': self.import_batch,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'value': self.value
        }
