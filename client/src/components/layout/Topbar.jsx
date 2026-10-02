import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, LogOut, User, CheckCheck, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import FleetHubLogo from '../common/FleetHubLogo';

const Topbar = ({ title, subtitle, mobileOpen = false, onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoadingNotifs(true);
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data.slice(0, 5));
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Build header text based on user & role
  const clientName = user?.client?.name || user?.clientId?.name;
  let defaultTitle = 'Dashboard';
  if (user?.role === 'SUPER_ADMIN') {
    defaultTitle = 'Super Admin Control';
  } else if (user?.role === 'ADMIN') {
    defaultTitle = 'Operations Management';
  } else if (user?.role === 'DRIVER') {
    defaultTitle = 'Driver Terminal';
  } else if (user?.role === 'CLIENT') {
    defaultTitle = clientName ? `${clientName}` : 'Client Dashboard';
  }

  const displayTitle = title || defaultTitle;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-dark-900/95 backdrop-blur-md border-b border-dark-700/60 px-4 sm:px-6 flex items-center justify-between z-50 select-none">
      {/* Left: Mobile Hamburger + Primary Official Logo + Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile Menu Hamburger */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-dark-800 transition-colors -ml-1 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            title={mobileOpen ? 'Close navigation' : 'Open navigation'}
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Primary FleetHub Logo in Fixed Navbar (approx 110px) */}
        <Link
          to="/dashboard"
          className="flex items-center flex-shrink-0 transition-transform hover:scale-[1.02]"
          title="FleetHub Dashboard"
        >
          <FleetHubLogo
            variant="navbar"
            className="w-[110px] h-auto object-contain drop-shadow"
          />
        </Link>

        {/* Vertical Divider */}
        <span className="hidden sm:inline-block h-5 w-px bg-dark-700/80 mx-1" aria-hidden="true" />

        {/* Page Title */}
        <div className="hidden sm:block min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 truncate">
            {displayTitle}
          </h2>
          {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>

      {/* Right Controls: Role, Notifications, Profile, Logout */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
        {/* Role badge (Desktop/Tablet) */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-dark-800 border border-dark-700 text-xs font-semibold text-slate-300">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Role: <span className="text-amber-400 font-bold">{user?.role}</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-dark-800 border border-transparent hover:border-dark-700 transition-colors"
            title="Notifications"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-dark-800 border border-dark-700 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="p-3.5 border-b border-dark-700/80 bg-dark-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-dark-700/50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`p-3 text-xs transition-colors ${
                        notif.isRead ? 'bg-transparent text-slate-400' : 'bg-amber-500/5 text-slate-200 font-medium'
                      }`}
                    >
                      <p className="font-semibold text-slate-200">{notif.title}</p>
                      <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-dark-700/80 bg-dark-900/30 text-center">
                <button
                  onClick={() => {
                    setShowNotifDropdown(false);
                    navigate('/notifications');
                  }}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300"
                >
                  View All Notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu & Logout */}
        <div className="flex items-center gap-1 sm:gap-2 pl-2 border-l border-dark-700/60">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-dark-800 transition-colors text-left"
            title="Profile & Settings"
            aria-label="User Profile"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-slate-200 leading-tight truncate max-w-[120px]">
                {user?.name}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </button>

          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
            title="Sign Out"
            aria-label="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
