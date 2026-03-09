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
    <div style={{ maxWidth: 400, margin: '100px auto', padding: 24 }}>
      <h1>ProctorIQ — Register</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          placeholder="Full Name"
          value={form.full_name}
          onChange={e => setForm({...form, full_name: e.target.value})}
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={e => setForm({...form, email: e.target.value})}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm({...form, password: e.target.value})}
        />
        <select
          value={form.role}
          onChange={e => setForm({...form, role: e.target.value})}>
          <option value="candidate">Candidate</option>
          <option value="recruiter">Recruiter</option>
          <option value="admin">Admin</option>
        </select>
        <button type="submit">Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}