from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from config import config
import os

db = SQLAlchemy()

def create_app(config_name='development'):
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    CORS(app)
    
    # Create upload folder if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Register blueprints
    from app.routes import audit_routes, data_routes
    app.register_blueprint(audit_routes.bp)
    app.register_blueprint(data_routes.bp)
    
    # Create database tables
    with app.app_context():
        from app.services.schema_manager import ensure_schema

        db.create_all()
        ensure_schema()
    
    return app
