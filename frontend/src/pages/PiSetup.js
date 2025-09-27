import React from 'react';

const PiSetup = () => {
  return (
    <div className="pi-setup-guide" style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div className="header" style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '10px' }}>🍓 Raspberry Pi Camera Setup Guide</h1>
        <p style={{ color: '#7f8c8d', fontSize: '18px' }}>
          Complete guide to configure your Raspberry Pi for Regulense document scanning
        </p>
      </div>

      {/* OS Recommendations */}
      <div className="section" style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#e74c3c', borderBottom: '2px solid #e74c3c', paddingBottom: '10px' }}>
          📋 Recommended Operating Systems
        </h2>
        
        <div className="os-options" style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
          <div className="os-card" style={{
            border: '2px solid #27ae60',
            borderRadius: '8px',
            padding: '15px',
            background: '#d5f4e6'
          }}>
            <h3 style={{ color: '#27ae60', margin: '0 0 10px 0' }}>✅ Raspberry Pi OS Lite (64-bit) - RECOMMENDED</h3>
            <p><strong>Why:</strong> Lightweight, optimized for Pi hardware, excellent camera support</p>
            <p><strong>Best for:</strong> Dedicated camera device, headless operation</p>
            <p><strong>Download:</strong> <a href="https://www.raspberrypi.org/software/operating-systems/" target="_blank" rel="noopener noreferrer">Official Pi Foundation</a></p>
          </div>
          
          <div className="os-card" style={{
            border: '2px solid #3498db',
            borderRadius: '8px',
            padding: '15px',
            background: '#ebf3fd'
          }}>
            <h3 style={{ color: '#3498db', margin: '0 0 10px 0' }}>🖥️ Raspberry Pi OS Desktop (64-bit)</h3>
            <p><strong>Why:</strong> Full desktop environment, easier for beginners</p>
            <p><strong>Best for:</strong> Development, testing, users who want GUI</p>
            <p><strong>Note:</strong> Uses more resources but provides visual interface</p>
          </div>
          
          <div className="os-card" style={{
            border: '2px solid #f39c12',
            borderRadius: '8px',
            padding: '15px',
            background: '#fef9e7'
          }}>
            <h3 style={{ color: '#f39c12', margin: '0 0 10px 0' }}>⚠️ Ubuntu Server 22.04 LTS</h3>
            <p><strong>Why:</strong> Long-term support, familiar for Ubuntu users</p>
            <p><strong>Best for:</strong> Advanced users, server environments</p>
            <p><strong>Note:</strong> Requires manual camera configuration</p>
          </div>
        </div>
      </div>

      {/* Hardware Requirements */}
      <div className="section" style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#9b59b6', borderBottom: '2px solid #9b59b6', paddingBottom: '10px' }}>
          🔧 Hardware Requirements
        </h2>
        
        <div className="hardware-list" style={{ marginTop: '20px' }}>
          <div className="requirement" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '10px', 
            margin: '10px 0',
            background: '#f8f9fa',
            borderRadius: '5px'
          }}>
            <span style={{ fontSize: '24px', marginRight: '15px' }}>🍓</span>
            <div>
              <strong>Raspberry Pi 3B+ or newer</strong>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>Pi 4 recommended for better performance</p>
            </div>
          </div>
          
          <div className="requirement" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '10px', 
            margin: '10px 0',
            background: '#f8f9fa',
            borderRadius: '5px'
          }}>
            <span style={{ fontSize: '24px', marginRight: '15px' }}>📷</span>
            <div>
              <strong>Pi Camera Module v2 or HQ Camera</strong>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>8MP or higher resolution recommended</p>
            </div>
          </div>
          
          <div className="requirement" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '10px', 
            margin: '10px 0',
            background: '#f8f9fa',
            borderRadius: '5px'
          }}>
            <span style={{ fontSize: '24px', marginRight: '15px' }}>💾</span>
            <div>
              <strong>16GB+ MicroSD Card (Class 10)</strong>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>32GB recommended for image storage</p>
            </div>
          </div>
          
          <div className="requirement" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '10px', 
            margin: '10px 0',
            background: '#f8f9fa',
            borderRadius: '5px'
          }}>
            <span style={{ fontSize: '24px', marginRight: '15px' }}>🌐</span>
            <div>
              <strong>WiFi or Ethernet Connection</strong>
              <p style={{ margin: '5px 0 0 0', color: '#6c757d' }}>For communication with main application</p>
            </div>
          </div>
        </div>
      </div>

      {/* Installation Steps */}
      <div className="section" style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#e67e22', borderBottom: '2px solid #e67e22', paddingBottom: '10px' }}>
          ⚙️ Installation Steps
        </h2>
        
        <div className="steps" style={{ marginTop: '20px' }}>
          <div className="step" style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                background: '#3498db', 
                color: 'white', 
                borderRadius: '50%', 
                width: '30px', 
                height: '30px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: '10px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>1</span>
              Flash Raspberry Pi OS
            </h3>
            <div style={{ marginLeft: '40px', color: '#555' }}>
              <p>1. Download <strong>Raspberry Pi Imager</strong> from official website</p>
              <p>2. Flash <strong>Raspberry Pi OS Lite (64-bit)</strong> to your SD card</p>
              <p>3. Enable SSH and configure WiFi during imaging process</p>
              <div style={{ 
                background: '#e8f4f8', 
                padding: '10px', 
                borderRadius: '5px', 
                marginTop: '10px',
                borderLeft: '4px solid #3498db'
              }}>
                <strong>💡 Tip:</strong> Use the gear icon in Pi Imager to pre-configure SSH, WiFi, and user credentials
              </div>
            </div>
          </div>

          <div className="step" style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                background: '#3498db', 
                color: 'white', 
                borderRadius: '50%', 
                width: '30px', 
                height: '30px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: '10px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>2</span>
              Connect Camera Module
            </h3>
            <div style={{ marginLeft: '40px', color: '#555' }}>
              <p>1. Power off your Raspberry Pi</p>
              <p>2. Connect camera ribbon cable to CSI port (blue side facing Ethernet port)</p>
              <p>3. Secure the connection and power on the Pi</p>
            </div>
          </div>

          <div className="step" style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                background: '#3498db', 
                color: 'white', 
                borderRadius: '50%', 
                width: '30px', 
                height: '30px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: '10px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>3</span>
              SSH into Your Pi
            </h3>
            <div style={{ marginLeft: '40px', color: '#555' }}>
              <div style={{ 
                background: '#2c3e50', 
                color: '#ecf0f1', 
                padding: '10px', 
                borderRadius: '5px', 
                fontFamily: 'monospace',
                marginTop: '10px'
              }}>
                ssh pi@[YOUR_PI_IP_ADDRESS]
              </div>
              <p style={{ marginTop: '10px' }}>Find your Pi's IP address from your router's admin panel or use: <code>ping raspberrypi.local</code></p>
            </div>
          </div>

          <div className="step" style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                background: '#3498db', 
                color: 'white', 
                borderRadius: '50%', 
                width: '30px', 
                height: '30px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: '10px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>4</span>
              Install Required Software
            </h3>
            <div style={{ marginLeft: '40px', color: '#555' }}>
              <div style={{ 
                background: '#2c3e50', 
                color: '#ecf0f1', 
                padding: '15px', 
                borderRadius: '5px', 
                fontFamily: 'monospace',
                marginTop: '10px',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                # Update system<br/>
                sudo apt update && sudo apt upgrade -y<br/><br/>
                
                # Install Python and camera libraries<br/>
                sudo apt install python3-pip python3-venv -y<br/>
                sudo apt install python3-picamera2 -y<br/><br/>
                
                # Install additional dependencies<br/>
                pip3 install requests flask opencv-python-headless<br/><br/>
                
                # Enable camera interface<br/>
                sudo raspi-config nonint do_camera 0
              </div>
            </div>
          </div>

          <div className="step" style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#2c3e50', display: 'flex', alignItems: 'center' }}>
              <span style={{ 
                background: '#3498db', 
                color: 'white', 
                borderRadius: '50%', 
                width: '30px', 
                height: '30px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: '10px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>5</span>
              Download Pi Camera Script
            </h3>
            <div style={{ marginLeft: '40px', color: '#555' }}>
              <p>The Pi camera script will be automatically generated when you complete this setup.</p>
              <div style={{ 
                background: '#e8f5e8', 
                padding: '10px', 
                borderRadius: '5px', 
                marginTop: '10px',
                borderLeft: '4px solid #27ae60'
              }}>
                <strong>📝 Next:</strong> Complete the backend setup to get your Pi camera script
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Network Configuration */}
      <div className="section" style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#8e44ad', borderBottom: '2px solid #8e44ad', paddingBottom: '10px' }}>
          🌐 Network Configuration
        </h2>
        
        <div style={{ marginTop: '20px' }}>
          <div style={{ 
            background: '#fff3cd', 
            padding: '15px', 
            borderRadius: '8px', 
            borderLeft: '4px solid #ffc107',
            marginBottom: '15px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>📡 Important Network Setup</h4>
            <p style={{ margin: 0, color: '#856404' }}>
              Your Raspberry Pi must be on the same network as your main application server for communication.
            </p>
          </div>
          
          <div className="network-info">
            <h4>Configuration Details:</h4>
            <ul style={{ color: '#555', lineHeight: '1.6' }}>
              <li><strong>Main App Server:</strong> {window.location.hostname}:{window.location.port || '80'}</li>
              <li><strong>Pi Camera Endpoint:</strong> Will be configured automatically</li>
              <li><strong>Communication:</strong> HTTP REST API</li>
              <li><strong>Port:</strong> 5001 (default for Pi camera service)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="section" style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#c0392b', borderBottom: '2px solid #c0392b', paddingBottom: '10px' }}>
          🔧 Troubleshooting
        </h2>
        
        <div className="troubleshooting" style={{ marginTop: '20px' }}>
          <div className="issue" style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#e74c3c' }}>❌ Camera not detected</h4>
            <ul style={{ color: '#555', marginLeft: '20px' }}>
              <li>Check ribbon cable connection (blue side facing Ethernet port)</li>
              <li>Run: <code>libcamera-hello --list-cameras</code></li>
              <li>Enable camera: <code>sudo raspi-config</code> → Interface Options → Camera</li>
              <li>Reboot after enabling: <code>sudo reboot</code></li>
            </ul>
          </div>
          
          <div className="issue" style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#e74c3c' }}>🌐 Network connection issues</h4>
            <ul style={{ color: '#555', marginLeft: '20px' }}>
              <li>Check WiFi configuration: <code>sudo nano /etc/wpa_supplicant/wpa_supplicant.conf</code></li>
              <li>Test connectivity: <code>ping google.com</code></li>
              <li>Check IP address: <code>hostname -I</code></li>
              <li>Restart networking: <code>sudo systemctl restart networking</code></li>
            </ul>
          </div>
          
          <div className="issue" style={{ marginBottom: '20px' }}>
            <h4 style={{ color: '#e74c3c' }}>🐍 Python/Library issues</h4>
            <ul style={{ color: '#555', marginLeft: '20px' }}>
              <li>Update pip: <code>pip3 install --upgrade pip</code></li>
              <li>Install in virtual environment if needed</li>
              <li>For picamera2 issues: <code>sudo apt install python3-libcamera python3-kms++</code></li>
              <li>Check Python version: <code>python3 --version</code> (should be 3.9+)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer" style={{ 
        textAlign: 'center', 
        padding: '20px', 
        background: '#ecf0f1', 
        borderRadius: '8px',
        marginTop: '30px'
      }}>
        <p style={{ margin: '0 0 10px 0', color: '#7f8c8d' }}>
          Need help? Check the <a href="https://www.raspberrypi.org/documentation/" target="_blank" rel="noopener noreferrer">official Raspberry Pi documentation</a>
        </p>
        <p style={{ margin: 0, color: '#95a5a6', fontSize: '14px' }}>
          🍓 Raspberry Pi Camera Integration for Regulense Document Scanning
        </p>
      </div>
    </div>
  );
};

export default PiSetup;