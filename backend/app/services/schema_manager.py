from sqlalchemy import inspect, text

from app import db


def ensure_schema():
    """Create missing tables and columns for the lightweight SQLite setup."""

    inspector = inspect(db.engine)

    if 'measurements' in inspector.get_table_names():
        existing_columns = {column['name'] for column in inspector.get_columns('measurements')}
        required_columns = {
            'equipment_label': 'ALTER TABLE measurements ADD COLUMN equipment_label VARCHAR(255)',
            'source_sheet': 'ALTER TABLE measurements ADD COLUMN source_sheet VARCHAR(255)',
            'source_column': 'ALTER TABLE measurements ADD COLUMN source_column VARCHAR(255)',
            'import_batch': 'ALTER TABLE measurements ADD COLUMN import_batch VARCHAR(255)',
        }

        for column_name, statement in required_columns.items():
            if column_name not in existing_columns:
                db.session.execute(text(statement))

    if 'audited_equipment' in inspector.get_table_names():
        existing_columns = {column['name'] for column in inspector.get_columns('audited_equipment')}
        required_columns = {
            'profile_template': 'ALTER TABLE audited_equipment ADD COLUMN profile_template VARCHAR(100)',
            'thresholds_json': 'ALTER TABLE audited_equipment ADD COLUMN thresholds_json TEXT',
            'preferred_plots_json': 'ALTER TABLE audited_equipment ADD COLUMN preferred_plots_json TEXT',
        }

        for column_name, statement in required_columns.items():
            if column_name not in existing_columns:
                db.session.execute(text(statement))

    db.session.commit()
