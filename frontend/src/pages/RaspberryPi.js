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
import './RaspberryPi.css';

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

const RaspberryPi = () => {
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
  const [piCameraStatus, setPiCameraStatus] = useState('disconnected');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await fetch('http://localhost:5000/api/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent scans
      const scansResponse = await fetch('http://localhost:5000/api/scans?limit=5');
      if (scansResponse.ok) {
        const scansData = await scansResponse.json();
        setRecentScans(scansData.scans || []);
      }

      // Create chart data
      const chartConfig = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Compliance Rate',
            data: [65, 72, 68, 75, 78, 82],
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      };
      setChartData(chartConfig);
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Compliance Trend Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="raspberry-pi-container">
      <div className="raspberry-pi-content">
        <div className="header-section">
          <h1>Raspberry Pi Camera</h1>
          <p>Professional-grade product scanning with dedicated hardware</p>
        </div>

        {/* Camera Capture Section */}
        <div className="capture-section">
          <div className="capture-card">
            <h2>Camera Control</h2>
            <PiCameraCapture 
              onStatusChange={setPiCameraStatus}
              onScanComplete={fetchDashboardData}
            />
          </div>
        </div>

        {/* Dashboard & Statistics Combined */}
        <div className="dashboard-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <h3>Total Scans</h3>
                <p className="stat-number">{stats.total_scans}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon compliant">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <h3>Compliant</h3>
                <p className="stat-number">{stats.compliant_scans}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon rate">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <h3>Compliance Rate</h3>
                <p className="stat-number">{stats.compliance_rate.toFixed(1)}%</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon violations">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="stat-content">
                <h3>Total Violations</h3>
                <p className="stat-number">
                  {stats.violations_by_severity.critical + 
                   stats.violations_by_severity.major + 
                   stats.violations_by_severity.minor}
                </p>
              </div>
            </div>
          </div>

          {/* Violations Breakdown */}
          <div className="violations-section">
            <div className="violations-card">
              <h3>Violations by Severity</h3>
              <div className="violations-grid">
                <div className="violation-item critical">
                  <span className="violation-label">Critical</span>
                  <span className="violation-count">{stats.violations_by_severity.critical}</span>
                </div>
                <div className="violation-item major">
                  <span className="violation-label">Major</span>
                  <span className="violation-count">{stats.violations_by_severity.major}</span>
                </div>
                <div className="violation-item minor">
                  <span className="violation-label">Minor</span>
                  <span className="violation-count">{stats.violations_by_severity.minor}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          {chartData && (
            <div className="chart-section">
              <div className="chart-card">
                <div className="chart-container">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* Recent Scans & History */}
          <div className="history-section">
            <div className="history-card">
              <h3>Recent Scan Results</h3>
              {recentScans.length > 0 ? (
                <div className="scans-table-container">
                  <table className="scans-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Date & Time</th>
                        <th>Product</th>
                        <th>Compliance Score</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentScans.map((scan) => (
                        <tr key={scan.id}>
                          <td>#{scan.id}</td>
                          <td>{new Date(scan.timestamp).toLocaleString()}</td>
                          <td>{scan.product_name || 'Unknown Product'}</td>
                          <td>
                            <span className={`score ${scan.compliance_score >= 80 ? 'good' : scan.compliance_score >= 60 ? 'warning' : 'poor'}`}>
                              {scan.compliance_score}%
                            </span>
                          </td>
                          <td>
                            <span className={`status ${scan.status}`}>
                              {scan.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-scans">
                  <p>No recent scans available. Start scanning to see results here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaspberryPi;