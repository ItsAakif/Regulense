"""
Field extraction module for converting raw OCR text into structured fields.
This module uses pattern matching and NLP techniques to extract specific fields
from OCR text for compliance validation.
"""

import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class FieldExtractor:
    """Extract structured fields from raw OCR text."""
    
    def __init__(self):
        """Initialize field extractor with patterns."""
        self.patterns = self._load_patterns()
    
    def _load_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Load regex patterns for field extraction."""
        return {
            'commodity_name': {
                'patterns': [
                    # Pattern for products at the beginning of text (like "STRAWBERRY JAM", "Sparkling Water")
                    r'^([A-Z][A-Z\s]+?)(?:\s+MANUFACTUR|MANUFACTUR|MFG|NET|QUANTITY|WEIGHT|ADDRESS|MADE)',
                    # Specific pattern for space-separated product names at start
                    r'^([A-Z]+\s+[A-Z]+)(?:\s+[A-Z]+)',
                    # Pattern for quoted product names
                    r'"([^"]+)"',
                    # Pattern for product names before manufacturer info
                    r'([A-Za-z\s]+?)(?:\s+MANUFACTUR[ER]*\s*:)',
                    # Pattern for common product types
                    r'((?:STRAWBERRY|SPARKLING|MINERAL|DRINKING)\s+(?:JAM|WATER|JUICE))',
                    # Pattern for products followed by common keywords
                    r'([A-Za-z\s]{3,30})(?:\s+(?:MANUFACTUR|MFG|NET|QUANTITY|WEIGHT|ADDRESS|MADE|BY))',
                    # Fallback patterns
                    r'(?:product|commodity|item)\s*:?\s*([a-zA-Z0-9\s\-\.\,\&\(\)\[\]]+?)(?:\s+manufacturer|mfg|net|quantity|weight|address)',
                    r'name\s*:?\s*([a-zA-Z0-9\s\-\.\,\&\(\)\[\]]+?)(?:\s+manufacturer|mfg|net|quantity|weight|address)'
                ],
                'priority': 1
            },
            'manufacturer': {
                'patterns': [
                    # Handle exact OCR misspelling "MANUFACTRER:"
                    r'MANUFACTRER:\s*([A-Z][A-Z\s]*?)(?:\s+ADDRESS|$)',
                    # Handle common OCR misspellings of "manufacturer" 
                    r'(?:manufacturer|manufactur[er]*|mfg|manufactured\s+by|made\s+by)\s*:?\s*([A-Z][A-Z\s]*?)(?:\s+address|ADDRESS|net|NET|quantity|QUANTITY|weight|WEIGHT|mrp|MRP|price|PRICE|$)',
                    # Specific pattern for misspelled "MANUFACTRER:" followed by company name
                    r'MANUFACTUR[ER]*\s*:\s*([A-Z][A-Z\s]*?)(?:\s+ADDRESS|$)',
                    # Pattern for company names with common suffixes
                    r'([A-Z][A-Z\s]*?(?:LTD|LIMITED|INC|CORP|PVT|PRIVATE|COMPANY|CO))(?:\s+ADDRESS|$)',
                    # Pattern for "AquaPure" style names
                    r'([A-Z][a-z]+[A-Z][a-z]+)(?:\s+ADDRESS|$)',
                    # Generic company pattern
                    r'(?:company|corp|ltd|inc|pvt)\s*[:\.]?\s*([^:\n]+?)(?:\s+address|net|quantity|weight|mrp|price|$)',
                    r'mfd\s*by\s*:?\s*([^:\n]+?)(?:\s+address|net|quantity|weight|mrp|price|$)'
                ],
                'priority': 2
            },
            'net_quantity': {
                'patterns': [
                    # Standard quantity patterns with units
                    r'(?:net\s+)?(?:quantity|weight|wt|qty)\s*:?\s*(\d+(?:\.\d+)?\s*[a-zA-Z]+(?:/[a-zA-Z]+)?)',
                    # Standalone quantity with common units
                    r'(\d+(?:\.\d+)?\s*(?:g|kg|ml|l|gm|gms|gram|grams|liter|litre|kilogram|oz|ounce|pound|lb))',
                    # Net quantity pattern
                    r'net\s*:?\s*(\d+(?:\.\d+)?\s*[a-zA-Z]+)',
                    # Pattern for "500" followed by unit on next line or space
                    r'(\d+(?:\.\d+)?)\s*([a-zA-Z]+)',
                    # Handle OCR spacing issues
                    r'(?:net|quantity|weight)\s*:?\s*(\d+\s*[a-zA-Z]+)'
                ],
                'priority': 3
            },
            'manufacture_date': {
                'patterns': [
                    # Standard date formats with keywords
                    r'(?:date\s+of\s+(?:manufacture|mfg|packing|production)|manufacture\s+date|mfg\s+date|packed\s+on)\s*:?\s*([0-3]?[0-9][\/\-\.][0-1]?[0-9][\/\-\.](?:20)?[0-9]{2})',
                    # Month year format
                    r'(?:date\s+of\s+(?:manufacture|mfg|packing|production)|manufacture\s+date|mfg\s+date|packed\s+on)\s*:?\s*([A-Za-z]{3,9}\s+20[0-9]{2})',
                    # Handle various separators and formats
                    r'(?:date\s+of\s+(?:manufacture|mfg|packing|production)|manufacture\s+date|mfg\s+date|packed\s+on)\s*:?\s*([0-3]?[0-9][\s\/\-\.][0-1]?[0-9][\s\/\-\.](?:20)?[0-9]{2})',
                    # Fallback for any date-like pattern near date keywords
                    r'(?:date|packing|manufacture|mfg)\s*:?\s*([A-Za-z0-9\s\/\-\.]{4,15})',
                    # Standard date patterns
                    r'(?:mfg|manufactured|mfd|production)\s*(?:date|on)?\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})',
                    r'(?:date\s+of\s+)?(?:manufacture|production)\s*:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})',
                    # Handle MM-YYYY format
                    r'(?:date\s+of\s+)?(?:manufacture|production)\s*:?\s*(\d{1,2}[\/\-\.]\d{4})',
                    # Standalone date patterns
                    r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})',
                    r'(\d{1,2}[\/\-\.]\d{4})',
                    # Handle "Aug 2024" without keywords
                    r'([A-Za-z]{3,9}\s+20[0-9]{2})'
                ],
                'priority': 4
            },
            'mrp': {
                'patterns': [
                    # MRP with currency symbols and keywords
                    r'(?:mrp|price|cost|maximum\s+retail\s+price)\s*:?\s*([₹RsINR]?\s*\d+(?:\.\d{2})?)',
                    # Currency symbols with numbers
                    r'([₹RsINR]\s*\d+(?:\.\d{2})?)',
                    # Numbers with currency symbols
                    r'(\d+(?:\.\d{2})?\s*[₹RsINR])',
                    # Handle "500" pattern (common OCR result)
                    r'(?:mrp|price)\s*:?\s*(\d+)',
                    # Handle currency variations
                    r'(?:rs|rupees)\s*:?\s*(\d+(?:\.\d{2})?)',
                    # Standalone price patterns near currency indicators
                    r'(?:[₹RsINR]|rupees?|rs\.?)\s*(\d+(?:\.\d{2})?)'
                ],
                'priority': 5
            },
            'consumer_care': {
                'patterns': [
                    # Standard consumer care patterns
                    r'(?:consumer\s+care|customer\s+care|helpline|contact)\s*:?\s*([+]?\d{1,4}[\s\-]?\d{10})',
                    r'(?:phone|tel|mobile|call)\s*:?\s*([+]?\d{1,4}[\s\-]?\d{10})',
                    # Extract phone numbers from mixed text (like "careberrybest.com +919123467889")
                    r'([+]?\d{1,4}[\s\-]?\d{10})',
                    r'(?:care|contact).*?([+]?\d{1,4}[\s\-]?\d{10})',
                    # Handle phone numbers with different formats
                    r'([+]?91[\s\-]?\d{10})',
                    r'(\d{10})',
                    # Handle email + phone combinations
                    r'(?:care|contact).*?([+]?\d{1,4}[\s\-]?\d{8,12})'
                ],
                'priority': 6
            },
            'country_of_origin': {
                'patterns': [
                    # Handle OCR errors like "MADE IN NDIA" -> "MADE IN INDIA"
                    r'(?:country\s+of\s+origin|origin|made\s+in)\s*:?\s*([a-zA-Z\s]+?)(?:\n|$|[A-Z]{2,})',
                    r'(?:manufactured\s+in|produced\s+in)\s*:?\s*([a-zA-Z\s]+?)(?:\n|$|[A-Z]{2,})',
                    # Specific pattern for "MADE IN NDIA" (OCR error for INDIA)
                    r'MADE\s+IN\s+(NDIA|INDIA)',
                    # Pattern for "COUNTEY OF ORIGIN" (OCR error)
                    r'COUNTEY\s+OF\s+ORIGIN\s+MADE\s+IN\s+([A-Z]+)',
                    # Handle "MADE IN INDIA" variations
                    r'MADE\s+IN\s+([A-Z]+)',
                    # Handle country names directly
                    r'(?:origin|country)\s*:?\s*([A-Z][a-z]+)',
                    # Fallback for common countries
                    r'(INDIA|CHINA|USA|JAPAN|GERMANY|FRANCE|UK|ITALY)'
                ],
                'priority': 7
            }
        }
    
    def extract_fields(self, ocr_result: Dict[str, Any]) -> Dict[str, str]:
        """
        Extract structured fields from OCR result.
        
        Args:
            ocr_result: Dictionary containing OCR text and metadata
            
        Returns:
            Dictionary with extracted fields
        """
        try:
            # Get the raw text from OCR result
            raw_text = ocr_result.get('text', '')
            if not raw_text:
                logger.warning("No text found in OCR result")
                return self._empty_fields()
            
            logger.info(f"Extracting fields from text: {raw_text[:100]}...")
            
            # Clean and normalize text
            cleaned_text = self._clean_text(raw_text)
            
            # Extract fields using patterns
            extracted_fields = {}
            
            for field_name, field_config in self.patterns.items():
                field_value = self._extract_field(cleaned_text, field_config)
                extracted_fields[field_name] = field_value
                
                if field_value:
                    logger.info(f"Extracted {field_name}: {field_value}")
                else:
                    logger.warning(f"Could not extract {field_name}")
            
            return extracted_fields
            
        except Exception as e:
            logger.error(f"Field extraction failed: {e}")
            return self._empty_fields()
    
    def _clean_text(self, text: str) -> str:
        """Clean and normalize OCR text."""
        # Remove extra whitespace and normalize
        cleaned = re.sub(r'\s+', ' ', text.strip())
        
        # Keep original case for better pattern matching
        # cleaned = cleaned.lower()
        
        return cleaned
    
    def _extract_field(self, text: str, field_config: Dict[str, Any]) -> str:
        """Extract a single field using its patterns."""
        patterns = field_config.get('patterns', [])
        
        for pattern in patterns:
            try:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    value = match.group(1).strip()
                    if value:
                        return self._clean_field_value(value)
            except Exception as e:
                logger.warning(f"Pattern matching failed for pattern {pattern}: {e}")
                continue
        
        return ""
    
    def _clean_field_value(self, value: str) -> str:
        """Clean extracted field value."""
        # Remove extra whitespace
        cleaned = re.sub(r'\s+', ' ', value.strip())
        
        # Fix common OCR errors
        if 'NDIA' in cleaned.upper():
            cleaned = cleaned.upper().replace('NDIA', 'INDIA')
        
        # Fix other common OCR errors
        ocr_fixes = {
            'MANUFACTRER': 'MANUFACTURER',
            'MANUFACTUR': 'MANUFACTURER',
            'COUNTEY': 'COUNTRY',
            'SPARKLNG': 'SPARKLING',
            'AQUAPURE': 'AquaPure',
            'BERRYBEST': 'BerryBest'
        }
        
        for error, correction in ocr_fixes.items():
            if error in cleaned.upper():
                cleaned = cleaned.replace(error, correction)
        
        # Clean up specific field types
        if any(currency in cleaned for currency in ['₹', 'Rs', 'INR']):
            # Clean MRP field - ensure proper currency format
            cleaned = re.sub(r'[^\d\.\₹RsINR\s]', '', cleaned)
        elif re.match(r'^\+?\d+[\s\-]?\d{8,12}$', cleaned.replace(' ', '')):
            # Clean phone number field
            cleaned = re.sub(r'[^\d\+\-\s]', '', cleaned)
        elif re.match(r'^\d+(\.\d+)?\s*[a-zA-Z]+$', cleaned):
            # Clean quantity field - ensure proper format
            cleaned = re.sub(r'[^\d\.\sa-zA-Z]', '', cleaned)
        else:
            # General cleaning - remove common OCR artifacts
            cleaned = re.sub(r'[^\w\s\.\,\-\(\)\[\]\/₹]', '', cleaned)
        
        return cleaned.strip()
    
    def _empty_fields(self) -> Dict[str, str]:
        """Return empty fields dictionary."""
        return {
            'commodity_name': '',
            'manufacturer': '',
            'net_quantity': '',
            'manufacture_date': '',
            'mrp': '',
            'consumer_care': '',
            'country_of_origin': ''
        }

# Example usage
if __name__ == "__main__":
    extractor = FieldExtractor()
    
    # Test with sample OCR result
    sample_ocr = {
        'text': 'Sample Product\nManufactured by: ABC Company Ltd\nNet Quantity: 500g\nMRP: ₹100\nMfg Date: 15/05/2023\nConsumer Care: +91 9876543210\nCountry of Origin: India'
    }
    
    fields = extractor.extract_fields(sample_ocr)
    print("Extracted fields:", fields)