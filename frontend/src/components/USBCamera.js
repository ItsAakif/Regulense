import React, { useState, useEffect } from 'react';
import './USBCamera.css';

const USBCamera = () => {
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load available USB cameras on component mount
  useEffect(() => {
    loadUSBCameras();
  }, []);

  const loadUSBCameras = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/usb-camera/list');
      const data = await response.json();
      
      if (data.success) {
        setAvailableCameras(data.cameras);
        if (data.cameras.length > 0) {
          setSelectedCamera(data.cameras[0]);
        } else {
          setError('No USB cameras detected. Please connect your phone via USB and enable USB debugging/camera access.');
        }
      } else {
        setError('Failed to detect USB cameras: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error loading USB cameras:', error);
      setError('Failed to connect to camera service. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const testCamera = async () => {
    if (!selectedCamera) {
      setError('Please select a camera first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/usb-camera/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          camera_id: selectedCamera.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsConnected(true);
        setError('');
        console.log('Camera test successful:', data);
      } else {
        setError('Camera test failed: ' + (data.error || 'Unknown error'));
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error testing camera:', error);
      setError('Failed to test camera connection');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const captureImage = async () => {
    if (!selectedCamera) {
      setError('Please select a camera first');
      return;
    }

    setIsCapturing(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/usb-camera/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          camera_id: selectedCamera.id,
          quality: 85
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        console.log('Image captured successfully');
      } else {
        const errorData = await response.json();
        setError('Capture failed: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      setError('Failed to capture image from USB camera');
    } finally {
      setIsCapturing(false);
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) {
      setError('No image to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      // Convert blob URL to file for upload
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('image', blob, 'usb_capture.jpg');
      formData.append('scan_type', 'compliance');

      const uploadResponse = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await uploadResponse.json();

      if (result.success) {
        setAnalysisResult(result);
        console.log('Analysis completed:', result);
      } else {
        setError('Analysis failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      setError('Failed to analyze image');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setError('');
  };

  const refreshCameras = () => {
    loadUSBCameras();
  };

  return (
    <div className="usb-camera-container">
      <div className="camera-header">
        <h2>USB Camera Capture</h2>
        <p>Connect your phone via USB cable for reliable image capture</p>
      </div>

      {/* Camera Selection */}
      <div className="camera-selection">
        <div className="selection-header">
          <h3>Available USB Cameras</h3>
          <button 
            onClick={refreshCameras} 
            disabled={isLoading}
            className="refresh-btn"
          >
            {isLoading ? 'Scanning...' : 'Refresh'}
          </button>
        </div>

        {availableCameras.length > 0 ? (
          <div className="camera-list">
            {availableCameras.map((camera) => (
              <div 
                key={camera.id} 
                className={`camera-item ${selectedCamera?.id === camera.id ? 'selected' : ''}`}
                onClick={() => setSelectedCamera(camera)}
              >
                <div className="camera-info">
                  <h4>{camera.name}</h4>
                  <p>Resolution: {camera.resolution}</p>
                  <p>FPS: {camera.fps}</p>
                </div>
                <div className="camera-status">
                  {selectedCamera?.id === camera.id && isConnected && (
                    <span className="status-connected">Connected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-cameras">
            <p>No USB cameras detected</p>
            <div className="setup-instructions">
              <h4>Setup Instructions:</h4>
              <ol>
                <li>Connect your phone to computer via USB cable</li>
                <li>Enable "USB Debugging" in Developer Options</li>
                <li>Allow camera access when prompted</li>
                <li>Click "Refresh" to scan for cameras</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      {selectedCamera && (
        <div className="camera-controls">
          <div className="control-buttons">
            <button 
              onClick={testCamera} 
              disabled={isLoading}
              className="test-btn"
            >
              {isLoading ? 'Testing...' : 'Test Camera'}
            </button>
            
            <button 
              onClick={captureImage} 
              disabled={!isConnected || isCapturing}
              className="capture-btn"
            >
              {isCapturing ? 'Capturing...' : 'Capture Image'}
            </button>
          </div>

          {isConnected && (
            <div className="connection-status">
              <span className="status-indicator connected"></span>
              Camera {selectedCamera.id} is ready
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {/* Image Display */}
      {capturedImage && (
        <div className="captured-image-section">
          <h3>Captured Image</h3>
          <div className="image-container">
            <img src={capturedImage} alt="USB Camera Capture" className="captured-image" />
          </div>
          
          <div className="image-controls">
            <button onClick={retakePhoto} className="retake-btn">
              Retake Photo
            </button>
            <button 
              onClick={analyzeImage} 
              disabled={isAnalyzing}
              className="analyze-btn"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Image'}
            </button>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="analysis-results">
          <h3>Analysis Results</h3>
          <div className="results-grid">
            <div className="result-card">
              <h4>Compliance Score</h4>
              <div className={`score ${analysisResult.compliance_score >= 80 ? 'good' : 
                analysisResult.compliance_score >= 60 ? 'warning' : 'poor'}`}>
                {analysisResult.compliance_score}%
              </div>
            </div>
            
            <div className="result-card">
              <h4>Status</h4>
              <div className={`status ${analysisResult.is_compliant ? 'compliant' : 'non-compliant'}`}>
                {analysisResult.is_compliant ? 'Compliant' : 'Non-Compliant'}
              </div>
            </div>
          </div>

          {analysisResult.ocr_fields && (
            <div className="extracted-fields">
              <h4>Extracted Information</h4>
              <div className="fields-grid">
                {Object.entries(analysisResult.ocr_fields.fields || {}).map(([key, value]) => (
                  <div key={key} className="field-item">
                    <span className="field-label">{key.replace(/_/g, ' ').toUpperCase()}:</span>
                    <span className="field-value">{value || 'Not detected'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysisResult.violations && analysisResult.violations.length > 0 && (
            <div className="violations">
              <h4>Violations Found</h4>
              <ul>
                {analysisResult.violations.map((violation, index) => (
                  <li key={index} className="violation-item">
                    <strong>{violation.rule}:</strong> {violation.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default USBCamera;