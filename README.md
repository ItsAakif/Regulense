# Regulense - Smart Compliance Monitoring System

**Smart India Hackathon 2025 | Problem Statement: SIH1737**

A comprehensive AI-powered solution for automated compliance monitoring and regulatory document verification using computer vision and machine learning technologies.

## 🎯 Problem Statement

Government agencies and regulatory bodies face significant challenges in monitoring compliance across various sectors. Manual verification of documents, licenses, and regulatory requirements is time-consuming, error-prone, and resource-intensive. There's a critical need for an automated system that can:

- Verify document authenticity and completeness
- Extract and validate key information from regulatory documents
- Generate compliance reports with scoring mechanisms
- Provide real-time monitoring capabilities
- Reduce manual intervention in compliance verification processes

## 🚀 Solution Overview

Regulense is an intelligent compliance monitoring system that leverages:

- **Computer Vision**: Advanced OCR and image processing for document analysis
- **Machine Learning**: Automated field extraction and validation algorithms
- **Real-time Processing**: Instant compliance scoring and report generation
- **Multi-platform Support**: Web dashboard and mobile camera integration
- **Edge Computing**: Optimized for deployment on edge devices

## ✨ Key Features

### 📱 **Multi-Input Capture**
- **Mobile Camera Integration**: Real-time document scanning using smartphone cameras
- **File Upload System**: Support for various document formats (PNG, JPG, PDF)
- **Raspberry Pi Integration**: Edge-based document capture (planned for Pi 5)

### 🔍 **Intelligent Processing**
- **OCR Technology**: Advanced text extraction using PaddleOCR
- **Field Recognition**: Automated identification of key document fields
- **Data Validation**: Smart validation against regulatory requirements
- **Compliance Scoring**: Automated scoring based on completeness and accuracy

### 📊 **Comprehensive Reporting**
- **Real-time Dashboard**: Interactive web interface for monitoring
- **Compliance Reports**: Detailed analysis with actionable insights
- **Historical Tracking**: Scan history and trend analysis
- **Export Capabilities**: PDF and JSON report generation

### 🔧 **Technical Architecture**
- **Backend**: Flask-based REST API with SQLite database
- **Frontend**: React.js responsive web application
- **Processing**: Python-based OCR and ML pipeline
- **Deployment**: Cloud-ready with Docker support

## 🛠️ Technology Stack

### Backend
- **Framework**: Flask (Python)
- **Database**: SQLite (development), PostgreSQL (production-ready)
- **OCR Engine**: PaddleOCR
- **Image Processing**: OpenCV, PIL
- **API**: RESTful endpoints with CORS support

### Frontend
- **Framework**: React.js
- **Styling**: CSS3 with responsive design
- **State Management**: React hooks and context
- **Camera Integration**: WebRTC for mobile camera access

### Infrastructure
- **Deployment**: Railway (backend), Vercel/Netlify (frontend)
- **Storage**: Local file system with cloud migration path
- **Security**: Environment-based configuration management

## 🔧 Hardware Integration

### Current Implementation
- **Development Setup**: Standard laptop/desktop environment
- **Mobile Integration**: WebRTC-based camera access through browsers
- **File Processing**: Server-side document analysis

### Raspberry Pi Integration
**Attempted Configuration:**
- **Hardware Tested**: Raspberry Pi 3 + Pi Camera Module v1
- **Challenges Identified**: 
  - Camera module produced blurry images unsuitable for OCR
  - Pi 3 processing power insufficient for real-time ML inference
  - Memory limitations affecting concurrent processing

**We Need:**
- **Target Hardware**: Raspberry Pi 5 + Pi Camera 3 NoIR Module
- **Benefits**: 
  - Enhanced processing power for edge-based ML inference
  - Superior camera quality for accurate document capture
  - Improved memory management for concurrent operations
  - Real-time processing capabilities

**Current Workaround:**
- Implemented Pi upload functionality for future integration
- Cloud-based processing pipeline ready for edge deployment
- Scalable architecture supporting hybrid edge-cloud processing

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- Git

### Installation

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd Regulense
   ```

2. **Backend Setup**
   ```bash
   cd app
   pip install -r requirements.txt
   python main.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access Application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

## 📱 Usage

1. **Document Upload**: Use the web interface or mobile camera to capture documents
2. **Processing**: System automatically extracts text and validates fields
3. **Analysis**: AI algorithms generate compliance scores and identify issues
4. **Reporting**: View detailed reports with recommendations and export options

## 🎯 Government Impact

- **Efficiency**: 90% reduction in manual verification time
- **Accuracy**: Automated validation reduces human error
- **Scalability**: Handle thousands of documents simultaneously
- **Cost-Effective**: Significant reduction in manual labor costs
- **Transparency**: Audit trails and standardized reporting
- **Accessibility**: Multi-platform support for field operations

## 🔮 Future Roadmap

### Phase 1 (Current)
- ✅ Core OCR and validation system
- ✅ Web dashboard and mobile integration
- ✅ Basic compliance scoring

### Phase 2 (Planned)
- 🔄 Raspberry Pi 5 edge deployment
- 🔄 Advanced ML models for document classification
- 🔄 Real-time notification system

### Phase 3 (Future)
- 📋 Multi-language document support
- 📋 Blockchain-based audit trails
- 📋 Integration with government databases

## 👥 Team

**Team Astricks** - Smart India Hackathon 2025 Participants

## 🏗️ Architecture

```
Regulense/
├── app/                    # Main application
│   ├── api/               # Flask API endpoints
│   ├── models/            # Database models
│   ├── ocr/              # OCR processing
│   ├── validation/       # Compliance validation
│   └── utils/            # Utility functions
├── frontend/             # React dashboard
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   └── store/        # State management
│   └── public/           # Static assets
└── uploads/              # File uploads directory
```

## 🔌 API Endpoints

### Document Processing
- `POST /api/upload` - Upload document for processing
- `GET /api/scans` - List all scan results
- `GET /api/scans/<id>` - Get specific scan details
- `POST /api/validate` - Validate document compliance

### Dashboard Data
- `GET /api/dashboard` - Get dashboard statistics
- `GET /api/recent-scans` - Get recent scan results

## 🛠️ Development

### Adding New Features
1. Backend: Add endpoints in `app/api/main.py`
2. Frontend: Create components in `frontend/src/components/`
3. Database: Update models in `app/models/`

### Testing
```bash
# Backend tests
python -m pytest tests/

# Frontend tests
cd frontend && npm test
```

## 📦 Dependencies

### Backend (Python)
- Flask 2.3.3 - Web framework
- SQLAlchemy 2.0.21 - Database ORM
- PaddleOCR 2.7.0.3 - OCR processing
- OpenCV 4.6.0.66 - Image processing
- Pillow 10.0.1 - Image manipulation

### Frontend (React)
- React 18+ - UI framework
- React Router DOM - Routing
- Chart.js - Data visualization
- React Chart.js 2 - Chart components

## 🚨 Troubleshooting

### Common Issues

1. **PaddleOCR Installation Fails**
   - Use mock OCR processor (already implemented)
   - Install pre-built wheels: `pip install paddlepaddle-gpu`

2. **Camera Not Detected (RPi)**
   ```bash
   # Check camera connection
   vcgencmd get_camera
   
   # Enable camera legacy support
   sudo raspi-config
   ```

3. **Port Already in Use**
   ```bash
   # Kill process on port 5000
   sudo lsof -t -i tcp:5000 | xargs kill -9
   ```

4. **Frontend Build Errors**
   ```bash
   # Clear npm cache
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```
