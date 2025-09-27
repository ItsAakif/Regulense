import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  const handleMobileCamera = () => {
    navigate('/mobile-camera');
  };

  const handleRaspberryPi = () => {
    navigate('/raspberry-pi');
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="hero-section">
          <h1 className="hero-title">Regulense</h1>
          <p className="hero-subtitle">
            AI-powered regulatory compliance scanning for consumer products
          </p>
        </div>

        <div className="capture-options">
          <div className="option-card mobile-option" onClick={handleMobileCamera}>
            <div className="option-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 2H7C5.9 2 5 2.9 5 4V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V4C19 2.9 18.1 2 17 2ZM17 18H7V6H17V18Z" fill="currentColor"/>
                <circle cx="12" cy="15" r="2" fill="currentColor"/>
              </svg>
            </div>
            <h2 className="option-title">Use Mobile Camera</h2>
            <p className="option-description">
              Connect your smartphone camera for quick and easy product scanning
            </p>
            <div className="option-features">
              <span className="feature-tag">Quick Setup</span>
              <span className="feature-tag">Wireless</span>
              <span className="feature-tag">Portable</span>
            </div>
          </div>

          <div className="option-card pi-option" onClick={handleRaspberryPi}>
            <div className="option-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="6" width="20" height="12" rx="2" fill="currentColor"/>
                <circle cx="6" cy="12" r="2" fill="white"/>
                <circle cx="18" cy="12" r="2" fill="white"/>
                <rect x="10" y="9" width="4" height="6" rx="1" fill="white"/>
              </svg>
            </div>
            <h2 className="option-title">Use Raspberry Pi</h2>
            <p className="option-description">
              Professional-grade scanning with dedicated Raspberry Pi camera module
            </p>
            <div className="option-features">
              <span className="feature-tag">High Quality</span>
              <span className="feature-tag">Dedicated</span>
              <span className="feature-tag">Professional</span>
            </div>
          </div>
        </div>

        <div className="info-section">
          <div className="info-card">
            <h3>How it works</h3>
            <ol>
              <li>Choose your preferred camera option</li>
              <li>Capture clear images of product labels</li>
              <li>Get instant AI-powered compliance analysis</li>
              <li>Review detailed reports and recommendations</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;