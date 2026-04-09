from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.models.session import ExamSession
from app.models.violation import Violation, ViolationType, Severity
from app.extensions import db
from app.services.proctor.suspicion_engine import SuspicionEngine
from datetime import datetime

proctor_bp = Blueprint('proctor', __name__, url_prefix='/api/proctor')

# Global suspicion engines per session
suspicion_engines = {}

def get_suspicion_engine(session_id: int) -> SuspicionEngine:
    """Get or create suspicion engine for a session."""
    if session_id not in suspicion_engines:
        suspicion_engines[session_id] = SuspicionEngine()
    return suspicion_engines[session_id]

@proctor_bp.route('/violation', methods=['POST'])
@jwt_required()
def report_violation():
    """
    Report a violation detected during exam.
    
    Expected JSON:
    {
        "session_id": int,
        "violation_type": str,
        "severity": str,
        "description": str,
        "violation_metadata": dict
    }
    """
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        session_id = data.get('session_id')
        violation_type = data.get('violation_type')
        severity = data.get('severity', 'low')
        description = data.get('description')
        violation_metadata = data.get('violation_metadata', {})
        
        # Verify session exists and belongs to user
        session = ExamSession.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Map violation type to enum
        try:
            v_type = ViolationType[violation_type]
        except KeyError:
            return jsonify({'error': f'Invalid violation type: {violation_type}'}), 400
        
        # Map severity to enum
        try:
            sev = Severity[severity]
        except KeyError:
            return jsonify({'error': f'Invalid severity: {severity}'}), 400
        
        # Create violation record
        violation = Violation(
            session_id=session_id,
            violation_type=v_type,
            severity=sev,
            description=description,
            violation_metadata=violation_metadata
        )
        
        db.session.add(violation)
        db.session.commit()
        
        # Update suspicion engine
        engine = get_suspicion_engine(session_id)
        confidence = violation_metadata.get('confidence', 0.8)
        engine.add_violation(violation_type, confidence, violation_metadata)
        
        return jsonify({
            'id': violation.id,
            'message': 'Violation recorded',
            'suspicion_score': engine.calculate_suspicion_score()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@proctor_bp.route('/violations/<int:session_id>', methods=['GET'])
@jwt_required()
def get_violations(session_id: int):
    """Get all violations for a session."""
    try:
        violations = Violation.query.filter_by(session_id=session_id).all()
        
        return jsonify({
            'session_id': session_id,
            'violations': [v.to_dict() for v in violations],
            'total_count': len(violations)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@proctor_bp.route('/suspicion/<int:session_id>', methods=['GET'])
@jwt_required()
def get_suspicion_summary(session_id: int):
    """Get suspicion summary for a session."""
    try:
        engine = get_suspicion_engine(session_id)
        summary = engine.get_summary()
        
        return jsonify(summary), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@proctor_bp.route('/session/<int:session_id>/start', methods=['POST'])
@jwt_required()
def start_proctoring(session_id: int):
    """Start proctoring session."""
    try:
        session = ExamSession.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        # Initialize suspicion engine
        engine = get_suspicion_engine(session_id)
        engine.clear_history()
        
        return jsonify({
            'message': 'Proctoring started',
            'session_id': session_id,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@proctor_bp.route('/session/<int:session_id>/end', methods=['POST'])
@jwt_required()
def end_proctoring(session_id: int):
    """End proctoring session and get final report."""
    try:
        session = ExamSession.query.get(session_id)
        if not session:
            return jsonify({'error': 'Session not found'}), 404
        
        engine = get_suspicion_engine(session_id)
        summary = engine.get_summary(time_window_seconds=3600)  # Last hour
        
        # Clean up engine
        if session_id in suspicion_engines:
            del suspicion_engines[session_id]
        
        return jsonify({
            'message': 'Proctoring ended',
            'session_id': session_id,
            'final_report': summary
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@proctor_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'proctor'}), 200

def register_socket_events(socketio):
    """Register socket.io events for proctoring."""
    import base64
    import cv2
    import numpy as np
    from flask import request
    from flask_socketio import join_room
    
    try:
        from app.services.proctor.face_detector import FaceDetector
        from app.services.proctor.gaze_tracker import GazeTracker
        from app.services.proctor.yolo_detector import YoloDetector
        face_detector = FaceDetector()
        gaze_tracker = GazeTracker()
        yolo_detector = YoloDetector()
    except Exception as e:
        print("Failed to initialize ML models:", e)
        face_detector = None
        gaze_tracker = None
        yolo_detector = None

    @socketio.on('join_session')
    def handle_join(data):
        session_id = data.get('session_id')
        if session_id:
            join_room(str(session_id))

    @socketio.on('violation_detected')
    def handle_violation(data):
        print(f"Violation detected: {data}")
        return True

    @socketio.on('frame')
    def handle_frame(data):
        session_id = data.get('session_id')
        frame_data = data.get('frame')
        tab_visible = data.get('tab_visible', True)
        
        if not session_id:
            return
            
        engine = get_suspicion_engine(session_id)
        
        if not tab_visible:
            v = engine.add_violation('tab_switch', 1.0, {})
            try:
                from app.models.violation import Violation, ViolationType, Severity
                from app.models.session import ExamSession, SessionStatus
                from app.extensions import db
                new_v = Violation(session_id=session_id, violation_type=ViolationType['tab_switch'], severity=Severity['medium'], description="Tab hidden")
                db.session.add(new_v)
                
                if v.get('should_terminate'):
                    session = ExamSession.query.get(session_id)
                    if session and session.status == SessionStatus.in_progress:
                        session.status = SessionStatus.terminated
                        session.score = 0.0
                db.session.commit()
            except Exception as e:
                print("DB write err:", e)
            socketio.emit('violation', v, to=request.sid)
            # Will naturally update score through engine

        if not frame_data or face_detector is None or gaze_tracker is None or yolo_detector is None:
            # If no frame or models failed, just return current score
            score = engine.calculate_suspicion_score()
            socketio.emit('frame_result', {
                'suspicion_score': int(score),
                'face_status': 'ok' if tab_visible else 'Tab hidden!'
            }, to=request.sid)
            return

        try:
            if ',' in frame_data:
                frame_b64 = frame_data.split(',')[1]
            else:
                frame_b64 = frame_data
                
            nparr = np.frombuffer(base64.b64decode(frame_b64), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return
                
            # Run YOLO Detection first for objects and multiple people
            yolo_result = yolo_detector.analyze(frame)
            if yolo_result.get('phone_detected'):
                v = engine.add_violation('phone_detected', 1.0, yolo_result)
                try:
                    from app.models.violation import Violation, ViolationType, Severity
                    from app.models.session import ExamSession, SessionStatus
                    from app.extensions import db
                    new_v = Violation(session_id=session_id, violation_type=ViolationType['phone_detected'], severity=Severity['high'])
                    db.session.add(new_v)
                    
                    if v.get('should_terminate'):
                        session = ExamSession.query.get(session_id)
                        if session and session.status == SessionStatus.in_progress:
                            session.status = SessionStatus.terminated
                            session.score = 0.0
                    db.session.commit()
                except Exception as e:
                    pass
                socketio.emit('violation', v, to=request.sid)
            
            person_count = yolo_result.get('person_count', 0)
            if person_count > 1:
                v = engine.add_violation('multiple_faces', 1.0, {'person_count': person_count})
                try:
                    from app.models.violation import Violation, ViolationType, Severity
                    from app.models.session import ExamSession, SessionStatus
                    from app.extensions import db
                    new_v = Violation(session_id=session_id, violation_type=ViolationType['multiple_faces'], severity=Severity['high'])
                    db.session.add(new_v)
                    
                    if v.get('should_terminate'):
                        session = ExamSession.query.get(session_id)
                        if session and session.status == SessionStatus.in_progress:
                            session.status = SessionStatus.terminated
                            session.score = 0.0
                    db.session.commit()
                except Exception as e:
                    pass
                socketio.emit('violation', v, to=request.sid)
                
            # Run Face Detection
            face_rect = face_detector.detect_face(frame)
            face_status = 'ok'
            
            if face_rect is None:
                # If YOLO also couldn't find a person, mark as no_face
                if person_count == 0:
                    v = engine.add_violation('no_face', 1.0, {})
                    try:
                        from app.models.violation import Violation, ViolationType, Severity
                        from app.models.session import ExamSession, SessionStatus
                        from app.extensions import db
                        new_v = Violation(session_id=session_id, violation_type=ViolationType['no_face'], severity=Severity['medium'])
                        db.session.add(new_v)
                        
                        if v.get('should_terminate'):
                            session = ExamSession.query.get(session_id)
                            if session and session.status == SessionStatus.in_progress:
                                session.status = SessionStatus.terminated
                                session.score = 0.0
                        db.session.commit()
                    except Exception as e:
                        pass
                    socketio.emit('violation', v, to=request.sid)
                    face_status = 'No face detected'
            else:
                # Run Gaze / Iris Point tracking
                gaze_info = gaze_tracker.estimate_gaze_direction(frame, face_rect)
                
                if gaze_info.get('is_suspicious', False):
                    v = engine.add_violation('gaze_away', gaze_info.get('confidence', 0.8), gaze_info)
                    try:
                        from app.models.violation import Violation, ViolationType, Severity
                        from app.models.session import ExamSession, SessionStatus
                        from app.extensions import db
                        new_v = Violation(session_id=session_id, violation_type=ViolationType['gaze_away'], severity=Severity['low'])
                        db.session.add(new_v)
                        
                        if v.get('should_terminate'):
                            session = ExamSession.query.get(session_id)
                            if session and session.status == SessionStatus.in_progress:
                                session.status = SessionStatus.terminated
                                session.score = 0.0
                        db.session.commit()
                    except Exception as e:
                        pass
                    socketio.emit('violation', v, to=request.sid)
                    face_status = f"Looking away ({gaze_info.get('direction', 'unknown')})"
            
            score = engine.calculate_suspicion_score()
            
            socketio.emit('frame_result', {
                'suspicion_score': int(score),
                'face_status': face_status,
                'phone_detected': yolo_result.get('phone_detected', False),
                'person_count': person_count
            }, to=request.sid)

        except Exception as e:
            print(f"Error processing frame: {e}")
