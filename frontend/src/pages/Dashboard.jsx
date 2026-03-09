import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Welcome, {user?.full_name}!</h1>
      <p>Role: <strong>{user?.role}</strong></p>
      <p>Email: {user?.email}</p>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}