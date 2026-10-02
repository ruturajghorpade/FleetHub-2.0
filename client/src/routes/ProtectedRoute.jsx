import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute ensures that users are authenticated before rendering nested routes.
 * If not authenticated: redirects to /login.
 * If role is not included in allowedRoles: redirects to /unauthorized.
 */
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Authenticating FleetHub session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role;

    // Strict role check
    let isAllowed = allowedRoles.includes(userRole);

    // Backward compatibility for legacy sub-roles to CLIENT
    if (
      !isAllowed &&
      allowedRoles.includes('CLIENT') &&
      ['CLIENT_ADMIN', 'CLIENT_USER', 'DISPATCHER'].includes(userRole)
    ) {
      isAllowed = true;
    }

    if (!isAllowed) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
