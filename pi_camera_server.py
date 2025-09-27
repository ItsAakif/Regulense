#!/usr/bin/env python3
"""
Raspberry Pi Camera Server for Regulense
Runs on Raspberry Pi to capture images and send them to the main application

Requirements:
- Raspberry Pi with camera module
- Python 3.7+
- picamera2 (for Pi OS Bullseye/Bookworm) - RECOMMENDED <mcreference link="https://github.com/raspberrypi/picamera2" index="1">1</mcreference>
- Flask
- Pillow
- numpy (for picamera2 array operations)

Installation for Modern Pi OS (Bookworm/Bullseye):
sudo apt update
sudo apt install python3-pip python3-flask python3-pillow python3-numpy
sudo apt install python3-picamera2 --no-install-recommends
pip3 install flask pillow

For Legacy Pi OS versions (if needed):
sudo apt install python3-picamera

Note: raspistill/raspivid commands are replaced by rpicam-* in modern Pi OS <mcreference link="https://raspberrytips.com/install-camera-raspberry-pi/" index="2">2</mcreference>
"""

import os
import sys
import base64
import json
import time
import logging
from datetime import datetime
from io import BytesIO
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from PIL import Image
import threading

# Try to import camera libraries (compatibility with different Pi OS versions)
CAMERA_LIB = None
try:
    from picamera2 import Picamera2
    CAMERA_LIB = 'picamera2'
    print("Using picamera2 (recommended for Pi OS Bullseye/Bookworm)")
except ImportError:
    try:
        import picamera
        CAMERA_LIB = 'picamera'
        print("Using picamera (legacy, for older Pi OS)")
    except ImportError:
        print("WARNING: No camera library found!")
        print("Server will run in mock mode for testing.")
        print("Install camera library with: sudo apt install python3-picamera2")
        CAMERA_LIB = 'mock'

# Flask app setup
app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global camera object
camera = None
camera_lock = threading.Lock()

class PiCameraManager:
    """Manages Pi camera operations with support for both picamera libraries"""
    
    def __init__(self):
        self.camera = None
        self.is_initialized = False
        self.last_error = None
        self.streaming = False
        self.stream_quality = 70
        self.stream_size = (640, 480)
        # High quality capture settings
        self.max_resolution = (4056, 3040)  # Pi Camera v3 max resolution
        self.default_resolution = (3280, 2464)  # High quality default
        self.capture_quality = 95  # Higher default quality
        
    def initialize_camera(self):
        """Initialize camera based on available library"""
        try:
            with camera_lock:
                if CAMERA_LIB == 'picamera2':
                    self.camera = Picamera2()
                    # Configure camera for maximum quality images
                    config = self.camera.create_still_configuration(
                        main={"size": self.default_resolution, "format": "RGB888"},
                        lores={"size": (640, 480), "format": "YUV420"},
                        # Add controls for better image quality
                        controls={
                            "AwbEnable": True,  # Auto white balance
                            "AeEnable": True,   # Auto exposure
                            "NoiseReductionMode": 2,  # High quality noise reduction
                            "Sharpness": 1.5,   # Enhanced sharpness
                            "Contrast": 1.1,    # Slight contrast boost
                            "Saturation": 1.0   # Natural saturation
                        }
                    )
                    self.camera.configure(config)
                    self.camera.start()
                    time.sleep(3)  # Allow more time for camera to stabilize
                    
                elif CAMERA_LIB == 'picamera':
                    self.camera = picamera.PiCamera()
                    # Configure for high quality
                    self.camera.resolution = self.default_resolution
                    self.camera.framerate = 15  # Lower framerate for better quality
                    self.camera.sharpness = 50  # Enhanced sharpness
                    self.camera.contrast = 10   # Slight contrast boost
                    self.camera.brightness = 50
                    self.camera.saturation = 0  # Natural colors
                    self.camera.ISO = 100       # Low ISO for less noise
                    self.camera.exposure_compensation = 0
                    self.camera.exposure_mode = 'auto'
                    self.camera.meter_mode = 'average'
                    self.camera.awb_mode = 'auto'
                    self.camera.image_effect = 'none'
                    self.camera.color_effects = None
                    self.camera.rotation = 0
                    self.camera.hflip = False
                    self.camera.vflip = False
                    self.camera.crop = (0.0, 0.0, 1.0, 1.0)
                    self.camera.start_preview()
                    time.sleep(3)  # Allow camera to warm up and adjust settings
                    
                elif CAMERA_LIB == 'mock':
                    # Mock mode for testing without camera hardware
                    self.camera = 'mock_camera'
                    logger.info("Mock camera initialized for testing")
                    
                self.is_initialized = True
                self.last_error = None
                logger.info(f"Camera initialized successfully using {CAMERA_LIB}")
                
        except Exception as e:
            self.last_error = str(e)
            self.is_initialized = False
            logger.error(f"Failed to initialize camera: {e}")
            raise Exception(f"Camera initialization failed: {e}")
            
    def capture_image(self, quality=None, width=None, height=None):
        """Capture image and return as base64 encoded string"""
        if not self.is_initialized:
            raise Exception("Camera not initialized")
        
        # Use high quality defaults if not specified
        if quality is None:
            quality = self.capture_quality
        if width is None or height is None:
            width, height = self.default_resolution
            
        try:
            with camera_lock:
                # Create BytesIO buffer for image
                image_buffer = BytesIO()
                
                if CAMERA_LIB == 'picamera2':
                    # Capture with picamera2 (modern method)
                    # Use capture_array for better performance and control
                    import numpy as np
                    
                    # For maximum quality, capture at full resolution first
                    array = self.camera.capture_array("main")
                    image = Image.fromarray(array)
                    
                    # Apply additional processing for better quality
                    if hasattr(image, 'convert'):
                        # Ensure RGB mode for consistent processing
                        if image.mode != 'RGB':
                            image = image.convert('RGB')
                    
                elif CAMERA_LIB == 'picamera':
                    # Capture with legacy picamera at maximum quality
                    # Use raw capture for best quality, then convert
                    stream = BytesIO()
                    self.camera.capture(stream, format='jpeg', quality=100, thumbnail=None)
                    stream.seek(0)
                    image = Image.open(stream)
                
                elif CAMERA_LIB == 'mock':
                    # Mock mode - create a test image
                    image = Image.new('RGB', (width, height), color='red')
                
                # Resize if requested size differs from captured size
                current_size = image.size
                if (width, height) != current_size:
                    # Use high-quality resampling
                    image = image.resize((width, height), Image.Resampling.LANCZOS)
                
                # Convert to base64 with optimized settings
                output_buffer = BytesIO()
                
                # Save with maximum quality settings
                save_kwargs = {
                    'format': 'JPEG',
                    'quality': quality,
                    'optimize': True,
                    'progressive': True,  # Progressive JPEG for better compression
                    'subsampling': 0,     # No chroma subsampling for best quality
                    'qtables': 'web_high' # High quality quantization tables
                }
                
                image.save(output_buffer, **save_kwargs)
                image_data = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
                
                logger.info(f"High quality image captured: {len(image_data)} bytes, quality={quality}, size={width}x{height}")
                return image_data
                
        except Exception as e:
            logger.error(f"Failed to capture image: {e}")
            raise Exception(f"Capture failed: {e}")
    
    def generate_stream_frame(self):
        """Generate a single frame for streaming"""
        if not self.is_initialized:
            return None
            
        try:
            with camera_lock:
                # Create BytesIO buffer for image
                image_buffer = BytesIO()
                
                if CAMERA_LIB == 'picamera2':
                    # Capture with picamera2 (modern method)
                    import numpy as np
                    array = self.camera.capture_array()
                    image = Image.fromarray(array)
                    
                elif CAMERA_LIB == 'picamera':
                    # Capture with legacy picamera
                    self.camera.capture(image_buffer, format='jpeg', quality=self.stream_quality)
                    image_buffer.seek(0)
                    image = Image.open(image_buffer)
                
                # Resize for streaming (smaller size for better performance)
                image = image.resize(self.stream_size, Image.Resampling.LANCZOS)
                
                # Convert to JPEG for streaming
                output_buffer = BytesIO()
                image.save(output_buffer, format='JPEG', quality=self.stream_quality, optimize=True)
                frame_data = output_buffer.getvalue()
                
                return frame_data
                
        except Exception as e:
            logger.error(f"Failed to generate stream frame: {e}")
            return None
    
    def stream_generator(self):
        """Generator function for MJPEG streaming"""
        while self.streaming:
            frame = self.generate_stream_frame()
            if frame:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.1)  # Control frame rate (~10 FPS)
    
    def start_streaming(self):
        """Start camera streaming"""
        if not self.is_initialized:
            raise Exception("Camera not initialized")
        self.streaming = True
        logger.info("Camera streaming started")
    
    def stop_streaming(self):
        """Stop camera streaming"""
        self.streaming = False
        logger.info("Camera streaming stopped")
    
    def cleanup(self):
        """Clean up camera resources"""
        try:
            with camera_lock:
                # Stop streaming if active
                self.streaming = False
                
                if self.camera:
                    if CAMERA_LIB == 'picamera2':
                        self.camera.stop()
                    elif CAMERA_LIB == 'picamera':
                        self.camera.close()
                    self.camera = None
                self.is_initialized = False
                logger.info("Camera cleaned up successfully")
        except Exception as e:
            logger.error(f"Error during camera cleanup: {e}")

# Initialize camera manager
camera_manager = PiCameraManager()

@app.route('/status', methods=['GET'])
def get_status():
    """Get Pi camera server status"""
    return jsonify({
        'status': 'online',
        'camera_library': CAMERA_LIB,
        'camera_initialized': camera_manager.is_initialized,
        'last_error': camera_manager.last_error,
        'timestamp': datetime.now().isoformat(),
        'pi_info': {
            'python_version': sys.version,
            'platform': sys.platform
        }
    })

@app.route('/initialize', methods=['POST'])
def initialize_camera():
    """Initialize the camera"""
    try:
        camera_manager.initialize_camera()
        return jsonify({
            'success': True,
            'message': 'Camera initialized successfully',
            'library': CAMERA_LIB
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/capture', methods=['POST'])
def capture_image():
    """Capture image from Pi camera with configurable quality settings"""
    try:
        # Get parameters from request
        data = request.get_json() or {}
        quality = data.get('quality', None)  # Use camera default if not specified
        width = data.get('width', None)      # Use camera default if not specified
        height = data.get('height', None)    # Use camera default if not specified
        preset = data.get('preset', None)    # Quality preset option
        
        # Handle quality presets
        if preset:
            if preset == 'maximum':
                quality = 98
                width, height = camera_manager.max_resolution
            elif preset == 'high':
                quality = 95
                width, height = camera_manager.default_resolution
            elif preset == 'medium':
                quality = 85
                width, height = (1920, 1080)
            elif preset == 'low':
                quality = 70
                width, height = (1280, 720)
            elif preset == 'thumbnail':
                quality = 60
                width, height = (640, 480)
        
        # Validate parameters if provided
        if quality is not None:
            quality = max(10, min(100, quality))
        if width is not None:
            width = max(320, min(4056, width))
        if height is not None:
            height = max(240, min(3040, height))
        
        # Initialize camera if not already done
        if not camera_manager.is_initialized:
            camera_manager.initialize_camera()
        
        # Capture image
        image_data = camera_manager.capture_image(quality, width, height)
        
        # Get actual values used (in case defaults were applied)
        actual_quality = quality if quality is not None else camera_manager.capture_quality
        actual_width = width if width is not None else camera_manager.default_resolution[0]
        actual_height = height if height is not None else camera_manager.default_resolution[1]
        
        return jsonify({
            'success': True,
            'image_data': image_data,
            'metadata': {
                'quality': actual_quality,
                'width': actual_width,
                'height': actual_height,
                'preset': preset,
                'timestamp': datetime.now().isoformat(),
                'library': CAMERA_LIB,
                'file_size_bytes': len(image_data) * 3 // 4,  # Approximate decoded size
                'compression_ratio': f"{actual_quality}%"
            }
        })
        
    except Exception as e:
        logger.error(f"Capture endpoint error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/quality-presets', methods=['GET'])
def get_quality_presets():
    """Get available quality presets and their settings"""
    presets = {
        'maximum': {
            'quality': 98,
            'resolution': camera_manager.max_resolution,
            'description': 'Maximum quality for archival/professional use',
            'use_case': 'Best quality, largest file size'
        },
        'high': {
            'quality': 95,
            'resolution': camera_manager.default_resolution,
            'description': 'High quality for detailed analysis',
            'use_case': 'Excellent quality, good file size balance'
        },
        'medium': {
            'quality': 85,
            'resolution': (1920, 1080),
            'description': 'Good quality for general use',
            'use_case': 'Good quality, moderate file size'
        },
        'low': {
            'quality': 70,
            'resolution': (1280, 720),
            'description': 'Lower quality for quick previews',
            'use_case': 'Acceptable quality, small file size'
        },
        'thumbnail': {
            'quality': 60,
            'resolution': (640, 480),
            'description': 'Thumbnail quality for previews',
            'use_case': 'Preview quality, very small file size'
        }
    }
    
    return jsonify({
        'success': True,
        'presets': presets,
        'camera_info': {
            'max_resolution': camera_manager.max_resolution,
            'default_resolution': camera_manager.default_resolution,
            'default_quality': camera_manager.capture_quality,
            'library': CAMERA_LIB
        }
    })

@app.route('/test', methods=['GET'])
def test_camera():
    try:
        if not camera_manager.is_initialized:
            camera_manager.initialize_camera()
            
        # Capture a small test image
        image_data = camera_manager.capture_image(quality=50, width=640, height=480)
        
        return jsonify({
            'success': True,
            'message': 'Camera test successful',
            'image_size': len(image_data),
            'library': CAMERA_LIB
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/cleanup', methods=['POST'])
def cleanup_camera():
    """Clean up camera resources"""
    try:
        camera_manager.cleanup()
        return jsonify({
            'success': True,
            'message': 'Camera cleaned up successfully'
        })
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/stream/start', methods=['POST'])
def start_stream():
    """Start camera streaming"""
    try:
        # Initialize camera if not already done
        if not camera_manager.is_initialized:
            camera_manager.initialize_camera()
        
        # Start streaming
        camera_manager.start_streaming()
        
        return jsonify({
            'success': True,
            'message': 'Camera streaming started',
            'stream_url': '/stream/video'
        })
    except Exception as e:
        logger.error(f"Failed to start streaming: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/stream/stop', methods=['POST'])
def stop_stream():
    """Stop camera streaming"""
    try:
        camera_manager.stop_streaming()
        return jsonify({
            'success': True,
            'message': 'Camera streaming stopped'
        })
    except Exception as e:
        logger.error(f"Failed to stop streaming: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/stream/video')
def video_stream():
    """Video streaming route. Put this in the src attribute of an img tag"""
    try:
        if not camera_manager.is_initialized:
            camera_manager.initialize_camera()
        
        if not camera_manager.streaming:
            camera_manager.start_streaming()
        
        return Response(
            camera_manager.stream_generator(),
            mimetype='multipart/x-mixed-replace; boundary=frame'
        )
    except Exception as e:
        logger.error(f"Video stream failed: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/stream/status', methods=['GET'])
def stream_status():
    """Get streaming status"""
    return jsonify({
        'success': True,
        'streaming': camera_manager.streaming,
        'initialized': camera_manager.is_initialized,
        'stream_url': '/stream/video' if camera_manager.streaming else None
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

def cleanup_on_exit():
    """Cleanup function called on exit"""
    logger.info("Shutting down Pi camera server...")
    camera_manager.cleanup()

if __name__ == '__main__':
    import atexit
    atexit.register(cleanup_on_exit)
    
    print("=" * 50)
    print("Regulense Pi Camera Server")
    print("=" * 50)
    print(f"Camera Library: {CAMERA_LIB}")
    print("Starting server on port 5001...")
    print("Make sure your Pi camera is connected and enabled!")
    print("=" * 50)
    
    try:
        # Initialize camera on startup
        camera_manager.initialize_camera()
        
        # Start Flask server
        app.run(
            host='0.0.0.0',  # Listen on all interfaces
            port=5001,
            debug=False,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\nShutting down...")
        cleanup_on_exit()
    except Exception as e:
        print(f"Failed to start server: {e}")
        sys.exit(1)