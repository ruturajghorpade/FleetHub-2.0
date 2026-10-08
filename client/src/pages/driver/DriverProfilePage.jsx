import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Mail,
  FileText,
  Calendar,
  MapPin,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Truck,
  Activity,
  Save,
  Lock,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DriverProfilePage = () => {
  const { user, changePassword } = useAuth();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Editable fields: Phone & Address
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Duty Availability state
  const [availability, setAvailability] = useState('AVAILABLE');
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  const fetchProfile = async () => {
    try {
      setProfileLoading(true);
      setErrorMsg('');
      const res = await api.get('/drivers/profile');
      if (res.data?.success && res.data.data) {
        const { driver, user: u, activeDelivery, assignedVehicle } = res.data.data;
        setProfileData({
          driver,
          user: u,
          activeDelivery,
          assignedVehicle,
        });
        setPhone(driver?.phone || u?.phone || '');
        setAddress(driver?.address || u?.address || '');
        setAvailability(driver?.status || 'AVAILABLE');
      }
    } catch (err) {
      console.error('Error fetching driver profile:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to load driver profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Update allowed contact fields
  const handleUpdateContact = async (e) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    setErrorMsg('');

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9][0-9]{9}$/.test(cleanPhone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number starting with 6-9.');
      return;
    }

    try {
      setSavingProfile(true);
      const res = await api.patch('/drivers/profile', {
        phone: cleanPhone,
        address: address.trim(),
      });

      if (res.data?.success) {
        setProfileSuccessMsg('Contact & address details updated successfully.');
        setPhone(cleanPhone);
        fetchProfile();
      }
    } catch (err) {
      console.error('Update contact error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update contact info.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Duty Availability
  const handleAvailabilityChange = async (newStatus) => {
    try {
      setUpdatingAvailability(true);
      setErrorMsg('');
      const res = await api.patch('/drivers/availability', { status: newStatus });
      if (res.data?.success) {
        setAvailability(newStatus);
        setProfileSuccessMsg(`Duty status updated to ${newStatus}.`);
      }
    } catch (err) {
      console.error('Update availability error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to update duty availability.');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  // Change Password
  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordSuccessMsg('');
    setPasswordErrorMsg('');

    if (!currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirmation do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await changePassword(currentPassword, newPassword, confirmPassword);
      if (res?.success) {
        setPasswordSuccessMsg('Password changed successfully! Keep your new credentials safe.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordErrorMsg(res?.message || 'Failed to update password.');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setPasswordErrorMsg(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" message="Loading your Driver Profile..." />
      </div>
    );
  }

  const driver = profileData?.driver || {};
  const activeDelivery = profileData?.activeDelivery;
  const assignedVehicle = profileData?.assignedVehicle;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-dark-700/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <User className="w-7 h-7 text-amber-500" />
            Driver Profile &amp; Terminal
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your duty availability, contact details, and account security
          </p>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`px-3 py-1 text-xs font-bold rounded-full border ${
              driver.status === 'INACTIVE'
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            ● Account: {driver.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'}
          </span>

          <span
            className={`px-3 py-1 text-xs font-bold rounded-full border ${
              availability === 'AVAILABLE'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : availability === 'BUSY'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
            }`}
          >
            Duty: {availability}
          </span>
        </div>
      </div>

      {/* Global Alerts */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {profileSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>{profileSuccessMsg}</span>
        </div>
      )}

      {/* Grid: Profile Info & Duty Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Duty Availability & Active Assignment */}
        <div className="space-y-6 md:col-span-1">
          {/* Duty Status Selector */}
          <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              Duty Availability
            </h2>
            <p className="text-xs text-slate-400">
              Only AVAILABLE drivers receive new delivery assignments from dispatchers.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-1">
              {[
                { id: 'AVAILABLE', label: 'AVAILABLE', color: 'hover:border-emerald-500/50' },
                { id: 'ON_BREAK', label: 'ON BREAK', color: 'hover:border-amber-500/50' },
                { id: 'OFF_DUTY', label: 'OFF DUTY', color: 'hover:border-slate-500/50' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={updatingAvailability || availability === 'BUSY'}
                  onClick={() => handleAvailabilityChange(opt.id)}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between cursor-pointer ${
                    availability === opt.id
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                      : 'bg-dark-900/60 text-slate-300 border-dark-700 ' + opt.color
                  } disabled:opacity-50`}
                >
                  <span>{opt.label}</span>
                  {availability === opt.id && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                </button>
              ))}
            </div>

            {availability === 'BUSY' && (
              <p className="text-[11px] text-amber-400/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                You are currently on an active trip. Complete your delivery to switch status.
              </p>
            )}
          </div>

          {/* Active Fleet Details */}
          <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-500" />
              Assigned Vehicle
            </h2>
            {assignedVehicle ? (
              <div className="p-3 bg-dark-900/60 rounded-xl border border-dark-700 space-y-1.5">
                <p className="text-xs font-black text-amber-400 tracking-wider">
                  {assignedVehicle.vehicleNumber}
                </p>
                <p className="text-xs text-slate-300">
                  {assignedVehicle.model || assignedVehicle.vehicleType}
                </p>
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {assignedVehicle.status || 'IN_USE'}
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 bg-dark-900/40 p-3 rounded-xl border border-dark-700/50">
                No vehicle currently checked out. Vehicles are assigned per delivery trip.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Driver Details & Editable Contact */}
        <div className="space-y-6 md:col-span-2">
          {/* Driver Information Card */}
          <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-dark-700/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500" />
                Driver Credentials &amp; Identity
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                ID: {driver._id?.slice(-8).toUpperCase() || 'N/A'}
              </span>
            </div>

            {/* Read-Only System Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Legal Name</label>
                <div className="bg-dark-900/60 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-200">
                  {driver.name || user?.name || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email (System Login)</label>
                <div className="bg-dark-900/60 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-200 truncate">
                  {driver.email || user?.email || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Driving License Number</label>
                <div className="bg-dark-900/60 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-amber-400">
                  {driver.licenseNumber || 'N/A'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">License Expiry Date</label>
                <div className="bg-dark-900/60 border border-dark-700 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-200">
                  {driver.licenseExpiryDate
                    ? new Date(driver.licenseExpiryDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </div>
              </div>
            </div>

            {/* Editable Fields: Phone & Address Form */}
            <form onSubmit={handleUpdateContact} className="pt-4 border-t border-dark-700/60 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Update Contact &amp; Operating Address
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-slate-400">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="9876543210"
                      required
                      className="w-full bg-dark-900 border border-dark-700 focus:border-amber-500 rounded-xl pl-12 pr-3.5 py-2 text-sm text-slate-100 focus:outline-none transition-colors"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">10-digit mobile number</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Pune, Maharashtra"
                    className="w-full bg-dark-900 border border-dark-700 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {savingProfile ? 'Saving...' : 'Save Contact Details'}
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-dark-800/80 border border-dark-700/60 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-dark-700/60">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                Change Password
              </h2>
              <span className="text-xs text-slate-400">Encrypted with bcrypt</span>
            </div>

            {passwordErrorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{passwordErrorMsg}</span>
              </div>
            )}

            {passwordSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Current Password <span className="text-amber-500">*</span>
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-dark-900 border border-dark-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    New Password <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-dark-900 border border-dark-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm New Password <span className="text-amber-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-dark-900 border border-dark-700 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  {passwordLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverProfilePage;
