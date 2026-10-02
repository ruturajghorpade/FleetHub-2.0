import React from 'react';
import FleetHubLogo from './FleetHubLogo';

const LoadingSpinner = ({ text = 'Loading FleetHub...', fullScreen = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3.5 p-8 text-center">
      {fullScreen && (
        <div className="mb-2 animate-pulse">
          <FleetHubLogo variant="auth" className="w-[200px] h-auto object-contain drop-shadow-lg" />
        </div>
      )}
      <div className="w-8 h-8 border-3 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
      {text && <p className="text-slate-400 text-xs sm:text-sm font-medium">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
