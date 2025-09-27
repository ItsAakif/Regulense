import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PiCameraCapture from '../components/PiCameraCapture';
import './PiCamera.css';

const PiCamera = () => {
  const [recentScans, setRecentScans] = useState([]);
  const [stats, setStats] = useState({
    total_pi_scans: 0,
    successful_captures: 0,
    failed_captures: 0,
    last_capture_time: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPiCameraData();
  }, []);

  const fetchPiCameraData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch recent scans from Pi camera
      const scansResponse = await fetch('http://localhost:5000/api/scans');
      if (scansResponse.ok) {
        const scansData = await scansResponse.json();
        // Filter for Pi camera scans (you might want to add a source field to distinguish)
        setRecentScans(scansData.slice(0, 6)); // Show last 6 scans
      }

      // Fetch Pi camera statistics
      const statsResponse = await fetch('http://localhost:5000/api/pi-camera/status');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(prevStats => ({
          ...prevStats,
          ...statsData
        }));
      }

    } catch (err) {
      console.error('Error fetching Pi camera data:', err);
      setError('Failed to load Pi camera data');
      // Set fallback data
      setStats({
        total_pi_scans: 0,
        successful_captures: 0,
        failed_captures: 0,
        last_capture_time: null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScanComplete = (scanData) => {
    // Update recent scans when a new scan is completed
    setRecentScans(prev => [scanData, ...prev.slice(0, 5)]);
    setStats(prev => ({
      ...prev,
      total_pi_scans: prev.total_pi_scans + 1,
      successful_captures: prev.successful_captures + 1,
      last_capture_time: new Date().toISOString()
    }));
  };

  if (loading) {
    return (
      <div className="pi-camera-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading Pi Camera interface...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pi-camera-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="page-title">🍓 Raspberry Pi Camera</h1>
            <p className="page-subtitle">
              Capture and analyze product images directly from your Raspberry Pi camera
            </p>
          </div>
          <div className="header-actions">
            <button className="refresh-btn" onClick={fetchPiCameraData} disabled={loading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <Link to="/pi-setup" className="setup-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
              </svg>
              Setup Guide
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{error}</p>
        </div>
      )}

      {/* Statistics Overview */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Total Pi Scans</h3>
              <p className="stat-number">{stats.total_pi_scans}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon success">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Successful Captures</h3>
              <p className="stat-number">{stats.successful_captures}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon error">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Failed Captures</h3>
              <p className="stat-number">{stats.failed_captures}</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon time">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </div>
            <div className="stat-content">
              <h3>Last Capture</h3>
              <p className="stat-text">
                {stats.last_capture_time 
                  ? new Date(stats.last_capture_time).toLocaleString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Camera Interface */}
      <div className="camera-section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Camera Interface</h2>
            <p className="card-subtitle">Connect to your Raspberry Pi and capture images</p>
          </div>
          <div className="card-content">
            <PiCameraCapture onScanComplete={handleScanComplete} />
          </div>
        </div>
      </div>

      {/* Recent Captures */}
      {recentScans.length > 0 && (
        <div className="recent-captures-section">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Recent Pi Camera Captures</h2>
              <p className="card-subtitle">Latest images captured from your Raspberry Pi</p>
            </div>
            <div className="captures-grid">
              {recentScans.map(scan => (
                <div key={scan.id} className="capture-item">
                  <div className="capture-image">
                    <img 
                      src={`http://localhost:5000/${scan.image_path?.replace(/\\/g, '/')}`} 
                      alt={`Pi Capture ${scan.id}`}
                      onError={(e) => {
                        e.target.src = `http://localhost:5000/uploads/${scan.filename}`;
                      }}
                    />
                    <div className="capture-overlay">
                      <Link to={`/scan/${scan.id}`} className="view-details-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                        View Details
                      </Link>
                    </div>
                  </div>
                  <div className="capture-info">
                    <h4>{scan.ocr_fields?.fields?.commodity_name || scan.extracted_data?.commodity_name || 'Unknown Product'}</h4>
                    <div className="capture-meta">
                      <span className={`capture-score ${scan.compliance_score >= 90 ? 'good' : scan.compliance_score >= 70 ? 'warning' : 'poor'}`}>
                        {scan.compliance_score}%
                      </span>
                      <span className={`capture-status ${scan.is_compliant ? 'compliant' : 'non-compliant'}`}>
                        {scan.is_compliant ? 'Compliant' : 'Non-Compliant'}
                      </span>
                    </div>
                    <p className="capture-date">
                      {new Date(scan.upload_time).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Quick Actions</h2>
            <p className="card-subtitle">Common Pi camera tasks and resources</p>
          </div>
          <div className="quick-actions-grid">
            <Link to="/pi-setup" className="action-card">
              <div className="action-icon setup">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                </svg>
              </div>
              <div className="action-content">
                <h3>Setup Guide</h3>
                <p>Complete Raspberry Pi camera setup instructions</p>
              </div>
            </Link>

            <Link to="/dashboard" className="action-card">
              <div className="action-icon dashboard">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
              </div>
              <div className="action-content">
                <h3>Dashboard</h3>
                <p>View overall system statistics and trends</p>
              </div>
            </Link>

            <Link to="/scans" className="action-card">
              <div className="action-icon history">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
              </div>
              <div className="action-content">
                <h3>Scan History</h3>
                <p>Browse all captured and processed images</p>
              </div>
            </Link>

            <Link to="/mobile-camera" className="action-card">
              <div className="action-icon mobile">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </div>
              <div className="action-content">
                <h3>Mobile Camera</h3>
                <p>Use your phone as an IP camera alternative</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PiCamera;