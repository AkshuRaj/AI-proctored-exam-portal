import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'candidate') navigate('/candidate');
    else if (user?.role === 'admin' || user?.role === 'recruiter') navigate('/admin');
  }, [user]);

  return <div style={{ padding: 40 }}>Redirecting...</div>;
}