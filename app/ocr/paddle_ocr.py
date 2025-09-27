# Real PaddleOCR processor for text extraction from images
import cv2
import numpy as np
import os
from typing import List, Dict, Any, Optional
import logging
from paddleocr import PaddleOCR

logger = logging.getLogger(__name__)

def convert_numpy_types(obj):
    """Convert numpy types to native Python types for JSON serialization."""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj

class PaddleOCRProcessor:
    """Real PaddleOCR processor for text extraction from images."""
    
    def __init__(self, use_angle_cls=True, lang='en', use_gpu=False):
        """Initialize PaddleOCR processor.
        
        Args:
            use_angle_cls: Whether to use angle classification
            lang: Language for OCR
            use_gpu: Whether to use GPU acceleration (ignored in this version)
        """
        try:
            # Note: use_gpu parameter is not supported in this PaddleOCR version
            self.ocr = PaddleOCR(use_angle_cls=use_angle_cls, lang=lang)
            logger.info(f"PaddleOCR processor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OCR processor: {e}")
            raise
    
    def extract_text(self, image_path: str, preprocess: bool = True) -> Dict[str, Any]:
        """Extract text from image using PaddleOCR.
        
        Args:
            image_path: Path to the image file
            preprocess: Whether to apply preprocessing
            
        Returns:
            Dictionary containing extracted text and metadata
        """
        try:
            # Check if image file exists
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image file not found: {image_path}")
            
            # Use PaddleOCR to extract text
            result = self.ocr.ocr(image_path)
            
            if not result or len(result) == 0:
                logger.warning(f"No text detected in image: {image_path}")
                return {
                    'text': '',
                    'confidence': 0.0,
                    'word_count': 0,
                    'lines': [],
                    'words': [],
                    'metadata': {
                        'line_count': 0,
                        'avg_confidence': 0.0,
                        'processing_method': 'paddleocr'
                    }
                }
            
            # Handle new PaddleOCR result format
            all_text = []
            all_words = []
            confidences = []
            
            # Check if result is in new format with rec_texts
            if isinstance(result, list) and len(result) > 0 and isinstance(result[0], dict):
                ocr_result = result[0]
                if 'rec_texts' in ocr_result and 'rec_scores' in ocr_result:
                    # New format with rec_texts and rec_scores
                    texts = ocr_result['rec_texts']
                    scores = ocr_result['rec_scores']
                    polys = ocr_result.get('rec_polys', [])
                    
                    for i, text in enumerate(texts):
                        confidence = scores[i] if i < len(scores) else 1.0
                        all_text.append(text)
                        confidences.append(confidence)
                        
                        # Create word entry with bbox if available
                        bbox = polys[i] if i < len(polys) else []
                        try:
                            if bbox is not None and len(bbox) > 0:
                                # Convert numpy array to list if needed
                                if hasattr(bbox, 'tolist'):
                                    bbox = bbox.tolist()
                                
                                # Calculate position from polygon
                                if len(bbox) >= 4:
                                    x_coords = [point[0] for point in bbox]
                                    y_coords = [point[1] for point in bbox]
                                    position = {
                                        'x': min(x_coords),
                                        'y': min(y_coords),
                                        'width': max(x_coords) - min(x_coords),
                                        'height': max(y_coords) - min(y_coords)
                                    }
                                else:
                                    position = {'x': 0, 'y': 0, 'width': 0, 'height': 0}
                            else:
                                position = {'x': 0, 'y': 0, 'width': 0, 'height': 0}
                        except Exception as e:
                            logger.warning(f"Error processing bbox: {e}")
                            position = {'x': 0, 'y': 0, 'width': 0, 'height': 0}
                        
                        word_entry = {
                            'text': text,
                            'confidence': confidence,
                            'bbox': bbox,
                            'position': position
                        }
                        all_words.append(word_entry)
                else:
                    logger.warning(f"Unexpected result format: {type(ocr_result)}")
                    return {
                        'text': '',
                        'confidence': 0.0,
                        'word_count': 0,
                        'lines': [],
                        'words': [],
                        'metadata': {
                            'line_count': 0,
                            'avg_confidence': 0.0,
                            'processing_method': 'paddleocr'
                        }
                    }
            else:
                # Fallback to old format processing
                if not result[0]:
                    logger.warning(f"No text detected in image: {image_path}")
                    return {
                        'text': '',
                        'confidence': 0.0,
                        'word_count': 0,
                        'lines': [],
                        'words': [],
                        'metadata': {
                            'line_count': 0,
                            'avg_confidence': 0.0,
                            'processing_method': 'paddleocr'
                        }
                    }
                
                for line in result[0]:
                    if line and len(line) >= 2:
                        bbox = line[0]
                        text_info = line[1]
                        
                        # Handle different result formats
                        if isinstance(text_info, tuple) and len(text_info) == 2:
                            text, confidence = text_info
                        elif isinstance(text_info, str):
                            text = text_info
                            confidence = 1.0  # Default confidence if not provided
                        else:
                            continue  # Skip malformed entries
                        
                        all_text.append(text)
                        confidences.append(confidence)
                        
                        # Create word entry with safe bbox processing
                        try:
                            if bbox and len(bbox) > 0:
                                # Convert numpy array to list if needed
                                if hasattr(bbox, 'tolist'):
                                    bbox = bbox.tolist()
                                
                                # Handle different bbox formats
                                if isinstance(bbox[0], (list, tuple)) and len(bbox[0]) >= 2:
                                    # Standard format: [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                                    x_coords = [float(point[0]) for point in bbox if len(point) >= 2]
                                    y_coords = [float(point[1]) for point in bbox if len(point) >= 2]
                                    
                                    if x_coords and y_coords:
                                        position = {
                                            'x': float(min(x_coords)),
                                            'y': float(min(y_coords)),
                                            'width': float(max(x_coords) - min(x_coords)),
                                            'height': float(max(y_coords) - min(y_coords))
                                        }
                                    else:
                                        position = {'x': 0.0, 'y': 0.0, 'width': 0.0, 'height': 0.0}
                                else:
                                    # Fallback for unexpected format
                                    position = {'x': 0.0, 'y': 0.0, 'width': 0.0, 'height': 0.0}
                            else:
                                position = {'x': 0.0, 'y': 0.0, 'width': 0.0, 'height': 0.0}
                        except Exception as e:
                            logger.warning(f"Error processing bbox: {e}")
                            position = {'x': 0.0, 'y': 0.0, 'width': 0.0, 'height': 0.0}
                        
                        word_entry = {
                            'text': text,
                            'confidence': float(confidence),
                            'bbox': bbox,
                            'position': position
                        }
                        all_words.append(word_entry)
            
            # Combine all text
            full_text = ' '.join(all_text)
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            extracted_data = {
                'text': full_text,
                'confidence': avg_confidence,
                'word_count': len(all_text),
                'lines': all_text,
                'words': all_words,
                'metadata': {
                    'line_count': len(all_text),
                    'avg_confidence': avg_confidence,
                    'processing_method': 'paddleocr'
                }
            }
            
            logger.info(f"OCR extraction completed for {image_path}: {len(all_text)} lines, avg confidence: {avg_confidence:.2f}")
            
            # Convert numpy types to native Python types for JSON serialization
            extracted_data = convert_numpy_types(extracted_data)
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"OCR extraction failed for {image_path}: {e}")
            raise
    
    def batch_extract(self, image_paths: List[str], preprocess: bool = True) -> List[Dict[str, Any]]:
        """Extract text from multiple images.
        
        Args:
            image_paths: List of image file paths
            preprocess: Whether to apply preprocessing
            
        Returns:
            List of extraction results
        """
        results = []
        for image_path in image_paths:
            try:
                result = self.extract_text(image_path, preprocess)
                results.append(result)
            except Exception as e:
                logger.error(f"Failed to process {image_path}: {e}")
                results.append({
                    'text': '',
                    'confidence': 0.0,
                    'word_count': 0,
                    'lines': [],
                    'words': [],
                    'error': str(e)
                })
        
        return results

# Example usage
if __name__ == "__main__":
    # This is for testing purposes
    processor = PaddleOCRProcessor()
    # fields = processor.extract_fields("path/to/your/image.jpg")
    # print(fields)