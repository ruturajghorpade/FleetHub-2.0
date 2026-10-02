import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Building2,
  Users,
  Car,
  Clock,
  CheckCircle2,
  XCircle,
  Wrench,
  ArrowUpRight,
  RefreshCw,
  Plus,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import DeliveryModal from '../../components/deliveries/DeliveryModal';
import AssignModal from '../../components/deliveries/AssignModal';
import FleetHubLogo from '../../components/common/FleetHubLogo';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [assignDelivery, setAssignDelivery] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports/dashboard');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError('Unable to load admin dashboard metrics.');
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
              <Shield className="w-4 h-4" />
              <span>FLEETHUB OPERATIONS MANAGEMENT</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Fleet Operations &amp; Dispatch Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor client delivery requests, assign drivers, and manage operational vehicle availability.
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
        <LoadingSpinner text="Fetching operations metrics..." fullScreen />
      ) : (
        <>
          {/* Operations Metrics Grid (8 required metrics) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Total Clients */}
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
              <p className="text-[10px] text-slate-400 mt-1">Active client accounts</p>
            </Link>

            {/* 2. Total Drivers */}
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
              <p className="text-[10px] text-slate-400 mt-1">Active fleet couriers</p>
            </Link>

            {/* 3. Total Vehicles */}
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
              <p className="text-[10px] text-slate-400 mt-1">Total registered fleet</p>
            </Link>

            {/* 4. Active Deliveries */}
            <Link
              to="/deliveries"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-amber-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Active Deliveries
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400">{stats?.activeDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">In transit / ongoing</p>
            </Link>

            {/* 5. Pending Deliveries */}
            <Link
              to="/deliveries"
              className="bg-dark-800/80 border border-dark-700/60 hover:border-amber-500/50 rounded-2xl p-4 shadow-sm transition-all"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Pending Deliveries
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400">{stats?.pendingDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Awaiting dispatch assignment</p>
            </Link>

            {/* 6. Completed Deliveries */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Completed Deliveries
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">{stats?.completedDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Successfully delivered</p>
            </div>

            {/* 7. Cancelled Deliveries */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                  Cancelled Deliveries
                </span>
                <XCircle className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-2xl font-black text-rose-400">{stats?.cancelledOrders ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Cancelled by client</p>
            </div>

            {/* 8. Vehicles in Maintenance */}
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
              <p className="text-[10px] text-slate-400 mt-1">Currently in garage</p>
            </Link>
          </div>

          {/* Recent Deliveries Table */}
          <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-dark-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Recent Operations Deliveries</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Latest dispatch queue and live delivery fulfillment
                </p>
              </div>
              <Link
                to="/deliveries"
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                View Deliveries Queue <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-900/50 border-b border-dark-700/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Client</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Driver</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50 text-slate-300">
                  {stats?.recentDeliveries?.map((d) => (
                    <tr key={d._id} className="hover:bg-dark-700/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{d.orderId}</td>
                      <td className="py-3.5 px-4 font-semibold text-white">{d.clientId?.name || '—'}</td>
                      <td className="py-3.5 px-4">{d.customerName}</td>
                      <td className="py-3.5 px-4">{d.driverId?.name || <span className="text-amber-400 font-medium">Unassigned</span>}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-dark-900 border border-dark-700 text-slate-200">
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white">₹{d.amount}</td>
                      <td className="py-3.5 px-4 text-right">
                        {['REQUESTED', 'WAITING_FOR_DRIVER', 'PENDING', 'DRIVER_REJECTED', 'ASSIGNMENT_FAILED'].includes(d.status) && (
                          <button
                            onClick={() => setAssignDelivery(d)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] shadow-sm cursor-pointer"
                          >
                            Assign Fleet
                          </button>
                        )}
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

      {assignDelivery && (
        <AssignModal
          isOpen={!!assignDelivery}
          onClose={() => setAssignDelivery(null)}
          delivery={assignDelivery}
          onSuccess={fetchStats}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
