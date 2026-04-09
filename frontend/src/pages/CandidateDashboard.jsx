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
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24, position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Welcome, {user?.full_name}!</h1>
          <p style={{ color: '#666' }}>Role: {user?.role}</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px', borderRadius: 6 }}>Logout</button>
      </div>

      <h2 style={{ marginTop: 32 }}>My Exams</h2>

      {exams.length === 0 ? (
        <p style={{ color: '#666' }}>No exams assigned yet.</p>
      ) : (
        exams.map(item => (
          <div key={item.session_id} style={{
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 20,
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0 }}>{item.exam.title}</h3>
              <p style={{ color: '#666', margin: '4px 0' }}>{item.exam.description}</p>
              <p style={{ margin: '4px 0', fontSize: 14 }}>
                Duration: {item.exam.duration_minutes} mins &nbsp;|&nbsp;
                Questions: {item.exam.question_count} &nbsp;|&nbsp;
                Passing: {item.exam.passing_score}%
              </p>
              {item.score !== null && (
                <p style={{ fontWeight: 'bold', margin: '4px 0' }}>Score: {item.score}%</p>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: statusColor(item.status), fontWeight: 'bold', textTransform: 'capitalize', margin: '0 0 12px 0' }}>
                {item.status.replace('_', ' ')}
              </p>
              {item.status === 'in_progress' && (
                <button
                  onClick={() => handleStartExamClick(item.session_id)}
                  style={{ 
                    background: '#1A56DB', 
                    color: 'white', 
                    padding: '8px 24px', 
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    border: 'none'
                  }}
                >
                  Start Exam
                </button>
              )}
              {item.status === 'submitted' && (
                <button
                  onClick={() => navigate(`/results/${item.session_id}`)}
                  style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
                >
                  View Results
                </button>
              )}
            </div>
          </div>
        ))
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
            
            <div style={{ padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={closeModal}
                style={{ padding: '10px 20px', borderRadius: 6, background: 'white', border: '1px solid #d1d5db', color: '#374151', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Cancel
              </button>
              <button 
                onClick={proceedToExam}
                disabled={!cameraStream}
                style={{ 
                  padding: '10px 24px', borderRadius: 6, border: 'none',
                  background: cameraStream ? '#1A56DB' : '#9ca3af', 
                  color: 'white', cursor: cameraStream ? 'pointer' : 'not-allowed',
                  fontWeight: 'bold', transition: 'background 0.2s'
                }}
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