import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Ban,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DeliveryModal from '../../components/deliveries/DeliveryModal';
import CancelModal from '../../components/deliveries/CancelModal';
import TrackingModal from '../../components/deliveries/TrackingModal';
import FleetHubLogo from '../../components/common/FleetHubLogo';

const ClientDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [cancelDelivery, setCancelDelivery] = useState(null);
  const [trackingDelivery, setTrackingDelivery] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDeliveryCreated = async (createdDelivery) => {
    showToast('Delivery created successfully.');
    if (createdDelivery && createdDelivery._id) {
      setStats((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalDeliveries: (prev.totalDeliveries || 0) + 1,
          pendingDeliveries: (prev.pendingDeliveries || 0) + 1,
          recentDeliveries: [createdDelivery, ...(prev.recentDeliveries || [])],
        };
      });
    }
    await fetchStats();
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports/dashboard');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load client stats:', err);
      setError('Unable to load client dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const clientName = user?.client?.name || user?.clientId?.name || user?.name;

  return (
    <div className="space-y-6">
      {/* Top Client Header */}
      <div className="bg-gradient-to-r from-dark-800 to-dark-900 border border-dark-700/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-amber-400 mb-2">
            <FleetHubLogo variant="dashboard" className="w-[145px] h-auto object-contain" />
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4" />
              <span>RESTAURANT PORTAL / CLIENT DASHBOARD</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            {clientName ? (clientName.includes('Dashboard') ? clientName : `${clientName} — Delivery Dashboard`) : "Domino's Pizza — Delivery Dashboard"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track your restaurant delivery requests, view dispatched orders, and manage outlets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="p-2.5 rounded-xl bg-dark-700/60 hover:bg-dark-700 border border-dark-600/50 text-slate-300 hover:text-white transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          <button
            onClick={() => setIsDeliveryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Request Delivery
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchStats} />}

      {loading && !stats ? (
        <LoadingSpinner text="Fetching your deliveries..." fullScreen />
      ) : (
        <>
          {/* Client Metrics Grid (5 key metrics as requested in Section 11) */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* 1. Total Deliveries */}
            <Link
              to="/client/deliveries"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-amber-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Total Deliveries
                </span>
                <Package className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white">{stats?.totalDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">All requested orders</p>
            </Link>

            {/* 2. Pending Deliveries */}
            <Link
              to="/client/deliveries"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-amber-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Pending
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400">{stats?.pendingDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Awaiting dispatch</p>
            </Link>

            {/* 3. Active Deliveries */}
            <Link
              to="/client/deliveries"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-amber-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                  Active
                </span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-black text-purple-400">{stats?.activeDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Assigned / In transit</p>
            </Link>

            {/* 4. Completed Deliveries */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Completed
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">{stats?.completedDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Successfully delivered</p>
            </div>

            {/* 5. Cancelled Deliveries */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  Cancelled
                </span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-rose-400">{stats?.cancelledOrders ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Cancelled orders</p>
            </div>
          </div>

          {/* Recent Deliveries Table with Cancellation Rules */}
          <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-dark-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Recent Deliveries</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live tracking of recent customer food orders
                </p>
              </div>
              <Link
                to="/client/deliveries"
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                View All Deliveries <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-900/50 border-b border-dark-700/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Address</th>
                    <th className="py-3.5 px-4">Assigned Driver</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4 text-center">Track</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50 text-slate-300">
                  {stats?.recentDeliveries?.map((d) => {
                    const canCancel = ['REQUESTED', 'WAITING_FOR_DRIVER', 'PENDING', 'DRIVER_ASSIGNED', 'ASSIGNED', 'DRIVER_REJECTED', 'ASSIGNMENT_FAILED'].includes(d.status);
                    const isWaiting = d.status === 'WAITING_FOR_DRIVER' || d.status === 'REQUESTED';

                    return (
                      <tr key={d._id} className="hover:bg-dark-700/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                          <button
                            onClick={() => setTrackingDelivery(d)}
                            className="hover:underline font-mono text-left cursor-pointer"
                          >
                            {d.orderId}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">{d.customerName}</td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-400">{d.deliveryAddress}</td>
                        <td className="py-3.5 px-4">
                          {d.driverId?.name ? (
                            <span className="text-white font-medium">{d.driverId.name}</span>
                          ) : isWaiting ? (
                            <span className="text-amber-400/90 text-[11px] font-medium animate-pulse">
                              Finding partner...
                            </span>
                          ) : (
                            <span className="text-slate-500">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === 'DELIVERED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : d.status === 'CANCELLED'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : d.status === 'OUT_FOR_DELIVERY' || d.status === 'PICKED_UP'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-dark-900 border border-dark-700 text-amber-400'
                            }`}
                          >
                            {d.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">₹{d.amount}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setTrackingDelivery(d)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Track
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {canCancel ? (
                            <button
                              onClick={() => setCancelDelivery(d)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">
                              {d.status === 'DELIVERED'
                                ? 'Completed'
                                : d.status === 'CANCELLED'
                                ? 'Cancelled'
                                : 'In transit'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-500/30'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-500/30'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-xs font-semibold">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-slate-400 hover:text-white transition-colors ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isDeliveryModalOpen && (
        <DeliveryModal
          isOpen={isDeliveryModalOpen}
          onClose={() => setIsDeliveryModalOpen(false)}
          onCreated={handleDeliveryCreated}
          onSuccess={handleDeliveryCreated}
        />
      )}

      {cancelDelivery && (
        <CancelModal
          isOpen={!!cancelDelivery}
          onClose={() => setCancelDelivery(null)}
          delivery={cancelDelivery}
          onSuccess={() => {
            showToast('Delivery cancelled successfully.');
            fetchStats();
          }}
        />
      )}

      {trackingDelivery && (
        <TrackingModal
          isOpen={!!trackingDelivery}
          onClose={() => setTrackingDelivery(null)}
          delivery={trackingDelivery}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
