import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CandidateDashboard from './pages/CandidateDashboard';
import ExamPage from './pages/ExamPage';
import Results from './pages/Results';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin', 'recruiter']}>
          <AdminDashboard />
          </ProtectedRoute> 
        } />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />

          <Route path="/candidate" element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <CandidateDashboard />
            </ProtectedRoute>
          } />

          <Route path="/exam/:sessionId" element={
            <ProtectedRoute allowedRoles={['candidate']}>
              <ExamPage />
            </ProtectedRoute>
          } />

          <Route path="/results/:sessionId" element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>

          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}