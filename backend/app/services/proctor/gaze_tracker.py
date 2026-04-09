import cv2
import numpy as np
import mediapipe as mp
from typing import Dict, Tuple

class GazeTracker:
    """
    Tracks eye gaze direction using MediaPipe Face Mesh iris landmarks.
    Determines screen quadrant (left, right, up, down, center).
    """
    def __init__(self):
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        model_path = os.path.join(base_dir, 'face_landmarker.task')
        
        try:
            BaseOptions = mp.tasks.BaseOptions
            FaceLandmarker = mp.tasks.vision.FaceLandmarker
            FaceLandmarkerOptions = mp.tasks.vision.FaceLandmarkerOptions
            
            options = FaceLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=model_path),
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
                num_faces=1
            )
            self.face_mesh = FaceLandmarker.create_from_options(options)
        except Exception as e:
            print("Warning: Failed to load FaceLandmarker. Ensure face_landmarker.task is in backend/ directory. Error:", e)
            self.face_mesh = None

    def estimate_gaze_direction(self, frame: np.ndarray, face_rect: Tuple[int, int, int, int] = None) -> Dict:
        """
        Estimates the gaze direction.
        
        Args:
            frame: Input image frame
            face_rect: (Optional) face bonding box
            
        Returns:
            Dict: {'direction': str, 'confidence': float, 'is_suspicious': bool}
        """
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        if self.face_mesh is None:
            return {'direction': 'unknown', 'confidence': 0.0, 'is_suspicious': False}
            
        try:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
            results = self.face_mesh.detect(mp_image)
        except Exception as e:
            return {'direction': 'unknown', 'confidence': 0.0, 'is_suspicious': False}

        if not results.face_landmarks:
            return {'direction': 'unknown', 'confidence': 0.0, 'is_suspicious': False}

        landmarks = results.face_landmarks[0]

        def compute_ratio(p_left, p_right, p_center):
            # Distance from left corner to center
            dist_left = np.linalg.norm(np.array([p_center.x, p_center.y]) - np.array([p_left.x, p_left.y]))
            # Distance from right corner to center
            dist_right = np.linalg.norm(np.array([p_center.x, p_center.y]) - np.array([p_right.x, p_right.y]))
            return dist_left / (dist_left + dist_right + 1e-6)

        def compute_v_ratio(p_top, p_bot, p_center):
            # Distance from top to center
            dist_top = np.linalg.norm(np.array([p_center.x, p_center.y]) - np.array([p_top.x, p_top.y]))
            # Distance from bottom to center
            dist_bot = np.linalg.norm(np.array([p_center.x, p_center.y]) - np.array([p_bot.x, p_bot.y]))
            return dist_top / (dist_top + dist_bot + 1e-6)

        # Left eye (user's right eye, left side from camera perspective)
        # 33 = outer, 133 = inner, 159 = top, 145 = bottom, 468 = iris center
        hr1 = compute_ratio(landmarks[33], landmarks[133], landmarks[468])
        vr1 = compute_v_ratio(landmarks[159], landmarks[145], landmarks[468])
        
        # Right eye (user's left eye)
        # 362 = outer, 263 = inner, 386 = top, 374 = bottom, 473 = iris center
        hr2 = compute_ratio(landmarks[362], landmarks[263], landmarks[473])
        vr2 = compute_v_ratio(landmarks[386], landmarks[374], landmarks[473])
        
        # Average ratios
        h_ratio = (hr1 + hr2) / 2.0
        v_ratio = (vr1 + vr2) / 2.0
        
        direction = 'center'
        is_suspicious = False
        
        if h_ratio < 0.42:
            direction = 'right'
            is_suspicious = True
        elif h_ratio > 0.58:
            direction = 'left'
            is_suspicious = True
        elif v_ratio < 0.40:
            direction = 'up'
            is_suspicious = True
        elif v_ratio > 0.65:
            direction = 'down'
            is_suspicious = True
            
        return {
            'direction': direction,
            'confidence': 0.8,
            'is_suspicious': is_suspicious,
            'h_ratio': h_ratio,
            'v_ratio': v_ratio
        }
