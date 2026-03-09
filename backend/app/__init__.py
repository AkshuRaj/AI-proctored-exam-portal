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

    from app.models.user import User

    from app.routes.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'ProctorIQ API running'}

    return app