import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Users,
  Car,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Activity,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DeliveryModal from '../../components/deliveries/DeliveryModal';
import FleetHubLogo from '../../components/common/FleetHubLogo';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports/dashboard');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load super admin stats:', err);
      setError('Unable to load super admin dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-dark-800 to-dark-900 border border-dark-700/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-amber-400 mb-2">
            <FleetHubLogo variant="dashboard" className="w-[145px] h-auto object-contain" />
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>SUPER ADMIN PLATFORM MASTER CONTROL</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            FleetHub Master Operations &amp; Platform Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Centralized platform oversight across all administrators, client accounts, fleet vehicles, and deliveries.
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

          <Link
            to="/super-admin/admins"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20"
          >
            <ShieldCheck className="w-4 h-4" />
            Manage Admins
          </Link>
        </div>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchStats} />}

      {loading && !stats ? (
        <LoadingSpinner text="Fetching platform metrics..." fullScreen />
      ) : (
        <>
          {/* Key Platform Metrics Grid (9 required metrics) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* 1. Total Admins */}
            <Link
              to="/super-admin/admins"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-amber-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Total Admins
                </span>
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white">{stats?.totalAdmins ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Platform Admins</p>
            </Link>

            {/* 2. Total Clients */}
            <Link
              to="/clients"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-blue-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                  Total Clients
                </span>
                <Building2 className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white">{stats?.totalClients ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Active Businesses</p>
            </Link>

            {/* 3. Total Drivers */}
            <Link
              to="/drivers"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-purple-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                  Total Drivers
                </span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-black text-white">{stats?.totalDrivers ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Registered Couriers</p>
            </Link>

            {/* 4. Total Vehicles */}
            <Link
              to="/vehicles"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-amber-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Total Vehicles
                </span>
                <Car className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white">{stats?.totalVehicles ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Fleet Assets</p>
            </Link>

            {/* 5. Total Deliveries */}
            <Link
              to="/deliveries"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-indigo-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                  Total Deliveries
                </span>
                <Package className="w-4 h-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-black text-white">{stats?.totalDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Lifetime Orders</p>
            </Link>

            {/* 6. Active Deliveries */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Active
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400">{stats?.activeDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">In Transit / Assigned</p>
            </div>

            {/* 7. Completed Deliveries */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Completed
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">{stats?.completedDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Successfully Fulfilled</p>
            </div>

            {/* 8. Cancelled Deliveries */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  Cancelled
                </span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-rose-400">{stats?.cancelledOrders ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Cancelled Orders</p>
            </div>

            {/* 9. Vehicles in Maintenance */}
            <Link
              to="/maintenance"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-amber-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  In Maintenance
                </span>
                <Wrench className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-rose-400">{stats?.vehiclesInMaintenance ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Vehicles Under Repair</p>
            </Link>

            {/* 10. Security Audit Trail Quick Card */}
            <Link
              to="/super-admin/audit-logs"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-amber-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Audit Logs
                </span>
                <Activity className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xs font-bold text-white mt-1">Real-time Trail</p>
              <p className="text-[10px] text-slate-400 mt-1">Inspect Security Events →</p>
            </Link>
          </div>

          {/* Recent Platform Deliveries */}
          <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-dark-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Live Platform Deliveries</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Latest delivery requests across all clients and branches
                </p>
              </div>
              <Link
                to="/deliveries"
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                All Deliveries <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-900/50 border-b border-dark-700/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Driver</th>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50 text-slate-300">
                  {stats?.recentDeliveries?.map((d) => (
                    <tr key={d._id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{d.orderId}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{d.clientId?.name || '—'}</td>
                      <td className="py-3.5 px-4">{d.driverId?.name || <span className="text-slate-500">Unassigned</span>}</td>
                      <td className="py-3.5 px-4">{d.vehicleId?.vehicleNumber || '—'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-dark-900 border border-dark-700 text-slate-200">
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">₹{d.amount}</td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isDeliveryModalOpen && (
        <DeliveryModal
          isOpen={isDeliveryModalOpen}
          onClose={() => setIsDeliveryModalOpen(false)}
          onSuccess={fetchStats}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;
