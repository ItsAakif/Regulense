import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <nav className="sidebar">
      <ul className="sidebar-menu">
        <li>
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}
          >
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/scans" 
            className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}
          >
            Scan Results
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/statistics" 
            className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}
          >
            Statistics
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/export" 
            className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}
          >
            Export Data
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Sidebar;