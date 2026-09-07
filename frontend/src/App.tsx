import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ServiceRegister from './pages/ServiceRegister';
import Earnings from './pages/Earnings';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import api from './lib/api';
import { useAuthStore } from './store/useAuthStore';
import Configuration from './pages/admin/Configuration';

// Protected Route Wrapper
const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { token, user } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If token exists but user is not loaded, we should show a loading state
  // or wait for the user profile to be fetched.
  if (!user && token) {
    return <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>;
  }

  if (roles && user && !roles.includes(user.role)) {
    // Redirect to their respective dashboard instead of "/"
    const target = '/dashboard';
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};

function App() {
  const { user, token, login, logout } = useAuthStore();

  React.useEffect(() => {
    const fetchProfile = async () => {
      if (token && !user) {
        try {
          const response = await api.get('/auth/profile');
          login(response.data, token); // Update store with user info
        } catch (error) {
          console.error('Failed to fetch profile', error);
          logout(); // Clear invalid token
        }
      }
    };
    fetchProfile();
  }, [token, user, login, logout]);

  return (
    <Router>
      <Routes>
        {/* Public Routes with PublicLayout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={
            token ? (
                <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          } />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected App Routes */}
        <Route element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          {/* Admin & Staff Routes */}
          <Route path="dashboard" element={
            <ProtectedRoute roles={['ADMIN', 'STAFF']}><Dashboard /></ProtectedRoute>
          } />
          <Route path="staff" element={
            <ProtectedRoute roles={['ADMIN']}><Staff /></ProtectedRoute>
          } />
          <Route path="register-service" element={<ProtectedRoute roles={['ADMIN', 'STAFF']}><ServiceRegister /></ProtectedRoute>} />
          <Route path="earnings" element={<ProtectedRoute roles={['ADMIN', 'STAFF']}><Earnings /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute roles={['ADMIN', 'STAFF']}><Profile /></ProtectedRoute>} />
          <Route path="configuration" element={
            <ProtectedRoute roles={['ADMIN']}><Configuration /></ProtectedRoute>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
