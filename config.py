import os
from pathlib import Path

class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///regulense.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # OCR Configuration
    OCR_LANGUAGE = 'en'
    OCR_USE_GPU = False
    
    # Compliance thresholds
    COMPLIANCE_PASS_THRESHOLD = 0.8
    COMPLIANCE_WARNING_THRESHOLD = 0.6
    
    # API Configuration
    LAPTOP_API_URL = os.environ.get('LAPTOP_API_URL') or 'http://localhost:5000'
    RPI_API_PORT = int(os.environ.get('RPI_API_PORT', 5001))
    
    @staticmethod
    def init_app(app):
        # Create upload directory if it doesn't exist
        upload_dir = Path(app.config['UPLOAD_FOLDER'])
        upload_dir.mkdir(exist_ok=True)

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('DEV_DATABASE_URL') or 'sqlite:///regulense_dev.db'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///regulense_prod.db'
    
    # Railway-specific optimizations
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))
    OCR_CONFIDENCE_THRESHOLD = float(os.environ.get('OCR_CONFIDENCE_THRESHOLD', 0.5))
    
    # Logging configuration for Railway
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    @staticmethod
    def init_app(app):
        Config.init_app(app)
        
        # Configure logging for Railway
        import logging
        logging.basicConfig(
            level=getattr(logging, app.config.get('LOG_LEVEL', 'INFO')),
            format='%(asctime)s %(levelname)s %(name)s %(message)s'
        )

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}