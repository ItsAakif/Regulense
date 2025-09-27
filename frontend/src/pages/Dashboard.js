import React, { useState, useEffect } from 'react';
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
  Filler,
} from 'chart.js';
import PiCameraCapture from '../components/PiCameraCapture';
// Mobile camera components removed - replaced with Pi camera

// Register Chart.js components including Filler plugin
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

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_scans: 0,
    compliant_scans: 0,
    violations_by_severity: { critical: 0, major: 0, minor: 0 },
    compliance_rate: 0
  });
  const [chartData, setChartData] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Pi camera integration state
  const [piCameraStatus, setPiCameraStatus] = useState('disconnected'); // 'disconnected', 'connected', 'capturing'

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await fetch('/api/stats');
      if (!statsResponse.ok) {
        throw new Error('Failed to fetch statistics');
      }
      const statsData = await statsResponse.json();
      setStats(statsData);
      setError(null); // Clear any previous errors

      // Fetch chart data (recent scans for trend analysis)
      const scansResponse = await fetch('/api/scans?limit=50');
      if (!scansResponse.ok) {
        throw new Error('Failed to fetch scan data');
      }
      const scansData = await scansResponse.json();
      
      // Process data for chart
      const processedChartData = processChartData(scansData.scans || []);
      setChartData(processedChartData);
      
      // Set recent scans (limit to 5 most recent)
      setRecentScans((scansData.scans || []).slice(0, 5));
      
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
    } finally {
      setLoading(false);
    }
  };

  const handleScanComplete = () => {
    // Refresh dashboard data when a new scan is completed
    fetchDashboardData();
  };

  const processChartData = (scans) => {
    // Group scans by month
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
      <div className="dashboard">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const totalViolations = stats.violations_by_severity ? 
    Object.values(stats.violations_by_severity).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      
      {error && (
        <div className="error-banner">
          <p>{error} - Showing fallback data</p>
        </div>
      )}
      
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Scans</span>
          <div className="stat-value">{stats.total_scans}</div>
        </div>
        
        <div className="stat-card">
          <span className="stat-label">Compliant Products</span>
          <div className="stat-value">{stats.compliant_scans}</div>
        </div>
        
        <div className="stat-card">
          <span className="stat-label">Compliance Rate</span>
          <div className="stat-value">{stats.compliance_rate}%</div>
        </div>
        
        <div className="stat-card">
          <span className="stat-label">Violations</span>
          <div className="stat-value">{totalViolations}</div>
        </div>
      </div>
      
      {chartData && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Compliance Trends</h2>
            <p className="card-subtitle">Performance over the last 6 months</p>
          </div>
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}
      
      {recentScans.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Recent Scans</h2>
            <p className="card-subtitle">Latest processed product images</p>
          </div>
          <div className="recent-scans-grid">
            {recentScans.map(scan => (
              <div key={scan.id} className="scan-item">
                <div className="scan-image">
                  <img 
                    src={`http://localhost:5000/${scan.image_path?.replace(/\\/g, '/')}`} 
                    alt={`Scan ${scan.id}`}
                    onError={(e) => {
                      e.target.src = `http://localhost:5000/uploads/${scan.filename}`;
                    }}
                  />
                </div>
                <div className="scan-info">
                  <h4>{scan.ocr_fields?.fields?.commodity_name || scan.extracted_data?.commodity_name || 'Unknown Product'}</h4>
                  <p className="scan-score">Score: {scan.compliance_score}%</p>
                  <span className={`scan-status ${scan.is_compliant ? 'compliant' : 'non-compliant'}`}>
                    {scan.is_compliant ? 'Compliant' : 'Non-Compliant'}
                  </span>
                  <p className="scan-date">{new Date(scan.upload_time).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">🍓 Raspberry Pi Camera Integration</h2>
        </div>
        <div className="card-content">
          <PiCameraCapture onScanComplete={handleScanComplete} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;