import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import './ScanHistory.css';

const ScanHistory = () => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalScans, setTotalScans] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchScans();
  }, [currentPage, filter, searchTerm]);

  const downloadScanReport = (scanData) => {
    const timestamp = new Date().toLocaleString();
    const scanTime = new Date(scanData.upload_time).toLocaleString();
    
    // Create PDF document
    const pdf = new jsPDF();
    const pageHeight = pdf.internal.pageSize.height;
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    
    // Helper function to check if we need a new page
    const checkPageBreak = (currentY, requiredSpace = 20) => {
      if (currentY + requiredSpace > pageHeight - 30) {
        pdf.addPage();
        return 30; // Reset to top margin
      }
      return currentY;
    };
    
    // Helper function to add text with proper spacing
    const addTextWithSpacing = (text, x, y, options = {}) => {
      const fontSize = options.fontSize || 12;
      const lineHeight = fontSize * 0.6; // Better line height calculation
      const maxLineWidth = options.maxWidth || maxWidth;
      
      pdf.setFontSize(fontSize);
      if (options.bold) pdf.setFont(undefined, 'bold');
      else pdf.setFont(undefined, 'normal');
      
      // Split text to fit within page width
      const splitText = pdf.splitTextToSize(text, maxLineWidth);
      const textHeight = splitText.length * lineHeight;
      
      // Check if we need a page break
      y = checkPageBreak(y, textHeight + 5);
      
      pdf.text(splitText, x, y);
      return y + textHeight + (options.extraSpacing || 5);
    };
    
    let yPosition = 30;
    
    // Set font and title
    yPosition = addTextWithSpacing('REGULENSE COMPLIANCE REPORT', margin, yPosition, {
      fontSize: 20,
      bold: true,
      extraSpacing: 10
    });
    
    // Add separator line
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;
    
    // Report metadata
    yPosition = addTextWithSpacing(`Generated: ${timestamp}`, margin, yPosition, {
      fontSize: 12,
      extraSpacing: 8
    });
    
    yPosition = addTextWithSpacing(`Scan ID: ${scanData.id}`, margin, yPosition, {
      fontSize: 12,
      extraSpacing: 8
    });
    
    yPosition = addTextWithSpacing(`Scan Date: ${scanTime}`, margin, yPosition, {
      fontSize: 12,
      extraSpacing: 15
    });
    
    // Compliance Summary
    yPosition = addTextWithSpacing('COMPLIANCE SUMMARY', margin, yPosition, {
      fontSize: 16,
      bold: true,
      extraSpacing: 12
    });
    
    yPosition = addTextWithSpacing(`Compliance Score: ${scanData.compliance_score}%`, margin, yPosition, {
      fontSize: 12,
      extraSpacing: 8
    });
    
    yPosition = addTextWithSpacing(`Status: ${scanData.is_compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}`, margin, yPosition, {
      fontSize: 12,
      extraSpacing: 8
    });
    
    yPosition = addTextWithSpacing(`Processing Time: ${scanData.processing_time || 'N/A'} seconds`, margin, yPosition, {
      fontSize: 12,
      extraSpacing: 15
    });
    
    // Extracted Fields
    yPosition = addTextWithSpacing('EXTRACTED FIELDS', margin, yPosition, {
      fontSize: 16,
      bold: true,
      extraSpacing: 12
    });
    
    const extractedFields = Object.entries(scanData.ocr_fields?.fields || {});
    
    extractedFields.forEach(([key, value]) => {
      const fieldName = key.replace(/_/g, ' ').toUpperCase();
      let fieldValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : (value || 'N/A');
      
      // Truncate very long values to prevent excessive spacing
      if (fieldValue.length > 200) {
        fieldValue = fieldValue.substring(0, 200) + '...';
      }
      
      yPosition = addTextWithSpacing(`${fieldName}: ${fieldValue}`, margin, yPosition, {
        fontSize: 11,
        extraSpacing: 8,
        maxWidth: maxWidth
      });
    });
    
    yPosition += 10; // Extra space before violations
    
    // Violations
    yPosition = addTextWithSpacing('VIOLATIONS DETECTED', margin, yPosition, {
      fontSize: 16,
      bold: true,
      extraSpacing: 12
    });
    
    if (scanData.violations && scanData.violations.length > 0) {
      scanData.violations.forEach((violation, index) => {
        const violationText = `${index + 1}. ${violation.field || violation.type || 'Unknown'}: ${violation.message || violation.description || 'No description'} (${violation.severity || 'unknown'} severity)`;
        
        yPosition = addTextWithSpacing(violationText, margin, yPosition, {
          fontSize: 11,
          extraSpacing: 10,
          maxWidth: maxWidth
        });
      });
    } else {
      yPosition = addTextWithSpacing('No violations detected - Product is fully compliant', margin, yPosition, {
        fontSize: 12,
        extraSpacing: 10
      });
    }
    
    // Add footer to all pages
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'italic');
      pdf.text('Report generated by Regulense Compliance System', margin, pageHeight - 15);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 30, pageHeight - 15);
    }
    
    // Save the PDF
    pdf.save(`regulense_report_${scanData.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = async () => {
    try {
      // Fetch all scans for export (without pagination)
      const response = await fetch('http://localhost:5000/api/scans/export');
      
      if (!response.ok) {
        throw new Error('Failed to fetch scan data for export');
      }
      
      const allScans = await response.json();
      
      // Create CSV content (Excel-compatible)
      const headers = [
        'Scan ID',
        'Product Name',
        'Upload Date',
        'Compliance Score (%)',
        'Status',
        'Violations Count',
        'Processing Time (s)',
        'Manufacturer',
        'Net Quantity',
        'MRP',
        'Date of Manufacture',
        'Consumer Care',
        'Country of Origin',
        'Violations Details'
      ];
      
      const csvContent = [
        headers.join(','),
        ...allScans.map(scan => [
          scan.id,
          `"${scan.ocr_fields?.fields?.commodity_name || 'Unknown Product'}"`,
          new Date(scan.upload_time).toLocaleDateString(),
          scan.compliance_score.toFixed(1),
          scan.is_compliant ? 'COMPLIANT' : 'NON-COMPLIANT',
          scan.violations?.length || 0,
          scan.processing_time || 'N/A',
          `"${scan.ocr_fields?.fields?.manufacturer || 'N/A'}"`,
          `"${scan.ocr_fields?.fields?.net_quantity || 'N/A'}"`,
          `"${scan.ocr_fields?.fields?.mrp || 'N/A'}"`,
          `"${scan.ocr_fields?.fields?.date_of_manufacture || 'N/A'}"`,
          `"${scan.ocr_fields?.fields?.consumer_care || 'N/A'}"`,
          `"${scan.ocr_fields?.fields?.country_of_origin || 'N/A'}"`,
          `"${scan.violations?.map(v => `${v.field}: ${v.message} (${v.severity})`).join('; ') || 'None'}"`
        ].join(','))
      ].join('\n');
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `regulense_scan_data_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const fetchScans = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage
      });
      
      if (filter !== 'all') {
        params.append('status', filter);
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      const response = await fetch(`http://localhost:5000/api/scans?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch scan history');
      }
      
      const data = await response.json();
      
      setScans(data.scans || []);
      setTotalPages(data.total_pages || 1);
      setTotalScans(data.total || 0);
      setError(null);
      
    } catch (err) {
      console.error('Error fetching scans:', err);
      setError(err.message);
      
      // Fallback to mock data if API fails
      const mockScans = [
        {
          id: 1,
          filename: 'product_label_001.jpg',
          upload_time: '2024-01-15T10:30:00Z',
          compliance_score: 85.5,
          status: 'compliant',
          violations: []
        },
        {
          id: 2,
          filename: 'nutrition_facts_002.jpg',
          upload_time: '2024-01-15T11:45:00Z',
          compliance_score: 65.2,
          status: 'non-compliant',
          violations: [
            { type: 'missing_allergen_info', severity: 'major' },
            { type: 'incorrect_serving_size', severity: 'minor' }
          ]
        },
        {
          id: 3,
          filename: 'ingredient_list_003.jpg',
          upload_time: '2024-01-15T14:20:00Z',
          compliance_score: 92.8,
          status: 'compliant',
          violations: []
        },
        {
          id: 4,
          filename: 'product_claims_004.jpg',
          upload_time: '2024-01-15T16:10:00Z',
          compliance_score: 45.3,
          status: 'non-compliant',
          violations: [
            { type: 'unsubstantiated_health_claim', severity: 'critical' },
            { type: 'misleading_nutrition_info', severity: 'major' }
          ]
        }
      ];
      
      setScans(mockScans);
      setTotalPages(1);
      setTotalScans(mockScans.length);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status, score) => {
    const isCompliant = status === 'compliant' || score >= 80;
    return (
      <span className={`status-badge ${isCompliant ? 'compliant' : 'non-compliant'}`}>
        {isCompliant ? 'Compliant' : 'Non-Compliant'}
      </span>
    );
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'orange';
    return 'red';
  };

  const renderViolations = (violations) => {
    if (!violations || violations.length === 0) {
      return <span className="no-violations">None</span>;
    }

    return (
      <div className="violations-list">
        {violations.slice(0, 2).map((violation, index) => {
          // Handle both string and object violation formats
          let violationData;
          if (typeof violation === 'string') {
            // Parse string violations from backend
            violationData = {
              type: 'General',
              severity: 'medium'
            };
          } else {
            // Handle object violations
            violationData = {
              type: violation?.type || 'General',
              severity: violation?.severity || 'medium'
            };
          }

          return (
            <span key={index} className={`violation-tag ${violationData.severity}`}>
              {violationData.type.replace(/_/g, ' ')}
            </span>
          );
        })}
        {violations.length > 2 && (
          <span className="more-violations">+{violations.length - 2} more</span>
        )}
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          className={`page-btn ${i === currentPage ? 'active' : ''}`}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="pagination">
        <button
          className="page-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        {pages}
        <button
          className="page-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="scan-history">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading scan history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-history">
      <div className="page-header">
        <h2 className="page-title">Scan History</h2>
        <div className="header-actions">
          <button 
            className="export-btn excel-btn"
            onClick={exportToExcel}
            title="Export all scan data to Excel"
          >
            📊 Export to Excel
          </button>
        </div>
      </div>
      
      {error && (
        <div className="error-banner">
          <p>⚠️ {error} - Showing fallback data</p>
        </div>
      )}
      
      <div className="controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by filename..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All ({totalScans})
          </button>
          <button
            className={`filter-btn ${filter === 'compliant' ? 'active' : ''}`}
            onClick={() => handleFilterChange('compliant')}
          >
            Compliant
          </button>
          <button
            className={`filter-btn ${filter === 'non-compliant' ? 'active' : ''}`}
            onClick={() => handleFilterChange('non-compliant')}
          >
            Non-Compliant
          </button>
        </div>
      </div>
      
      {scans.length === 0 ? (
        <div className="no-data">
          <p>No scans found matching your criteria.</p>
        </div>
      ) : (
        <>
          <div className="scans-table">
            <div className="table-header">
              <div className="col-product">Product</div>
              <div className="col-date">Upload Date</div>
              <div className="col-score">Score</div>
              <div className="col-status">Status</div>
              <div className="col-violations">Violations</div>
              <div className="col-actions">Actions</div>
            </div>
            
            {scans.map((scan) => (
              <div key={scan.id} className="table-row">
                <div className="col-product">
                  <span className="product-name">
                    {scan.ocr_fields?.fields?.commodity_name || 'Unknown Product'}
                  </span>
                </div>
                <div className="col-date">
                  {formatDate(scan.upload_time)}
                </div>
                <div className="col-score">
                  <span 
                    className="score" 
                    style={{ color: getScoreColor(scan.compliance_score) }}
                  >
                    {scan.compliance_score.toFixed(1)}%
                  </span>
                </div>
                <div className="col-status">
                  {getStatusBadge(scan.status, scan.compliance_score)}
                </div>
                <div className="col-violations">
                  {renderViolations(scan.violations)}
                </div>
                <div className="col-actions">
                  <button 
                    className="action-btn view-btn"
                    onClick={() => window.location.href = `/scan/${scan.id}`}
                  >
                    View Details
                  </button>
                  <button 
                    className="action-btn download-btn"
                    onClick={() => downloadScanReport(scan)}
                    title="Download Report"
                  >
                    📄
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default ScanHistory;