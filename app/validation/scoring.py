from app.validation.compliance_validator import ComplianceValidator

class ComplianceScorer:
    def __init__(self):
        self.validator = ComplianceValidator()
        # Scoring weights based on severity
        self.severity_weights = {
            "critical": 15,  # 15% deduction for critical violations
            "major": 5,      # 5% deduction for major violations
            "minor": 2       # 2% deduction for minor violations
        }
    
    def calculate_compliance_score(self, violations):
        """
        Calculate compliance score based on violations
        Maximum score is 100, minimum is 0
        """
        score = 100.0
        
        # Handle both list of violation strings and list of violation objects
        for violation in violations:
            if isinstance(violation, str):
                # Simple string violation - treat as minor
                deduction = self.severity_weights.get("minor", 2)
            elif isinstance(violation, dict):
                # Violation object with severity
                severity = violation.get("severity", "minor")
                deduction = self.severity_weights.get(severity, 2)
            else:
                # Unknown format - treat as minor
                deduction = self.severity_weights.get("minor", 2)
            
            score -= deduction
        
        # Ensure score doesn't go below 0
        score = max(0, score)
        
        return round(score, 2)
    
    def is_compliant(self, score):
        """
        Determine if product is compliant based on score
        Minimum compliance score is 70%
        """
        return score >= 70.0
    
    def generate_compliance_report(self, ocr_fields):
        """
        Generate a complete compliance report including validation details, violations, score, and compliance status
        """
        # Convert OCR fields to text for validation
        text_content = ""
        if isinstance(ocr_fields, dict):
            for key, value in ocr_fields.items():
                if isinstance(value, str):
                    text_content += f"{key}: {value}\n"
                elif isinstance(value, list):
                    text_content += f"{key}: {' '.join(str(v) for v in value)}\n"
        elif isinstance(ocr_fields, str):
            text_content = ocr_fields
        
        # Validate text content
        validation_result = self.validator.validate_text(text_content)
        validation_details = validation_result.get('details', {})
        violations = validation_result.get('violations', [])
        
        # Calculate compliance score
        score = self.calculate_compliance_score(violations)
        
        # Determine compliance status
        is_compliant = self.is_compliant(score)
        
        # Create report
        report = {
            "ocr_fields": ocr_fields,
            "validation_details": validation_details,
            "violations": violations,
            "compliance_score": score,
            "is_compliant": is_compliant
        }
        
        return report

# Example usage
if __name__ == "__main__":
    # This is for testing purposes
    scorer = ComplianceScorer()
    # test_fields = {
    #     "commodity_name": "Test Product",
    #     "manufacturer": "Test Company",
    #     "net_quantity": "500 g",
    #     "manufacture_date": "15/05/2023",
    #     "mrp": "₹100",
    #     "consumer_care": "1234567890",
    #     "country_of_origin": "India"
    # }
    # report = scorer.generate_compliance_report(test_fields)
    # print("Compliance Report:", report)