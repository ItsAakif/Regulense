import React, { useState, useEffect } from 'react';

const Statistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      // In a real implementation, this would fetch from the backend API
      // const response = await fetch('/api/stats');
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockData = {
        total_scans: 127,
        compliant_scans: 89,
        compliance_rate: 70.08,
        average_compliance_score: 78.5,
        violations_by_severity: {
          critical: 12,
          major: 24,
          minor: 36
        },
        common_violations: [
          {
            violation: "Missing consumer care details",
            count: 15,
            percentage: 15.0
          },
          {
            violation: "Invalid date format",
            count: 10,
            percentage: 10.0
          },
          {
            violation: "Missing country of origin",
            count: 8,
            percentage: 8.0
          }
        ],
        compliance_trend: [
          {
            date: "2023-05-01",
            compliance_rate: 70.0,
            total_scans: 20
          },
          {
            date: "2023-05-02",
            compliance_rate: 72.5,
            total_scans: 25
          },
          {
            date: "2023-05-03",
            compliance_rate: 68.0,
            total_scans: 22
          },
          {
            date: "2023-05-04",
            compliance_rate: 75.0,
            total_scans: 30
          },
          {
            date: "2023-05-05",
            compliance_rate: 73.3,
            total_scans: 30
          }
        ]
      };
      
      setStats(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading statistics...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!stats) return <div>No statistics data available</div>;

  return (
    <div className="statistics">
      <h2>Compliance Statistics</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Scans</h3>
          <p className="stat-value">{stats.total_scans}</p>
        </div>
        
        <div className="stat-card">
          <h3>Compliant Products</h3>
          <p className="stat-value">{stats.compliant_scans}</p>
        </div>
        
        <div className="stat-card">
          <h3>Compliance Rate</h3>
          <p className="stat-value">{stats.compliance_rate}%</p>
        </div>
        
        <div className="stat-card">
          <h3>Avg. Compliance Score</h3>
          <p className="stat-value">{stats.average_compliance_score}</p>
        </div>
      </div>
      
      <div className="stats-section">
        <h3>Violations by Severity</h3>
        <div className="violations-chart">
          <div className="chart-container">
            <div className="chart-bar critical" style={{height: `${(stats.violations_by_severity.critical / 50) * 100}%`}}>
              <span>Critical: {stats.violations_by_severity.critical}</span>
            </div>
            <div className="chart-bar major" style={{height: `${(stats.violations_by_severity.major / 50) * 100}%`}}>
              <span>Major: {stats.violations_by_severity.major}</span>
            </div>
            <div className="chart-bar minor" style={{height: `${(stats.violations_by_severity.minor / 50) * 100}%`}}>
              <span>Minor: {stats.violations_by_severity.minor}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="stats-section">
        <h3>Common Violations</h3>
        <table className="violations-table">
          <thead>
            <tr>
              <th>Violation</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {stats.common_violations.map((violation, index) => (
              <tr key={index}>
                <td>{violation.violation}</td>
                <td>{violation.count}</td>
                <td>{violation.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="stats-section">
        <h3>Compliance Trend</h3>
        <div className="trend-chart">
          <div className="chart-container">
            {stats.compliance_trend.map((day, index) => (
              <div key={index} className="trend-bar" style={{height: `${day.compliance_rate}%`}}>
                <span>{day.compliance_rate}%</span>
                <label>{new Date(day.date).toLocaleDateString()}</label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;