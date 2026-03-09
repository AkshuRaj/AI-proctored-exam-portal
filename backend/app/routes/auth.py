from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User, RoleEnum

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    for field in ['email', 'password', 'full_name']:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if User.query.filter_by(email=data['email'].lower()).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(
        email=data['email'].lower(),
        full_name=data['full_name'],
        role=RoleEnum[data.get('role', 'candidate')]
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'user': user.to_dict(), 'token': token}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email', '').lower()).first()

    if not user or not user.check_password(data.get('password', '')):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account deactivated'}), 403

    token = create_access_token(
        identity=str(user.id),
        additional_claims={'role': user.role.value}
    )
    return jsonify({'user': user.to_dict(), 'token': token}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get_or_404(int(user_id))
    return jsonify(user.to_dict()), 200