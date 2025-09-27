import React from 'react';
import BrowserCamera from '../components/BrowserCamera';
import './MobileCamera.css'; // Reuse mobile camera styles for consistency

const BrowserCameraPage = () => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleImageCapture = (imageData) => {
    if (imageData) {
      setCapturedImage(imageData);
      setError('');
    } else {
      setCapturedImage(null);
      setResults(null);
    }
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setCapturedImage(null);
    setResults(null);
  };

  const processImage = async () => {
    if (!capturedImage) {
      setError('No image captured');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', capturedImage.blob, 'camera-capture.jpg');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResults(data);
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setError(`Processing failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setResults(null);
    setError('');
  };

  return (
    <div className="upload-container">
      <div className="upload-header">
        <h1>Browser Camera Scanner</h1>
        <p>Use your device's camera to scan product labels for compliance checking</p>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="upload-content">
        <BrowserCamera 
          onImageCapture={handleImageCapture}
          onError={handleError}
        />

        {capturedImage && !results && (
          <div className="image-actions">
            <div className="action-buttons">
              <button 
                onClick={processImage} 
                disabled={isProcessing}
                className="process-btn"
              >
                {isProcessing ? 'Processing...' : 'Process Image'}
              </button>
              <button onClick={resetCapture} className="reset-btn">
                Reset
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="processing-indicator">
            <div className="spinner"></div>
            <p>Processing image... This may take a few moments.</p>
          </div>
        )}

        {results && (
          <div className="results-section">
            <h2>Scan Results</h2>
            
            <div className="compliance-summary">
              <div className={`compliance-badge ${results.compliance_status?.toLowerCase()}`}>
                Status: {results.compliance_status || 'Unknown'}
              </div>
              {results.compliance_score !== undefined && (
                <div className="compliance-score">
                  Score: {results.compliance_score}/100
                </div>
              )}
            </div>

            {results.extracted_fields && Object.keys(results.extracted_fields).length > 0 && (
              <div className="extracted-fields">
                <h3>Extracted Information</h3>
                <div className="fields-grid">
                  {Object.entries(results.extracted_fields).map(([key, value]) => (
                    <div key={key} className="field-item">
                      <strong>{key.replace(/_/g, ' ').toUpperCase()}:</strong>
                      <span>{value || 'Not found'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results.violations && results.violations.length > 0 && (
              <div className="violations-section">
                <h3>Compliance Issues</h3>
                <ul className="violations-list">
                  {results.violations.map((violation, index) => (
                    <li key={index} className={`violation-item ${violation.severity?.toLowerCase()}`}>
                      <strong>{violation.field}:</strong> {violation.message}
                      {violation.severity && (
                        <span className="severity-badge">{violation.severity}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {results.ocr_text && (
              <div className="ocr-text-section">
                <h3>Extracted Text</h3>
                <div className="ocr-text">
                  {results.ocr_text}
                </div>
              </div>
            )}

            <div className="action-buttons">
              <button onClick={resetCapture} className="new-scan-btn">
                New Scan
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="help-section">
        <h3>Tips for Better Results</h3>
        <ul>
          <li>Ensure good lighting when capturing images</li>
          <li>Hold the camera steady and focus on the product label</li>
          <li>Make sure text is clearly visible and not blurry</li>
          <li>Capture the entire label including all required information</li>
          <li>Use the back camera for better quality (if available)</li>
        </ul>
      </div>
    </div>
  );
};

export default BrowserCameraPage;