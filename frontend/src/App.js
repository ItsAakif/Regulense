import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import UnifiedDashboard from './pages/UnifiedDashboard';
import ScanList from './pages/ScanList';
import ScanDetails from './pages/ScanDetails';
import Upload from './pages/Upload';
import Export from './pages/Export';
import MobileCamera from './pages/MobileCamera';
import BrowserCameraPage from './pages/BrowserCamera';
import PiCamera from './pages/PiCamera';
import PiSetup from './pages/PiSetup';
import USBCamera from './components/USBCamera';
import './App.css';

function Navigation() {
  const location = useLocation();
  
  // Only show navigation if not on home page
  if (location.pathname === '/') {
    return null;
  }
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/scans', label: 'History' },
    { path: '/upload', label: 'Upload' },
    { path: '/export', label: 'Export' },
    { 
      label: 'Camera', 
      submenu: [
        { path: '/browser-camera', label: 'Browser Camera' },
        { path: '/mobile-camera', label: 'Mobile Camera (DroidCam)' },
        { path: '/usb-camera', label: 'USB Camera' },
        { path: '/pi-camera', label: 'Pi Camera' },
        { path: '/pi-setup', label: 'Pi Setup' }
      ]
    }
  ];
  
  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo-link">
          <h1>Regulense</h1>
        </Link>
        <nav>
          <ul className="nav-tabs">
            {navItems.map((item, index) => (
              <li key={item.path || index}>
                {item.submenu ? (
                  <div className="nav-dropdown">
                    <span className="nav-tab dropdown-toggle">
                      {item.label}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6,9 12,15 18,9"/>
                      </svg>
                    </span>
                    <div className="dropdown-menu">
                      {item.submenu.map((subItem) => (
                        <Link 
                          key={subItem.path}
                          to={subItem.path} 
                          className="dropdown-item"
                        >
                          {subItem.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link 
                    to={item.path} 
                    className={`nav-tab ${location.pathname === item.path ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <div className="app-container">
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<UnifiedDashboard />} />
            <Route path="/scans" element={<ScanList />} />
            <Route path="/scan/:id" element={<ScanDetails />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/export" element={<Export />} />
            <Route path="/browser-camera" element={<BrowserCameraPage />} />
            <Route path="/mobile-camera" element={<MobileCamera />} />
            <Route path="/usb-camera" element={<USBCamera />} />
            <Route path="/pi-camera" element={<PiCamera />} />
            <Route path="/pi-setup" element={<PiSetup />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;