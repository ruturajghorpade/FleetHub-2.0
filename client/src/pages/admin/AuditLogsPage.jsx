import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  User,
  Clock,
  Shield,
  Activity,
  Globe,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (actionFilter) params.action = actionFilter;
      if (roleFilter) params.role = roleFilter;

      const res = await api.get('/audit-logs', { params });
      if (res.data?.success) {
        setLogs(res.data.data || []);
        setTotalCount(res.data.total || res.data.count || 0);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError('Unable to load security audit logs from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadgeColor = (action) => {
    const act = (action || '').toLowerCase();
    if (act.includes('created')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (act.includes('deleted') || act.includes('deactivated'))
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (act.includes('cancelled')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (act.includes('login') || act.includes('logout'))
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (act.includes('assigned') || act.includes('updated'))
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-dark-800 to-dark-900 border border-dark-700/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <Activity className="w-4 h-4" />
            SECURITY &amp; COMPLIANCE AUDIT TRAIL
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Platform Audit Logs
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Chronological record of user authentication, admin activities, and fleet operational events.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            className="p-2.5 rounded-xl bg-dark-700/60 hover:bg-dark-700 border border-dark-600/50 text-slate-300 hover:text-white transition-colors"
            title="Refresh Audit Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchLogs} />}

      {/* Filter / Search Bar */}
      <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, details, user..."
            className="w-full bg-dark-900 border border-dark-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            <option value="ADMIN">ADMIN</option>
            <option value="CLIENT">CLIENT</option>
            <option value="DRIVER">DRIVER</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-dark-900 border border-dark-700 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none focus:border-amber-400 cursor-pointer"
          >
            <option value="">All Actions</option>
            <option value="Login">Login</option>
            <option value="Logout">Logout</option>
            <option value="Admin created">Admin created</option>
            <option value="Admin deactivated">Admin deactivated</option>
            <option value="Client created">Client created</option>
            <option value="Driver created">Driver created</option>
            <option value="Vehicle created">Vehicle created</option>
            <option value="Delivery created">Delivery created</option>
            <option value="Delivery assigned">Delivery assigned</option>
            <option value="Delivery cancelled">Delivery cancelled</option>
            <option value="Delivery completed">Delivery completed</option>
            <option value="Maintenance created">Maintenance created</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="py-12">
            <LoadingSpinner text="Fetching audit trail..." />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No Audit Logs Found"
            message="No security actions or system events match your current filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/50 border-b border-dark-700/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Resource</th>
                  <th className="py-3.5 px-4">Details</th>
                  <th className="py-3.5 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/50 text-slate-300">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div>
                        <p className="text-slate-100">{log.userName || 'System'}</p>
                        <p className="text-[10px] text-slate-400 font-normal">{log.userEmail || '—'}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{log.resource}</td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate" title={log.details}>
                      {log.details || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
