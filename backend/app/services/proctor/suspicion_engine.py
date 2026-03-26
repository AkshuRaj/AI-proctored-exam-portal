# from typing import Dict, List
# from datetime import datetime, timedelta

# class SuspicionEngine:
#     """
#     Aggregates all proctoring signals and determines overall suspicion level.
#     """
    
#     def __init__(self):
#         """Initialize suspicion engine."""
#         self.violation_weights = {
#             'face_not_detected': 10,
#             'gaze_deviation': 5,
#             'audio_anomaly': 7,
#             'external_object': 15,
#             'multiple_faces': 20,
#             'background_changed': 8
#         }
        
#         self.suspicion_thresholds = {
#             'low': 10,
#             'medium': 25,
#             'high': 50
#         }
        
#         self.violation_history = []
    
#     def add_violation(self, violation_type: str, confidence: float, metadata: Dict = None):
#         """
#         Add a violation to the engine.
        
#         Args:
#             violation_type: Type of violation
#             confidence: Confidence score (0-1)
#             metadata: Additional metadata
#         """
#         violation = {
#             'type': violation_type,
#             'confidence': confidence,
#             'weight': self.violation_weights.get(violation_type, 5),
#             'timestamp': datetime.utcnow(),
#             'metadata': metadata or {}
#         }
#         self.violation_history.append(violation)
    
#     def calculate_suspicion_score(self, time_window_seconds: int = 60) -> float:
#         """
#         Calculate overall suspicion score based on recent violations.
        
#         Args:
#             time_window_seconds: Look back window in seconds
            
#         Returns:
#             Suspicion score (0-100)
#         """
#         cutoff_time = datetime.utcnow() - timedelta(seconds=time_window_seconds)
#         recent_violations = [v for v in self.violation_history if v['timestamp'] > cutoff_time]
        
#         if not recent_violations:
#             return 0.0
        
#         total_weight = sum(v['weight'] * v['confidence'] for v in recent_violations)
        
#         # Normalize to 0-100 scale
#         suspicion_score = min(total_weight / 10, 100)
        
#         return suspicion_score
    
#     def get_suspicion_level(self, score: float = None) -> str:
#         """
#         Get suspicion level based on score.
        
#         Args:
#             score: Suspicion score (if None, calculates it)
            
#         Returns:
#             Suspicion level: 'low', 'medium', or 'high'
#         """
#         if score is None:
#             score = self.calculate_suspicion_score()
        
#         if score >= self.suspicion_thresholds['high']:
#             return 'high'
#         elif score >= self.suspicion_thresholds['medium']:
#             return 'medium'
#         else:
#             return 'low'
    
#     def get_violation_count(self, violation_type: str = None, time_window_seconds: int = 60) -> int:
#         """
#         Get count of violations.
        
#         Args:
#             violation_type: Specific type to count (None for all)
#             time_window_seconds: Look back window
            
#         Returns:
#             Count of violations
#         """
#         cutoff_time = datetime.utcnow() - timedelta(seconds=time_window_seconds)
#         violations = [v for v in self.violation_history if v['timestamp'] > cutoff_time]
        
#         if violation_type:
#             violations = [v for v in violations if v['type'] == violation_type]
        
#         return len(violations)
    
#     def get_summary(self, time_window_seconds: int = 300) -> Dict:
#         """
#         Get comprehensive summary of suspicion data.
        
#         Args:
#             time_window_seconds: Look back window
            
#         Returns:
#             Dictionary with summary data
#         """
#         score = self.calculate_suspicion_score(time_window_seconds)
#         level = self.get_suspicion_level(score)
        
#         cutoff_time = datetime.utcnow() - timedelta(seconds=time_window_seconds)
#         recent_violations = [v for v in self.violation_history if v['timestamp'] > cutoff_time]
        
#         # Count by type
#         violation_counts = {}
#         for v in recent_violations:
#             violation_counts[v['type']] = violation_counts.get(v['type'], 0) + 1
        
#         return {
#             'suspicion_score': round(score, 2),
#             'suspicion_level': level,
#             'total_violations': len(recent_violations),
#             'violation_counts': violation_counts,
#             'most_common_violation': max(violation_counts, key=violation_counts.get) if violation_counts else None,
#             'timestamp': datetime.utcnow().isoformat()
#         }
    
#     def clear_history(self):
#         """Clear violation history."""
#         self.violation_history = []

class SuspicionEngine:

    # Score added per violation
    SCORES = {
        'no_face':        10,
        'multiple_faces': 15,
        'gaze_off':        5,
        'head_turned':     5,
        'tab_switch':      8,
        'phone_detected': 20,
        'audio_detected':  3,
        'unknown_object':  5,
    }

    SEVERITY = {
        'no_face':        'medium',
        'multiple_faces': 'high',
        'gaze_off':       'low',
        'head_turned':    'low',
        'tab_switch':     'medium',
        'phone_detected': 'high',
        'audio_detected': 'low',
        'unknown_object': 'low',
    }

    # Terminate exam if score exceeds this
    TERMINATION_THRESHOLD = 100

    def __init__(self):
        self.session_scores = {}  # session_id → total score

    def get_score(self, session_id):
        return self.session_scores.get(session_id, 0)

    def add_violation(self, session_id, violation_type):
        delta = self.SCORES.get(violation_type, 5)

        if session_id not in self.session_scores:
            self.session_scores[session_id] = 0

        self.session_scores[session_id] += delta

        total    = self.session_scores[session_id]
        should_terminate = total >= self.TERMINATION_THRESHOLD

        return {
            'violation_type':        violation_type,
            'delta':                 delta,
            'total_score':           total,
            'severity':              self.SEVERITY.get(violation_type, 'low'),
            'should_terminate':      should_terminate
        }

    def reset(self, session_id):
        self.session_scores[session_id] = 0

# Single shared instance across the app
suspicion_engine = SuspicionEngine()