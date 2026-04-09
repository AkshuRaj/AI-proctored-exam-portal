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
