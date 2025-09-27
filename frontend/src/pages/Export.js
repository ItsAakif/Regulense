import React, { useState } from 'react';

const Export = () => {
  const [exportStatus, setExportStatus] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('Preparing export...');
      
      // Call the backend API to export data
      const response = await fetch('http://localhost:5000/api/export');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'regulense_export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setExportStatus('Export completed successfully! The file has been downloaded.');
    } catch (error) {
      setExportStatus('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="export">
      <h2>Export Data</h2>
      
      <div className="export-section">
        <h3>Export Scan Results</h3>
        <p>Download all scan results as a CSV file for further analysis.</p>
        
        <button 
          className="btn btn-primary export-btn" 
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : 'Export to CSV'}
        </button>
        
        {exportStatus && (
          <div className={`export-status ${exportStatus.includes('failed') ? 'error' : 'success'}`}>
            {exportStatus}
          </div>
        )}
      </div>
      
      <div className="export-info">
        <h4>Export Information</h4>
        <ul>
          <li>The exported file will contain all scan results</li>
          <li>File format: CSV (Comma-Separated Values)</li>
          <li>File size: Depends on the number of scans</li>
          <li>Fields included: ID, Timestamp, Image Path, Compliance Score, etc.</li>
        </ul>
      </div>
    </div>
  );
};

export default Export;