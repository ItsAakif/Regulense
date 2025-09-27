import { setScans, setStats, setCurrentScan, setLoading, setError } from './index';

// Async action creators (thunks)

export const fetchScans = () => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      // In a real implementation, this would fetch from the backend API
      // const response = await fetch('/api/scans');
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockData = [
        {
          id: 1,
          timestamp: '2023-05-15T10:30:00Z',
          commodity_name: 'Sample Product A',
          compliance_score: 85.5,
          is_compliant: true
        },
        {
          id: 2,
          timestamp: '2023-05-15T09:15:00Z',
          commodity_name: 'Sample Product B',
          compliance_score: 65.0,
          is_compliant: false
        },
        {
          id: 3,
          timestamp: '2023-05-14T14:45:00Z',
          commodity_name: 'Sample Product C',
          compliance_score: 92.0,
          is_compliant: true
        }
      ];
      
      dispatch(setScans(mockData));
    } catch (error) {
      dispatch(setError('Failed to fetch scans'));
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export const fetchStats = () => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
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
        }
      };
      
      dispatch(setStats(mockData));
    } catch (error) {
      dispatch(setError('Failed to fetch statistics'));
    } finally {
      dispatch(setLoading(false));
    }
  };
};

export const fetchScanDetails = (id) => {
  return async (dispatch) => {
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    try {
      // In a real implementation, this would fetch from the backend API
      // const response = await fetch(`/api/scan/${id}`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockData = {
        id: id,
        timestamp: '2023-05-15T10:30:00Z',
        image_path: '/images/scan_123.jpg',
        ocr_fields: {
          commodity_name: 'Sample Product A',
          manufacturer: 'Sample Manufacturer Inc., 123 Business Street, Industrial City, State 12345',
          net_quantity: '500 g',
          manufacture_date: '15/05/2023',
          mrp: '₹100',
          consumer_care: '+91 9876543210',
          country_of_origin: 'India',
          batch_lot: 'LOT12345'
        },
        compliance_score: 85.5,
        violations: [
          {
            rule_id: "minor_format_issue",
            field: "manufacture_date",
            severity: "minor",
            message: "Date format should be DD/MM/YYYY",
            value: "15/05/2023"
          }
        ],
        is_compliant: true,
        validation_details: {
          commodity_name: {
            status: "passed",
            violations: []
          },
          manufacturer: {
            status: "passed",
            violations: []
          },
          net_quantity: {
            status: "passed",
            violations: []
          },
          manufacture_date: {
            status: "passed",
            violations: []
          },
          mrp: {
            status: "passed",
            violations: []
          },
          consumer_care: {
            status: "passed",
            violations: []
          },
          country_of_origin: {
            status: "passed",
            violations: []
          }
        },
        processing_time: 2.35
      };
      
      dispatch(setCurrentScan(mockData));
    } catch (error) {
      dispatch(setError('Failed to fetch scan details'));
    } finally {
      dispatch(setLoading(false));
    }
  };
};

