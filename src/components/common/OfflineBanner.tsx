import React from 'react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-500/90 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-black shadow-lg animate-in slide-in-from-top duration-300">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Cached data active. Connect to internet for search & playback.</span>
    </div>
  );
};
