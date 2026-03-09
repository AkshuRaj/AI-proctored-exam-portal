from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.models.user import User

def role_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user = User.query.get(int(get_jwt_identity()))
            if not user:
                return jsonify({'error': 'User not found'}), 404
            if user.role.value not in roles:
                return jsonify({'error': 'Unauthorized', 'required': list(roles)}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator