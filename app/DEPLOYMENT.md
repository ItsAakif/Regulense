# Railway Deployment Guide

## Overview
This application is configured for deployment on Railway with optimized settings for OCR processing using PaddleOCR.

## Configuration Files

### Core Files
- `requirements.txt` - Python dependencies optimized for Flask and OCR
- `Procfile` - Gunicorn configuration with optimized settings
- `railway.toml` - Railway-specific deployment configuration
- `nixpacks.toml` - Build configuration with system dependencies
- `wsgi.py` - WSGI entry point for production
- `runtime.txt` - Python version specification

### Environment Configuration
- `.env.example` - Template for environment variables
- `config.py` - Flask configuration classes (Development/Production/Testing)

## Key Features

### Optimized for OCR Processing
- Memory limit increased to 2GB for PaddleOCR
- Timeout set to 300 seconds for large document processing
- Single worker configuration to prevent memory issues
- System dependencies for OpenCV and image processing

### Production Settings
- Gunicorn WSGI server with optimized worker configuration
- JSON serialization fixes for NumPy data types
- Proper error handling and logging
- CORS configuration for frontend integration

## Deployment Steps

1. **Push to Railway**
   ```bash
   railway login
   railway link [your-project-id]
   railway up
   ```

2. **Environment Variables**
   Railway will automatically use variables from `railway.toml`, but you can override:
   - `FLASK_ENV=production`
   - `DATABASE_URL` (if using external database)
   - `MAX_CONTENT_LENGTH=16777216` (16MB file upload limit)
   - `OCR_CONFIDENCE_THRESHOLD=0.5`

3. **Health Check**
   - Endpoint: `/health`
   - Timeout: 300 seconds
   - Automatic restart on failure

## Local Testing

Test the production configuration locally:

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment
set FLASK_ENV=production

# Run with gunicorn
gunicorn api.main:app --bind 0.0.0.0:5000 --timeout 300 --workers 1
```

## Troubleshooting

### Common Issues
1. **Memory Issues**: Increase `RAILWAY_MEMORY_LIMIT` in railway.toml
2. **Timeout Issues**: Adjust `--timeout` in Procfile and healthcheckTimeout in railway.toml
3. **JSON Serialization**: NumPy types are automatically converted to Python native types
4. **File Upload**: Check `MAX_CONTENT_LENGTH` setting for large documents

### Logs
Monitor deployment logs in Railway dashboard or via CLI:
```bash
railway logs
```