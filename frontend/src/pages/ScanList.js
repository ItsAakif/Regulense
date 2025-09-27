import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ScanList = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/scans');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setScans(data.scans || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch scan results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading scan results...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="scan-list">
      <h2>Recent Scan Results</h2>
      
      <table className="scans-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Date & Time</th>
            <th>Product</th>
            <th>Compliance Score</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {scans.map(scan => (
            <tr key={scan.id}>
              <td>{scan.id}</td>
              <td>{new Date(scan.upload_time).toLocaleString()}</td>
              <td>{scan.ocr_fields?.fields?.commodity_name || scan.extracted_data?.commodity_name || 'Unknown Product'}</td>
              <td>{scan.compliance_score}%</td>
              <td>
                <span className={scan.is_compliant ? 'status compliant' : 'status non-compliant'}>
                  {scan.is_compliant ? 'Compliant' : 'Non-Compliant'}
                </span>
              </td>
              <td>
                <Link to={`/scan/${scan.id}`} className="btn btn-secondary">
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScanList;