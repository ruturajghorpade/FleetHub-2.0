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
import Dashboard from './pages/dashboard/Dashboard';
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Protected Application Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/* Dynamic Dashboard Redirector */}
              <Route path="/dashboard" element={<Dashboard />} />

              {/* 1. SUPER_ADMIN Routes */}
              <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
                <Route path="/super-admin/admins" element={<AdminManagementPage />} />
                <Route path="/super-admin/audit-logs" element={<AuditLogsPage />} />
              </Route>

              {/* 2. ADMIN Routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Route>

              {/* 3. DISPATCHER Routes */}
              <Route element={<ProtectedRoute allowedRoles={['DISPATCHER', 'ADMIN', 'SUPER_ADMIN']} />}>
                <Route path="/dispatcher/dashboard" element={<DispatcherDashboard />} />
              </Route>

              {/* 4. CLIENT Routes (No Drivers or Vehicles management) */}
              <Route element={<ProtectedRoute allowedRoles={['CLIENT']} />}>
                <Route path="/client/dashboard" element={<ClientDashboard />} />
                <Route path="/client/deliveries" element={<DeliveriesPage />} />
                <Route path="/client/branches" element={<BranchesPage />} />
                <Route path="/client/profile" element={<SettingsPage />} />
              </Route>

              {/* 5. DRIVER Routes */}
              <Route element={<ProtectedRoute allowedRoles={['DRIVER']} />}>
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
