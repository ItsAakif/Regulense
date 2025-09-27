from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from pathlib import Path

db = SQLAlchemy()

# For direct SQLAlchemy usage
engine = None
SessionLocal = None
Base = declarative_base()

def init_database(app):
    """Initialize database with Flask app"""
    global engine, SessionLocal
    
    # Ensure database directory exists
    db_path = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if db_path.startswith('sqlite:///'):
        db_file = db_path.replace('sqlite:///', '')
        if db_file and db_file != ':memory:':
            db_dir = Path(db_file).parent
            db_dir.mkdir(parents=True, exist_ok=True)
    
    db.init_app(app)
    
    # Create engine for direct SQLAlchemy usage
    engine = create_engine(
        app.config['SQLALCHEMY_DATABASE_URI'],
        pool_pre_ping=True,
        pool_recycle=300
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    with app.app_context():
        try:
            db.create_all()
            print("Database tables created successfully")
        except Exception as e:
            print(f"Error creating database tables: {e}")
            raise

def get_db_session():
    """Get database session with proper error handling"""
    if SessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_database first.")
    return SessionLocal()

def close_db_session(session):
    """Safely close database session"""
    try:
        session.close()
    except Exception as e:
        print(f"Error closing database session: {e}")