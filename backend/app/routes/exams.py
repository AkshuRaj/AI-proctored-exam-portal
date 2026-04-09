from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.extensions import db
from app.models.exam import Exam, Question, Answer
from app.models.session import ExamSession, SessionStatus
from app.utils.decorators import role_required

exams_bp = Blueprint('exams', __name__)

# ─── GET MY ASSIGNED EXAMS ───────────────────────────────
@exams_bp.route('/my', methods=['GET'])
@jwt_required()
def my_exams():
    user_id  = int(get_jwt_identity())
    sessions = ExamSession.query.filter_by(user_id=user_id).all()

    result = []
    for s in sessions:
        exam = Exam.query.get(s.exam_id)
        result.append({
            'session_id':       s.id,
            'status':           s.status.value,
            'score':            s.score,
            'started_at':       s.started_at.isoformat(),
            'submitted_at':     s.submitted_at.isoformat() if s.submitted_at else None,
            'exam':             exam.to_dict()
        })

    return jsonify(result), 200


# ─── START EXAM ──────────────────────────────────────────
@exams_bp.route('/session/<int:session_id>/start', methods=['POST'])
@jwt_required()
def start_exam(session_id):
    user_id = int(get_jwt_identity())
    session = ExamSession.query.get_or_404(session_id)

    # Make sure this session belongs to the logged in user
    if session.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    if session.status != SessionStatus.in_progress:
        return jsonify({'error': 'Exam already submitted or terminated'}), 400

    # Return questions WITHOUT correct answers
    questions = Question.query.filter_by(exam_id=session.exam_id).all()

    return jsonify({
        'session':   session.to_dict(),
        'exam':      Exam.query.get(session.exam_id).to_dict(),
        'questions': [q.to_dict(include_answer=False) for q in questions]
    }), 200


# ─── SAVE ANSWER ─────────────────────────────────────────
@exams_bp.route('/session/<int:session_id>/answer', methods=['POST'])
@jwt_required()
def save_answer(session_id):
    user_id = int(get_jwt_identity())
    session = ExamSession.query.get_or_404(session_id)

    if session.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    if session.status != SessionStatus.in_progress:
        return jsonify({'error': 'Exam already submitted or terminated'}), 400

    data        = request.get_json()
    question_id = data.get('question_id')
    selected    = data.get('selected_option')

    if selected not in ['a', 'b', 'c', 'd']:
        return jsonify({'error': 'selected_option must be a, b, c or d'}), 400

    # Update if already answered, otherwise create
    answer = Answer.query.filter_by(
        session_id=session_id,
        question_id=question_id
    ).first()

    if answer:
        answer.selected_option = selected
    else:
        answer = Answer(
            session_id=session_id,
            question_id=question_id,
            selected_option=selected
        )
        db.session.add(answer)

    db.session.commit()
    return jsonify({'message': 'Answer saved'}), 200


# ─── SUBMIT EXAM ─────────────────────────────────────────
@exams_bp.route('/session/<int:session_id>/submit', methods=['POST'])
@jwt_required()
def submit_exam(session_id):
    user_id = int(get_jwt_identity())
    session = ExamSession.query.get_or_404(session_id)

    if session.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    if session.status != SessionStatus.in_progress:
        return jsonify({'error': 'Exam already submitted or terminated'}), 400

    # Calculate score
    questions = Question.query.filter_by(exam_id=session.exam_id).all()
    answers   = Answer.query.filter_by(session_id=session_id).all()

    answer_map = {a.question_id: a.selected_option for a in answers}

    correct = 0
    for q in questions:
        if answer_map.get(q.id) == q.correct_answer:
            correct += 1

    score = (correct / len(questions)) * 100 if questions else 0

    session.score        = round(score, 2)
    session.status       = SessionStatus.submitted
    session.submitted_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'message':         'Exam submitted successfully',
        'score':           session.score,
        'correct':         correct,
        'total':           len(questions),
        'passed':          score >= Exam.query.get(session.exam_id).passing_score
    }), 200


# ─── GET RESULTS ─────────────────────────────────────────
@exams_bp.route('/session/<int:session_id>/result', methods=['GET'])
@jwt_required()
def get_result(session_id):
    user_id = int(get_jwt_identity())
    session = ExamSession.query.get_or_404(session_id)

    if session.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    exam = Exam.query.get(session.exam_id)

    return jsonify({
        'session': session.to_dict(),
        'exam':    exam.to_dict(),
        'passed':  session.score >= exam.passing_score if session.score else False
    }), 200