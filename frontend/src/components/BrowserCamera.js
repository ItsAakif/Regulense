import React, { useState, useRef, useEffect } from 'react';
import './BrowserCamera.css';

const BrowserCamera = ({ onImageCapture, onError }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' for front, 'environment' for back
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Check if camera is supported
  const isCameraSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  // Check if HTTPS is required
  const isHTTPSRequired = () => {
    return location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1';
  };

  const startCamera = async () => {
    if (!isCameraSupported()) {
      onError('Camera not supported on this device/browser');
      return;
    }

    if (isHTTPSRequired()) {
      onError('HTTPS is required for camera access. Please use a secure connection.');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
      
      setStream(mediaStream);
      setIsStreaming(true);
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      if (error.name === 'NotAllowedError') {
        onError('Camera access denied. Please allow camera permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        onError('No camera found on this device.');
      } else if (error.name === 'NotSupportedError') {
        onError('Camera not supported on this device.');
      } else {
        onError(`Camera error: ${error.message}`);
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsStreaming(false);
    setCapturedImage(null);
  };

  const switchCamera = async () => {
    const newFacingMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacingMode);
    
    if (isStreaming) {
      stopCamera();
      // Small delay to ensure camera is released
      setTimeout(() => {
        setFacingMode(newFacingMode);
        startCamera();
      }, 100);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      onError('Camera not ready for capture');
      return;
    }

    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const imageUrl = URL.createObjectURL(blob);
          setCapturedImage(imageUrl);
          
          // Call parent callback with image data
          onImageCapture({
            blob: blob,
            url: imageUrl,
            width: canvas.width,
            height: canvas.height
          });
        } else {
          onError('Failed to capture image');
        }
        setIsCapturing(false);
      }, 'image/jpeg', 0.9);

    } catch (error) {
      console.error('Error capturing image:', error);
      onError('Failed to capture image: ' + error.message);
      setIsCapturing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    if (onImageCapture) {
      onImageCapture(null); // Clear parent state
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (!isCameraSupported()) {
    return (
      <div className="browser-camera-error">
        <h3>Camera Not Supported</h3>
        <p>Your browser doesn't support camera access. Please use a modern browser or try the upload feature instead.</p>
      </div>
    );
  }

  if (isHTTPSRequired()) {
    return (
      <div className="browser-camera-error">
        <h3>HTTPS Required</h3>
        <p>Camera access requires a secure connection (HTTPS). Please access this app through HTTPS or use the upload feature.</p>
      </div>
    );
  }

  return (
    <div className="browser-camera">
      <div className="camera-header">
        <h2>Browser Camera</h2>
        <p>Use your device's camera to scan product labels</p>
      </div>

      {!isStreaming && !capturedImage && (
        <div className="camera-start">
          <button onClick={startCamera} className="start-camera-btn">
            Start Camera
          </button>
          <p className="camera-help">
            Click "Start Camera" and allow camera permissions when prompted
          </p>
        </div>
      )}

      {isStreaming && !capturedImage && (
        <div className="camera-active">
          <div className="video-container">
            <video
              ref={videoRef}
              className="camera-video"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="capture-canvas"
              style={{ display: 'none' }}
            />
          </div>
          
          <div className="camera-controls">
            <button 
              onClick={switchCamera} 
              className="switch-camera-btn"
              title="Switch between front and back camera"
            >
              🔄 Switch Camera
            </button>
            
            <button 
              onClick={captureImage} 
              className="capture-btn"
              disabled={isCapturing}
            >
              {isCapturing ? 'Capturing...' : '📷 Capture'}
            </button>
            
            <button onClick={stopCamera} className="stop-camera-btn">
              Stop Camera
            </button>
          </div>
          
          <div className="camera-info">
            <p>Using: {facingMode === 'environment' ? 'Back Camera' : 'Front Camera'}</p>
          </div>
        </div>
      )}

      {capturedImage && (
        <div className="captured-image">
          <div className="image-preview">
            <img src={capturedImage} alt="Captured" className="preview-image" />
          </div>
          
          <div className="image-actions">
            <button onClick={retakePhoto} className="retake-btn">
              Retake Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowserCamera;