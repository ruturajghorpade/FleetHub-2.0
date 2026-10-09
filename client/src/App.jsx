import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Public Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Unauthorized from './pages/Unauthorized';
import NotFoundPage from './pages/NotFoundPage';

// Role Dashboards
import { useAuth, getRoleDashboardPath } from './context/AuthContext';
import SuperAdminDashboard from './pages/dashboard/SuperAdminDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import DispatcherDashboard from './pages/dashboard/DispatcherDashboard';
import ClientDashboard from './pages/dashboard/ClientDashboard';
import DriverDashboard from './pages/dashboard/DriverDashboard';
import DriverProfilePage from './pages/driver/DriverProfilePage';

// Super Admin Protected Pages
import AdminManagementPage from './pages/admin/AdminManagementPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';

// Operational Pages
import DeliveriesPage from './pages/deliveries/DeliveriesPage';
import VehiclesPage from './pages/vehicles/VehiclesPage';
import DriversPage from './pages/drivers/DriversPage';
import MaintenancePage from './pages/maintenance/MaintenancePage';
import ClientsPage from './pages/clients/ClientsPage';
import BranchesPage from './pages/branches/BranchesPage';
import ReportsPage from './pages/reports/ReportsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import SettingsPage from './pages/settings/SettingsPage';

// Route-level authentication and dynamic role dashboard redirect
const RootRoleRedirect = () => {
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

  return <Navigate to={getRoleDashboardPath(user?.role)} replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root Entrypoint: Direct Auth & Role-Based Navigation */}
          <Route path="/" element={<RootRoleRedirect />} />

          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Application Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Dynamic Dashboard Redirector */}
              <Route path="/dashboard" element={<RootRoleRedirect />} />

              {/* 1. SUPER_ADMIN Routes */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/admins" element={<AdminManagementPage />} />
                <Route path="/super-admin/audit-logs" element={<AuditLogsPage />} />
              </Route>

              {/* 2. ADMIN Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} />}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Route>

              {/* 3. DISPATCHER Routes */}
              <Route element={<ProtectedRoute allowedRoles={['DISPATCHER', 'ADMIN', 'SUPER_ADMIN']} />}>
                <Route path="/dispatcher" element={<Navigate to="/dispatcher/dashboard" replace />} />
                <Route path="/dispatcher/dashboard" element={<DispatcherDashboard />} />
              </Route>

              {/* 4. CLIENT Routes (No Drivers or Vehicles management) */}
              <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
                <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />
                <Route path="/client/dashboard" element={<ClientDashboard />} />
                <Route path="/client/deliveries" element={<DeliveriesPage />} />
                <Route path="/client/branches" element={<BranchesPage />} />
                <Route path="/client/profile" element={<SettingsPage />} />
              </Route>

              {/* 5. DRIVER Routes */}
              <Route element={<ProtectedRoute allowedRoles={['DRIVER']} />}>
                <Route path="/driver" element={<Navigate to="/driver/dashboard" replace />} />
                <Route path="/driver/dashboard" element={<DriverDashboard />} />
                <Route path="/driver/deliveries" element={<DeliveriesPage />} />
                <Route path="/driver/deliveries/:id" element={<DeliveriesPage />} />
                <Route path="/driver/profile" element={<DriverProfilePage />} />
                <Route path="/driver/change-password" element={<DriverProfilePage />} />
              </Route>

              {/* Operations Routes (Deliveries & Fleet) */}
              <Route
                path="/deliveries"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER', 'CLIENT', 'DRIVER']}>
                    <DeliveriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/vehicles"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER']}>
                    <VehiclesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/drivers"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'DISPATCHER']}>
                    <DriversPage />
                  </ProtectedRoute>
                }
              />

              {/* Client & Admin Management */}
              <Route
                path="/branches"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CLIENT']}>
                    <BranchesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/maintenance"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <MaintenancePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Only Clients Management */}
              <Route
                path="/clients"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
                    <ClientsPage />
                  </ProtectedRoute>
                }
              />

              {/* System Routes */}
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          {/* Fallbacks */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
