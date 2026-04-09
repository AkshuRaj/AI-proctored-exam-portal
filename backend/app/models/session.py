from datetime import datetime
from app.extensions import db
import enum

class SessionStatus(enum.Enum):
    in_progress = 'in_progress'
    submitted   = 'submitted'
    terminated  = 'terminated'  # kicked out by proctoring

class ExamSession(db.Model):
    __tablename__ = 'exam_sessions'

    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    exam_id      = db.Column(db.Integer, db.ForeignKey('exams.id'), nullable=False)
    started_at   = db.Column(db.DateTime, default=datetime.utcnow)
    submitted_at = db.Column(db.DateTime, nullable=True)
    score        = db.Column(db.Float, nullable=True)
    status       = db.Column(db.Enum(SessionStatus), default=SessionStatus.in_progress)

    answers    = db.relationship('Answer', backref='session', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':           self.id,
            'user_id':      self.user_id,
            'exam_id':      self.exam_id,
            'started_at':   self.started_at.isoformat(),
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'score':        self.score,
            'status':       self.status.value
        }