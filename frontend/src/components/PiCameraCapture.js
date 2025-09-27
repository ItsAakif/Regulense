import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Camera, Wifi, WifiOff, RefreshCw, Settings, CheckCircle, XCircle, AlertTriangle, Maximize, X } from 'lucide-react';

const PiCameraCapture = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [piIP, setPiIP] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastImage, setLastImage] = useState(null);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [processingResults, setProcessingResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [previewError, setPreviewError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check Pi connection status
  const checkConnection = async () => {
    if (!piIP) {
      setError('Please enter Pi IP address');
      return;
    }

    setConnectionStatus('connecting');
    setError('');

    try {
      const response = await fetch(`http://${piIP}:5001/status`, {
        method: 'GET',
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        setConnectionStatus('connected');
        addLog(`Connected to Pi at ${piIP}`, 'success');
        setError('');
        
        // Check streaming status
        checkStreamingStatus();
      } else {
        throw new Error('Pi not responding');
      }
    } catch (err) {
      setConnectionStatus('disconnected');
      setError(`Failed to connect to Pi: ${err.message}`);
      addLog(`Connection failed: ${err.message}`, 'error');
    }
  };

  // Check streaming status
  const checkStreamingStatus = async () => {
    if (!piIP) return;

    try {
      const response = await fetch(`http://${piIP}:5001/stream/status`);
      if (response.ok) {
        const data = await response.json();
        setIsStreaming(data.streaming);
        if (data.streaming && data.stream_url) {
          setStreamUrl(`http://${piIP}:5001${data.stream_url}`);
        } else {
          setStreamUrl(null);
        }
      }
    } catch (err) {
      console.log('Stream status check failed:', err);
    }
  };

  // Start camera preview
  const startPreview = async () => {
    if (!piIP || connectionStatus !== 'connected') {
      setPreviewError('Please connect to Pi first');
      return;
    }

    try {
      setPreviewError('');
      const response = await fetch(`http://${piIP}:5001/stream/start`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setIsStreaming(true);
        setStreamUrl(`http://${piIP}:5001${data.stream_url}`);
        addLog('Camera preview started', 'success');
      } else {
        throw new Error('Failed to start preview');
      }
    } catch (err) {
      setPreviewError(`Failed to start preview: ${err.message}`);
      addLog(`Preview start failed: ${err.message}`, 'error');
    }
  };

  // Stop camera preview
  const stopPreview = async () => {
    if (!piIP) return;

    try {
      const response = await fetch(`http://${piIP}:5001/stream/stop`, {
        method: 'POST'
      });

      if (response.ok) {
        setIsStreaming(false);
        setStreamUrl(null);
        addLog('Camera preview stopped', 'info');
      }
    } catch (err) {
      console.log('Failed to stop preview:', err);
    }
  };

  // Toggle fullscreen preview
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Capture image from Pi camera
  const captureImage = async () => {
    if (connectionStatus !== 'connected') {
      setError('Pi camera not connected');
      return;
    }

    setIsCapturing(true);
    setError('');

    try {
      const response = await fetch(`http://${piIP}:5001/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quality: 85,
          width: 1920,
          height: 1080
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLastImage(data.image_data);
        addLog('Image captured successfully', 'success');
        
        // Send image to main backend for processing
        await processImage(data.image_data);
      } else {
        throw new Error('Failed to capture image');
      }
    } catch (err) {
      setError(`Capture failed: ${err.message}`);
      addLog(`Capture failed: ${err.message}`, 'error');
    } finally {
      setIsCapturing(false);
    }
  };

  // Process captured image through main backend
  const processImage = async (imageData) => {
    setIsProcessing(true);
    setProcessingResults(null);
    addLog('Starting image processing...', 'info');
    
    try {
      const response = await fetch('/api/process-pi-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_data: imageData,
          source: 'pi_camera'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setProcessingResults(result);
        addLog(`Processing complete! Compliance Score: ${result.compliance_score}%, Violations: ${result.violations_count}`, 'success');
        
        // Navigate to scan details if needed
        if (result.scan_id) {
          addLog(`Scan saved with ID: ${result.scan_id}`, 'info');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Processing failed');
      }
    } catch (err) {
      addLog(`Processing failed: ${err.message}`, 'error');
      setError(`Processing failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add log entry
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-9), { timestamp, message, type }]);
  };

  // Auto-connect on IP change
  useEffect(() => {
    if (piIP && piIP.length > 7) {
      const timer = setTimeout(checkConnection, 1000);
      return () => clearTimeout(timer);
    }
  }, [piIP]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    const variants = {
      connected: 'bg-green-100 text-green-800',
      connecting: 'bg-yellow-100 text-yellow-800',
      disconnected: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={variants[connectionStatus]}>
        {getStatusIcon()}
        <span className="ml-1 capitalize">{connectionStatus}</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Fullscreen Preview Modal */}
      {isFullscreen && isStreaming && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <Button
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 z-10"
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={streamUrl}
              alt="Fullscreen Camera Preview"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                console.error('Fullscreen stream error:', e);
                setPreviewError('Failed to load camera stream');
                setIsStreaming(false);
                setIsFullscreen(false);
              }}
            />
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded text-lg">
              Live Preview - Fullscreen
            </div>
          </div>
        </div>
      )}

      {/* Connection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Raspberry Pi Camera Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Pi IP Address</label>
              <input
                type="text"
                value={piIP}
                onChange={(e) => setPiIP(e.target.value)}
                placeholder="192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col items-center gap-2">
              <label className="text-sm font-medium">Status</label>
              {getStatusBadge()}
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={checkConnection}
              disabled={!piIP || connectionStatus === 'connecting'}
              variant="outline"
            >
              <Wifi className="h-4 w-4 mr-2" />
              Test Connection
            </Button>
            
            {connectionStatus === 'connected' && (
              <Button 
                onClick={isStreaming ? stopPreview : startPreview}
                disabled={!piIP}
                variant="outline"
                className={isStreaming ? "bg-red-50 hover:bg-red-100 text-red-700" : "bg-blue-50 hover:bg-blue-100 text-blue-700"}
              >
                <Camera className="h-4 w-4 mr-2" />
                {isStreaming ? 'Stop Preview' : 'Start Preview'}
              </Button>
            )}
            
            <Button 
              onClick={captureImage}
              disabled={connectionStatus !== 'connected' || isCapturing || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              {isCapturing ? 'Capturing...' : isProcessing ? 'Processing...' : 'Capture & Process'}
            </Button>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Camera Preview Card */}
      {connectionStatus === 'connected' && (
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Camera className="h-5 w-5" />
               Live Camera Preview
               {isStreaming && (
                 <Badge className="bg-green-100 text-green-800">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                   Live
                 </Badge>
               )}
               {isStreaming && (
                 <Button
                   onClick={toggleFullscreen}
                   variant="ghost"
                   size="sm"
                   className="ml-auto"
                 >
                   <Maximize className="h-4 w-4" />
                 </Button>
               )}
             </CardTitle>
           </CardHeader>
          <CardContent>
            {isStreaming ? (
              <div className="relative">
                <img
                  src={streamUrl}
                  alt="Live Camera Preview"
                  className="w-full max-w-2xl mx-auto rounded-lg border shadow-sm"
                  onError={(e) => {
                    console.error('Stream error:', e);
                    setPreviewError('Failed to load camera stream');
                    setIsStreaming(false);
                  }}
                  onLoad={() => {
                    setPreviewError(null);
                  }}
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  Live Preview
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Camera className="h-16 w-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">Camera Preview Not Active</p>
                <p className="text-sm">Click "Start Preview" to see live camera feed</p>
              </div>
            )}
            
            {previewError && (
              <Alert className="mt-4 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">{previewError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Results Card */}
      {processingResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className={`h-5 w-5 ${processingResults.compliance_score >= 80 ? 'text-green-600' : processingResults.compliance_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`} />
              Processing Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">Compliance Score</div>
                <div className="text-2xl font-bold text-blue-800">{processingResults.compliance_score}%</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <div className="text-sm text-red-600 font-medium">Violations Found</div>
                <div className="text-2xl font-bold text-red-800">{processingResults.violations_count}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Processing Time: {processingResults.processing_time?.toFixed(2)}s
              </div>
              <div className="text-sm text-gray-600">
                Scan ID: #{processingResults.scan_id}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => window.open(`/scan/${processingResults.scan_id}`, '_blank')}
                className="flex-1"
              >
                View Detailed Results
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setProcessingResults(null)}
              >
                Clear Results
              </Button>
            </div>
            
            {processingResults.compliance_score < 80 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  {processingResults.violations_count > 0 
                    ? `Document has ${processingResults.violations_count} compliance violations. Review the detailed results for more information.`
                    : 'Compliance score is below 80%. Consider reviewing the document quality and scanning conditions.'
                  }
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image Preview Card */}
      {lastImage && (
        <Card>
          <CardHeader>
            <CardTitle>Last Captured Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <img 
                src={`data:image/jpeg;base64,${lastImage}`}
                alt="Captured from Pi Camera"
                className="w-full h-auto max-h-96 object-contain"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">No activity yet</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">{log.timestamp}</span>
                  <span className={`
                    ${log.type === 'success' ? 'text-green-600' : ''}
                    ${log.type === 'error' ? 'text-red-600' : ''}
                    ${log.type === 'info' ? 'text-blue-600' : ''}
                  `}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Guide Link */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600 mb-3">
              Need help setting up your Raspberry Pi camera?
            </p>
            <Button variant="outline" onClick={() => window.open('/pi-setup', '_blank')}>
              <Settings className="h-4 w-4 mr-2" />
              View Setup Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PiCameraCapture;