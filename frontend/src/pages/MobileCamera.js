import React, { useState, useRef, useEffect } from 'react';
import './MobileCamera.css';

const MobileCamera = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [ipAddress, setIpAddress] = useState('192.168.1.');
  const [port, setPort] = useState('4747');
  const [networkInfo, setNetworkInfo] = useState(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [isTemporarilyDisconnected, setIsTemporarilyDisconnected] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Common IP camera apps and their URL patterns
  const cameraApps = [
    {
      name: 'DroidCam WiFi',
      description: 'Popular wireless camera app',
      urlPattern: 'http://{ip}:{port}/mjpegfeed?640x480',
      defaultPort: '4747',
      instructions: [
        'Install DroidCam on your phone',
        'Connect both devices to the same WiFi',
        'Start DroidCam and note the IP address shown in the app',
        'Make sure "WiFi IP" is enabled in DroidCam settings',
        'Use port 4747 (default) - DO NOT change this',
        'Ensure both devices are on the same network'
      ]
    },
    {
      name: 'DroidCam USB',
      description: 'DroidCam via USB connection (more stable)',
      urlPattern: 'usb',
      defaultPort: '4747',
      isUSB: true,
      instructions: [
        'Install DroidCam on your phone and PC',
        'Enable USB Debugging in Developer Options on your phone',
        'Connect your phone to PC via USB cable',
        'Start DroidCam app on your phone',
        'Select "USB" mode in DroidCam PC client',
        'Click "Start" in DroidCam PC client first',
        'Then click "Connect USB" below'
      ]
    },
    {
      name: 'IP Webcam',
      description: 'Feature-rich IP camera solution',
      urlPattern: 'http://{ip}:{port}/video',
      defaultPort: '8080',
      instructions: [
        'Install IP Webcam on your phone',
        'Start the server in the app',
        'Note the IP address shown',
        'Use port 8080 (default)'
      ]
    },
    {
      name: 'iVCam',
      description: 'High-quality wireless camera',
      urlPattern: 'http://{ip}:{port}/cam.mjpg',
      defaultPort: '8080',
      instructions: [
        'Install iVCam on your phone',
        'Install iVCam client on computer',
        'Connect via WiFi or USB',
        'Use the provided IP and port'
      ]
    }
  ];

  const [selectedApp, setSelectedApp] = useState(cameraApps[0]);

  useEffect(() => {
    if (streamUrl && videoRef.current) {
      videoRef.current.src = streamUrl;
      // Note: .load() method is not available on img elements, only on video elements
      // The img element will automatically load when src is set
    }
  }, [streamUrl]);

  const connectToCamera = async () => {
    // Handle USB connection differently
    if (selectedApp.isUSB) {
      setError('Testing USB connection...');
      
      try {
        // Test USB connection via backend
        const testResponse = await fetch('/api/droidcam-usb/test');
        const testResult = await testResponse.json();
        
        if (testResult.success) {
          // Use proxy endpoint for USB connection too
          const usbUrl = 'http://localhost:4747/mjpegfeed?640x480';
          const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(usbUrl)}`;
          setStreamUrl(proxyUrl);
          setIsConnected(true);
          setError('');
        } else {
          throw new Error(testResult.error || 'USB connection failed');
        }
      } catch (error) {
        console.error('USB connection failed:', error);
        setError(`USB connection failed. Please check:
1. DroidCam PC client is running and started
2. Phone is connected via USB with USB Debugging enabled
3. DroidCam app is running on your phone
4. USB mode is selected in DroidCam PC client
5. Try restarting both DroidCam PC client and phone app`);
        setIsConnected(false);
        setStreamUrl('');
      }
      return;
    }

    // WiFi connection logic (existing)
    if (!ipAddress.trim()) {
      setError('Please enter your phone\'s IP address');
      return;
    }

    // Validate IP address format
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(ipAddress.trim())) {
      setError('Please enter a valid IP address (e.g., 192.168.1.100)');
      return;
    }

    // Validate IP address ranges (allow all private IP ranges and mobile hotspot ranges)
    const ipParts = ipAddress.trim().split('.').map(Number);
    const isValidPrivateIP = (
      // 192.168.x.x (Class C private)
      (ipParts[0] === 192 && ipParts[1] === 168) ||
      // 10.x.x.x (Class A private)
      (ipParts[0] === 10) ||
      // 172.16.x.x - 172.31.x.x (Class B private)
      (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) ||
      // Common mobile hotspot ranges
      (ipParts[0] === 192 && ipParts[1] === 168) ||
      (ipParts[0] === 172 && ipParts[1] === 20) ||
      // Allow localhost for testing
      (ipParts[0] === 127 && ipParts[1] === 0 && ipParts[2] === 0 && ipParts[3] === 1)
    );
    
    if (!isValidPrivateIP) {
      setError('Please enter a valid private IP address (supports 192.168.x.x, 10.x.x.x, 172.16-31.x.x ranges and mobile hotspots)');
      return;
    }

    const url = selectedApp.urlPattern
      .replace('{ip}', ipAddress.trim())
      .replace('{port}', port || selectedApp.defaultPort);
    
    setError('Connecting to camera...');
    
    try {
      // First, try to force disconnect any existing DroidCam connections
      if (url.includes('4747')) {
        try {
          setError('Clearing any existing DroidCam connections...');
          const disconnectResponse = await fetch('http://localhost:5000/api/force-disconnect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              streamUrl: url
            }),
          });

          if (disconnectResponse.ok) {
            const result = await disconnectResponse.json();
            console.log('Pre-connection force disconnect result:', result);
          }
        } catch (disconnectError) {
          console.warn('Pre-connection force disconnect failed:', disconnectError);
          // Continue with connection attempt even if force disconnect fails
        }
      }

      // Test the connection by trying to load the stream
      setError('Testing camera connection...');
      
      // Create a test image to verify the stream is accessible via proxy
      const testImg = new Image();
      testImg.crossOrigin = 'anonymous';
      
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000); // 10 second timeout

        testImg.onload = () => {
          clearTimeout(timeout);
          resolve(true);
        };
        
        testImg.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Failed to load camera stream'));
        };
        
        // Test using proxy endpoint to avoid CORS issues
        const testProxyUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
        testImg.src = testProxyUrl;
      });

      await connectionPromise;
      
      // If we get here, the connection test passed
      // Use proxy endpoint to avoid CORS issues
      const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
      setStreamUrl(proxyUrl);
      setIsConnected(true);
      setError('');
      
    } catch (error) {
      console.error('Connection failed:', error);
      setError(`Connection failed. Please check:
1. DroidCam is running on your phone
2. Both devices are on the same WiFi network  
3. IP address ${ipAddress.trim()} is correct
4. Port ${port || selectedApp.defaultPort} is not blocked by firewall
5. Try restarting DroidCam if it shows "busy"
6. Close any other browser tabs or apps using the camera

Error details: ${error.message}`);
      setIsConnected(false);
      setStreamUrl('');
    }
  };

  const captureImage = async () => {
    if (!isConnected) {
      setError('Please connect to your camera first.');
      return;
    }

    setIsCapturing(true);
    setError('');

    try {
      // Try direct canvas capture from img element (for MJPEG streams)
      if (videoRef.current && videoRef.current.complete && videoRef.current.naturalWidth > 0) {
        console.log('Attempting direct canvas capture from img element');
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        canvas.width = videoRef.current.naturalWidth || 640;
        canvas.height = videoRef.current.naturalHeight || 480;
        
        try {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              const imageUrl = URL.createObjectURL(blob);
              setCapturedImage(imageUrl);
              setCapturedBlob(blob);
              console.log('Successfully captured image from img element');
              setIsCapturing(false);
            } else {
              console.error('Failed to create blob from canvas');
              // Fall back to server capture
              fallbackToServerCapture();
            }
          }, 'image/jpeg', 0.9);
          
          return;
        } catch (canvasError) {
          console.error('Canvas capture failed:', canvasError);
          // Fall back to server capture
        }
      }

      // Fallback to server-based capture
      await fallbackToServerCapture();
      
    } catch (error) {
      console.error('All capture methods failed:', error);
      setError('Unable to capture image. Please ensure DroidCam is running and try again.');
      setIsCapturing(false);
    }
  };

  const fallbackToServerCapture = async () => {
    try {
      if (selectedApp.isUSB) {
        // USB capture
        const response = await fetch('http://localhost:5000/api/droidcam-usb/capture', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCapturedImage(data.image_url);
          setCapturedBlob(null); // Server-captured images don't have blob
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'USB capture failed');
        }
      } else {
        // WiFi capture - try alternative endpoints first
        await captureImageFallback();
      }
    } catch (error) {
      console.error('Server capture failed:', error);
      throw error;
    } finally {
      setIsCapturing(false);
    }
  };

  const captureImageFallback = async () => {
    if (!streamUrl) {
      setError('No camera stream available. Please connect to your camera first.');
      return;
    }

    setIsCapturing(true);
    setError('');

    try {
      // Method 1: Try direct image capture via server
      console.log('Attempting server capture with URL:', streamUrl);
      const imageUrl = await captureViaServer(streamUrl);
      
      if (imageUrl) {
        setCapturedImage(imageUrl);
        setCapturedBlob(null); // Server-captured images don't have blob
        // setShowCaptureModal(true); // Commented out as this modal doesn't exist
        setIsCapturing(false);
        return;
      }
    } catch (error) {
      console.error('Server capture failed:', error);
    }

    try {
      // Method 2: Try alternative DroidCam endpoints
      const alternativeUrls = [
        streamUrl.replace('/mjpegfeed', '/shot.jpg'),
        streamUrl.replace('/mjpegfeed', '/photo.jpg'),
        streamUrl.replace('mjpegfeed?640x480', 'shot.jpg'),
      ];

      for (const altUrl of alternativeUrls) {
        try {
          console.log('Trying alternative endpoint:', altUrl);
          const imageUrl = await captureViaServer(altUrl);
          
          if (imageUrl) {
            setCapturedImage(imageUrl);
            setCapturedBlob(null); // Server-captured images don't have blob
            // setShowCaptureModal(true); // Commented out as this modal doesn't exist
            setIsCapturing(false);
            return;
          }
        } catch (altError) {
          console.log('Alternative endpoint failed:', altUrl, altError.message);
          continue;
        }
      }
    } catch (error) {
      console.error('Alternative endpoints failed:', error);
    }

    try {
      // Method 3: Canvas-based capture from video stream (if available)
      if (videoRef.current && videoRef.current.naturalWidth > 0) {
        console.log('Attempting canvas capture from video stream');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = videoRef.current.naturalWidth;
        canvas.height = videoRef.current.naturalHeight;
        
        ctx.drawImage(videoRef.current, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const imageUrl = URL.createObjectURL(blob);
            setCapturedImage(imageUrl);
            setCapturedBlob(blob);
            // setShowCaptureModal(true); // Commented out as this modal doesn't exist
            setIsCapturing(false);
          } else {
            setError('Failed to capture image from video stream. Please try restarting DroidCam.');
            setIsCapturing(false);
          }
        }, 'image/jpeg', 0.9);
        
        return;
      }
    } catch (error) {
      console.error('Canvas capture failed:', error);
    }

    // Method 4: Show manual capture instructions
    setError(`Unable to capture image automatically. Manual options:
    
1. Take a screenshot on your phone and upload it manually
2. Restart DroidCam app and try again
3. Check if another app is using your camera
4. Ensure both devices are on the same WiFi network
5. Try using a different camera app like IP Webcam

If the problem persists, the camera stream may not be compatible with automatic capture.`);
    
    setIsCapturing(false);
  };

  const captureViaServer = async (streamUrl, retryCount = 0) => {
    const maxRetries = 3;
    const baseTimeout = 30000; // 30 seconds base timeout
    const timeoutMultiplier = retryCount + 1; // Increase timeout with retries
    const currentTimeout = baseTimeout * timeoutMultiplier;
    
    try {
      console.log(`Attempting server capture with URL: ${streamUrl} (Retry ${retryCount}/${maxRetries}, Timeout: ${currentTimeout}ms)`);
      
      // Validate stream URL before sending
      if (!streamUrl || streamUrl.trim() === '') {
        throw new Error('No stream URL available');
      }

      // Force close any existing connections before capture
      if (retryCount === 0) {
        try {
          await fetch('http://localhost:5000/api/force-disconnect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ streamUrl: streamUrl.trim() })
          });
          console.log('Forced disconnect of existing connections');
          // Wait a moment for cleanup
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (disconnectError) {
          console.log('Force disconnect failed (may not be implemented):', disconnectError.message);
        }
      }
      
      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Capture timeout after ${currentTimeout}ms, aborting...`);
        controller.abort();
      }, currentTimeout);
      
      // Send the stream URL to backend for capture
      const response = await fetch('http://localhost:5000/api/capture-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamUrl: streamUrl.trim(),
          timestamp: Date.now(),
          forceCapture: retryCount > 0 // Flag to indicate retry attempt
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        console.log('Server capture successful');
        setError(''); // Clear any previous errors
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }));
        console.error('Server capture failed:', errorData);
        
        // Handle specific DroidCam errors
        if (errorData.error && errorData.error.includes('DroidCam is busy')) {
          throw new Error('DroidCam is busy with another client. Please close other browser tabs or apps using the camera, then try again.');
        } else if (errorData.error && errorData.error.includes('Read timed out')) {
          throw new Error('Connection to DroidCam timed out. Please check that DroidCam is running and your phone is connected to WiFi.');
        } else if (errorData.error && (errorData.error.includes('Connection refused') || errorData.error.includes('refused'))) {
          throw new Error('Connection refused. Please verify the IP address and port, and ensure DroidCam is running.');
        } else {
          throw new Error(`Server capture failed: ${errorData.error || response.statusText}`);
        }
      }
    } catch (error) {
      console.error('Server capture failed:', error);
      
      // Handle different types of errors with retry logic
      if (error.name === 'AbortError') {
        console.log(`Capture aborted (timeout: ${currentTimeout}ms)`);
        
        // Retry logic for AbortError
        if (retryCount < maxRetries) {
          console.log(`Retrying capture... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1))); // Progressive delay
          return captureViaServer(streamUrl, retryCount + 1);
        } else {
          setError(`Capture failed after ${maxRetries} attempts. This may be due to:\n• DroidCam app is not running or not responding\n• Network connectivity issues\n• DroidCam is connected to another client\n• Camera is being used by another application\n\nTry: Restart DroidCam app, check network connection, or close other camera applications.`);
        }
      } else if (error.message.includes('Failed to fetch') || error.message.includes('Connection refused')) {
        // Handle connection refused errors with retry
        if (retryCount < maxRetries) {
          console.log(`Connection failed, retrying... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 3000 * (retryCount + 1))); // Progressive delay
          return captureViaServer(streamUrl, retryCount + 1);
        } else {
          setError(`Connection failed after ${maxRetries} attempts. Please check:\n• DroidCam app is running on your phone\n• Phone and computer are on the same network\n• IP address ${streamUrl.split('//')[1]?.split(':')[0]} is correct\n• No firewall is blocking the connection`);
        }
      } else if (error.message.includes('DroidCam is busy')) {
        // Handle DroidCam busy errors with retry
        if (retryCount < maxRetries) {
          console.log(`DroidCam busy, waiting and retrying... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 5000 * (retryCount + 1))); // Longer delay for busy state
          return captureViaServer(streamUrl, retryCount + 1);
        } else {
          setError(`DroidCam remains busy after ${maxRetries} attempts.\nPlease:\n• Close all browser tabs accessing DroidCam\n• Close other applications using the camera\n• Restart the DroidCam app on your phone\n• Wait a few seconds and try again`);
        }
      } else {
        // For other errors, retry once
        if (retryCount === 0) {
          console.log(`Capture failed with error: ${error.message}, retrying once...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return captureViaServer(streamUrl, retryCount + 1);
        } else {
          setError(`Unable to capture image: ${error.message}`);
        }
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const analyzeImage = async () => {
    if (!capturedImage) return;

    setIsAnalyzing(true);
    setError('');

    try {
      let blob;
      
      // Use stored blob if available (from canvas capture), otherwise fetch from URL
      if (capturedBlob) {
        blob = capturedBlob;
      } else {
        // Convert captured image to blob for upload (for server-captured images)
        const response = await fetch(capturedImage);
        blob = await response.blob();
      }
      
      const formData = new FormData();
      formData.append('file', blob, 'mobile_capture.jpg');

      const analysisResponse = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!analysisResponse.ok) {
        throw new Error('Analysis failed');
      }

      const result = await analysisResponse.json();
      setAnalysisResult(result);
    } catch (error) {
      console.error('Analysis error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to analyze image. Please try again.';
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to the analysis server. Please check if the backend is running.';
      } else if (error.message.includes('Analysis failed')) {
        errorMessage = 'Image analysis failed. Please ensure the image is clear and try again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Network error occurred. Please check your connection and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const disconnectCamera = async () => {
    // Force disconnect from DroidCam to clear busy state
    if (streamUrl && streamUrl.includes('4747')) {
      try {
        setError('Disconnecting from DroidCam...');
        const response = await fetch('http://localhost:5000/api/force-disconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            streamUrl: streamUrl
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Force disconnect result:', result);
        } else {
          console.warn('Force disconnect failed, but continuing with normal disconnect');
        }
      } catch (error) {
        console.warn('Force disconnect error:', error);
        // Continue with normal disconnect even if force disconnect fails
      }
    }

    setIsConnected(false);
    setStreamUrl('');
    setCapturedImage(null);
    setAnalysisResult(null);
    setError('');
    if (videoRef.current) {
      videoRef.current.src = '';
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    setAnalysisResult(null);
    setError('');
  };

  return (
    <div className="mobile-camera">
      <div className="mobile-camera-header">
        <h1>Mobile Camera Scanner</h1>
        <p>Use your phone as a wireless camera for food compliance scanning</p>
      </div>

      {!isConnected ? (
        <div className="connection-setup">
          {/* App Selection */}
          <div className="app-selection">
            <h2>Choose Your Camera App</h2>
            <div className="app-grid">
              {cameraApps.map((app, index) => (
                <div
                  key={index}
                  className={`app-card ${selectedApp.name === app.name ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedApp(app);
                    setPort(app.defaultPort);
                  }}
                >
                  <h3>{app.name}</h3>
                  <p>{app.description}</p>
                  <span className="default-port">Port: {app.defaultPort}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="setup-instructions">
            <h3>Setup Instructions for {selectedApp.name}</h3>
            <ol>
              {selectedApp.instructions.map((instruction, index) => (
                <li key={index}>{instruction}</li>
              ))}
            </ol>
          </div>

          {/* Connection Form */}
          <div className="connection-form">
            <h3>Connect to Camera</h3>
            {!selectedApp.isUSB && (
              <>
                <div className="form-group">
                  <label htmlFor="ip">Phone IP Address</label>
                  <input
                    type="text"
                    id="ip"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="e.g., 192.168.1.100"
                  />
                  <small className="input-help">
                    Your computer is on network 192.168.1.x. Enter your phone's IP address (check WiFi settings on your phone).
                  </small>
                </div>
                <div className="form-group">
                  <label htmlFor="port">Port</label>
                  <input
                    type="text"
                    id="port"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder={selectedApp.defaultPort}
                  />
                </div>
              </>
            )}
            {selectedApp.isUSB && (
              <div className="usb-connection-info">
                <p><strong>USB Connection Mode</strong></p>
                <p>Make sure DroidCam PC client is running and your phone is connected via USB with USB debugging enabled.</p>
              </div>
            )}
            {error && <div className="error-message">{error}</div>}
            <button onClick={connectToCamera} className="connect-btn">
              {selectedApp.isUSB ? 'Connect USB' : 'Connect to Camera'}
            </button>
          </div>

          {/* Help Section */}
          <div className="help-section">
            <h3>Need Help?</h3>
            <div className="help-tips">
              <div className="tip">
                <strong>Find your phone's IP:</strong>
                <p>Open DroidCam app on your phone - the IP address is shown at the top (e.g., 192.168.1.xxx)</p>
              </div>
              <div className="tip">
                <strong>DroidCam "Busy" Error Fix:</strong>
                <p><strong>Step 1:</strong> Close DroidCam app completely on your phone</p>
                <p><strong>Step 2:</strong> Wait 5 seconds, then reopen DroidCam app</p>
                <p><strong>Step 3:</strong> Make sure no other apps are using the camera</p>
                <p><strong>Step 4:</strong> Try connecting again</p>
                <p><strong>If still busy:</strong> Restart your phone and try again</p>
              </div>
              <div className="tip">
                <strong>Connection issues?</strong>
                <p>Ensure both devices are on the same WiFi network and test by opening http://[phone-ip]:4747 in browser</p>
              </div>
              <div className="tip">
                <strong>Firewall blocking?</strong>
                <p>Windows may block the connection - allow DroidCam through Windows Firewall</p>
              </div>
            </div>
            <div className="troubleshooting-link">
              <p><strong>Still having issues?</strong> Check the <a href="/DROIDCAM_TROUBLESHOOTING.md" target="_blank">detailed troubleshooting guide</a></p>
            </div>
          </div>
        </div>
      ) : (
        <div className="camera-interface">
          <div className="camera-controls">
            <button onClick={disconnectCamera} className="disconnect-btn">
              Disconnect Camera
            </button>
            <div className="connection-status">
              <span className="status-indicator connected"></span>
              Connected to {ipAddress}:{port}
            </div>
          </div>

          {!capturedImage ? (
            <div className="camera-view">
              <div className="video-container">
                {streamUrl && (
                  <img
                    ref={videoRef}
                    src={streamUrl}
                    alt="Camera Feed"
                    className="camera-feed"
                    style={{ 
                      maxWidth: '100%', 
                      height: 'auto',
                      display: 'block',
                      border: '2px solid #4CAF50',
                      borderRadius: '8px'
                    }}
                    onError={(e) => {
                      console.error('Camera feed error:', e);
                      // Only handle errors if we're not capturing or temporarily disconnected
                      if (!isTemporarilyDisconnected && !isCapturing) {
                        setError('Camera feed not available. Please check your IP address and ensure DroidCam is running.');
                        setIsConnected(false);
                        setStreamUrl('');
                      }
                    }}
                    onLoad={() => {
                      console.log('Camera feed loaded successfully');
                      setError('');
                      setIsConnected(true);
                    }}
                    crossOrigin="anonymous"
                  />
                )}
                {!streamUrl && (
                  <div className="no-feed">
                    <p>No camera feed available</p>
                  </div>
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
              <div className="capture-controls">
                <button
                  onClick={captureImage}
                  disabled={isCapturing}
                  className="capture-btn"
                >
                  {isCapturing ? 'Capturing...' : 'Capture Image'}
                </button>
              </div>
            </div>
          ) : (
            <div className="captured-image-view">
              <div className="image-container">
                <img src={capturedImage} alt="Captured" className="captured-image" />
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
                <div className="result-card">
                  <h4>Commodity</h4>
                  <div className="commodity">{analysisResult.commodity_name || 'N/A'}</div>
                </div>
              </div>

              {/* Extracted Fields Section */}
              <div className="scan-section">
                <h4>Extracted Fields</h4>
                <div className="fields-grid">
                  {analysisResult.ocr_fields?.fields ? (
                    Object.entries(analysisResult.ocr_fields.fields).map(([key, value]) => (
                      <div className="field-item" key={key}>
                        <label>{key.replace(/_/g, ' ').toUpperCase()}</label>
                        <p>{value || 'N/A'}</p>
                      </div>
                    ))
                  ) : (
                    <p>No extracted fields available</p>
                  )}
                </div>
              </div>

              {/* OCR Text Section */}
              <div className="scan-section">
                <h4>OCR Text</h4>
                <div className="ocr-text">
                  <p><strong>Confidence:</strong> {analysisResult.ocr_fields?.confidence ? `${(analysisResult.ocr_fields.confidence * 100).toFixed(1)}%` : 'N/A'}</p>
                  <div className="raw-text">
                    <h5>Raw OCR Text:</h5>
                    <pre>{analysisResult.ocr_fields?.text || 'No text extracted'}</pre>
                  </div>
                </div>
              </div>
              
              {/* Violations Section */}
              <div className="scan-section">
                <h4>Violations</h4>
                {analysisResult.violations && analysisResult.violations.length > 0 ? (
                  <ul className="violations-list">
                    {analysisResult.violations.map((violation, index) => {
                      // Handle both string and object violation formats
                      let violationData;
                      if (typeof violation === 'string') {
                        // Parse string violations from backend
                        violationData = {
                          field: 'General',
                          message: violation,
                          severity: 'medium'
                        };
                      } else {
                        // Handle object violations
                        violationData = {
                          field: violation?.field || violation?.type || 'General',
                          message: violation?.message || violation?.description || violation,
                          severity: violation?.severity || 'medium'
                        };
                      }

                      return (
                        <li key={index} className={`violation ${violationData.severity?.toLowerCase()}`}>
                          <strong>{violationData.field}:</strong> {violationData.message}
                          {violationData.severity && <span className="severity-badge">{violationData.severity}</span>}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p>No violations found. This product is fully compliant.</p>
                )}
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}
        </div>
      )}
    </div>
  );
};

export default MobileCamera;