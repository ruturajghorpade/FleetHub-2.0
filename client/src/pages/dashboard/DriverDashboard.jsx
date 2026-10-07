import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  KeyRound,
  ShieldAlert,
  Eye,
  EyeOff,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import EmptyState from '../../components/common/EmptyState';
import FleetHubLogo from '../../components/common/FleetHubLogo';
import Modal from '../../components/common/Modal';
import { validateTextLength, validatePassword } from '../../utils/validation';

const REJECTION_REASONS = [
  'Not Available',
  'End of Shift',
  'Vehicle Issue',
  'Too Far',
  'Other',
];

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user, changePassword } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSuccess, setStatusSuccess] = useState('');
  const [availabilityUpdating, setAvailabilityUpdating] = useState(false);

  // Forced Password Change Modal state (when user.mustChangePassword is true)
  const [forcePasswordOpen, setForcePasswordOpen] = useState(!!user?.mustChangePassword);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Rejection modal
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState(REJECTION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [rejectFieldError, setRejectFieldError] = useState('');

  const fetchDriverData = async (signal) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports/dashboard', { signal });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('Failed to load driver dashboard:', err);
      setError('Unable to load driver delivery information.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchDriverData(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (user?.mustChangePassword) {
      setForcePasswordOpen(true);
    }
  }, [user?.mustChangePassword]);

  // Update Driver Availability (AVAILABLE, ON_BREAK, OFF_DUTY)
  const handleAvailabilityChange = async (newStatus) => {
    try {
      setAvailabilityUpdating(true);
      setStatusSuccess('');
      setError('');

      const res = await api.patch('/drivers/availability', { status: newStatus });
      if (res.data?.success) {
        setStatusSuccess(`Duty status updated to ${newStatus.replace(/_/g, ' ')}`);
        await fetchDriverData();
        setTimeout(() => setStatusSuccess(''), 3500);
      }
    } catch (err) {
      console.error('Failed to update availability:', err);
      setError(err.response?.data?.message || 'Failed to update duty availability.');
    } finally {
      setAvailabilityUpdating(false);
    }
  };

  // Handle Forced Password Change Modal Close (X button, Backdrop, ESC)
  const handleClosePasswordModal = () => {
    if (user?.mustChangePassword) {
      setPasswordError('Password change is required before you can continue.');
      return;
    }
    setForcePasswordOpen(false);
  };

  // Handle Forced Password Change Submit
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (changingPass) return;

    setPasswordError('');
    setPasswordSuccess('');

    // 1. Current temporary password is required
    if (!currentPassword || !currentPassword.trim()) {
      setPasswordError('Current temporary password is required.');
      return;
    }

    // 2. New password is required
    if (!newPassword) {
      setPasswordError('New password is required.');
      return;
    }

    // 3. Confirm password is required
    if (!confirmPassword) {
      setPasswordError('Please confirm your new password.');
      return;
    }

    // 4. New password and Confirm password must match
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and Confirm password must match.');
      return;
    }

    // 5. New password must satisfy existing password rules
    const passErr = validatePassword(newPassword, 'New password');
    if (passErr) {
      setPasswordError(passErr);
      return;
    }

    // 6. New password must not be the same as the temporary password
    if (newPassword === currentPassword) {
      setPasswordError('New password cannot be the same as the temporary password.');
      return;
    }

    try {
      setChangingPass(true);
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (res?.success) {
        setPasswordSuccess('Password successfully updated! Your account is fully active.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setForcePasswordOpen(false);
          setPasswordSuccess('');
          navigate('/driver/dashboard');
        }, 800);
      } else {
        setPasswordError(res?.message || 'Failed to update password.');
      }
    } catch (err) {
      console.error('Password change failed:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.currentPassword ||
        err.response?.data?.errors?.newPassword ||
        err.message ||
        'Failed to update password. Check temporary password.';
      setPasswordError(errorMsg);
    } finally {
      setChangingPass(false);
    }
  };

  // Accept Delivery
  const handleAcceptDelivery = async (deliveryId) => {
    try {
      setUpdatingStatus(true);
      setStatusSuccess('');
      setError('');

      const res = await api.patch(`/deliveries/${deliveryId}/accept`);
      if (res.data?.success) {
        setStatusSuccess('Delivery ACCEPTED! Your vehicle is now assigned for this order.');
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

  // Reject Delivery
  const handleRejectDelivery = async (e) => {
    e.preventDefault();
    if (!activeDelivery) return;
    setRejectFieldError('');

    if (selectedReason === 'Other') {
      const err = validateTextLength(customReason, 'Rejection reason', 3, 250);
      if (err) {
        setRejectFieldError(err);
        return;
      }
    }

    try {
      setRejecting(true);
      setError('');
      const finalReason =
        selectedReason === 'Other' && customReason.trim()
          ? customReason.trim()
          : selectedReason;

      const res = await api.patch(`/deliveries/${activeDelivery._id}/reject`, {
        reason: finalReason,
      });

      if (res.data?.success) {
        setIsRejectModalOpen(false);
        setCustomReason('');
        setRejectFieldError('');
        setStatusSuccess('Delivery rejected. Order has returned to Dispatcher queue.');
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

  // Linear status progression
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
  const driverProfile = data?.driver;
  const currentAvailability = activeDelivery ? 'BUSY' : driverProfile?.status || 'AVAILABLE';

  return (
    <div className="space-y-5 max-w-4xl mx-auto px-1 sm:px-0">
      {/* Forced Password Change Notice Banner if flagged */}
      {user?.mustChangePassword && !forcePasswordOpen && (
        <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-300">Action Required: Change Temporary Password</p>
              <p className="text-xs text-amber-300/80">You are currently using a temporary password.</p>
            </div>
          </div>
          <button
            onClick={() => setForcePasswordOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
          >
            Set New Password Now
          </button>
        </div>
      )}

      {/* Top Welcome & Availability Banner (Mobile Optimized) */}
      <div className="bg-gradient-to-r from-dark-800 to-dark-900 border border-dark-700/80 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1.5">
            <Bike className="w-4 h-4 text-amber-400" />
            <span className="tracking-wide">FLEETHUB DRIVER TERMINAL</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Welcome, {user?.name || driverProfile?.name || 'Partner'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            View assigned on-demand orders, accept deliveries, and fulfill drop-offs.
          </p>
        </div>

        {/* Availability Toggle / Dropdown */}
        <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-dark-700/60">
          <div className="flex flex-col sm:items-end">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Duty Availability:
            </span>
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  currentAvailability === 'AVAILABLE'
                    ? 'bg-emerald-400 animate-pulse'
                    : currentAvailability === 'BUSY'
                    ? 'bg-amber-400 animate-ping'
                    : currentAvailability === 'ON_BREAK'
                    ? 'bg-blue-400'
                    : 'bg-slate-500'
                }`}
              />
              <span
                className={`text-xs font-bold ${
                  currentAvailability === 'AVAILABLE'
                    ? 'text-emerald-400'
                    : currentAvailability === 'BUSY'
                    ? 'text-amber-400'
                    : currentAvailability === 'ON_BREAK'
                    ? 'text-blue-400'
                    : 'text-slate-400'
                }`}
              >
                {currentAvailability === 'BUSY' ? 'BUSY (ON TRIP)' : currentAvailability}
              </span>
            </div>
          </div>

          {/* Quick toggle if not busy */}
          {currentAvailability !== 'BUSY' ? (
            <select
              value={driverProfile?.status || 'AVAILABLE'}
              disabled={availabilityUpdating}
              onChange={(e) => handleAvailabilityChange(e.target.value)}
              className="bg-dark-900 border border-dark-700 text-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="AVAILABLE">AVAILABLE (On Duty)</option>
              <option value="ON_BREAK">ON BREAK</option>
              <option value="OFF_DUTY">OFF DUTY</option>
            </select>
          ) : (
            <span className="text-[11px] font-semibold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl">
              Fulfilling order
            </span>
          )}

          <button
            onClick={fetchDriverData}
            className="p-2 rounded-xl bg-dark-700/60 hover:bg-dark-700 border border-dark-600/50 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {statusSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-md">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusSuccess}</span>
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={fetchDriverData} />}

      {loading && !data ? (
        <LoadingSpinner text="Connecting to FleetHub Dispatch..." fullScreen />
      ) : (
        <>
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                  Today's Orders
                </span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white">{data?.todaysDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Assigned today</p>
            </div>

            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  New Assignments
                </span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-black text-amber-400">
                {data?.pendingAssignments ?? (activeDelivery?.status === 'DRIVER_ASSIGNED' ? 1 : 0)}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Awaiting accept</p>
            </div>

            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400">
                  Active Trip
                </span>
                <Navigation className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-black text-purple-400">{activeDelivery ? 1 : 0}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Currently on duty</p>
            </div>

            <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Completed
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-black text-emerald-400">{data?.completedDeliveries ?? 0}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Total delivered</p>
            </div>
          </div>

          {/* ACTIVE DELIVERY CARD (Mobile-First Touch Target) */}
          {activeDelivery ? (
            <div className="bg-gradient-to-br from-amber-500/10 via-dark-800 to-dark-800 border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    {activeDelivery.status === 'DRIVER_ASSIGNED'
                      ? 'NEW DELIVERY ASSIGNMENT'
                      : 'ACTIVE DELIVERY IN PROGRESS'}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Column: Order & Customer Information */}
                <div className="space-y-3.5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 font-medium">Order ID:</span>
                      <p className="text-xl font-black text-white font-mono">{activeDelivery.orderId}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 font-medium">Order Amount:</span>
                      <p className="text-lg font-black text-emerald-400">₹{activeDelivery.amount}</p>
                    </div>
                  </div>

                  {/* Customer & Address Details */}
                  <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-700/80 space-y-3 text-xs">
                    {/* Customer Name & Phone */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {activeDelivery.customerName?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{activeDelivery.customerName}</p>
                          <p className="text-slate-400 font-mono text-[11px]">{activeDelivery.customerPhone}</p>
                        </div>
                      </div>
                      <a
                        href={`tel:${activeDelivery.customerPhone}`}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 font-bold text-xs hover:bg-emerald-500/30 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    </div>

                    {/* Pickup Branch */}
                    {activeDelivery.branchId && (
                      <div className="pt-2 border-t border-dark-700/60 flex items-start gap-2 text-[11px]">
                        <Building2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-300">
                            Pickup Branch: {activeDelivery.branchId?.name}
                          </p>
                          <p className="text-slate-400">{activeDelivery.branchId?.address}</p>
                        </div>
                      </div>
                    )}

                    {/* Drop-off Address */}
                    <div className="pt-2 border-t border-dark-700/60 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-200">Delivery Drop-off Address:</p>
                        <p className="text-slate-300 mt-0.5 font-medium leading-relaxed">
                          {activeDelivery.deliveryAddress}
                        </p>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="pt-2 border-t border-dark-700/60 flex items-start gap-2 text-[11px]">
                      <Package className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-400">Order Items: </span>
                        <span className="text-slate-200 font-medium">{activeDelivery.orderItems}</span>
                      </div>
                    </div>

                    {activeDelivery.deliveryNotes && (
                      <div className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 text-amber-300 text-[11px]">
                        <strong>Notes:</strong> {activeDelivery.deliveryNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Vehicle & Big Action Buttons */}
                <div className="flex flex-col justify-between space-y-4">
                  {/* Vehicle Card */}
                  <div className="p-4 rounded-2xl bg-dark-900/90 border border-dark-700/80 space-y-2 text-xs">
                    <p className="font-semibold text-slate-300 flex items-center gap-2">
                      <Car className="w-4 h-4 text-amber-400" />
                      Assigned FleetHub Vehicle
                    </p>
                    {assignedVehicle ? (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-slate-400">Plate Number:</span>
                          <p className="font-mono font-bold text-white uppercase text-sm mt-0.5">
                            {assignedVehicle.vehicleNumber}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Type / Model:</span>
                          <p className="font-medium text-white mt-0.5">
                            {assignedVehicle.vehicleType} · {assignedVehicle.model}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-xs italic">Vehicle assigned with order dispatch.</p>
                    )}
                  </div>

                  {/* ACTION BUTTONS (Mobile First Large Touch Targets) */}
                  <div className="space-y-3 pt-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Required Action:
                    </p>

                    {/* 1. DRIVER_ASSIGNED: ACCEPT or REJECT */}
                    {(activeDelivery.status === 'DRIVER_ASSIGNED' || activeDelivery.status === 'ASSIGNED') && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          disabled={updatingStatus}
                          onClick={() => handleAcceptDelivery(activeDelivery._id)}
                          className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition cursor-pointer disabled:opacity-50 active:scale-98"
                        >
                          <Check className="w-5 h-5 stroke-[3]" />
                          ACCEPT DELIVERY
                        </button>
                        <button
                          disabled={updatingStatus}
                          onClick={() => setIsRejectModalOpen(true)}
                          className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-sm border border-rose-500/40 transition cursor-pointer disabled:opacity-50 active:scale-98"
                        >
                          <XCircle className="w-5 h-5" />
                          REJECT DELIVERY
                        </button>
                      </div>
                    )}

                    {/* 2. ACCEPTED: Next is PICKED_UP */}
                    {activeDelivery.status === 'ACCEPTED' && (
                      <button
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(activeDelivery._id, 'PICKED_UP')}
                        className="w-full py-4 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/25 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
                      >
                        <Package className="w-5 h-5" />
                        MARK AS PICKED UP (FROM BRANCH)
                      </button>
                    )}

                    {/* 3. PICKED_UP: Next is OUT_FOR_DELIVERY */}
                    {activeDelivery.status === 'PICKED_UP' && (
                      <button
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(activeDelivery._id, 'OUT_FOR_DELIVERY')}
                        className="w-full py-4 px-4 rounded-2xl bg-purple-500 hover:bg-purple-400 text-white font-black text-sm shadow-xl shadow-purple-500/25 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
                      >
                        <Navigation className="w-5 h-5" />
                        START DELIVERY (OUT FOR DELIVERY)
                      </button>
                    )}

                    {/* 4. OUT_FOR_DELIVERY: Next is DELIVERED */}
                    {activeDelivery.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus(activeDelivery._id, 'DELIVERED')}
                        className="w-full py-4 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base shadow-2xl shadow-emerald-500/30 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
                      >
                        <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
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
                description={`You are currently ${currentAvailability}. When a FleetHub dispatcher assigns an order to you, it will appear here instantly.`}
              />
            </div>
          )}

          {/* Delivery History */}
          <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-dark-700/60 flex items-center justify-between">
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
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Drop-off Address</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/50 text-slate-300">
                  {data?.deliveryHistory?.length > 0 ? (
                    data.deliveryHistory.map((d) => (
                      <tr key={d._id} className="hover:bg-dark-700/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">{d.orderId}</td>
                        <td className="py-3 px-4 font-semibold text-white">{d.customerName}</td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-400">{d.deliveryAddress}</td>
                        <td className="py-3 px-4 font-mono text-slate-300">
                          {d.vehicleId?.vehicleNumber || '—'}
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4 font-bold text-white text-right">₹{d.amount}</td>
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

      {/* Driver Rejection Modal (Requirements 13 & 15) */}
      {isRejectModalOpen && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Reject Delivery — ${activeDelivery?.orderId}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleRejectDelivery} className="space-y-4">
            <p className="text-xs text-slate-300">
              Please specify a reason for rejecting this assignment. The delivery will return to the Dispatcher queue and your availability will be restored.
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
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
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
                  placeholder="e.g. Front tire puncture / Road impassable"
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
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 rounded-xl hover:bg-dark-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejecting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-all shadow-md shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Force Change Password Modal (Requirement 19: Mandatory on first temporary login) */}
      <Modal
        isOpen={forcePasswordOpen}
        onClose={handleClosePasswordModal}
        title="Set Your Personal Password"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-amber-300">First-Time Setup Required</p>
              <p className="text-amber-300/80 mt-0.5">
                You signed in with a temporary password provided by FleetHub Administration.
                Please choose a new permanent password to secure your Driver Terminal.
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="current-temporary-password">
              Current Temporary Password <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <input
                id="current-temporary-password"
                name="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Enter temporary password"
                required
                autoComplete="current-password"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                aria-label={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="new-password">
              New Password <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <input
                id="new-password"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Minimum 8 characters"
                required
                autoComplete="new-password"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Must be at least 8 characters and contain uppercase, lowercase, number, and special symbol.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="confirm-new-password">
              Confirm New Password <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <input
                id="confirm-new-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder="Re-type new password"
                required
                autoComplete="new-password"
                className="w-full bg-dark-900 border border-dark-700 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer p-1"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={changingPass}
              className="w-full py-3 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {changingPass ? 'Saving Password...' : 'Save New Password & Continue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DriverDashboard;
