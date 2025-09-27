import logging
import traceback
from flask import Flask, request, jsonify, send_file, current_app
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge
import os
import uuid
import json
import time
from datetime import datetime, timedelta
import pandas as pd
from pathlib import Path
from functools import wraps

# Import configuration
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import config
from app.models.database import init_database, db
from app.models.scan_result import ScanResult
from app.ocr.paddle_ocr import PaddleOCRProcessor
from app.ocr.preprocessing import ImagePreprocessor
from app.ocr.field_extractor import FieldExtractor
from app.validation.compliance_validator import ComplianceValidator
from app.validation.scoring import ComplianceScorer
import requests
import base64
from io import BytesIO
from PIL import Image
import cv2
import numpy as np

# Camera routes removed - mobile-only implementation

# Configure comprehensive logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Create logs directory if it doesn't exist
os.makedirs('logs', exist_ok=True)

# Error handling decorator
def handle_errors(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {f.__name__}: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return jsonify({
                'error': 'Internal server error',
                'message': str(e) if current_app.debug else 'An unexpected error occurred'
            }), 500
    return decorated_function

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    config[config_name].init_app(app)
    
    # Initialize extensions
    CORS(app, origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "https://*.netlify.app",
        "https://regulense-frontend.vercel.app"
    ])
    init_database(app)
    
    # Camera routes removed - mobile-only implementation
    logger.info("Running with mobile-only camera support")
    
    return app

app = create_app()

# Global processor variables - will be initialized lazily
ocr_processor = None
preprocessor = None
field_extractor = None
validator = None
compliance_scorer = None

def get_processors():
    """Lazy initialization of processors"""
    global ocr_processor, preprocessor, field_extractor, validator, compliance_scorer
    
    if ocr_processor is None:
        try:
            print("Initializing processors on first use...")
            print("Initializing PaddleOCR...")
            ocr_processor = PaddleOCRProcessor()
            print("PaddleOCR initialized successfully")
            
            print("Initializing ImagePreprocessor...")
            preprocessor = ImagePreprocessor()
            print("ImagePreprocessor initialized successfully")
            
            print("Initializing FieldExtractor...")
            field_extractor = FieldExtractor()
            print("FieldExtractor initialized successfully")
            
            print("Initializing ComplianceValidator...")
            validator = ComplianceValidator()
            print("ComplianceValidator initialized successfully")
            
            print("Initializing ComplianceScorer...")
            compliance_scorer = ComplianceScorer()
            print("ComplianceScorer initialized successfully")
            
            print("All processors initialized successfully")
        except Exception as e:
            print(f"Error initializing processors: {e}")
            import traceback
            traceback.print_exc()
            raise e
    
    return ocr_processor, preprocessor, field_extractor, validator, compliance_scorer

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Ensure uploads directory exists
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/api/upload', methods=['POST'])
@handle_errors
def upload_file():
    """Receive image from client and process it"""
    logger.info("File upload request received")
    
    # Check if image file is present in request
    if 'file' not in request.files:
        logger.warning("No file provided in upload request")
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '' or not file:
        logger.warning("Empty filename in upload request")
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        logger.warning(f"Invalid file type uploaded: {file.filename}")
        return jsonify({'error': 'File type not allowed'}), 400
    
    # Check file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)
    
    max_size = 10 * 1024 * 1024  # 10MB
    if file_size > max_size:
        logger.warning(f"File too large: {file_size} bytes")
        return jsonify({'error': 'File too large. Maximum size is 10MB.'}), 400
    
    # Check if processors are available
    try:
        ocr_processor, preprocessor, field_extractor, validator, compliance_scorer = get_processors()
        logger.info("Processors initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize processors: {str(e)}")
        return jsonify({'error': 'Processing services not available'}), 503
    
    # Generate unique filename
    filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
    
    # Save the file
    try:
        file.save(file_path)
        logger.info(f"File saved successfully: {unique_filename}")
    except Exception as e:
        logger.error(f"Failed to save file {unique_filename}: {str(e)}")
        return jsonify({'error': f'Failed to save file: {str(e)}'}), 500
    
    # Process image
    start_time = time.time()
    
    try:
        logger.info(f"Starting processing for file: {unique_filename}")
        
        # Preprocess the image
        processed_image_path = preprocessor.preprocess_image(file_path)
        
        # Extract text using OCR
        ocr_result = ocr_processor.extract_text(processed_image_path)
        
        # Extract structured fields from OCR text
        extracted_fields = field_extractor.extract_fields(ocr_result)
        
        # Combine OCR result with extracted fields
        ocr_fields = {
            'text': ocr_result.get('text', ''),
            'confidence': ocr_result.get('confidence', 0.0),
            'words': ocr_result.get('words', []),
            'metadata': ocr_result.get('metadata', {}),
            'fields': extracted_fields
        }
        
        # Validate compliance using structured fields
        compliance_report = compliance_scorer.generate_compliance_report(ocr_fields)
        
        processing_time = time.time() - start_time
        logger.info(f"Processing completed for file: {unique_filename} in {processing_time:.2f}s")
        
        # Save to database
        scan_result = ScanResult(
            filename=unique_filename,
            image_path=file_path,
            ocr_fields=ocr_fields,
            compliance_score=compliance_report["compliance_score"],
            violations=compliance_report["violations"],
            is_compliant=compliance_report["is_compliant"],
            validation_details=compliance_report["validation_details"],
            processing_time=processing_time
        )
        
        db.session.add(scan_result)
        db.session.commit()
        logger.info(f"Scan result saved to database with ID: {scan_result.id}")
        
        # Return success response
        return jsonify({
            'success': True,
            'scan_id': scan_result.id,
            'timestamp': scan_result.upload_time.isoformat(),
            'compliance_score': scan_result.compliance_score,
            'is_compliant': scan_result.is_compliant,
            'violations': compliance_report["violations"],
            'processing_time': scan_result.processing_time,
            'ocr_fields': ocr_fields
        }), 201
        
    except Exception as processing_error:
        logger.error(f"Processing failed for file {unique_filename}: {str(processing_error)}")
        logger.error(f"Processing error traceback: {traceback.format_exc()}")
        
        # Save failed scan to database
        scan_result = ScanResult(
            filename=unique_filename,
            image_path=file_path,
            ocr_fields={},
            compliance_score=0.0,
            violations=[f'Processing error: {str(processing_error)}'],
            is_compliant=False,
            validation_details={},
            processing_time=time.time() - start_time
        )
        
        try:
            db.session.add(scan_result)
            db.session.commit()
            logger.info(f"Failed scan logged to database for file: {unique_filename}")
        except Exception as db_error:
            logger.error(f"Failed to log failed scan to database: {str(db_error)}")
        
        return jsonify({
            'error': f'Processing failed: {str(processing_error)}',
            'scan_id': scan_result.id,
            'remote_processing': True
        }), 500

@app.route('/api/scan-history', methods=['GET'])
@app.route('/api/scans', methods=['GET'])  # Add alias route for compatibility
@handle_errors
def get_scans():
    """Get all scan results with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')  # 'compliant', 'non-compliant', 'all'
        
        query = ScanResult.query
        
        # Filter by compliance status if specified
        if status == 'compliant':
            query = query.filter(ScanResult.is_compliant == True)
        elif status == 'non-compliant':
            query = query.filter(ScanResult.is_compliant == False)
        
        # Order by upload_time (newest first)
        query = query.order_by(ScanResult.upload_time.desc())
        
        # Paginate results
        scans = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'scans': [scan.to_dict() for scan in scans.items],
            'total': scans.total,
            'pages': scans.pages,
            'current_page': page,
            'per_page': per_page
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scans/<int:scan_id>', methods=['GET'])
@handle_errors
def get_scan_detail(scan_id):
    """Get specific scan result"""
    try:
        scan = ScanResult.query.get(scan_id)
        if not scan:
            return jsonify({'error': 'Scan not found'}), 404
        return jsonify(scan.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scans/export', methods=['GET'])
@handle_errors
def export_scans():
    """Export all scan results for Excel/CSV download"""
    try:
        # Get all scans without pagination
        scans = ScanResult.query.order_by(ScanResult.upload_time.desc()).all()
        
        # Return all scan data
        return jsonify([scan.to_dict() for scan in scans])
    except Exception as e:
        logger.error(f"Error exporting scans: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/stats', methods=['GET'])
@handle_errors
def get_statistics():
    """Get compliance statistics from database"""
    try:
        # Get total scans count
        total_scans = ScanResult.query.count()
        
        # Get compliant scans count (score >= 70)
        compliant_scans = ScanResult.query.filter(ScanResult.compliance_score >= 70).count()
        
        # Calculate compliance rate
        compliance_rate = round((compliant_scans / total_scans * 100), 1) if total_scans > 0 else 0
        
        # Get recent scans (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_scans = ScanResult.query.filter(ScanResult.upload_time >= thirty_days_ago).count()
        
        # Calculate average compliance score
        avg_score_result = db.session.query(db.func.avg(ScanResult.compliance_score)).scalar()
        average_compliance_score = round(avg_score_result, 1) if avg_score_result else 0.0
        
        # Count violations by severity
        violations_by_severity = {"critical": 0, "major": 0, "minor": 0}
        
        # Get all scans with violations
        scans_with_violations = ScanResult.query.filter(ScanResult.violations != '[]').all()
        
        for scan in scans_with_violations:
            try:
                violations = json.loads(scan.violations) if scan.violations else []
                for violation in violations:
                    # Handle both dict and string violations
                    if isinstance(violation, dict):
                        severity = violation.get('severity', 'minor').lower()
                    elif isinstance(violation, str):
                        # If violation is a string, treat it as minor severity
                        severity = 'minor'
                    else:
                        continue
                    
                    if severity in violations_by_severity:
                        violations_by_severity[severity] += 1
            except (json.JSONDecodeError, TypeError):
                continue
        
        # Get common violations (top 5)
        violation_counts = {}
        for scan in scans_with_violations:
            try:
                violations = json.loads(scan.violations) if scan.violations else []
                for violation in violations:
                    # Handle both dict and string violations
                    if isinstance(violation, dict):
                        field = violation.get('field', 'unknown')
                    elif isinstance(violation, str):
                        # If violation is a string, use the string as the field name
                        field = violation[:50] if len(violation) > 50 else violation  # Truncate long strings
                    else:
                        field = 'unknown'
                    
                    violation_counts[field] = violation_counts.get(field, 0) + 1
            except (json.JSONDecodeError, TypeError):
                continue
        
        common_violations = [
            {"field": field, "count": count} 
            for field, count in sorted(violation_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        ]
        
        # Generate compliance trend (last 6 months)
        compliance_trend = []
        for i in range(5, -1, -1):
            month_start = datetime.now().replace(day=1) - timedelta(days=30*i)
            month_end = month_start + timedelta(days=30)
            
            month_scans = ScanResult.query.filter(
                ScanResult.upload_time >= month_start,
                ScanResult.upload_time < month_end
            ).count()
            
            month_compliant = ScanResult.query.filter(
                ScanResult.upload_time >= month_start,
                ScanResult.upload_time < month_end,
                ScanResult.compliance_score >= 70
            ).count()
            
            month_rate = round((month_compliant / month_scans * 100), 1) if month_scans > 0 else 0
            
            compliance_trend.append({
                "month": month_start.strftime("%b"),
                "rate": month_rate,
                "scans": month_scans
            })
        
        return jsonify({
            "total_scans": total_scans,
            "compliant_scans": compliant_scans,
            "compliance_rate": compliance_rate,
            "recent_scans": recent_scans,
            "average_compliance_score": average_compliance_score,
            "violations_by_severity": violations_by_severity,
            "common_violations": common_violations,
            "compliance_trend": compliance_trend
        }), 200
        
    except Exception as e:
        logger.error(f"Error calculating statistics: {str(e)}")
        # Return empty stats on error
        return jsonify({
            "total_scans": 0,
            "compliant_scans": 0,
            "compliance_rate": 0,
            "recent_scans": 0,
            "average_compliance_score": 0.0,
            "violations_by_severity": {"critical": 0, "major": 0, "minor": 0},
            "common_violations": [],
            "compliance_trend": [],
            "error": "Failed to calculate statistics"
        }), 200

@app.route('/favicon.ico')
def favicon():
    """Serve favicon.ico"""
    try:
        # Return a simple response to prevent 500 errors
        return '', 204  # No Content
    except Exception as e:
        logger.error(f"Error serving favicon: {e}")
        return '', 404

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        return send_file(file_path)
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        logger.error(f"Error serving file {filename}: {e}")
        return jsonify({'error': 'Server error'}), 500

@app.route('/api/reprocess/<int:scan_id>', methods=['POST'])
@handle_errors
def reprocess_scan(scan_id):
    """Reprocess an existing scan with current OCR implementation"""
    try:
        # Get the scan
        scan = ScanResult.query.get_or_404(scan_id)
        
        # Check if image file still exists
        if not os.path.exists(scan.image_path):
            return jsonify({'error': 'Original image file not found'}), 404
        
        # Reprocess with current OCR
        start_time = time.time()
        
        # Extract text using OCR
        ocr_result = ocr_processor.extract_text(scan.image_path)
        
        # Extract structured fields from OCR text
        extracted_fields = field_extractor.extract_fields(ocr_result)
        
        # Combine OCR result with extracted fields
        ocr_fields = {
            'text': ocr_result.get('text', ''),
            'confidence': ocr_result.get('confidence', 0),
            'words': ocr_result.get('words', []),
            'metadata': ocr_result.get('metadata', {}),
            'extracted_fields': extracted_fields
        }
        
        # Generate compliance report
        compliance_report = compliance_scorer.generate_compliance_report(ocr_fields)
        
        processing_time = time.time() - start_time
        
        # Update the scan record
        scan.ocr_fields = json.dumps(ocr_fields)
        scan.violations = json.dumps(compliance_report["violations"])
        scan.compliance_score = compliance_report["compliance_score"]
        scan.is_compliant = compliance_report["is_compliant"]
        scan.validation_details = json.dumps(compliance_report["validation_details"])
        scan.processing_time = processing_time
        scan.processed = True
        
        db.session.commit()
        
        return jsonify({
            'message': 'Scan reprocessed successfully',
            'scan': scan.to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error reprocessing scan {scan_id}: {str(e)}")
        return jsonify({'error': f'Error reprocessing scan: {str(e)}'}), 500

@app.route('/api/reprocess-all', methods=['POST'])
@handle_errors
def reprocess_all_scans():
    """Reprocess all existing scans with current OCR implementation"""
    try:
        scans = ScanResult.query.all()
        reprocessed_count = 0
        errors = []
        
        for scan in scans:
            try:
                if os.path.exists(scan.image_path):
                    # Reprocess with current OCR
                    start_time = time.time()
                    
                    # Extract text using OCR
                    ocr_result = ocr_processor.extract_text(scan.image_path)
                    
                    # Extract structured fields from OCR text
                    extracted_fields = field_extractor.extract_fields(ocr_result)
                    
                    # Combine OCR result with extracted fields
                    ocr_fields = {
                        'text': ocr_result.get('text', ''),
                        'confidence': ocr_result.get('confidence', 0),
                        'words': ocr_result.get('words', []),
                        'metadata': ocr_result.get('metadata', {}),
                        'extracted_fields': extracted_fields
                    }
                    
                    # Generate compliance report
                    compliance_report = compliance_scorer.generate_compliance_report(ocr_fields)
                    
                    processing_time = time.time() - start_time
                    
                    # Update the scan record
                    scan.ocr_fields = json.dumps(ocr_fields)
                    scan.violations = json.dumps(compliance_report["violations"])
                    scan.compliance_score = compliance_report["compliance_score"]
                    scan.is_compliant = compliance_report["is_compliant"]
                    scan.validation_details = json.dumps(compliance_report["validation_details"])
                    scan.processing_time = processing_time
                    scan.processed = True
                    
                    reprocessed_count += 1
                else:
                    errors.append(f"Image file not found for scan {scan.id}")
            except Exception as e:
                errors.append(f"Error reprocessing scan {scan.id}: {str(e)}")
        
        db.session.commit()
        
        return jsonify({
            'message': f'Reprocessed {reprocessed_count} scans',
            'reprocessed_count': reprocessed_count,
            'total_scans': len(scans),
            'errors': errors
        })
        
    except Exception as e:
        logger.error(f"Error reprocessing all scans: {str(e)}")
        return jsonify({'error': f'Error reprocessing scans: {str(e)}'}), 500

@app.route('/api/export', methods=['GET'])
@handle_errors
def export_data():
    """Export scan results to CSV"""
    try:
        scans = ScanResult.query.order_by(ScanResult.upload_time.desc()).all()
        
        # Convert to DataFrame
        data = []
        for scan in scans:
            scan_dict = scan.to_dict()
            # Flatten the data for CSV export
            row = {
                'id': scan_dict['id'],
                'filename': scan_dict['filename'],
                'upload_time': scan_dict['upload_time'],
                'image_path': scan_dict['image_path'],
                'compliance_score': scan_dict['compliance_score'],
                'is_compliant': scan_dict['is_compliant'],
                'processing_time': scan_dict['processing_time']
            }
            
            # Add OCR fields
            ocr_fields = scan_dict.get('ocr_fields', {})
            for key, value in ocr_fields.items():
                row[f'ocr_{key}'] = value
            
            # Add violations count
            violations = scan_dict.get('violations', [])
            row['violations_count'] = len(violations)
            
            data.append(row)
        
        df = pd.DataFrame(data)
        
        # Save to CSV file
        csv_filename = f"regulens_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], csv_filename)
        df.to_csv(csv_path, index=False)
        
        # Return CSV file
        return send_file(csv_path, as_attachment=True, download_name=csv_filename)
        
    except Exception as e:
        return jsonify({'error': f'Error exporting data: {str(e)}'}), 500

@app.route('/api/proxy-stream')
@handle_errors
def proxy_stream():
    """Proxy DroidCam stream to avoid CORS issues"""
    try:
        stream_url = request.args.get('url')
        
        if not stream_url:
            return jsonify({'error': 'Stream URL is required'}), 400
        
        # Validate URL format
        if not stream_url.startswith(('http://', 'https://')):
            return jsonify({'error': 'Invalid URL format'}), 400
        
        logger.info(f"Proxying stream: {stream_url}")
        
        # First, try to override any existing DroidCam connection
        if '4747' in stream_url and 'mjpegfeed' in stream_url:
            try:
                base_url = stream_url.split('/mjpegfeed')[0]
                override_url = f"{base_url}/override"
                logger.info(f"Attempting to override DroidCam connection: {override_url}")
                requests.get(override_url, timeout=5)
            except Exception as e:
                logger.warning(f"Could not override DroidCam connection: {e}")
        
        # Proxy the stream with proper headers
        response = requests.get(stream_url, timeout=10, stream=True)
        
        def generate():
            for chunk in response.iter_content(chunk_size=1024):
                if chunk:
                    yield chunk
        
        # Return the stream with proper CORS headers
        from flask import Response
        return Response(
            generate(),
            content_type=response.headers.get('content-type', 'application/octet-stream'),
            headers={
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'no-cache'
            }
        )
        
    except Exception as e:
        logger.error(f"Error proxying stream: {e}")
        return jsonify({'error': f'Error proxying stream: {str(e)}'}), 500

@app.route('/api/force-disconnect', methods=['POST'])
@handle_errors
def force_disconnect():
    """Force disconnect from DroidCam to clear busy state"""
    try:
        data = request.get_json()
        if not data:
            logger.error("No JSON data received in force-disconnect request")
            return jsonify({'error': 'No data provided'}), 400
            
        stream_url = data.get('streamUrl')
        
        if not stream_url:
            logger.error("No streamUrl provided in request data")
            return jsonify({'error': 'Stream URL is required'}), 400
        
        logger.info(f"Force disconnecting from DroidCam: {stream_url}")
        
        # Enhanced DroidCam connection handling
        if '4747' in stream_url:
            try:
                # Extract base URL and IP
                if '/mjpegfeed' in stream_url:
                    base_url = stream_url.split('/mjpegfeed')[0]
                elif '/shot.jpg' in stream_url:
                    base_url = stream_url.split('/shot.jpg')[0]
                else:
                    # Fallback for other DroidCam URLs
                    base_url = '/'.join(stream_url.split('/')[:-1])
                
                ip_port = base_url.replace('http://', '').replace('https://', '')
                
                # Try DroidCam disconnect endpoints with more aggressive approach
                disconnect_endpoints = [
                    f"{base_url}/disconnect",
                    f"{base_url}/stop",
                    f"{base_url}/reset",
                    f"{base_url}/takeover",
                    f"{base_url}/kill",
                    f"{base_url}/close",
                    f"http://{ip_port}/disconnect",
                    f"http://{ip_port}/stop",
                    f"http://{ip_port}/reset",
                    f"http://{ip_port}/takeover",
                    f"http://{ip_port}/kill",
                    f"http://{ip_port}/close",
                    # Try different ports that DroidCam might use
                    f"http://{ip_port.split(':')[0]}:4747/disconnect",
                    f"http://{ip_port.split(':')[0]}:4747/stop",
                    f"http://{ip_port.split(':')[0]}:4747/reset",
                    f"http://{ip_port.split(':')[0]}:4747/takeover"
                ]
                
                successful_disconnects = 0
                for endpoint in disconnect_endpoints:
                    try:
                        logger.info(f"Attempting disconnect: {endpoint}")
                        # Try both GET and POST methods
                        for method in ['GET', 'POST']:
                            try:
                                if method == 'GET':
                                    disconnect_response = requests.get(endpoint, timeout=2)
                                else:
                                    disconnect_response = requests.post(endpoint, timeout=2)
                                logger.info(f"Disconnect response ({method}): {disconnect_response.status_code}")
                                successful_disconnects += 1
                                break  # If one method works, don't try the other
                            except:
                                continue
                        time.sleep(0.2)  # Shorter pause between attempts
                        
                    except Exception as e:
                        logger.debug(f"Disconnect endpoint {endpoint} failed: {e}")
                        continue
                
                logger.info(f"Completed {successful_disconnects} disconnect attempts")
                return jsonify({
                    'success': True, 
                    'message': f'Attempted disconnect from {successful_disconnects} endpoints',
                    'disconnects': successful_disconnects
                }), 200
                        
            except Exception as e:
                logger.warning(f"Could not force disconnect from DroidCam: {e}")
                return jsonify({'error': f'Force disconnect failed: {str(e)}'}), 500
        else:
            return jsonify({'error': 'Force disconnect only supported for DroidCam streams'}), 400
        
    except Exception as e:
        logger.error(f"Error in force disconnect: {str(e)}")
        return jsonify({'error': f'Error in force disconnect: {str(e)}'}), 500

@app.route('/api/capture-stream', methods=['POST'])
@handle_errors
def capture_stream():
    """Capture image from stream URL to avoid CORS issues"""
    try:
        data = request.get_json()
        if not data:
            logger.error("No JSON data received in capture-stream request")
            return jsonify({'error': 'No data provided'}), 400
            
        stream_url = data.get('streamUrl')
        
        if not stream_url:
            logger.error("No streamUrl provided in request data")
            return jsonify({'error': 'Stream URL is required'}), 400
        
        # Validate URL format
        if not stream_url.startswith(('http://', 'https://')):
            logger.error(f"Invalid URL format: {stream_url}")
            return jsonify({'error': 'Invalid URL format'}), 400
        
        logger.info(f"Capturing image from stream: {stream_url}")
        
        # Enhanced DroidCam connection handling
        if '4747' in stream_url:
            try:
                # Extract base URL and IP
                if '/mjpegfeed' in stream_url:
                    base_url = stream_url.split('/mjpegfeed')[0]
                elif '/shot.jpg' in stream_url:
                    base_url = stream_url.split('/shot.jpg')[0]
                else:
                    # Fallback for other DroidCam URLs
                    base_url = '/'.join(stream_url.split('/')[:-1])
                
                ip_port = base_url.replace('http://', '').replace('https://', '')
                
                # First, automatically attempt force disconnect to clear any existing connections
                logger.info(f"Automatically attempting force disconnect before capture")
                
                # Use the same aggressive disconnect logic as the force-disconnect endpoint
                disconnect_endpoints = [
                    f"{base_url}/disconnect",
                    f"{base_url}/stop",
                    f"{base_url}/reset",
                    f"{base_url}/takeover",
                    f"{base_url}/kill",
                    f"{base_url}/close",
                    f"http://{ip_port}/disconnect",
                    f"http://{ip_port}/stop",
                    f"http://{ip_port}/reset",
                    f"http://{ip_port}/takeover",
                    f"http://{ip_port}/kill",
                    f"http://{ip_port}/close",
                    # Try different ports that DroidCam might use
                    f"http://{ip_port.split(':')[0]}:4747/disconnect",
                    f"http://{ip_port.split(':')[0]}:4747/stop",
                    f"http://{ip_port.split(':')[0]}:4747/reset",
                    f"http://{ip_port.split(':')[0]}:4747/takeover"
                ]
                
                successful_disconnects = 0
                for endpoint in disconnect_endpoints:
                    try:
                        # Try both GET and POST methods
                        for method in ['GET', 'POST']:
                            try:
                                if method == 'GET':
                                    disconnect_response = requests.get(endpoint, timeout=1)
                                else:
                                    disconnect_response = requests.post(endpoint, timeout=1)
                                successful_disconnects += 1
                                break  # If one method works, don't try the other
                            except:
                                continue
                    except:
                        continue
                
                logger.info(f"Completed {successful_disconnects} automatic disconnect attempts")
                time.sleep(1)  # Wait for disconnections to take effect
                
                # Now check if DroidCam is still busy
                logger.info(f"Checking DroidCam status after disconnect: {stream_url}")
                test_response = requests.get(stream_url, timeout=5, stream=True)
                
                # Check if we get the busy message
                if test_response.headers.get('content-type', '').startswith('text/html'):
                    content_preview = test_response.text[:500]
                    if 'DroidCam busy' in content_preview or 'connected to another client' in content_preview:
                        logger.error("DroidCam is still busy after disconnect attempts")
                        return jsonify({'error': 'DroidCam is busy with another client. Please close the DroidCam mobile app and try again.'}), 400
                        
            except Exception as e:
                logger.warning(f"Could not check/clear DroidCam busy state: {e}")
        
        # Fetch the image from the stream with increased timeout
        logger.info(f"Attempting to fetch image from: {stream_url}")
        response = requests.get(stream_url, timeout=20, stream=True)
        response.raise_for_status()
        
        # Check content type
        content_type = response.headers.get('content-type', '')
        logger.info(f"Stream response content-type: {content_type}")
        logger.info(f"Stream response status: {response.status_code}")
        logger.info(f"Stream response headers: {dict(response.headers)}")
        
        # Handle DroidCam busy response
        if content_type == 'text/html':
            content = response.text
            logger.info(f"Received HTML response from DroidCam: {content[:500]}")
            if 'DroidCam busy' in content or 'DroidCam is connected to another client' in content:
                logger.error("DroidCam is busy with another client")
                return jsonify({'error': 'DroidCam is busy with another client. Please disconnect other clients first.'}), 400
            else:
                logger.error(f"URL returned HTML instead of image: {content[:200]}")
                return jsonify({'error': f'URL does not return an image. Response: {content[:200]}'}), 400
        
        # Check if it's an MJPEG stream
        if content_type.startswith('multipart/x-mixed-replace'):
            # Handle MJPEG stream - extract first frame
            logger.info("Handling MJPEG stream")
            boundary = None
            for line in response.iter_lines():
                if line.startswith(b'--'):
                    boundary = line
                    break
            
            if boundary:
                # Read until we find the first JPEG frame
                jpeg_data = b''
                in_jpeg = False
                for line in response.iter_lines():
                    if line.startswith(b'Content-Type: image/jpeg'):
                        in_jpeg = True
                        continue
                    elif line == b'' and in_jpeg:
                        # Start of JPEG data
                        continue
                    elif in_jpeg and line.startswith(boundary):
                        # End of JPEG frame
                        break
                    elif in_jpeg:
                        jpeg_data += line + b'\n'
                
                if jpeg_data:
                    image = Image.open(BytesIO(jpeg_data))
                else:
                    logger.error("Could not extract JPEG frame from MJPEG stream")
                    return jsonify({'error': 'Could not extract frame from MJPEG stream'}), 400
            else:
                logger.error("Could not find boundary in MJPEG stream")
                return jsonify({'error': 'Invalid MJPEG stream format'}), 400
        
        elif not content_type.startswith('image/'):
            logger.error(f"URL does not return an image, content-type: {content_type}")
            return jsonify({'error': 'URL does not return an image'}), 400
        else:
            # Handle regular image
            image = Image.open(BytesIO(response.content))
        
        # Convert to RGB if necessary (for JPEG compatibility)
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        
        # Save to BytesIO buffer
        img_buffer = BytesIO()
        image.save(img_buffer, format='JPEG', quality=85)
        img_buffer.seek(0)
        
        logger.info("Image capture successful")
        return send_file(
            img_buffer,
            mimetype='image/jpeg',
            as_attachment=False
        )
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to fetch stream: {str(e)}")
        return jsonify({'error': f'Failed to fetch stream: {str(e)}'}), 500
    except Exception as e:
        logger.error(f"Error capturing stream: {str(e)}")
        return jsonify({'error': f'Error capturing image: {str(e)}'}), 500

if __name__ == '__main__':
    print("Starting Flask application...")
    print("Flask app created successfully")
    print("About to start server on port 5000...")
    app.run(debug=True, host='0.0.0.0', port=5000)
    print("Server started!")