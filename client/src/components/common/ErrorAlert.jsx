import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const ErrorAlert = ({ message = 'Unable to load data.', onRetry = null }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl my-4 text-rose-300">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-lg text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorAlert;
