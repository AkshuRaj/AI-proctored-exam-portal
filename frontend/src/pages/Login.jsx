import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm]   = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login }         = useAuth();
  const navigate          = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="animate-fade-in flex-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 450 }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--primary-color)' }}>ProctorIQ</h1>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Login to access your exams</p>
        
        {error && (
          <div style={{ background: 'var(--danger-color)', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="email" placeholder="Email Address"
            value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <input type="password" placeholder="Password"
            value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', padding: '1rem' }}>Sign In</button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '2rem' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: 'bold' }}>Register Here</Link>
        </p>
      </div>
    </div>
  );
}