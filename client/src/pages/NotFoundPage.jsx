import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Compass, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { useAuth, getRoleDashboardPath } from '../context/AuthContext';
import FleetHubLogo from '../components/common/FleetHubLogo';

const NotFoundPage = () => {
  const { user } = useAuth();
  const dashboardPath = user ? getRoleDashboardPath(user.role) : '/login';

  useEffect(() => {
    document.title = 'FleetHub 2.0 | Smarter Logistics — 404 Not Found';
  }, []);

  return (
    <div className="relative min-h-screen bg-[#090d17] flex items-center justify-center p-4 text-slate-100 overflow-hidden">
      {/* Background radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_70%)]"
      />

      <div className="relative w-full max-w-md bg-[#111827]/95 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center backdrop-blur-xl">
        {/* Official FleetHub Brand Logo */}
        <div className="flex justify-center mb-5">
          <Link to="/" className="inline-block transition-transform hover:scale-[1.02]">
            <FleetHubLogo variant="auth" className="w-[220px] h-auto object-contain drop-shadow" />
          </Link>
        </div>

        {/* 404 Icon Badge */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10 mb-4">
          <Compass className="w-7 h-7 stroke-[2.2]" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold uppercase tracking-wider mb-2">
          404 Not Found
        </span>

        <h1 className="text-2xl font-black text-white tracking-tight mt-1">
          Lost in Transit
        </h1>

        <p className="text-sm text-slate-400 mt-2 leading-relaxed">
          The page or route you are looking for does not exist, has been relocated, or is temporarily unavailable.
        </p>

        <div className="space-y-3 mt-6">
          <Link
            to={dashboardPath}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-slate-950 text-sm shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98]"
          >
            <LayoutDashboard className="w-4 h-4" />
            Back to Dashboard
          </Link>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white border border-dark-700 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
