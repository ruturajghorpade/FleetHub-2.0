import React, { useState, useEffect } from 'react';
import {
  Bike,
  Package,
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Car,
  RefreshCw,
  Navigation,
  Calendar,
  AlertCircle,
  XCircle,
  X,
  Check,
} from 'lucide-react';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import FleetHubLogo from '../../components/common/FleetHubLogo';
import Modal from '../../components/common/Modal';
import { validateTextLength } from '../../utils/validation';

const REJECTION_REASONS = [
  'Not Available',
  'End of Shift',
  'Vehicle Issue',
  'Too Far',
  'Other',
];

const DriverDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState('');

  // Rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectFieldError, setRejectFieldError] = useState('');

  const fetchDriverData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports/dashboard');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load driver dashboard:', err);
      setError('Unable to load driver delivery information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverData();
  }, []);

  const handleAcceptDelivery = async (deliveryId) => {
    try {
      setUpdatingStatus(true);
      setStatusSuccess('');
      setError('');

      const res = await api.patch(`/deliveries/${deliveryId}/accept`);
      if (res.data?.success) {
        setStatusSuccess('Delivery ACCEPTED! Your vehicle is now in use.');
        await fetchDriverData();
        setTimeout(() => setStatusSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Failed to accept delivery:', err);
      setError(err.response?.data?.message || 'Failed to accept delivery.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRejectDelivery = async (e) => {
    e.preventDefault();
    if (!activeDelivery) return;
    setRejectFieldError('');

    if (selectedReason === 'Other') {
      const err = validateTextLength(customReason, 'Rejection reason', 5, 250);
      if (err) {
        setRejectFieldError(err);
        return;
      }
    }

    try {
      setRejecting(true);
      setError('');
      const finalReason = selectedReason === 'Other' && customReason.trim()
        ? customReason.trim()
        : selectedReason;

      const res = await api.patch(`/deliveries/${activeDelivery._id}/reject`, {
        reason: finalReason,
      });

      if (res.data?.success) {
        setIsRejectModalOpen(false);
        setCustomReason('');
        setRejectFieldError('');
        setStatusSuccess('Delivery rejected. Reverted to Dispatcher queue.');
        await fetchDriverData();
        setTimeout(() => setStatusSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Failed to reject delivery:', err);
      const backendErr = err.response?.data?.message || 'Failed to reject delivery.';
      setError(backendErr);
      if (err.response?.data?.errors?.reason) {
        setRejectFieldError(err.response.data.errors.reason);
      }
    } finally {
      setRejecting(false);
    }
  };

  const handleUpdateStatus = async (deliveryId, nextStatus) => {
    try {
      setUpdatingStatus(true);
      setStatusSuccess('');
      setError('');

      const res = await api.patch(`/deliveries/${deliveryId}/status`, { status: nextStatus });
      if (res.data?.success) {
        setStatusSuccess(`Status successfully updated to ${nextStatus.replace(/_/g, ' ')}!`);
        await fetchDriverData();
        setTimeout(() => setStatusSuccess(''), 4000);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err.response?.data?.message || 'Failed to update delivery status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const activeDelivery = data?.activeDelivery;
  const assignedVehicle = data?.assignedVehicle || activeDelivery?.vehicleId;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-dark-800 to-dark-900 border border-dark-700/80 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold text-amber-400 mb-2">
            <FleetHubLogo variant="dashboard" className="w-[145px] h-auto object-contain" />
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5">
              <Bike className="w-4 h-4" />
              <span>DRIVER TERMINAL / FLEETHUB PARTNER</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Delivery Route &amp; Active Task Fulfillment
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Accept assignments, track drop-off locations, and update order statuses in real time.
          </p>
        </div>

        <button
          onClick={fetchDriverData}
          className="p-2.5 rounded-xl bg-dark-700/60 hover:bg-dark-700 border border-dark-600/50 text-slate-300 hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
        </button>
      </div>

      {statusSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {statusSuccess}
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={fetchDriverData} />}

      {loading && !data ? (
        <LoadingSpinner text="Connecting to dispatcher..." fullScreen />
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Today's Orders
                </span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white">{data?.todaysDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Assigned today</p>
            </div>

            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Active Task
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400">
                {activeDelivery ? 1 : 0}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Currently in progress</p>
            </div>

            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Total Completed
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">
                {data?.completedDeliveries ?? 0}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Delivered by you</p>
            </div>
          </div>

          {/* ACTIVE DELIVERY CARD */}
          {activeDelivery ? (
            <div className="bg-gradient-to-br from-amber-500/10 via-dark-800 to-dark-800 border-2 border-amber-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping"></span>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    CURRENT ASSIGNED DELIVERY
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    activeDelivery.status === 'DRIVER_ASSIGNED' || activeDelivery.status === 'ASSIGNED'
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : activeDelivery.status === 'ACCEPTED'
                      ? 'bg-blue-500 text-white'
                      : activeDelivery.status === 'PICKED_UP'
                      ? 'bg-indigo-500 text-white'
                      : activeDelivery.status === 'OUT_FOR_DELIVERY'
                      ? 'bg-purple-500 text-white'
                      : 'bg-emerald-500 text-slate-950'
                  }`}
                >
                  {activeDelivery.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium">Order Number:</span>
                    <p className="text-xl font-black text-white font-mono">{activeDelivery.orderId}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-dark-900/80 border border-dark-700/80 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-200">Delivery Drop-off Address:</p>
                        <p className="text-slate-300 mt-0.5 font-medium">{activeDelivery.deliveryAddress}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-dark-700/60">
                      <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <p className="text-slate-300">
                        Customer: <span className="font-bold text-white">{activeDelivery.customerName}</span> ({activeDelivery.customerPhone})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <p className="text-slate-300">
                        Items: <span className="text-white font-medium">{activeDelivery.orderItems}</span>
                      </p>
                    </div>

                    {activeDelivery.deliveryNotes && (
                      <div className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 text-amber-300 text-[11px] mt-1">
                        <strong>Notes:</strong> {activeDelivery.deliveryNotes}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-between space-y-4">
                  <div className="p-4 rounded-2xl bg-dark-900/80 border border-dark-700/80 space-y-2 text-xs">
                    <p className="font-semibold text-slate-300 flex items-center gap-2">
                      <Car className="w-4 h-4 text-amber-400" />
                      Assigned FleetHub Vehicle
                    </p>
                    {assignedVehicle ? (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-slate-400">Plate Number:</span>
                          <p className="font-mono font-bold text-white uppercase">{assignedVehicle.vehicleNumber}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Type / Model:</span>
                          <p className="font-medium text-white">{assignedVehicle.vehicleType} · {assignedVehicle.model}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs italic">Vehicle information will appear once assigned.</p>
                    )}

                    <div className="pt-2 border-t border-dark-700/60 flex items-center justify-between">
                      <span className="text-slate-400">Total Order Amount:</span>
                      <span className="text-base font-black text-emerald-400">₹{activeDelivery.amount}</span>
                    </div>
                  </div>

                  {/* Actions depending on Status (Sections 11, 12, 13, 18) */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Driver Actions:
                    </p>

                    {/* 1. DRIVER_ASSIGNED: Show Accept / Reject */}
                    {(activeDelivery.status === 'DRIVER_ASSIGNED' || activeDelivery.status === 'ASSIGNED') && (
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          disabled={updatingStatus}
                          onClick={() => handleAcceptDelivery(activeDelivery._id)}
                          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          ACCEPT DELIVERY
                        </button>
                        <button
                          disabled={updatingStatus}
                          onClick={() => setIsRejectModalOpen(true)}
                          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs border border-rose-500/40 transition cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          REJECT DELIVERY
                        </button>
                      </div>
                    )}

                    {/* 2. ACCEPTED: Next step is PICKED_UP */}
                    {activeDelivery.status === 'ACCEPTED' && (
                      <button
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(activeDelivery._id, 'PICKED_UP')}
                        className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        MARK AS PICKED UP (FROM BRANCH)
                      </button>
                    )}

                    {/* 3. PICKED_UP: Next step is OUT_FOR_DELIVERY */}
                    {activeDelivery.status === 'PICKED_UP' && (
                      <button
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(activeDelivery._id, 'OUT_FOR_DELIVERY')}
                        className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        START DELIVERY (OUT FOR DELIVERY)
                      </button>
                    )}

                    {/* 4. OUT_FOR_DELIVERY: Next step is DELIVERED */}
                    {activeDelivery.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(activeDelivery._id, 'DELIVERED')}
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                        COMPLETE DELIVERY (MARK AS DELIVERED)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-3xl p-8 text-center">
              <EmptyState
                icon={Bike}
                title="No active deliveries assigned"
                description="You are currently AVAILABLE for new assignments. When a FleetHub dispatcher assigns an order to you, it will appear here."
              />
            </div>
          )}

          {/* Delivery History */}
          <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-dark-700/60 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Your Delivery History</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recent deliveries completed or handled by you
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-dark-900/50 border-b border-dark-700/60 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Drop-off Address</th>
                    <th className="py-3.5 px-4">Vehicle</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 font-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50 text-slate-300">
                  {data?.deliveryHistory?.length > 0 ? (
                    data.deliveryHistory.map((d) => (
                      <tr key={d._id} className="hover:bg-dark-700/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{d.orderId}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">{d.customerName}</td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-slate-400">{d.deliveryAddress}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {d.vehicleId?.vehicleNumber || '—'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === 'DELIVERED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : d.status === 'CANCELLED'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-dark-900 border border-dark-700 text-slate-300'
                            }`}
                          >
                            {d.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">₹{d.amount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500 italic">
                        No previous delivery history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Driver Rejection Modal (Requirement 13) */}
      {isRejectModalOpen && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Reject Delivery — ${activeDelivery?.orderId}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleRejectDelivery} className="space-y-4">
            <p className="text-xs text-slate-300">
              Please specify a reason for rejecting this assignment. The delivery will return to the Dispatcher queue.
            </p>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Reason for Rejection <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  setRejectFieldError('');
                }}
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {REJECTION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {selectedReason === 'Other' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Specify Reason <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500">{customReason.length}/250</span>
                </div>
                <input
                  type="text"
                  maxLength={250}
                  value={customReason}
                  onChange={(e) => {
                    setCustomReason(e.target.value);
                    if (rejectFieldError) setRejectFieldError('');
                  }}
                  placeholder="e.g. Mechanical issue with front tire / Road blocked"
                  required
                  className={`w-full bg-dark-900 border ${
                    rejectFieldError
                      ? 'border-rose-500 focus:border-rose-500'
                      : 'border-dark-700 focus:border-amber-500'
                  } rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none transition-colors`}
                />
                {rejectFieldError && (
                  <p className="mt-1 text-xs text-rose-400 font-medium">{rejectFieldError}</p>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-dark-700/60 mt-4">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejecting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default DriverDashboard;
