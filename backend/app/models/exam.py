from datetime import datetime
from app.extensions import db

class Exam(db.Model):
    __tablename__ = 'exams'

    id               = db.Column(db.Integer, primary_key=True)
    title            = db.Column(db.String(200), nullable=False)
    description      = db.Column(db.Text)
    created_by       = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False, default=60)
    is_published     = db.Column(db.Boolean, default=False)
    passing_score    = db.Column(db.Float, default=50.0)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)

    questions = db.relationship('Question', backref='exam', lazy=True, cascade='all, delete-orphan')
    sessions  = db.relationship('ExamSession', backref='exam', lazy=True)

    def to_dict(self):
        return {
            'id':               self.id,
            'title':            self.title,
            'description':      self.description,
            'created_by':       self.created_by,
            'duration_minutes': self.duration_minutes,
            'is_published':     self.is_published,
            'passing_score':    self.passing_score,
            'created_at':       self.created_at.isoformat(),
            'question_count':   len(self.questions)
        }


class Question(db.Model):
    __tablename__ = 'questions'

    id            = db.Column(db.Integer, primary_key=True)
    exam_id       = db.Column(db.Integer, db.ForeignKey('exams.id'), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    option_a      = db.Column(db.String(300), nullable=False)
    option_b      = db.Column(db.String(300), nullable=False)
    option_c      = db.Column(db.String(300), nullable=False)
    option_d      = db.Column(db.String(300), nullable=False)
    correct_answer = db.Column(db.String(1), nullable=False)  # 'a', 'b', 'c', or 'd'

    def to_dict(self, include_answer=False):
        data = {
            'id':            self.id,
            'exam_id':       self.exam_id,
            'question_text': self.question_text,
            'option_a':      self.option_a,
            'option_b':      self.option_b,
            'option_c':      self.option_c,
            'option_d':      self.option_d,
        }
        if include_answer:
            data['correct_answer'] = self.correct_answer
        return data


class Answer(db.Model):
    __tablename__ = 'answers'

    id              = db.Column(db.Integer, primary_key=True)
    session_id      = db.Column(db.Integer, db.ForeignKey('exam_sessions.id'), nullable=False)
    question_id     = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    selected_option = db.Column(db.String(1))  # 'a', 'b', 'c', or 'd'

    def to_dict(self):
        return {
            'id':              self.id,
            'session_id':      self.session_id,
            'question_id':     self.question_id,
            'selected_option': self.selected_option
        }