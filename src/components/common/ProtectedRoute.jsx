import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={spinnerContainerStyle}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Cargando sesión...</p>
      </div>
    );
  }

  if (!user) {
    // Redirect to login if not logged in
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to main page if role is not allowed
    return <Navigate to="/" replace />;
  }

  return children;
};

const spinnerContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  width: '100vw',
  backgroundColor: 'var(--bg-primary)',
  fontFamily: 'var(--font-sans)'
};

export default ProtectedRoute;
