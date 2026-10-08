import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, getRoleDashboardPath } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

/**
 * RoleGuard restricts access to components or nested routes based on authenticated user roles.
 * Supports role hierarchy (SUPER_ADMIN / ADMIN have access to all administrative views).
 */
const RoleGuard = ({ allowedRoles = [], children, fallback }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return children ? children : <Outlet />;
  }

  const userRole = user?.role;
  const isSuper = userRole === 'SUPER_ADMIN';

  const isAuthorized =
    isSuper ||
    allowedRoles.includes(userRole) ||
    ((allowedRoles.includes('CLIENT_ADMIN') || allowedRoles.includes('CLIENT')) &&
      (userRole === 'CLIENT_ADMIN' || userRole === 'CLIENT'));

  if (!isAuthorized) {
    if (fallback) {
      return fallback;
    }

    const redirectPath = getRoleDashboardPath(userRole);
    return <Navigate to={redirectPath} replace />;
  }

  return children ? children : <Outlet />;
};

export default RoleGuard;
