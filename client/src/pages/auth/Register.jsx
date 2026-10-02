import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  Building2,
  Lock,
  Mail,
  MapPin,
  Phone,
  UserRound,
  FileText,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getRoleDashboardPath, useAuth } from '../../context/AuthContext';
import FleetHubLogo from '../../components/common/FleetHubLogo';

const inputClass =
  'w-full rounded-xl border border-slate-700/80 bg-[#090e19] py-2.5 pl-10 pr-3.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15';

const selectClass =
  'w-full rounded-xl border border-slate-700/80 bg-[#090e19] py-2.5 pl-10 pr-3.5 text-sm text-slate-100 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15 cursor-pointer';

const VEHICLE_OPTIONS = [
  { value: 'BIKE', label: 'Motorcycle / Bike' },
  { value: 'SCOOTER', label: 'Scooter / Activa' },
  { value: 'CAR', label: 'Car' },
  { value: 'VAN', label: 'Delivery Van' },
];

const Register = () => {
  // Public registration allows ONLY CLIENT and DRIVER
  const [selectedRole, setSelectedRole] = useState('CLIENT');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    document.title = 'FleetHub 2.0 | Smarter Logistics — Create Account';
  }, []);

  const [formData, setFormData] = useState({
    // Common fields
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',

    // Client-specific fields
    clientName: '',
    clientAddress: '',
    branchName: '',
    branchAddress: '',

    // Driver-specific fields
    licenseNumber: '',
    licenseExpiry: '',
    vehicleType: 'BIKE',
    vehicleNumber: '',
    vehicleModel: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (selectedRole === 'CLIENT' && !formData.clientName.trim()) {
      setError('Company / Restaurant Name is required for Client registration.');
      return;
    }

    if (selectedRole === 'DRIVER' && !formData.licenseNumber.trim()) {
      setError('Driving License Number is required for Driver registration.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: selectedRole, // strictly CLIENT or DRIVER
      };

      if (selectedRole === 'CLIENT') {
        payload.clientName = formData.clientName.trim();
        payload.clientAddress = formData.clientAddress.trim();
        if (formData.branchName.trim()) payload.branchName = formData.branchName.trim();
        if (formData.branchAddress.trim()) payload.branchAddress = formData.branchAddress.trim();
      } else if (selectedRole === 'DRIVER') {
        payload.licenseNumber = formData.licenseNumber.trim().toUpperCase();
        if (formData.licenseExpiry) payload.licenseExpiry = formData.licenseExpiry;
        if (formData.vehicleType) payload.vehicleType = formData.vehicleType;
        if (formData.vehicleNumber) payload.vehicleNumber = formData.vehicleNumber.trim().toUpperCase();
        if (formData.vehicleModel) payload.vehicleModel = formData.vehicleModel.trim();
      }

      const registeredUser = await register(payload);
      const targetDashboard = getRoleDashboardPath(registeredUser?.role);
      navigate(targetDashboard);
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.message ||
          'Failed to create account. Please verify your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#090d17] px-4 py-8 text-slate-100 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_70%)]"
      />

      <header className="relative mb-6 flex w-full max-w-lg flex-col items-center text-center">
        <Link to="/" className="inline-block transition-transform hover:scale-[1.02] mb-3">
          <FleetHubLogo variant="auth" className="w-[220px] h-auto object-contain drop-shadow-xl" />
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
          Create FleetHub Account
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Join the FleetHub delivery and logistics platform
        </p>
      </header>

      <section className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-[#111827]/95 p-6 shadow-2xl shadow-black/40 sm:p-8 backdrop-blur-xl">
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Partner Restaurant / Business Client Account */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Restaurant / Business Client</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  CLIENT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Register your café, restaurant, or food business to request on-demand delivery logistics.
              </p>
            </div>
          </div>

          {/* Common Account Information */}
          <div className="pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Personal Information
            </h3>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <UserRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="user@domain.com"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+91 98765 43210"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      className={`${inputClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic CLIENT Fields */}
          {selectedRole === 'CLIENT' && (
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Company / Restaurant Details
              </h3>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Company / Restaurant Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    placeholder="e.g. Domino's Pizza / Spice Garden"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Business Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    name="clientAddress"
                    value={formData.clientAddress}
                    onChange={handleChange}
                    placeholder="Shop 104, High Street Avenue"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-dark-900/60 border border-dark-700/60 space-y-2.5">
                <p className="text-[11px] font-semibold text-slate-300">
                  Optional Initial Branch Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleChange}
                    placeholder="Branch Name (e.g. Downtown Outlet)"
                    className="w-full rounded-xl border border-slate-700/80 bg-[#090e19] py-2 px-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400"
                  />
                  <input
                    type="text"
                    name="branchAddress"
                    value={formData.branchAddress}
                    onChange={handleChange}
                    placeholder="Branch Address"
                    className="w-full rounded-xl border border-slate-700/80 bg-[#090e19] py-2 px-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dynamic DRIVER Fields */}
          {selectedRole === 'DRIVER' && (
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5" /> Driver Credentials &amp; Vehicle
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Driving License Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      placeholder="DL-MH12-98765"
                      required
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    License Expiry Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="date"
                      name="licenseExpiry"
                      value={formData.licenseExpiry}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-dark-900/60 border border-dark-700/60 space-y-2.5">
                <p className="text-[11px] font-semibold text-slate-300">
                  Optional Vehicle Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Vehicle Type</label>
                    <select
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-700/80 bg-[#090e19] py-2 px-2.5 text-xs text-slate-100 outline-none focus:border-amber-400"
                    >
                      {VEHICLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Plate Number</label>
                    <input
                      type="text"
                      name="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={handleChange}
                      placeholder="MH-12-AB-1234"
                      className="w-full rounded-xl border border-slate-700/80 bg-[#090e19] py-2 px-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Vehicle Model</label>
                    <input
                      type="text"
                      name="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={handleChange}
                      placeholder="e.g. Hero Splendor"
                      className="w-full rounded-xl border border-slate-700/80 bg-[#090e19] py-2 px-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? (
              'Creating Account…'
            ) : (
              <>
                Create Account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-amber-400 underline decoration-amber-400/50 underline-offset-2 hover:text-amber-300"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
};

export default Register;
