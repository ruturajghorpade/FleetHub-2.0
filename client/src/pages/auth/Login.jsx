import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { getRoleDashboardPath, useAuth } from '../../context/AuthContext';
import FleetHubLogo from '../../components/common/FleetHubLogo';

import { validateEmail } from '../../utils/validation';

const inputClass =
  'w-full rounded-xl border border-slate-700/80 bg-[#090e19] py-3 pl-11 pr-11 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/15';

const inputErrorClass =
  'w-full rounded-xl border border-rose-500 bg-[#090e19] py-3 pl-11 pr-11 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'FleetHub 2.0 | Smarter Logistics — Sign In';
  }, []);

  const validate = () => {
    const errs = {};
    const emailErr = validateEmail(email, 'Email address');
    if (emailErr) errs.email = emailErr;
    if (!password) errs.password = 'Password is required.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const user = await login(email.trim(), password);
      const targetDashboard = getRoleDashboardPath(user?.role);
      navigate(targetDashboard);
    } catch (err) {
      console.error('Login error:', err);
      const msg =
        err.response?.data?.message || 'Could not sign in. Check your email and password.';
      setError(msg);
      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setFieldErrors({});
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#090d17] px-4 py-10 text-slate-100 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.09),transparent_68%)]"
      />

      <header className="relative mb-7 flex w-full max-w-md flex-col items-center text-center">
        <Link to="/" className="inline-block transition-transform hover:scale-[1.02] mb-3">
          <FleetHubLogo variant="auth" className="w-[220px] h-auto object-contain drop-shadow-xl" />
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
          Welcome Back
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Sign in to FleetHub
        </p>
      </header>

      <section className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#111827]/95 px-6 py-7 shadow-2xl shadow-black/30 sm:px-8 sm:py-8">
        <h2 className="sr-only">Sign in to FleetHub</h2>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-semibold text-slate-300"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: '' }));
                  }
                }}
                onBlur={() => {
                  const err = validateEmail(email, 'Email address');
                  if (err) setFieldErrors((prev) => ({ ...prev, email: err }));
                }}
                placeholder="name@restaurant.com"
                required
                className={fieldErrors.email ? inputErrorClass : inputClass}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-xs font-semibold text-slate-300"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
              />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }
                }}
                onBlur={() => {
                  if (!password) {
                    setFieldErrors((prev) => ({ ...prev, password: 'Password is required.' }));
                  }
                }}
                placeholder="Enter your password"
                required
                className={fieldErrors.password ? inputErrorClass : inputClass}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827] disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? (
              'Signing in…'
            ) : (
              <>
                Sign In to FleetHub <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Role Fillers for testing & demo */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-xs">
          <p className="text-slate-400 font-semibold mb-2 text-center">Quick Demo Credentials:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('superadmin@fleethub.com', 'superadmin123')}
              className="px-2.5 py-1.5 rounded-lg bg-dark-900 border border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-amber-400 text-[11px] font-medium transition text-left truncate"
            >
              👑 Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@fleethub.com', 'admin123')}
              className="px-2.5 py-1.5 rounded-lg bg-dark-900 border border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-amber-400 text-[11px] font-medium transition text-left truncate"
            >
              🛡️ Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('dominos@fleethub.com', 'client123')}
              className="px-2.5 py-1.5 rounded-lg bg-dark-900 border border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-amber-400 text-[11px] font-medium transition text-left truncate"
            >
              🍕 Client
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('driver1@fleethub.com', 'driver123')}
              className="px-2.5 py-1.5 rounded-lg bg-dark-900 border border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-amber-400 text-[11px] font-medium transition text-left truncate"
            >
              🛵 Driver
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-amber-400 underline decoration-amber-400/50 underline-offset-2 hover:text-amber-300"
          >
            Register here
          </Link>
        </p>
      </section>
    </main>
  );
};

export default Login;
