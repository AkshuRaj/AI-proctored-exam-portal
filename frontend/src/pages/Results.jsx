import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function Results() {
  const { sessionId }         = useParams();
  const location              = useLocation();
  const navigate              = useNavigate();
  const [result, setResult]   = useState(location.state || null);

  useEffect(() => {
    if (!result) {
      api.get(`/exams/session/${sessionId}/result`)
        .then(res => setResult(res.data))
        .catch(() => navigate('/dashboard'));
    }
  }, []);

  if (!result) return <div style={{ padding: 40 }}>Loading results...</div>;

  const passed = result.passed;

  return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 64 }}>{passed ? '🎉' : '😔'}</div>
      <h1 style={{ color: passed ? 'green' : 'red' }}>
        {passed ? 'Passed!' : 'Failed'}
      </h1>
      <h2>Your Score: {result.score}%</h2>
      <p>Correct Answers: {result.correct} / {result.total}</p>
      <p style={{ color: '#666' }}>
        Passing Score: {result.passed ? '✅ Met' : '❌ Not Met'}
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        style={{ marginTop: 24, padding: '10px 24px', background: '#1A56DB', color: 'white', borderRadius: 6 }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}