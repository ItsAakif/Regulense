import re
from typing import List, Dict, Any
from datetime import datetime
try:
    import phonenumbers
    from phonenumbers import NumberParseException
    PHONENUMBERS_AVAILABLE = True
except ImportError:
    PHONENUMBERS_AVAILABLE = False

class ComplianceValidator:
    def __init__(self):
        self.rules = {
            'phone_number': self._validate_phone_number,
            'email': self._validate_email,
            'date_format': self._validate_date_format,
            'required_fields': self._validate_required_fields,
            'text_length': self._validate_text_length,
            'personal_data': self._validate_personal_data,
            'financial_data': self._validate_financial_data,
            'medical_data': self._validate_medical_data,
            'address_data': self._validate_address_data
        }
        
        # Define patterns for different types of sensitive data
        self.patterns = {
            'ssn': r'\b\d{3}-?\d{2}-?\d{4}\b',
            'passport': r'\b[A-Z]{1,2}\d{6,9}\b',
            'license_plate': r'\b[A-Z]{1,3}[- ]?\d{1,4}[- ]?[A-Z]{0,3}\b',
            'ip_address': r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',
            'url': r'https?://[^\s]+',
            'medical_id': r'\b(?:MRN|Patient ID)[:\s]*\d+\b',
            'insurance_number': r'\b[A-Z]{2,4}\d{6,12}\b',
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'\b(?:\+?1[-. ]?)?\(?\d{3}\)?[-. ]?\d{3}[-. ]?\d{4}\b',
            'date': r'\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b'
        }
    
    def validate_text(self, extracted_text: str, rule_type: str = 'all') -> Dict[str, Any]:
        """
        Validate extracted text against compliance rules
        """
        results = {
            'is_compliant': True,
            'violations': [],
            'score': 100,
            'details': {},
            'sensitive_data_found': [],
            'risk_level': 'low'
        }
        
        if rule_type == 'all':
            # Run all validation rules
            for rule_name, rule_func in self.rules.items():
                try:
                    rule_result = rule_func(extracted_text)
                    results['details'][rule_name] = rule_result
                    
                    if not rule_result['passed']:
                        results['is_compliant'] = False
                        results['violations'].extend(rule_result['violations'])
                        
                    # Collect sensitive data findings
                    if 'sensitive_data' in rule_result:
                        results['sensitive_data_found'].extend(rule_result['sensitive_data'])
                        
                except Exception as e:
                    results['details'][rule_name] = {
                        'passed': False,
                        'violations': [f"Error running rule {rule_name}: {str(e)}"]
                    }
                    results['is_compliant'] = False
        else:
            # Run specific rule
            if rule_type in self.rules:
                try:
                    rule_result = self.rules[rule_type](extracted_text)
                    results['details'][rule_type] = rule_result
                    
                    if not rule_result['passed']:
                        results['is_compliant'] = False
                        results['violations'].extend(rule_result['violations'])
                        
                except Exception as e:
                    results['details'][rule_type] = {
                        'passed': False,
                        'violations': [f"Error running rule {rule_type}: {str(e)}"]
                    }
                    results['is_compliant'] = False
        
        # Calculate compliance score and risk level
        results['score'] = self._calculate_score(results['details'])
        results['risk_level'] = self._calculate_risk_level(results['sensitive_data_found'], results['score'])
        
        return results
    
    def _validate_phone_number(self, text: str) -> Dict[str, Any]:
        """
        Validate phone number format and detect phone numbers in text
        """
        violations = []
        sensitive_data = []
        
        # Find phone numbers using regex
        phone_matches = re.findall(self.patterns['phone'], text)
        
        for phone in phone_matches:
            sensitive_data.append({
                'type': 'phone_number',
                'value': phone,
                'risk': 'medium'
            })
            
            # Validate format if phonenumbers library is available
            if PHONENUMBERS_AVAILABLE:
                try:
                    parsed = phonenumbers.parse(phone, "US")
                    if not phonenumbers.is_valid_number(parsed):
                        violations.append(f"Invalid phone number format: {phone}")
                except NumberParseException:
                    violations.append(f"Could not parse phone number: {phone}")
        
        return {
            'passed': len(violations) == 0,
            'violations': violations,
            'sensitive_data': sensitive_data,
            'count': len(phone_matches)
        }
    
    def _validate_email(self, text: str) -> Dict[str, Any]:
        """
        Validate email format and detect emails in text
        """
        violations = []
        sensitive_data = []
        
        # Find emails using regex
        email_matches = re.findall(self.patterns['email'], text)
        
        for email in email_matches:
            sensitive_data.append({
                'type': 'email',
                'value': email,
                'risk': 'medium'
            })
            
            # Basic email validation
            if '@' not in email or '.' not in email.split('@')[1]:
                violations.append(f"Invalid email format: {email}")
        
        return {
            'passed': len(violations) == 0,
            'violations': violations,
            'sensitive_data': sensitive_data,
            'count': len(email_matches)
        }
    
    def _validate_date_format(self, text: str) -> Dict[str, Any]:
        """
        Validate date formats in text
        """
        violations = []
        sensitive_data = []
        
        # Find dates using regex
        date_matches = re.findall(self.patterns['date'], text)
        
        for date_str in date_matches:
            sensitive_data.append({
                'type': 'date',
                'value': date_str,
                'risk': 'low'
            })
            
            # Try to parse date
            try:
                # Try different date formats
                for fmt in ['%m/%d/%Y', '%m-%d-%Y', '%d/%m/%Y', '%d-%m-%Y', '%m/%d/%y', '%m-%d-%y']:
                    try:
                        datetime.strptime(date_str, fmt)
                        break
                    except ValueError:
                        continue
                else:
                    violations.append(f"Invalid date format: {date_str}")
            except Exception:
                violations.append(f"Could not parse date: {date_str}")
        
        return {
            'passed': len(violations) == 0,
            'violations': violations,
            'sensitive_data': sensitive_data,
            'count': len(date_matches)
        }
    
    def _validate_required_fields(self, text: str) -> Dict[str, Any]:
        """
        Check for required fields in documents
        """
        violations = []
        required_keywords = ['name', 'date', 'signature', 'address']
        
        text_lower = text.lower()
        missing_fields = []
        
        for field in required_keywords:
            if field not in text_lower:
                missing_fields.append(field)
        
        if missing_fields:
            violations.append(f"Missing required fields: {', '.join(missing_fields)}")
        
        return {
            'passed': len(violations) == 0,
            'violations': violations,
            'missing_fields': missing_fields
        }
    
    def _validate_text_length(self, text: str) -> Dict[str, Any]:
        """
        Validate text length requirements
        """
        violations = []
        
        if len(text) < 10:
            violations.append("Text too short for meaningful analysis")
        elif len(text) > 10000:
            violations.append("Text too long, may contain excessive information")
        
        return {
            'passed': len(violations) == 0,
            'violations': violations,
            'length': len(text)
        }
    
    def _validate_personal_data(self, text: str) -> Dict[str, Any]:
        """
        Detect personal identifiable information (PII)
        """
        violations = []
        sensitive_data = []
        
        # Check for SSN
        ssn_matches = re.findall(self.patterns['ssn'], text)
        for ssn in ssn_matches:
            sensitive_data.append({
                'type': 'ssn',
                'value': ssn,
                'risk': 'high'
            })
            violations.append(f"Social Security Number detected: {ssn[:3]}-XX-XXXX")
        
        # Check for passport numbers
        passport_matches = re.findall(self.patterns['passport'], text)
        for passport in passport_matches:
            sensitive_data.append({
                'type': 'passport',
                'value': passport,
                'risk': 'high'
            })
            violations.append(f"Passport number detected: {passport[:2]}XXXXXX")
        
        return {
            'passed': len(violations) == 0,
            'violations': violations,
            'sensitive_data': sensitive_data
        }
    
    def _validate_financial_data(self, text: str) -> Dict[str, Any]:
        """
        Detect financial information
        """
        violations = []
        sensitive_data = []
        
        return {
            'passed': len(violations) == 0,
            'violations': violations,
            'sensitive_data': sensitive_data
        }
    
    def _validate_medical_data(self, text: str) -> Dict[str, Any]:
        """
        Detect medical information
        """
        violations = []
        sensitive_data = []
        
        # Check for medical record numbers
        medical_matches = re.findall(self.patterns['medical_id'], text)
        for medical in medical_matches:
            sensitive_data.append({
                'type': 'medical_id',
                'value': medical,
                'risk': 'high'
            })
            violations.append(f"Medical ID detected: {medical}")
        
        # Check for insurance numbers
        insurance_matches = re.findall(self.patterns['insurance_number'], text)
        for insurance in insurance_matches:
            sensitive_data.append({
                'type': 'insurance_number',
                'value': insurance,
                'risk': 'medium'
            })
            violations.append(f"Insurance number detected: {insurance[:2]}XXXXXX")
        
        return {
            'passed': len(violations) == 0,
            'violations': violations,
            'sensitive_data': sensitive_data
        }
    
    def _validate_address_data(self, text: str) -> Dict[str, Any]:
        """
        Detect address information
        """
        violations = []
        sensitive_data = []
        
        # Simple address pattern (street number + street name)
        address_pattern = r'\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)\b'
        address_matches = re.findall(address_pattern, text, re.IGNORECASE)
        
        for address in address_matches:
            sensitive_data.append({
                'type': 'address',
                'value': address,
                'risk': 'medium'
            })
            violations.append(f"Address detected: {address}")
        
        return {
            'passed': len(violations) == 0,
            'violations': violations,
            'sensitive_data': sensitive_data
        }
    
    def _calculate_score(self, details: Dict[str, Any]) -> int:
        """
        Calculate compliance score based on validation results
        """
        total_rules = len(details)
        if total_rules == 0:
            return 100
        
        passed_rules = sum(1 for result in details.values() if result.get('passed', False))
        base_score = int((passed_rules / total_rules) * 100)
        
        # Deduct points for high-risk violations
        penalty = 0
        for result in details.values():
            if 'sensitive_data' in result:
                for data in result['sensitive_data']:
                    if data.get('risk') == 'high':
                        penalty += 20
                    elif data.get('risk') == 'medium':
                        penalty += 10
                    elif data.get('risk') == 'low':
                        penalty += 5
        
        final_score = max(0, base_score - penalty)
        return final_score
    
    def _calculate_risk_level(self, sensitive_data: List[Dict], score: int) -> str:
        """
        Calculate overall risk level
        """
        high_risk_count = sum(1 for data in sensitive_data if data.get('risk') == 'high')
        medium_risk_count = sum(1 for data in sensitive_data if data.get('risk') == 'medium')
        
        if high_risk_count > 0 or score < 50:
            return 'high'
        elif medium_risk_count > 2 or score < 75:
            return 'medium'
        else:
            return 'low'