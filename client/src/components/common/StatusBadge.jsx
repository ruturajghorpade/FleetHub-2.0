import React from 'react';

const statusStyles = {
  // Deliveries
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  ASSIGNED: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  OUT_FOR_DELIVERY: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  DELIVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  CANCELLED: 'bg-rose-500/10 text-rose-400 border-rose-500/30',

  // Vehicles & Drivers
  AVAILABLE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  MAINTENANCE: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  INACTIVE: 'bg-slate-500/10 text-slate-400 border-slate-500/30',

  // General Status
  ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  IN_PROGRESS: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  COMPLETED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

const formatLabel = (status) => {
  if (!status) return 'UNKNOWN';
  return status.replace(/_/g, ' ');
};

const StatusBadge = ({ status, className = '' }) => {
  const badgeStyle = statusStyles[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/30';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${badgeStyle} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {formatLabel(status)}
    </span>
  );
};

export default StatusBadge;
