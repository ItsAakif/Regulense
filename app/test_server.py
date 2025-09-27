from flask import Flask, jsonify, request
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:3000",
    "https://*.vercel.app", 
    "https://*.netlify.app",
    "https://regulense-frontend.vercel.app"
])

@app.route('/')
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Regulense Backend API is running',
        'version': '1.0.0'
    })

@app.route('/api/health')
def api_health():
    return jsonify({
        'status': 'healthy',
        'api': 'ready',
        'timestamp': '2025-01-27T12:00:00Z'
    })

@app.route('/api/upload', methods=['POST'])
def mock_upload():
    return jsonify({
        'message': 'Mock upload endpoint - OCR processing disabled for testing',
        'status': 'success',
        'mock_data': {
            'compliance_score': 85,
            'is_compliant': True,
            'violations': [],
            'extracted_fields': {
                'product_name': 'Test Product',
                'manufacturer': 'Test Manufacturer',
                'net_weight': '500g'
            }
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting test server on port {port}...")
    app.run(debug=True, host='0.0.0.0', port=port)