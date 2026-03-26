import cv2
import numpy as np
from typing import Tuple, Optional, Dict

class FaceDetector:
    """
    Detects faces in video frames using OpenCV's Haar Cascade classifier.
    """
    
    def __init__(self):
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        self.confidence_threshold = 0.7
    
    def detect_face(self, frame: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
        """
        Detects a face in the given frame.
        
        Args:
            frame: Input image frame (BGR format from OpenCV)
            
        Returns:
            Tuple of (x, y, width, height) for the detected face, or None if no face found
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(30, 30)
        )
        
        if len(faces) > 0:
            # Return the largest face detected
            return tuple(faces[0])
        return None
    
    def get_face_quality(self, frame: np.ndarray, face_rect: Tuple[int, int, int, int]) -> float:
        """
        Evaluates face quality based on brightness and clarity.
        
        Args:
            frame: Input image frame
            face_rect: Face rectangle (x, y, w, h)
            
        Returns:
            Quality score between 0 and 1
        """
        x, y, w, h = face_rect
        face_region = frame[y:y+h, x:x+w]
        
        # Calculate brightness
        brightness = np.mean(cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)) / 255.0
        
        # Calculate Laplacian variance (blur detection)
        gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var() / 100.0
        
        # Combine scores
        quality = (brightness * 0.4 + min(laplacian_var, 1.0) * 0.6)
        return min(quality, 1.0)
    
    def draw_face(self, frame: np.ndarray, face_rect: Optional[Tuple[int, int, int, int]]) -> np.ndarray:
        """
        Draws face rectangle on the frame.
        """
        if face_rect:
            x, y, w, h = face_rect
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        return frame
