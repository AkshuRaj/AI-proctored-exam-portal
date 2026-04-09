from typing import Dict, List
from datetime import datetime

class SuspicionEngine:
    """
    Aggregates all proctoring signals and determines overall suspicion level.
    """
    
    SCORES = {
        'no_face':        10,
        'multiple_faces': 15,
        'gaze_away':      5,
        'head_turned':    5,
        'tab_switch':     8,
        'phone_detected': 20,
        'audio_detected': 3,
        'unknown_object': 5,
    }

    SEVERITY = {
        'no_face':        'medium',
        'multiple_faces': 'high',
        'gaze_away':      'low',
        'head_turned':    'low',
        'tab_switch':     'medium',
        'phone_detected': 'high',
        'audio_detected': 'low',
        'unknown_object': 'low',
    }

    TERMINATION_THRESHOLD = 100

    def __init__(self):
        self.violation_history = []
        self.total_score = 0
    
    def add_violation(self, violation_type: str, confidence: float = 1.0, metadata: Dict = None):
        delta = self.SCORES.get(violation_type, 5)
        self.total_score += delta
        
        violation = {
            'type': violation_type,
            'confidence': confidence,
            'delta': delta,
            'total_score': self.total_score,
            'severity': self.SEVERITY.get(violation_type, 'low'),
            'timestamp': datetime.utcnow().isoformat(),
            'metadata': metadata or {}
        }
        self.violation_history.append(violation)
        return violation
    
    def calculate_suspicion_score(self, time_window_seconds: int = None) -> float:
        # Simplification: just return total_score. If time window is given, could filter.
        return min(self.total_score, 100)
    
    def get_summary(self, time_window_seconds: int = 300) -> Dict:
        violation_counts = {}
        for v in self.violation_history:
            violation_counts[v['type']] = violation_counts.get(v['type'], 0) + 1
            
        should_terminate = self.total_score >= self.TERMINATION_THRESHOLD
        
        return {
            'suspicion_score': self.total_score,
            'suspicion_level': 'high' if self.total_score > 50 else ('medium' if self.total_score > 20 else 'low'),
            'total_violations': len(self.violation_history),
            'violation_counts': violation_counts,
            'should_terminate': should_terminate,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def clear_history(self):
        self.violation_history = []
        self.total_score = 0
