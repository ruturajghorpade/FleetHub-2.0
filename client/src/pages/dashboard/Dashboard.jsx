import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, getRoleDashboardPath } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const Dashboard = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingSpinner text="Redirecting to your dashboard..." fullScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Direct user to their canonical role dashboard
  const targetDashboard = getRoleDashboardPath(user.role);
  return <Navigate to={targetDashboard} replace />;
};

export default Dashboard;
