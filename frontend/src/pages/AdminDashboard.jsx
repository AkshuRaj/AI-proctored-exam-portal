// frontend/src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function AdminDashboard() {
  const { user, logout }         = useAuth();
  const navigate                 = useNavigate();
  const [exams, setExams]        = useState([]);
  const [users, setUsers]        = useState([]);
  const [activeTab, setActiveTab] = useState('exams');

  // Create exam form
  const [examForm, setExamForm] = useState({
    title: '', description: '', duration_minutes: 60, passing_score: 50
  });

  // Add question form
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a'
  });

  // Assign exam form
  const [assignForm, setAssignForm] = useState({ exam_id: '', user_id: '' });

  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchExams();
    fetchUsers();
  }, []);

  const fetchExams = () => {
    api.get('/admin/exams').then(res => setExams(res.data));
  };

  const fetchUsers = () => {
    api.get('/admin/users').then(res =>
      setUsers(res.data.filter(u => u.role === 'candidate'))
    );
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/exams', { ...examForm, created_by: user.id });
      fetchExams();
      setExamForm({ title: '', description: '', duration_minutes: 60, passing_score: 50 });
      showMessage('✅ Exam created!');
    } catch (err) {
      showMessage('❌ ' + (err.response?.data?.error || 'Failed'));
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/exams/${selectedExamId}/questions`, questionForm);
      setQuestionForm({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a' });
      fetchExams();
      showMessage('✅ Question added!');
    } catch (err) {
      showMessage('❌ ' + (err.response?.data?.error || 'Failed'));
    }
  };

  const handlePublish = async (examId) => {
    try {
      await api.patch(`/admin/exams/${examId}/publish`);
      fetchExams();
      showMessage('✅ Exam published!');
    } catch (err) {
      showMessage('❌ ' + (err.response?.data?.error || 'Failed'));
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/exams/${assignForm.exam_id}/assign`, { user_id: parseInt(assignForm.user_id) });
      showMessage('✅ Exam assigned!');
    } catch (err) {
      showMessage('❌ ' + (err.response?.data?.error || 'Already assigned or failed'));
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const tabStyle = (tab) => ({
    padding: '10px 24px',
    cursor: 'pointer',
    borderBottom: activeTab === tab ? '3px solid #1A56DB' : '3px solid transparent',
    fontWeight: activeTab === tab ? 'bold' : 'normal',
    color: activeTab === tab ? '#1A56DB' : '#666'
  });

  const inputStyle = {
    padding: '8px 12px', borderRadius: 6,
    border: '1px solid #ddd', width: '100%', marginBottom: 10
  };

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
          <p style={{ color: '#666', margin: 0 }}>{user?.full_name} — {user?.role}</p>
        </div>
        <button onClick={handleLogout}>Logout</button>
      </div>

      {/* Message */}
      {message && (
        <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 6, marginBottom: 16, fontWeight: 'bold' }}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: 24 }}>
        <div style={tabStyle('exams')}     onClick={() => setActiveTab('exams')}>📋 Exams</div>
        <div style={tabStyle('questions')} onClick={() => setActiveTab('questions')}>❓ Add Questions</div>
        <div style={tabStyle('assign')}    onClick={() => setActiveTab('assign')}>👤 Assign</div>
      </div>

      {/* TAB 1 — Create & View Exams */}
      {activeTab === 'exams' && (
        <div>
          <h2>Create New Exam</h2>
          <form onSubmit={handleCreateExam}>
            <input style={inputStyle} placeholder="Exam Title" required
              value={examForm.title} onChange={e => setExamForm({...examForm, title: e.target.value})} />
            <input style={inputStyle} placeholder="Description"
              value={examForm.description} onChange={e => setExamForm({...examForm, description: e.target.value})} />
            <div style={{ display: 'flex', gap: 12 }}>
              <input style={inputStyle} type="number" placeholder="Duration (mins)"
                value={examForm.duration_minutes} onChange={e => setExamForm({...examForm, duration_minutes: parseInt(e.target.value)})} />
              <input style={inputStyle} type="number" placeholder="Passing Score %"
                value={examForm.passing_score} onChange={e => setExamForm({...examForm, passing_score: parseFloat(e.target.value)})} />
            </div>
            <button type="submit" style={{ background: '#1A56DB', color: 'white', padding: '10px 24px', borderRadius: 6 }}>
              Create Exam
            </button>
          </form>

          <h2 style={{ marginTop: 32 }}>All Exams</h2>
          {exams.length === 0 ? <p style={{ color: '#666' }}>No exams yet.</p> : exams.map(exam => (
            <div key={exam.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0 }}>{exam.title}</h3>
                  <p style={{ color: '#666', margin: '4px 0' }}>{exam.description}</p>
                  <p style={{ margin: '4px 0' }}>
                    ⏱ {exam.duration_minutes} mins &nbsp;|&nbsp;
                    ❓ {exam.question_count} questions &nbsp;|&nbsp;
                    🎯 Passing: {exam.passing_score}%
                  </p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ color: exam.is_published ? 'green' : 'orange', fontWeight: 'bold' }}>
                    {exam.is_published ? '✅ Published' : '⏳ Draft'}
                  </p>
                  {!exam.is_published && (
                    <button onClick={() => handlePublish(exam.id)}
                      style={{ background: 'green', color: 'white', padding: '6px 14px', borderRadius: 6 }}>
                      Publish
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2 — Add Questions */}
      {activeTab === 'questions' && (
        <div>
          <h2>Add Questions</h2>
          <select style={{...inputStyle, marginBottom: 20}}
            value={selectedExamId || ''}
            onChange={e => setSelectedExamId(e.target.value)}>
            <option value="">-- Select an Exam --</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>

          {selectedExamId && (
            <form onSubmit={handleAddQuestion}>
              <textarea style={{...inputStyle, height: 80}} placeholder="Question Text" required
                value={questionForm.question_text}
                onChange={e => setQuestionForm({...questionForm, question_text: e.target.value})} />
              <input style={inputStyle} placeholder="Option A" required
                value={questionForm.option_a} onChange={e => setQuestionForm({...questionForm, option_a: e.target.value})} />
              <input style={inputStyle} placeholder="Option B" required
                value={questionForm.option_b} onChange={e => setQuestionForm({...questionForm, option_b: e.target.value})} />
              <input style={inputStyle} placeholder="Option C" required
                value={questionForm.option_c} onChange={e => setQuestionForm({...questionForm, option_c: e.target.value})} />
              <input style={inputStyle} placeholder="Option D" required
                value={questionForm.option_d} onChange={e => setQuestionForm({...questionForm, option_d: e.target.value})} />
              <select style={inputStyle} value={questionForm.correct_answer}
                onChange={e => setQuestionForm({...questionForm, correct_answer: e.target.value})}>
                <option value="a">A is Correct</option>
                <option value="b">B is Correct</option>
                <option value="c">C is Correct</option>
                <option value="d">D is Correct</option>
              </select>
              <button type="submit" style={{ background: '#1A56DB', color: 'white', padding: '10px 24px', borderRadius: 6 }}>
                Add Question
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 3 — Assign Exam */}
      {activeTab === 'assign' && (
        <div>
          <h2>Assign Exam to Candidate</h2>
          <form onSubmit={handleAssign}>
            <select style={inputStyle} required value={assignForm.exam_id}
              onChange={e => setAssignForm({...assignForm, exam_id: e.target.value})}>
              <option value="">-- Select Exam --</option>
              {exams.filter(e => e.is_published).map(e =>
                <option key={e.id} value={e.id}>{e.title}</option>
              )}
            </select>
            <select style={inputStyle} required value={assignForm.user_id}
              onChange={e => setAssignForm({...assignForm, user_id: e.target.value})}>
              <option value="">-- Select Candidate --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
            </select>
            <button type="submit" style={{ background: '#1A56DB', color: 'white', padding: '10px 24px', borderRadius: 6 }}>
              Assign Exam
            </button>
          </form>
        </div>
      )}

    </div>
  );
}