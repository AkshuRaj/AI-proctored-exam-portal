import cv2
import numpy as np
from typing import Optional, Tuple, Dict

class GazeTracker:
    """
    Tracks eye gaze direction to detect if the candidate is looking away from the screen.
    """
    
    def __init__(self):
        self.eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )
        self.gaze_threshold = 30  # degrees
        self.suspicious_duration = 3  # seconds
    
    def detect_eyes(self, frame: np.ndarray, face_rect: Tuple[int, int, int, int]) -> Optional[Tuple]:
        """
        Detects eyes within the detected face region.
        
        Args:
            frame: Input image frame
            face_rect: Face rectangle (x, y, w, h)
            
        Returns:
            Tuple of eye regions or None
        """
        x, y, w, h = face_rect
        roi = frame[y:y+h, x:x+w]
        gray_roi = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        
        eyes = self.eye_cascade.detectMultiScale(gray_roi)
        
        if len(eyes) >= 2:
            return eyes[:2]  # Return first two eyes
        return None
    
    def estimate_gaze_direction(self, frame: np.ndarray, face_rect: Tuple[int, int, int, int]) -> Dict:
        """
        Estimates gaze direction based on eye position within face.
        
        Args:
            frame: Input image frame
            face_rect: Face rectangle
            
        Returns:
            Dictionary with gaze direction and confidence
        """
        eyes = self.detect_eyes(frame, face_rect)
        
        if eyes is None:
            return {'direction': 'unknown', 'confidence': 0.0, 'is_suspicious': False}
        
        # Extract eye center positions
        x, y, w, h = face_rect
        eye_centers = []
        
        for ex, ey, ew, eh in eyes:
            eye_center_x = x + ex + ew // 2
            eye_center_y = y + ey + eh // 2
            eye_centers.append((eye_center_x, eye_center_y))
        
        # Determine if looking away
        # Simple heuristic: if eyes are at edges of face, gaze is away
        face_center_x = x + w // 2
        face_center_y = y + h // 2
        
        avg_eye_x = np.mean([ec[0] for ec in eye_centers])
        horizontal_deviation = abs(avg_eye_x - face_center_x) / (w / 2) * 100
        
        is_right = avg_eye_x > face_center_x
        direction = 'right' if is_right else 'left'
        
        is_suspicious = horizontal_deviation > self.gaze_threshold
        confidence = min(horizontal_deviation / 100.0, 1.0)
        
        return {
            'direction': direction,
            'deviation_angle': horizontal_deviation,
            'confidence': confidence,
            'is_suspicious': is_suspicious
        }
    
    def draw_gaze_indicator(self, frame: np.ndarray, gaze_info: Dict) -> np.ndarray:
        """
        Draws gaze indicator on frame.
        """
        if gaze_info['is_suspicious']:
            cv2.putText(frame, f"Gaze Away: {gaze_info['direction']}", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        return frame
