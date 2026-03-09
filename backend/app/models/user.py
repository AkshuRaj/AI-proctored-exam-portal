import enum
from datetime import datetime
from app.extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class RoleEnum(enum.Enum):
    admin     = 'admin'
    recruiter = 'recruiter'
    candidate = 'candidate'

class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    full_name     = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role          = db.Column(db.Enum(RoleEnum), default=RoleEnum.candidate, nullable=False)
    is_active     = db.Column(db.Boolean, default=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id':         self.id,
            'email':      self.email,
            'full_name':  self.full_name,
            'role':       self.role.value,
            'is_active':  self.is_active,
            'created_at': self.created_at.isoformat()
        }