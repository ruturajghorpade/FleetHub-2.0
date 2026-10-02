import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, RefreshCw, CheckCircle, Clock, AlertTriangle, Package, Wrench } from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'DELIVERY_CREATED':
      case 'DELIVERY_ASSIGNED':
      case 'DELIVERY_DELIVERED':
      case 'DELIVERY_CANCELLED':
        return <Package className="w-5 h-5 text-amber-400" />;
      case 'MAINTENANCE_STARTED':
      case 'MAINTENANCE_COMPLETED':
        return <Wrench className="w-5 h-5 text-blue-400" />;
      default:
        return <Bell className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-amber-500" />
            System & Operations Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time activity logs for orders, driver assignments, and vehicle maintenance
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchNotifications}
            className="p-2.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700 text-slate-300 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchNotifications} />}

      {loading && notifications.length === 0 ? (
        <LoadingSpinner text="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="Operational notifications will automatically trigger when deliveries are created, assigned, completed, or cancelled."
        />
      ) : (
        <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden divide-y divide-dark-700/50">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                notif.isRead ? 'bg-transparent' : 'bg-amber-500/5 border-l-4 border-l-amber-500'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-dark-900 border border-dark-700/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-100">{notif.title}</h4>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{notif.message}</p>
                  <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {!notif.isRead && (
                <button
                  onClick={() => handleMarkAsRead(notif._id)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold px-2.5 py-1 rounded-lg bg-dark-700/50 hover:bg-dark-700 flex-shrink-0 transition-colors"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
