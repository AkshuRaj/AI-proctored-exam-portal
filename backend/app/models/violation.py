from app.extensions import db
from datetime import datetime
import enum

class ViolationType(enum.Enum):
    no_face = 'no_face'
    multiple_faces = 'multiple_faces'
    gaze_off = 'gaze_off'
    head_turned = 'head_turned'
    tab_switch = 'tab_switch'
    phone_detected = 'phone_detected'
    unknown_object = 'unknown_object'
    audio_detected = 'audio_detected'

class Severity(enum.Enum):
    low = 'low'
    medium = 'medium'
    high = 'high'

class Violation(db.Model):
    __tablename__ = 'violations'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('exam_sessions.id'), nullable=False)
    violation_type = db.Column(db.Enum(ViolationType), nullable=False)
    severity = db.Column(db.Enum(Severity), nullable=False, default='low')
    description = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    violation_metadata = db.Column(db.JSON)
    snapshot_path = db.Column(db.String(300), nullable=True)
    
    # Relationship
    session = db.relationship('ExamSession', backref='violations')
    
    def __repr__(self):
        return f'<Violation {self.id}: {self.violation_type.value} - {self.severity.value}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'session_id': self.session_id,
            'violation_type': self.violation_type.value,
            'severity': self.severity.value,
            'description': self.description,
            'timestamp': self.timestamp.isoformat(),
            'violation_metadata': self.violation_metadata,
            'snapshot_path': self.snapshot_path
        }
    timestamp            = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':                    self.id,
            'session_id':            self.session_id,
            'violation_type':        self.violation_type.value,
            'severity':              self.severity.value,
            'suspicion_score_delta': self.suspicion_score_delta,
            'snapshot_path':         self.snapshot_path,
            'timestamp':             self.timestamp.isoformat()
        }