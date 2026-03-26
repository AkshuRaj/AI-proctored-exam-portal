# import numpy as np
# from typing import Optional, List, Dict, Tuple

# class YOLODetector:
#     """
#     Detects objects in the scene using YOLO (You Only Look Once).
#     Can detect phone, book, person, etc. to identify suspicious activity.
#     """
    
#     def __init__(self, model_path: Optional[str] = None):
#         """
#         Initialize YOLO detector.
        
#         Args:
#             model_path: Path to YOLO model weights (optional)
#         """
#         self.model_path = model_path
#         self.net = None
#         self.layer_names = None
#         self.confidence_threshold = 0.5
#         self.nms_threshold = 0.4
        
#         # Suspicious objects
#         self.suspicious_objects = ['cell phone', 'phone', 'book', 'person']
#         self.allowed_objects = ['person']
        
#         if model_path:
#             self._load_model()
    
#     def _load_model(self):
#         """Load YOLO model from file."""
#         try:
#             import cv2
#             net = cv2.dnn.readNet(self.model_path)
#             self.net = net
#         except Exception as e:
#             print(f"Error loading YOLO model: {e}")
    
#     def detect_objects(self, frame: np.ndarray) -> List[Dict]:
#         """
#         Detect objects in the frame.
        
#         Args:
#             frame: Input image frame
            
#         Returns:
#             List of detected objects with class, confidence, and bbox
#         """
#         if self.net is None:
#             return []
        
#         h, w, c = frame.shape
        
#         # Create blob from frame
#         blob = self.net.forward()  # Placeholder
        
#         detections = []
        
#         # Format: [class_id, confidence, bbox_x, bbox_y, bbox_w, bbox_h]
#         # This is a placeholder implementation
        
#         return detections
    
#     def is_suspicious_object_detected(self, detections: List[Dict]) -> Dict:
#         """
#         Check if any suspicious objects are detected.
        
#         Args:
#             detections: List of detected objects
            
#         Returns:
#             Dictionary with suspicious status and details
#         """
#         suspicious_found = False
#         suspicious_objects_list = []
        
#         for detection in detections:
#             class_name = detection.get('class', '')
#             if class_name.lower() in self.suspicious_objects:
#                 suspicious_found = True
#                 suspicious_objects_list.append({
#                     'object': class_name,
#                     'confidence': detection.get('confidence', 0),
#                     'bbox': detection.get('bbox')
#                 })
        
#         return {
#             'is_suspicious': suspicious_found,
#             'objects': suspicious_objects_list,
#             'count': len(suspicious_objects_list)
#         }
    
#     def draw_detections(self, frame: np.ndarray, detections: List[Dict]) -> np.ndarray:
#         """
#         Draw detected objects on frame.
#         """
#         import cv2
        
#         for detection in detections:
#             bbox = detection.get('bbox')
#             class_name = detection.get('class', '')
#             confidence = detection.get('confidence', 0)
            
#             if bbox:
#                 x, y, w, h = bbox
#                 color = (0, 0, 255) if class_name.lower() in self.suspicious_objects else (0, 255, 0)
                
#                 cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
#                 cv2.putText(frame, f"{class_name} {confidence:.2f}", 
#                            (x, y-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
#         return frame
import cv2
import numpy as np

class YoloDetector:
    def __init__(self):
        self.model   = None
        self.enabled = False
        self._load_model()

    def _load_model(self):
        try:
            from ultralytics import YOLO
            self.model   = YOLO('yolov8n.pt')  # downloads automatically on first run
            self.enabled = True
            print("✅ YOLOv8 loaded successfully")
        except Exception as e:
            print(f"⚠️ YOLOv8 not loaded: {e}")
            self.enabled = False

    def analyze(self, frame):
        if not self.enabled or frame is None:
            return {'detections': [], 'phone_detected': False, 'extra_person': False}

        try:
            results     = self.model(frame, verbose=False)[0]
            detections  = []
            phone_detected  = False
            person_count    = 0

            for box in results.boxes:
                cls_id     = int(box.cls[0])
                cls_name   = self.model.names[cls_id]
                confidence = float(box.conf[0])

                if confidence < 0.5:
                    continue

                detections.append({'class': cls_name, 'confidence': round(confidence, 2)})

                if cls_name == 'cell phone':
                    phone_detected = True

                if cls_name == 'person':
                    person_count += 1

            return {
                'detections':    detections,
                'phone_detected': phone_detected,
                'extra_person':  person_count > 1,
                'person_count':  person_count
            }

        except Exception as e:
            return {'detections': [], 'phone_detected': False, 'extra_person': False, 'error': str(e)}