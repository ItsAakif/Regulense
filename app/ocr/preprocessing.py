import cv2
import numpy as np
from PIL import Image
import os
import math

class ImagePreprocessor:
    def __init__(self):
        self.target_width = 800
        self.target_height = 600
    
    def preprocess_image(self, image_path, output_path=None):
        """
        Apply preprocessing pipeline to an image to improve OCR accuracy
        Pipeline includes: noise reduction, contrast enhancement, and skew correction
        """
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise FileNotFoundError(f"Could not load image: {image_path}")
            
            # Apply preprocessing steps
            processed_image = self.resize_image(image)
            processed_image = self._reduce_noise(processed_image)
            processed_image = self._enhance_contrast(processed_image)
            processed_image = self._correct_skew(processed_image)
            processed_image = self.sharpen_image(processed_image)
            
            # Save processed image if output path is provided
            if output_path:
                cv2.imwrite(output_path, processed_image)
                return output_path
            
            # If no output path, save as temporary file
            temp_path = image_path.replace('.', '_processed.')
            cv2.imwrite(temp_path, processed_image)
            return temp_path
            
        except Exception as e:
            print(f"Error preprocessing image: {e}")
            return image_path  # Return original if preprocessing fails
    
    def resize_image(self, image, target_width=None):
        """
        Resize image while maintaining aspect ratio
        """
        if target_width is None:
            target_width = self.target_width
            
        height, width = image.shape[:2]
        
        # Calculate new dimensions
        if width > target_width:
            ratio = target_width / width
            new_width = target_width
            new_height = int(height * ratio)
            
            # Resize image
            resized = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_AREA)
            return resized
        
        return image
    
    def _reduce_noise(self, image):
        """
        Remove noise from image using morphological operations
        """
        # Convert to grayscale for noise removal
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply bilateral filter to reduce noise while preserving edges
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # Apply morphological operations to remove small noise
        kernel = np.ones((2, 2), np.uint8)
        denoised = cv2.morphologyEx(denoised, cv2.MORPH_CLOSE, kernel)
        denoised = cv2.morphologyEx(denoised, cv2.MORPH_OPEN, kernel)
        
        # Convert back to BGR
        denoised_bgr = cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)
        
        return denoised_bgr
    
    def _enhance_contrast(self, image):
        """
        Enhance image contrast for better text recognition
        """
        # Convert to LAB color space
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        
        # Merge channels and convert back to BGR
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        return enhanced
    
    def _correct_skew(self, image):
        """
        Correct image skew/rotation using Hough line detection
        """
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Apply edge detection
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            
            # Detect lines using Hough transform
            lines = cv2.HoughLines(edges, 1, np.pi/180, threshold=100)
            
            if lines is not None and len(lines) > 0:
                # Calculate average angle
                angles = []
                for line in lines[:10]:  # Use first 10 lines
                    # Handle both single array and nested array formats
                    if isinstance(line, np.ndarray) and len(line) >= 2:
                        if len(line.shape) == 1:
                            # Direct format: [rho, theta]
                            rho, theta = line[0], line[1]
                        else:
                            # Nested format: [[rho, theta]]
                            rho, theta = line[0][0], line[0][1]
                    else:
                        continue
                        
                    angle = theta * 180 / np.pi
                    if angle < 45:
                        angles.append(angle)
                    elif angle > 135:
                        angles.append(angle - 180)
                
                if angles:
                    avg_angle = np.mean(angles)
                    
                    # Only correct if angle is significant
                    if abs(avg_angle) > 0.5:
                        # Get image center
                        h, w = image.shape[:2]
                        center = (w // 2, h // 2)
                        
                        # Create rotation matrix
                        rotation_matrix = cv2.getRotationMatrix2D(center, avg_angle, 1.0)
                        
                        # Apply rotation
                        corrected = cv2.warpAffine(image, rotation_matrix, (w, h), 
                                                 flags=cv2.INTER_CUBIC, 
                                                 borderMode=cv2.BORDER_REPLICATE)
                        return corrected
            
            return image
            
        except Exception as e:
            print(f"Error correcting skew: {e}")
            return image
    
    def enhance_contrast(self, image):
        """
        Public method for contrast enhancement
        """
        return self._enhance_contrast(image)
    
    def remove_noise(self, image):
        """
        Public method for noise removal
        """
        return self._reduce_noise(image)
    
    def correct_skew(self, image):
        """
        Public method for skew correction
        """
        return self._correct_skew(image)
    
    def sharpen_image(self, image):
        """
        Apply sharpening filter to enhance text clarity
        """
        # Define sharpening kernel
        kernel = np.array([[-1, -1, -1],
                          [-1,  9, -1],
                          [-1, -1, -1]])
        
        # Apply sharpening
        sharpened = cv2.filter2D(image, -1, kernel)
        
        return sharpened
    
    def binarize_image(self, image):
        """
        Convert image to binary (black and white) for better OCR
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding
        binary = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Convert back to BGR for consistency
        binary_bgr = cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)
        
        return binary_bgr

# Example usage
if __name__ == "__main__":
    # This is for testing purposes
    preprocessor = ImagePreprocessor()
    # processed_image_path = preprocessor.preprocess_image("path/to/your/image.jpg", "path/to/output/processed_image.jpg")
    # print(f"Processed image saved to: {processed_image_path}")