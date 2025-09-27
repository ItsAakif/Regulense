import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './UnifiedDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const UnifiedDashboard = () => {
  const [stats, setStats] = useState({});
  const [chartData, setChartData] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch statistics
      const statsResponse = await fetch('/api/stats');
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch statistics');
      }
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch all scans for history and chart data
      const scansResponse = await fetch('/api/scans');
      if (!scansResponse.ok) {
        throw new Error('Failed to fetch scan data');
      }
      const scansData = await scansResponse.json();
      setScans(scansData.scans || []);
      
      // Process data for chart
      const processedChartData = processChartData(scansData.scans || []);
      setChartData(processedChartData);
      
      setError(null);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
      
      // Fallback to mock data
      setStats({
        total_scans: 156,
        compliant_scans: 142,
        violations_by_severity: { critical: 2, major: 7, minor: 5 },
        compliance_rate: 91.0
      });
      
      setChartData({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Compliance Rate (%)',
            data: [85, 88, 92, 89, 94, 91],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true
          },
          {
            label: 'Violations',
            data: [12, 8, 5, 7, 4, 6],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            fill: true
          }
        ]
      });

      // Mock scan data
      setScans([
        {
          id: 1,
          upload_time: new Date().toISOString(),
          extracted_data: { commodity_name: 'Strawberry Jam' },
          compliance_score: 95,
          is_compliant: true
        },
        {
          id: 2,
          upload_time: new Date(Date.now() - 86400000).toISOString(),
          extracted_data: { commodity_name: 'Organic Honey' },
          compliance_score: 78,
          is_compliant: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (scans) => {
    const monthlyData = {};
    const now = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      monthlyData[monthKey] = { total: 0, compliant: 0, violations: 0 };
    }
    
    // Process scans
    scans.forEach(scan => {
      const scanDate = new Date(scan.upload_time);
      const monthKey = scanDate.toLocaleDateString('en-US', { month: 'short' });
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].total++;
        if (scan.compliance_score >= 80) {
          monthlyData[monthKey].compliant++;
        } else {
          monthlyData[monthKey].violations++;
        }
      }
    });
    
    const labels = Object.keys(monthlyData);
    const complianceRates = labels.map(month => {
      const data = monthlyData[month];
      return data.total > 0 ? Math.round((data.compliant / data.total) * 100) : 0;
    });
    const violationCounts = labels.map(month => monthlyData[month].violations);
    
    return {
      labels,
      datasets: [
        {
          label: 'Compliance Rate (%)',
          data: complianceRates,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true
        },
        {
          label: 'Violations',
          data: violationCounts,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          fill: true
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'Inter, system-ui, sans-serif'
          }
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        border: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, system-ui, sans-serif'
          },
          color: '#6b7280'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f3f4f6',
          drawBorder: false
        },
        border: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            family: 'Inter, system-ui, sans-serif'
          },
          color: '#6b7280'
        }
      }
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6
      },
      line: {
        tension: 0.3
      }
    }
  };

  if (loading) {
    return (
      <div className="unified-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const totalViolations = stats.violations_by_severity ? 
    Object.values(stats.violations_by_severity).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <div className="unified-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard & History</h1>
          <p className="dashboard-subtitle">Complete overview of your compliance monitoring</p>
        </div>
        <button className="refresh-btn" onClick={fetchDashboardData} disabled={loading}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M3 21v-5h5"/>
          </svg>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="error-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p>{error} - Showing fallback data</p>
        </div>
      )}
      
      {/* Statistics Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/>
              <path d="M19 7h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Scans</h3>
            <p className="stat-number">{stats.total_scans}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon compliant">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22,4 12,14.01 9,11.01"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Compliant Products</h3>
            <p className="stat-number">{stats.compliant_scans}</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon rate">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polygon points="10,8 16,12 10,16 10,8"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Compliance Rate</h3>
            <p className="stat-number">{stats.compliance_rate}%</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon violations">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Violations</h3>
            <p className="stat-number">{totalViolations}</p>
          </div>
        </div>
      </div>

      {/* Violations Breakdown */}
      {stats.violations_by_severity && (
        <div className="violations-section">
          <div className="card">
            <div className="card-header">
              <h2>Violations Breakdown</h2>
              <p>Current violations by severity level</p>
            </div>
            <div className="violations-grid">
              <div className="violation-item critical">
                <div className="violation-label">Critical</div>
                <div className="violation-count">{stats.violations_by_severity.critical || 0}</div>
              </div>
              <div className="violation-item major">
                <div className="violation-label">Major</div>
                <div className="violation-count">{stats.violations_by_severity.major || 0}</div>
              </div>
              <div className="violation-item minor">
                <div className="violation-label">Minor</div>
                <div className="violation-count">{stats.violations_by_severity.minor || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Trends Chart */}
      {chartData && (
        <div className="chart-section">
          <div className="card">
            <div className="card-header">
              <h2>Compliance Trends</h2>
              <p>Performance over the last 6 months</p>
            </div>
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
      )}

      {/* Scan History */}
      <div className="history-section">
        <div className="card">
          <div className="card-header">
            <h2>Scan History</h2>
            <p>Complete list of all processed scans</p>
          </div>
          {scans.length > 0 ? (
            <div className="table-container">
              <table className="scans-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Date & Time</th>
                    <th>Product Name</th>
                    <th>Compliance Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map(scan => (
                    <tr key={scan.id}>
                      <td>#{scan.id}</td>
                      <td>{new Date(scan.upload_time).toLocaleString()}</td>
                      <td>{scan.ocr_fields?.fields?.commodity_name || scan.extracted_data?.commodity_name || 'Unknown Product'}</td>
                      <td>
                        <span className={`score ${scan.compliance_score >= 90 ? 'good' : scan.compliance_score >= 70 ? 'warning' : 'poor'}`}>
                          {scan.compliance_score}%
                        </span>
                      </td>
                      <td>
                        <span className={`status ${scan.is_compliant ? 'compliant' : 'non-compliant'}`}>
                          {scan.is_compliant ? 'Compliant' : 'Non-Compliant'}
                        </span>
                      </td>
                      <td>
                        <Link to={`/scan/${scan.id}`} className="view-btn">
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-scans">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z"/>
                <path d="M19 7h-4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
              </svg>
              <p>No scans available yet</p>
              <p>Start by capturing your first product image using our camera options</p>
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/pi-camera" style={{ 
                  padding: '8px 16px', 
                  background: 'linear-gradient(135deg, #667eea, #764ba2)', 
                  color: 'white', 
                  textDecoration: 'none', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  🍓 Pi Camera
                </Link>
                <Link to="/mobile-camera" style={{ 
                  padding: '8px 16px', 
                  background: 'linear-gradient(135deg, #ff9a9e, #fecfef)', 
                  color: 'white', 
                  textDecoration: 'none', 
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  📱 Mobile Camera
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedDashboard;