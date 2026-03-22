from flask import Flask
from dotenv import load_dotenv
import os

load_dotenv()

from app.extensions import db, jwt, migrate, cors
from app.config import config

def create_app(config_name=None):
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'default')

    app = Flask(__name__)
    app.config.from_object(config[config_name])

    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r'/api/*': {'origins': 'http://localhost:5173'}})

    # Import all models so Flask-Migrate detects them
    from app.models.user import User
    from app.models.exam import Exam, Question, Answer
    from app.models.session import ExamSession

    # Register blueprints
    from app.routes.auth  import auth_bp
    from app.routes.exams import exams_bp
    from app.routes.admin import admin_bp

    app.register_blueprint(auth_bp,  url_prefix='/api/auth')
    app.register_blueprint(exams_bp, url_prefix='/api/exams')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'ProctorIQ API running'}

    return app