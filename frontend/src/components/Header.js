import React from 'react';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1>Regulens - Compliance Dashboard</h1>
        <div className="header-actions">
          <button className="btn btn-primary">Refresh</button>
        </div>
      </div>
    </header>
  );
};

export default Header;