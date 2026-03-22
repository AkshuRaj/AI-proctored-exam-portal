from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.exam import Exam, Question
from app.models.session import ExamSession
from app.models.user import User
from app.utils.decorators import role_required

admin_bp = Blueprint('admin', __name__)

# ─── CREATE EXAM ─────────────────────────────────────────
@admin_bp.route('/exams', methods=['POST'])
@role_required('admin', 'recruiter')
def create_exam():
    data = request.get_json()

    if not data.get('title'):
        return jsonify({'error': 'title is required'}), 400

    exam = Exam(
        title            = data['title'],
        description      = data.get('description', ''),
        created_by       = int(data['created_by']),
        duration_minutes = data.get('duration_minutes', 60),
        passing_score    = data.get('passing_score', 50.0)
    )
    db.session.add(exam)
    db.session.commit()
    return jsonify(exam.to_dict()), 201


# ─── ADD QUESTION TO EXAM ────────────────────────────────
@admin_bp.route('/exams/<int:exam_id>/questions', methods=['POST'])
@role_required('admin', 'recruiter')
def add_question(exam_id):
    exam = Exam.query.get_or_404(exam_id)
    data = request.get_json()

    required = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    if data['correct_answer'] not in ['a', 'b', 'c', 'd']:
        return jsonify({'error': 'correct_answer must be a, b, c or d'}), 400

    question = Question(
        exam_id        = exam_id,
        question_text  = data['question_text'],
        option_a       = data['option_a'],
        option_b       = data['option_b'],
        option_c       = data['option_c'],
        option_d       = data['option_d'],
        correct_answer = data['correct_answer']
    )
    db.session.add(question)
    db.session.commit()
    return jsonify(question.to_dict(include_answer=True)), 201


# ─── PUBLISH EXAM ────────────────────────────────────────
@admin_bp.route('/exams/<int:exam_id>/publish', methods=['PATCH'])
@role_required('admin', 'recruiter')
def publish_exam(exam_id):
    exam = Exam.query.get_or_404(exam_id)
    exam.is_published = True
    db.session.commit()
    return jsonify({'message': 'Exam published', 'exam': exam.to_dict()}), 200


# ─── ASSIGN EXAM TO CANDIDATE ────────────────────────────
@admin_bp.route('/exams/<int:exam_id>/assign', methods=['POST'])
@role_required('admin', 'recruiter')
def assign_exam(exam_id):
    exam = Exam.query.get_or_404(exam_id)
    data = request.get_json()

    user = User.query.get_or_404(data['user_id'])

    # Check if already assigned
    existing = ExamSession.query.filter_by(
        user_id=user.id, exam_id=exam_id
    ).first()
    if existing:
        return jsonify({'error': 'Exam already assigned to this user'}), 409

    session = ExamSession(user_id=user.id, exam_id=exam_id)
    db.session.add(session)
    db.session.commit()
    return jsonify({'message': 'Exam assigned', 'session': session.to_dict()}), 201


# ─── GET ALL USERS (admin only) ──────────────────────────
@admin_bp.route('/users', methods=['GET'])
@role_required('admin')
def get_users():
    users = User.query.all()
    return jsonify([u.to_dict() for u in users]), 200


# ─── GET ALL EXAMS ───────────────────────────────────────
@admin_bp.route('/exams', methods=['GET'])
@role_required('admin', 'recruiter')
def get_exams():
    exams = Exam.query.all()
    return jsonify([e.to_dict() for e in exams]), 200