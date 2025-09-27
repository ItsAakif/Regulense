from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean
from datetime import datetime
import json
from .database import db

class ScanResult(db.Model):
    __tablename__ = 'scan_results'
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    upload_time = Column(DateTime, default=datetime.utcnow)
    image_path = Column(String(500))
    ocr_text = Column(Text)
    ocr_fields = Column(Text)  # JSON string
    compliance_score = Column(Float)
    violations = Column(Text)  # JSON string
    is_compliant = Column(Boolean, default=False)
    validation_details = Column(Text)  # JSON string
    processing_time = Column(Float)
    processed = Column(Boolean, default=False)
    
    def __init__(self, filename, image_path=None, ocr_fields=None, compliance_score=None, violations=None, is_compliant=False, validation_details=None, processing_time=None):
        self.filename = filename
        self.image_path = image_path
        self.ocr_fields = json.dumps(ocr_fields) if isinstance(ocr_fields, dict) else ocr_fields
        self.compliance_score = compliance_score
        self.violations = json.dumps(violations) if isinstance(violations, list) else violations
        self.is_compliant = is_compliant
        self.validation_details = json.dumps(validation_details) if isinstance(validation_details, dict) else validation_details
        self.processing_time = processing_time
    
    def set_violations(self, violations_list):
        """Set violations from a list"""
        self.violations = json.dumps(violations_list or [])
    
    def get_violations(self):
        """Get violations as a list"""
        try:
            return json.loads(self.violations) if self.violations else []
        except (json.JSONDecodeError, TypeError):
            return []
    
    def to_dict(self):
        """Convert the ScanResult object to a dictionary for JSON serialization"""
        return {
            'id': self.id,
            'filename': self.filename,
            'upload_time': self.upload_time.isoformat() if self.upload_time else None,
            'image_path': self.image_path,
            'ocr_text': self.ocr_text,
            'ocr_fields': json.loads(self.ocr_fields) if self.ocr_fields else {},
            'compliance_score': self.compliance_score,
            'violations': json.loads(self.violations) if self.violations else [],
            'is_compliant': self.is_compliant,
            'validation_details': json.loads(self.validation_details) if self.validation_details else {},
            'processing_time': self.processing_time,
            'processed': self.processed
        }
    
    def __repr__(self):
        return f'<ScanResult {self.id}: {self.filename} (Score: {self.compliance_score})>'