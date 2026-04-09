import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Register() {
  const [form, setForm]   = useState({ email: '', password: '', full_name: '', role: 'candidate' });
  const [error, setError] = useState('');
  const navigate          = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="animate-fade-in flex-center" style={{ minHeight: '80vh' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: 450 }}>
        <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--primary-color)' }}>Register</h1>
        
        {error && (
          <div style={{ background: 'var(--danger-color)', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Full Name"
            value={form.full_name}
            onChange={e => setForm({...form, full_name: e.target.value})}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
            required
          />
          <select
            value={form.role}
            onChange={e => setForm({...form, role: e.target.value})}
            style={{
              width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', 
              borderRadius: '12px', background: 'var(--surface-color)', color: 'var(--text-primary)',
              fontFamily: 'inherit', fontSize: '1rem', outline: 'none'
            }}
          >
            <option value="candidate">Candidate</option>
            <option value="recruiter">Recruiter</option>
            <option value="admin">Admin</option>
          </select>
          
          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem', padding: '1rem' }}>Create Account</button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '2rem' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: 'bold' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}