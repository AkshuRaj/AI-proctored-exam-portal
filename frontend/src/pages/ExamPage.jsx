// import { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import api from '../api/axios';
// import Timer from '../components/Timer';

// export default function ExamPage() {
//   const { sessionId }               = useParams();
//   const navigate                    = useNavigate();
//   const [examData, setExamData]     = useState(null);
//   const [answers, setAnswers]       = useState({});
//   const [current, setCurrent]       = useState(0);
//   const [loading, setLoading]       = useState(true);
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     api.post(`/exams/session/${sessionId}/start`)
//       .then(res => {
//         setExamData(res.data);
//         setLoading(false);
//       })
//       .catch(err => {
//         alert(err.response?.data?.error || 'Failed to load exam');
//         navigate('/dashboard');
//       });
//   }, [sessionId]);

//   const handleAnswer = async (questionId, option) => {
//     setAnswers(prev => ({ ...prev, [questionId]: option }));
//     try {
//       await api.post(`/exams/session/${sessionId}/answer`, {
//         question_id:     questionId,
//         selected_option: option
//       });
//     } catch (err) {
//       console.error('Failed to save answer', err);
//     }
//   };

//   const handleSubmit = async () => {
//     if (submitting) return;
//     setSubmitting(true);
//     try {
//       const res = await api.post(`/exams/session/${sessionId}/submit`);
//       navigate(`/results/${sessionId}`, { state: res.data });
//     } catch (err) {
//       alert(err.response?.data?.error || 'Submission failed');
//       setSubmitting(false);
//     }
//   };

//   if (loading) return <div style={{ padding: 40 }}>Loading exam...</div>;

//   const questions = examData.questions;
//   const question  = questions[current];

//   return (
//     <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>

//       {/* Header */}
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
//         <h2>{examData.exam.title}</h2>
//         <Timer
//           durationMinutes={examData.exam.duration_minutes}
//           onTimeUp={handleSubmit}
//         />
//       </div>

//       {/* Progress */}
//       <p style={{ color: '#666' }}>
//         Question {current + 1} of {questions.length} —
//         Answered: {Object.keys(answers).length}/{questions.length}
//       </p>

//       {/* Question */}
//       <div style={{ background: '#f9f9f9', padding: 24, borderRadius: 8, marginBottom: 24 }}>
//         <h3>{question.question_text}</h3>
//         {['a', 'b', 'c', 'd'].map(opt => (
//           <div
//             key={opt}
//             onClick={() => handleAnswer(question.id, opt)}
//             style={{
//               padding: '12px 16px',
//               margin: '8px 0',
//               borderRadius: 6,
//               border: `2px solid ${answers[question.id] === opt ? '#1A56DB' : '#ddd'}`,
//               background: answers[question.id] === opt ? '#EFF6FF' : 'white',
//               cursor: 'pointer',
//               fontWeight: answers[question.id] === opt ? 'bold' : 'normal'
//             }}
//           >
//             <strong>{opt.toUpperCase()}.</strong> {question[`option_${opt}`]}
//           </div>
//         ))}
//       </div>

//       {/* Navigation */}
//       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
//         <button
//           onClick={() => setCurrent(prev => prev - 1)}
//           disabled={current === 0}
//         >
//           ← Previous
//         </button>

//         <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
//           {questions.map((q, i) => (
//             <div
//               key={q.id}
//               onClick={() => setCurrent(i)}
//               style={{
//                 width: 32, height: 32,
//                 borderRadius: '50%',
//                 background: answers[q.id] ? '#1A56DB' : '#ddd',
//                 color: answers[q.id] ? 'white' : '#333',
//                 display: 'flex', alignItems: 'center', justifyContent: 'center',
//                 cursor: 'pointer', fontSize: 12, fontWeight: 'bold'
//               }}
//             >
//               {i + 1}
//             </div>
//           ))}
//         </div>

//         {current < questions.length - 1 ? (
//           <button onClick={() => setCurrent(prev => prev + 1)}>
//             Next →
//           </button>
//         ) : (
//           <button
//             onClick={handleSubmit}
//             disabled={submitting}
//             style={{ background: '#1A56DB', color: 'white', padding: '8px 20px', borderRadius: 6 }}
//           >
//             {submitting ? 'Submitting...' : 'Submit Exam'}
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Timer from '../components/Timer';
import WebcamFeed from '../components/WebcamFeed';

export default function ExamPage() {
  const { sessionId }               = useParams();
  const navigate                    = useNavigate();
  const webcamRef                   = useRef(null);
  const [examData, setExamData]     = useState(null);
  const [answers, setAnswers]       = useState({});
  const [current, setCurrent]       = useState(0);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);

  useEffect(() => {
    api.post(`/exams/session/${sessionId}/start`)
      .then(res => {
        setExamData(res.data);
        setLoading(false);
      })
      .catch(err => {
        alert(err.response?.data?.error || 'Failed to load exam');
        navigate('/candidate');
      });
  }, [sessionId]);

  const handleAnswer = async (questionId, option) => {
    setAnswers(prev => ({ ...prev, [questionId]: option }));
    try {
      await api.post(`/exams/session/${sessionId}/answer`, {
        question_id:     questionId,
        selected_option: option
      });
    } catch (err) {
      console.error('Failed to save answer', err);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    
    // Stop webcam when submitting
    if (webcamRef.current) {
      webcamRef.current.stopWebcam();
    }
    
    try {
      const res = await api.post(`/exams/session/${sessionId}/submit`);
      navigate(`/results/${sessionId}`, { state: res.data });
    } catch (err) {
      alert(err.response?.data?.error || 'Submission failed');
      setSubmitting(false);
    }
  };

  const handleTerminate = async (score) => {
    // Stop webcam when exam is terminated
    if (webcamRef.current) {
      webcamRef.current.stopWebcam();
    }
    try {
      await api.post(`/exams/session/${sessionId}/terminate`);
    } catch (err) {
      console.error('Termination recorded failed:', err);
    }
    alert(`⚠️ Your exam has been terminated due to suspicious activity. Suspicion Score: ${score}`);
    navigate('/candidate');
  };

  if (loading) return <div style={{ padding: 40 }}>Loading exam...</div>;

  const questions = examData.questions;
  const question  = questions[current];

  return (
    <div className="app-container animate-fade-in" style={{ position: 'relative' }}>

      {/* Proctoring Webcam — fixed top right */}
      <WebcamFeed
        ref={webcamRef}
        sessionId={parseInt(sessionId)}
        onTerminate={handleTerminate}
        onCameraStatusChange={setCameraBlocked}
      />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2>{examData.exam.title}</h2>
        <Timer
          durationMinutes={examData.exam.duration_minutes}
          onTimeUp={handleSubmit}
        />
      </div>

      {/* Progress */}
      <p style={{ color: '#666' }}>
        Question {current + 1} of {questions.length} —
        Answered: {Object.keys(answers).length}/{questions.length}
      </p>

      {/* Question */}
      <div className="modern-card" style={{ marginBottom: '2rem', opacity: cameraBlocked ? 0.5 : 1, pointerEvents: cameraBlocked ? 'none' : 'auto' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{question.question_text}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {['a', 'b', 'c', 'd'].map(opt => {
            const isSelected = answers[question.id] === opt;
            return (
              <div
                key={opt}
                onClick={() => !cameraBlocked && handleAnswer(question.id, opt)}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                  background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'var(--surface-color)',
                  cursor: cameraBlocked ? 'not-allowed' : 'pointer',
                  fontWeight: isSelected ? '600' : '400',
                  color: isSelected ? 'var(--primary-color)' : 'var(--text-primary)',
                  transition: 'all 0.2s ease',
                  opacity: cameraBlocked ? 0.6 : 1
                }}
              >
                <strong style={{ marginRight: '0.5rem', color: isSelected ? 'var(--primary-color)' : 'var(--text-secondary)' }}>{opt.toUpperCase()}.</strong> 
                {question[`option_${opt}`]}
              </div>
            );
          })}
        </div>
      </div>

      {/* Camera Blocked Warning */}
      {cameraBlocked && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: '#fee2e2', border: '3px solid #DC2626', borderRadius: 12,
            padding: 32, textAlign: 'center', maxWidth: 400
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
            <h2 style={{ color: '#DC2626', margin: '0 0 12px 0' }}>CAMERA IS BLOCKED!</h2>
            <p style={{ color: '#333', marginBottom: 16, fontSize: 16 }}>
              Please open your camera to continue the exam. You cannot answer questions until your camera is active.
            </p>
            <p style={{ color: '#666', fontSize: 14 }}>
              Check if your camera lens is covered, or if another app is using the camera.
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <button
          onClick={() => setCurrent(prev => prev - 1)}
          disabled={current === 0 || cameraBlocked}
          className="btn-outline"
          style={{ opacity: cameraBlocked ? 0.5 : 1, cursor: cameraBlocked ? 'not-allowed' : 'pointer' }}
        >
          ← Previous
        </button>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {questions.map((q, i) => (
            <div
              key={q.id}
              onClick={() => !cameraBlocked && setCurrent(i)}
              style={{
                width: 36, height: 36,
                borderRadius: '50%',
                background: answers[q.id] ? 'var(--primary-color)' : 'var(--border-color)',
                color: answers[q.id] ? 'white' : 'var(--text-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: cameraBlocked ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 'bold',
                opacity: cameraBlocked ? 0.5 : 1,
                boxShadow: answers[q.id] ? '0 2px 4px rgba(79, 70, 229, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {current < questions.length - 1 ? (
          <button 
            onClick={() => setCurrent(prev => prev + 1)} 
            disabled={cameraBlocked} 
            className="btn-outline"
            style={{ opacity: cameraBlocked ? 0.5 : 1, cursor: cameraBlocked ? 'not-allowed' : 'pointer' }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || cameraBlocked}
            className="btn-primary"
            style={{ opacity: (submitting || cameraBlocked) ? 0.5 : 1, cursor: (submitting || cameraBlocked) ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        )}
      </div>
    </div>
  );
}