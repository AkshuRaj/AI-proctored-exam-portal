import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function CandidateDashboard() {
  const { user, logout }      = useAuth();
  const navigate              = useNavigate();
  const videoRef              = useRef(null);
  const [exams, setExams]     = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [permissionError, setPermissionError] = useState('');
  const [checkingCamera, setCheckingCamera] = useState(false);

  useEffect(() => {
    api.get('/exams/my')
      .then(res => {
        setExams(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Cleanup stream when component unmounts or modal closes
  const stopStream = (stream) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  useEffect(() => {
    return () => stopStream(cameraStream);
  }, [cameraStream]);

  const handleLogout = () => {
    stopStream(cameraStream);
    logout();
    navigate('/login');
  };

  const handleStartExamClick = (sessionId) => {
    setSelectedSession(sessionId);
    setShowModal(true);
    setPermissionError('');
    setCameraStream(null);
    checkCameraPermissions();
  };

  const checkCameraPermissions = async () => {
    setCheckingCamera(true);
    setPermissionError('');
    let videoStream = null;
    let audioStream = null;

    try {
      // 1. Try to get CAMERA
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          throw new Error('CAMERA_DENIED');
        } else {
          throw new Error('CAMERA_NOT_FOUND');
        }
      }

      // 2. Try to get MICROPHONE (Optional Fallback)
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn('Microphone not found or denied, proceeding with video only.', err);
      }

      // 3. Combine them
      const tracks = [...videoStream.getVideoTracks()];
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }
      
      const combinedStream = new MediaStream(tracks);

      setCameraStream(combinedStream);
      if (videoRef.current) {
        videoRef.current.srcObject = combinedStream;
      }

    } catch (err) {
      if (videoStream) videoStream.getTracks().forEach(t => t.stop());
      if (audioStream) audioStream.getTracks().forEach(t => t.stop());

      switch (err.message) {
        case 'CAMERA_DENIED':
          setPermissionError('Browser blocked your CAMERA! Click the lock icon 🔒 in the address bar to allow camera access.');
          break;
        case 'CAMERA_NOT_FOUND':
          setPermissionError('We cannot find a WEBCAM connected to your computer. Please plug in a camera.');
          break;
        default:
          setPermissionError(`Hardware Error: ${err.message}`);
      }
    } finally {
      setCheckingCamera(false);
    }
  };

  const proceedToExam = () => {
    stopStream(cameraStream);
    setShowModal(false);
    navigate(`/exam/${selectedSession}`);
  };

  const closeModal = () => {
    stopStream(cameraStream);
    setShowModal(false);
    setSelectedSession(null);
  };

  const statusColor = (status) => {
    if (status === 'submitted')   return 'green';
    if (status === 'terminated')  return 'red';
    return '#1A56DB';
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div className="app-container animate-fade-in" style={{ position: 'relative' }}>
      <div className="flex-between">
        <div>
          <h1 style={{ color: 'var(--primary-color)' }}>Welcome, {user?.full_name}!</h1>
          <p className="read-the-docs">Role: {user?.role}</p>
        </div>
        <button onClick={handleLogout} className="btn-outline">Logout</button>
      </div>

      <h2 style={{ marginTop: '2rem', marginBottom: '1.5rem' }}>My Exams</h2>

      {exams.length === 0 ? (
        <p className="read-the-docs">No exams assigned yet.</p>
      ) : (
        <div className="card-grid">
          {exams.map(item => (
            <div key={item.session_id} className="modern-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{item.exam.title}</h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0', fontSize: '0.95rem' }}>{item.exam.description}</p>
                
                <div style={{ background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <div><strong>⏱ {item.exam.duration_minutes}m</strong></div>
                  <div><strong>📋 {item.exam.question_count} Qs</strong></div>
                  <div><strong>🎯 {item.exam.passing_score}% pass</strong></div>
                </div>
                
                {item.score !== null && (
                  <p style={{ fontWeight: 'bold', margin: '4px 0', fontSize: '1.1rem', color: 'var(--primary-color)' }}>Score: {item.score}%</p>
                )}
              </div>
              
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <span style={{ color: statusColor(item.status), fontWeight: '600', textTransform: 'capitalize', fontSize: '0.9rem' }}>
                  ● {item.status.replace('_', ' ')}
                </span>
                {item.status === 'in_progress' && (
                  <button
                    onClick={() => handleStartExamClick(item.session_id)}
                    className="btn-primary"
                  >
                    Start Exam
                  </button>
                )}
                {item.status === 'submitted' && (
                  <button
                    onClick={() => navigate(`/results/${item.session_id}`)}
                    className="btn-outline"
                  >
                    View Results
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hardware Setup Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20
        }}>
          <div style={{
            background: 'white', borderRadius: 12, width: '100%', maxWidth: 500,
            overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Camera Readiness Check</h2>
              <button 
                onClick={closeModal}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666' }}
              >
                &times;
              </button>
            </div>
            
            <div style={{ padding: 24 }}>
              <p style={{ margin: '0 0 16px 0', color: '#4b5563' }}>
                ProctorIQ requires continuous camera and microphone access during the exam. Please ensure you are clearly visible.
              </p>
              
              <div style={{ 
                width: '100%', height: 280, background: '#111827', borderRadius: 8, 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', position: 'relative', marginBottom: 16
              }}>
                {cameraStream ? (
                  <video 
                    ref={(video) => {
                      if (video && cameraStream) {
                        video.srcObject = cameraStream;
                        video.play().catch(e => console.error(e));
                      }
                    }} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                    muted 
                  />
                ) : checkingCamera ? (
                  <div style={{ color: 'white' }}>Requesting permissions...</div>
                ) : (
                  <div style={{ padding: 20, textAlign: 'center', color: '#f87171' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
                    <div>{permissionError || 'Camera unavailable'}</div>
                  </div>
                )}
              </div>

              {!cameraStream && !checkingCamera && (
                <button 
                  onClick={checkCameraPermissions}
                  style={{ 
                    width: '100%', padding: '10px', background: '#e5e7eb', 
                    color: '#374151', borderRadius: 6, fontWeight: 'bold', 
                    border: '1px solid #d1d5db', cursor: 'pointer', marginBottom: 8 
                  }}
                >
                  Retry Camera Setup
                </button>
              )}
            </div>
            
            <div style={{ padding: '16px 24px', background: 'var(--surface-color)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={closeModal} className="btn-outline">Cancel</button>
              <button 
                onClick={proceedToExam}
                disabled={!cameraStream}
                className="btn-primary"
              >
                Proceed to Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}