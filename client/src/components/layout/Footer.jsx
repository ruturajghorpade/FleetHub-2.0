import React from 'react';

/**
 * Professional responsive Footer component for FleetHub 2.0
 * Features compact industrial styling, version badge, and copyright metadata.
 */
const Footer = () => {
  return (
    <footer className="w-full border-t border-dark-700/60 bg-dark-950/40 backdrop-blur-xs py-4 px-4 sm:px-6 lg:px-8 mt-auto select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-400">
        <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-center sm:text-left">
          <span className="font-semibold text-slate-300">
            &copy; 2026 FleetHub 2.0
          </span>
          <span className="hidden sm:inline text-dark-600" aria-hidden="true">&bull;</span>
          <span className="text-slate-400">
            Multi-Client Fleet &amp; Logistics Management System
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-dark-800 border border-dark-700 text-[11px] font-medium text-amber-400/90 tracking-wide">
            Version 2.0.0
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
