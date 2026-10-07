import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldCheck,
  Package,
  Car,
  Users,
  Wrench,
  Building2,
  GitFork,
  BarChart3,
  Bell,
  Settings,
  Activity,
  History,
  PlusCircle,
  Clock,
  CheckCircle2,
  X,
  Radio,
  User,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ mobileOpen = false, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'CLIENT';

  let roleSubtitle = 'Restaurant Portal';
  if (role === 'SUPER_ADMIN') {
    roleSubtitle = 'Platform Master Control';
  } else if (role === 'ADMIN') {
    roleSubtitle = 'Operations Management';
  } else if (role === 'DISPATCHER') {
    roleSubtitle = 'FleetHub Dispatcher';
  } else if (role === 'DRIVER') {
    roleSubtitle = 'Driver Terminal';
  }

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
      isActive
        ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
        : 'text-slate-400 hover:text-slate-100 hover:bg-dark-700/60'
    }`;

  const renderNavLinks = () => {
    // ============================================
    // 1. SUPER_ADMIN NAVIGATION
    // ============================================
    if (role === 'SUPER_ADMIN') {
      return (
        <div className="space-y-5">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Platform Master
            </p>
            <div className="space-y-1">
              <NavLink to="/super-admin/dashboard" className={navItemClass}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
              <NavLink to="/super-admin/admins" className={navItemClass}>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Admins
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Platform Management
            </p>
            <div className="space-y-1">
              <NavLink to="/clients" className={navItemClass}>
                <Building2 className="w-4 h-4" />
                Clients
              </NavLink>
              <NavLink to="/branches" className={navItemClass}>
                <GitFork className="w-4 h-4" />
                Branches
              </NavLink>
              <NavLink to="/vehicles" className={navItemClass}>
                <Car className="w-4 h-4" />
                Vehicles
              </NavLink>
              <NavLink to="/drivers" className={navItemClass}>
                <Users className="w-4 h-4" />
                Drivers
              </NavLink>
              <NavLink to="/deliveries" className={navItemClass}>
                <Package className="w-4 h-4" />
                Deliveries
              </NavLink>
              <NavLink to="/maintenance" className={navItemClass}>
                <Wrench className="w-4 h-4" />
                Maintenance
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Analytics &amp; Security
            </p>
            <div className="space-y-1">
              <NavLink to="/reports" className={navItemClass}>
                <BarChart3 className="w-4 h-4" />
                Reports
              </NavLink>
              <NavLink to="/super-admin/audit-logs" className={navItemClass}>
                <Activity className="w-4 h-4 text-amber-400" />
                Audit Logs
              </NavLink>
              <NavLink to="/notifications" className={navItemClass}>
                <Bell className="w-4 h-4" />
                Notifications
              </NavLink>
              <NavLink to="/settings" className={navItemClass}>
                <Settings className="w-4 h-4" />
                Settings
              </NavLink>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 2. ADMIN NAVIGATION
    // ============================================
    if (role === 'ADMIN') {
      return (
        <div className="space-y-5">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Operations Control
            </p>
            <div className="space-y-1">
              <NavLink to="/admin/dashboard" className={navItemClass}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Fleet &amp; Dispatch
            </p>
            <div className="space-y-1">
              <NavLink to="/clients" className={navItemClass}>
                <Building2 className="w-4 h-4" />
                Clients
              </NavLink>
              <NavLink to="/branches" className={navItemClass}>
                <GitFork className="w-4 h-4" />
                Branches
              </NavLink>
              <NavLink to="/vehicles" className={navItemClass}>
                <Car className="w-4 h-4" />
                Vehicles
              </NavLink>
              <NavLink to="/drivers" className={navItemClass}>
                <Users className="w-4 h-4" />
                Drivers
              </NavLink>
              <NavLink to="/deliveries" className={navItemClass}>
                <Package className="w-4 h-4" />
                Deliveries
              </NavLink>
              <NavLink to="/maintenance" className={navItemClass}>
                <Wrench className="w-4 h-4" />
                Maintenance
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Reporting &amp; System
            </p>
            <div className="space-y-1">
              <NavLink to="/reports" className={navItemClass}>
                <BarChart3 className="w-4 h-4" />
                Reports
              </NavLink>
              <NavLink to="/notifications" className={navItemClass}>
                <Bell className="w-4 h-4" />
                Notifications
              </NavLink>
              <NavLink to="/settings" className={navItemClass}>
                <Settings className="w-4 h-4" />
                Profile
              </NavLink>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 3. DISPATCHER NAVIGATION (FleetHub Operations)
    // ============================================
    if (role === 'DISPATCHER') {
      return (
        <div className="space-y-5">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Dispatch Control
            </p>
            <div className="space-y-1">
              <NavLink to="/dispatcher/dashboard" className={navItemClass}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
              <NavLink to="/deliveries?status=REQUESTED,WAITING_FOR_DRIVER,DRIVER_REJECTED" className={navItemClass}>
                <Radio className="w-4 h-4 text-amber-400" />
                Pending Dispatch
              </NavLink>
              <NavLink to="/deliveries" className={navItemClass}>
                <Package className="w-4 h-4" />
                All Deliveries
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              FleetHub Resources
            </p>
            <div className="space-y-1">
              <NavLink to="/drivers" className={navItemClass}>
                <Users className="w-4 h-4" />
                Available Drivers
              </NavLink>
              <NavLink to="/vehicles" className={navItemClass}>
                <Car className="w-4 h-4" />
                Available Vehicles
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Account
            </p>
            <div className="space-y-1">
              <NavLink to="/notifications" className={navItemClass}>
                <Bell className="w-4 h-4" />
                Notifications
              </NavLink>
              <NavLink to="/settings" className={navItemClass}>
                <Settings className="w-4 h-4" />
                Profile
              </NavLink>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 4. CLIENT NAVIGATION (Section 2 Specification)
    // ============================================
    if (role === 'CLIENT' || ['CLIENT_ADMIN', 'CLIENT_USER'].includes(role)) {
      return (
        <div className="space-y-5">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Overview
            </p>
            <div className="space-y-1">
              <NavLink to="/client/dashboard" className={navItemClass}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Deliveries
            </p>
            <div className="space-y-1">
              <NavLink to="/deliveries?action=create" className={navItemClass}>
                <PlusCircle className="w-4 h-4 text-amber-400" />
                Create Delivery
              </NavLink>
              <NavLink to="/deliveries" className={navItemClass}>
                <Package className="w-4 h-4" />
                Delivery Orders
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Branches
            </p>
            <div className="space-y-1">
              <NavLink to="/branches" className={navItemClass}>
                <GitFork className="w-4 h-4" />
                My Branches
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Account
            </p>
            <div className="space-y-1">
              <NavLink to="/notifications" className={navItemClass}>
                <Bell className="w-4 h-4" />
                Notifications
              </NavLink>
              <NavLink to="/settings" className={navItemClass}>
                <Settings className="w-4 h-4" />
                Profile &amp; Settings
              </NavLink>
            </div>
          </div>
        </div>
      );
    }

    // ============================================
    // 5. DRIVER NAVIGATION (Section 17 Specification)
    // ============================================
    if (role === 'DRIVER') {
      return (
        <div className="space-y-5">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Terminal
            </p>
            <div className="space-y-1">
              <NavLink to="/driver/dashboard" className={navItemClass}>
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              My Deliveries
            </p>
            <div className="space-y-1">
              <NavLink to="/deliveries?status=DRIVER_ASSIGNED,ASSIGNED" className={navItemClass}>
                <Clock className="w-4 h-4 text-amber-400" />
                New Assignments
              </NavLink>
              <NavLink to="/deliveries?status=ACCEPTED,PICKED_UP,OUT_FOR_DELIVERY" className={navItemClass}>
                <Package className="w-4 h-4 text-purple-400" />
                Active Deliveries
              </NavLink>
              <NavLink to="/deliveries?status=DELIVERED" className={navItemClass}>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Completed Deliveries
              </NavLink>
            </div>
          </div>

          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Account &amp; Security
            </p>
            <div className="space-y-1">
              <NavLink to="/driver/profile" className={navItemClass}>
                <User className="w-4 h-4 text-amber-400" />
                Driver Profile
              </NavLink>
              <NavLink to="/driver/change-password" className={navItemClass}>
                <KeyRound className="w-4 h-4 text-slate-400" />
                Change Password
              </NavLink>
              <NavLink to="/notifications" className={navItemClass}>
                <Bell className="w-4 h-4" />
                Notifications
              </NavLink>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* 1. Desktop Sidebar: fixed below 64px navbar, width 240px (w-60), independent scroll */}
      <aside className="hidden md:flex flex-col fixed top-16 left-0 bottom-0 w-60 bg-dark-900 border-r border-dark-700/60 z-40 select-none overflow-y-auto">
        {/* Navigation Category Header */}
        <div className="px-4 py-3.5 border-b border-dark-700/60 bg-dark-950/40">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 truncate">
            {roleSubtitle}
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4">
          {renderNavLinks()}
        </div>

        {/* User Role Footer */}
        <div className="p-3.5 border-t border-dark-700/60 bg-dark-950/30 mt-auto">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {role}
            </span>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Slide-out Drawer & Overlay */}
      {mobileOpen && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 top-16 bg-black/60 backdrop-blur-xs z-40 transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          <aside className="fixed top-16 left-0 bottom-0 w-60 max-w-[80vw] bg-dark-900 border-r border-dark-700/60 z-50 flex flex-col overflow-y-auto select-none shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="px-4 py-3 border-b border-dark-700/60 bg-dark-950/60 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 truncate">
                {roleSubtitle}
              </p>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3.5 py-4" onClick={handleNavClick}>
              {renderNavLinks()}
            </div>

            <div className="p-3.5 border-t border-dark-700/60 bg-dark-950/40 mt-auto">
              <div className="flex items-center justify-between">
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {role}
                </span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
