import React, { useState, useEffect } from 'react';
import {
  Radio,
  Package,
  Users,
  Car,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  MapPin,
  Building2,
  ShieldAlert,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import AssignModal from '../../components/deliveries/AssignModal';
import FleetHubLogo from '../../components/common/FleetHubLogo';

const DispatcherDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDeliveryForAssign, setSelectedDeliveryForAssign] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDispatcherData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports/dashboard');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dispatcher data:', err);
      setError('Unable to load dispatcher operations data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispatcherData();
  }, []);

  const handleAssigned = (updatedDelivery) => {
    showToast(`Delivery ${updatedDelivery.orderId} assigned successfully to driver!`);
    fetchDispatcherData();
  };

  return (
    <div className="space-y-6">
      {/* Top Operations Header */}
      <div className="bg-gradient-to-r from-dark-800 to-dark-900 border border-dark-700/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-amber-400 mb-2">
            <FleetHubLogo variant="dashboard" className="w-[145px] h-auto object-contain" />
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>FLEETHUB DISPATCH CONSOLE / OPERATIONS</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Central On-Demand Dispatch &amp; Fleet Allocation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Assign available FleetHub drivers and vehicles to incoming restaurant food orders.
          </p>
        </div>

        <button
          onClick={fetchDispatcherData}
          className="p-2.5 rounded-xl bg-dark-700/60 hover:bg-dark-700 border border-dark-600/50 text-slate-300 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={fetchDispatcherData} />}

      {loading && !stats ? (
        <LoadingSpinner text="Connecting to FleetHub dispatch telemetry..." fullScreen />
      ) : (
        <>
          {/* Operations Metrics Grid (Section 9) */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* 1. New Requests */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                New Requests
              </span>
              <p className="text-2xl font-black text-white">{stats?.newRequests ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">REQUESTED status</p>
            </div>

            {/* 2. Waiting for Driver */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block mb-1">
                Waiting Driver
              </span>
              <p className="text-2xl font-black text-orange-400">{stats?.waitingForDriver ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Awaiting partner</p>
            </div>

            {/* 3. Driver Rejected */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
                Driver Rejected
              </span>
              <p className="text-2xl font-black text-rose-400">{stats?.driverRejected ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Needs reassignment</p>
            </div>

            {/* 4. Active Deliveries */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                Active In-Transit
              </span>
              <p className="text-2xl font-black text-purple-400">{stats?.activeDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">On the road</p>
            </div>

            {/* 5. Completed */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                Delivered
              </span>
              <p className="text-2xl font-black text-emerald-400">{stats?.completedDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Completed</p>
            </div>

            {/* 6. Assignment Failed */}
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block mb-1">
                Failed Attempts
              </span>
              <p className="text-2xl font-black text-rose-500">{stats?.assignmentFailed ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">&gt;=3 rejections</p>
            </div>

            {/* 7. Available Fleet */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                Available Fleet
              </span>
              <p className="text-lg font-black text-white">
                {stats?.availableDrivers ?? 0} <span className="text-xs font-medium text-slate-400">drvs</span> ·{' '}
                {stats?.availableVehicles ?? 0} <span className="text-xs font-medium text-slate-400">vehs</span>
              </p>
              <p className="text-[10px] text-amber-300/80 mt-0.5">Ready for dispatch</p>
            </div>
          </div>

          {/* Incoming Dispatch Queue */}
          <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-dark-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400" />
                  Dispatch Queue &amp; Recent Requests
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Orders requiring driver assignment, rejection resolution, or live dispatch monitoring
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-900/50 border-b border-dark-700/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Client / Restaurant</th>
                    <th className="py-3.5 px-4">Branch</th>
                    <th className="py-3.5 px-4">Customer &amp; Address</th>
                    <th className="py-3.5 px-4">Assigned Partner</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4 text-right">Dispatch Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50 text-slate-300">
                  {stats?.recentDeliveries?.map((d) => {
                    const needsAssignment = [
                      'REQUESTED',
                      'WAITING_FOR_DRIVER',
                      'DRIVER_REJECTED',
                      'ASSIGNMENT_FAILED',
                      'PENDING',
                    ].includes(d.status);

                    const canReassign = [
                      'DRIVER_ASSIGNED',
                      'ASSIGNED',
                      'ACCEPTED',
                    ].includes(d.status);

                    return (
                      <tr key={d._id} className="hover:bg-dark-700/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                          {d.orderId}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>{d.clientId?.name || 'Restaurant Client'}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          {d.branchId?.name || 'Main Branch'}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-semibold text-white">{d.customerName}</p>
                          <p className="text-slate-400 truncate">{d.deliveryAddress}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          {d.driverId ? (
                            <div>
                              <p className="font-semibold text-white">{d.driverId.name}</p>
                              <p className="text-[10px] text-slate-400">
                                {d.vehicleId?.vehicleNumber || d.driverId.phone}
                              </p>
                            </div>
                          ) : (
                            <span className="text-amber-400/80 italic text-[11px]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === 'REQUESTED'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : d.status === 'DRIVER_REJECTED'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : d.status === 'ASSIGNMENT_FAILED'
                                ? 'bg-rose-900/60 text-rose-200 border border-rose-700'
                                : d.status === 'WAITING_FOR_DRIVER'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : d.status === 'DELIVERED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-dark-900 border border-dark-700 text-slate-300'
                            }`}
                          >
                            {d.status.replace(/_/g, ' ')}
                          </span>
                          {d.rejectionReason && (
                            <p className="text-[10px] text-rose-400 mt-1 max-w-[140px] truncate" title={d.rejectionReason}>
                              Rej: {d.rejectionReason}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">₹{d.amount}</td>
                        <td className="py-3.5 px-4 text-right">
                          {needsAssignment ? (
                            <button
                              onClick={() => setSelectedDeliveryForAssign(d)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition cursor-pointer"
                            >
                              Assign Driver
                            </button>
                          ) : canReassign ? (
                            <button
                              onClick={() => setSelectedDeliveryForAssign(d)}
                              className="px-2.5 py-1 rounded-xl bg-dark-700 hover:bg-dark-600 text-slate-300 hover:text-white border border-dark-600 text-xs font-semibold transition cursor-pointer"
                            >
                              Reassign
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">No action</span>
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-950/90 text-emerald-200 border border-emerald-500/30 shadow-xl backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Assign Modal */}
      {selectedDeliveryForAssign && (
        <AssignModal
          isOpen={!!selectedDeliveryForAssign}
          onClose={() => setSelectedDeliveryForAssign(null)}
          delivery={selectedDeliveryForAssign}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
};

export default DispatcherDashboard;
