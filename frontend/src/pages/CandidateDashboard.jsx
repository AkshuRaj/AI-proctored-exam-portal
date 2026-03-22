import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function CandidateDashboard() {
  const { user, logout }      = useAuth();
  const navigate              = useNavigate();
  const [exams, setExams]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/exams/my')
      .then(res => {
        setExams(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const statusColor = (status) => {
    if (status === 'submitted')   return 'green';
    if (status === 'terminated')  return 'red';
    return '#1A56DB';
  };

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Welcome, {user?.full_name}!</h1>
          <p style={{ color: '#666' }}>Role: {user?.role}</p>
        </div>
        <button onClick={handleLogout}>Logout</button>
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
              <p style={{ margin: '4px 0' }}>
                Duration: {item.exam.duration_minutes} mins &nbsp;|&nbsp;
                Questions: {item.exam.question_count} &nbsp;|&nbsp;
                Passing: {item.exam.passing_score}%
              </p>
              {item.score !== null && (
                <p style={{ fontWeight: 'bold' }}>Score: {item.score}%</p>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: statusColor(item.status), fontWeight: 'bold', textTransform: 'capitalize' }}>
                {item.status.replace('_', ' ')}
              </p>
              {item.status === 'in_progress' && (
                <button
                  onClick={() => navigate(`/exam/${item.session_id}`)}
                  style={{ background: '#1A56DB', color: 'white', padding: '8px 16px', borderRadius: 6 }}
                >
                  Start Exam
                </button>
              )}
              {item.status === 'submitted' && (
                <button
                  onClick={() => navigate(`/results/${item.session_id}`)}
                  style={{ padding: '8px 16px', borderRadius: 6 }}
                >
                  View Results
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}