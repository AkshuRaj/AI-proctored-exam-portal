import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import Timer from '../components/Timer';

export default function ExamPage() {
  const { sessionId }               = useParams();
  const navigate                    = useNavigate();
  const [examData, setExamData]     = useState(null);
  const [answers, setAnswers]       = useState({});
  const [current, setCurrent]       = useState(0);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.post(`/exams/session/${sessionId}/start`)
      .then(res => {
        setExamData(res.data);
        setLoading(false);
      })
      .catch(err => {
        alert(err.response?.data?.error || 'Failed to load exam');
        navigate('/dashboard');
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
    try {
      const res = await api.post(`/exams/session/${sessionId}/submit`);
      navigate(`/results/${sessionId}`, { state: res.data });
    } catch (err) {
      alert(err.response?.data?.error || 'Submission failed');
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 40 }}>Loading exam...</div>;

  const questions = examData.questions;
  const question  = questions[current];

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>

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
      <div style={{ background: '#f9f9f9', padding: 24, borderRadius: 8, marginBottom: 24 }}>
        <h3>{question.question_text}</h3>
        {['a', 'b', 'c', 'd'].map(opt => (
          <div
            key={opt}
            onClick={() => handleAnswer(question.id, opt)}
            style={{
              padding: '12px 16px',
              margin: '8px 0',
              borderRadius: 6,
              border: `2px solid ${answers[question.id] === opt ? '#1A56DB' : '#ddd'}`,
              background: answers[question.id] === opt ? '#EFF6FF' : 'white',
              cursor: 'pointer',
              fontWeight: answers[question.id] === opt ? 'bold' : 'normal'
            }}
          >
            <strong>{opt.toUpperCase()}.</strong> {question[`option_${opt}`]}
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setCurrent(prev => prev - 1)}
          disabled={current === 0}
        >
          ← Previous
        </button>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {questions.map((q, i) => (
            <div
              key={q.id}
              onClick={() => setCurrent(i)}
              style={{
                width: 32, height: 32,
                borderRadius: '50%',
                background: answers[q.id] ? '#1A56DB' : '#ddd',
                color: answers[q.id] ? 'white' : '#333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 12, fontWeight: 'bold'
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {current < questions.length - 1 ? (
          <button onClick={() => setCurrent(prev => prev + 1)}>
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{ background: '#1A56DB', color: 'white', padding: '8px 20px', borderRadius: 6 }}
          >
            {submitting ? 'Submitting...' : 'Submit Exam'}
          </button>
        )}
      </div>
    </div>
  );
}