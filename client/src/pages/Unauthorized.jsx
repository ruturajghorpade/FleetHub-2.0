import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth, getRoleDashboardPath } from '../context/AuthContext';
import FleetHubLogo from '../components/common/FleetHubLogo';

const Unauthorized = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'FleetHub 2.0 | Smarter Logistics — Access Restricted';
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userDashboard = getRoleDashboardPath(user?.role);

  return (
    <div className="relative min-h-screen bg-[#090d17] flex items-center justify-center p-4 text-slate-100 overflow-hidden">
      {/* Glow effect */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(239,68,68,0.12),transparent_70%)]"
      />

      <div className="relative w-full max-w-md bg-[#111827]/95 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center backdrop-blur-xl">
        {/* Official Brand Logo */}
        <div className="flex justify-center mb-5">
          <Link to="/" className="inline-block transition-transform hover:scale-[1.02]">
            <FleetHubLogo variant="auth" className="w-[220px] h-auto object-contain drop-shadow" />
          </Link>
        </div>

        {/* Warning Icon Badge */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-500/10 mb-4">
          <ShieldAlert className="w-7 h-7 stroke-[2.2]" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold uppercase tracking-wider mb-2">
          403 Access Forbidden
        </span>

        <h1 className="text-2xl font-black text-white tracking-tight mt-1">
          Access Restricted
        </h1>

        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          You are not authorized to access this resource. Your account role does not have permission to view this view or API endpoint.
        </p>

        {user && (
          <div className="my-5 p-3.5 rounded-xl bg-dark-900/80 border border-dark-700/80 text-xs text-left">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Authenticated as:</span>
              <span className="font-semibold text-slate-200">{user.email}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-dark-700/60">
              <span className="text-slate-400">Current Role:</span>
              <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {user.role}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3 mt-6">
          <Link
            to={userDashboard}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Your Dashboard
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white border border-dark-700 text-xs font-semibold transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
