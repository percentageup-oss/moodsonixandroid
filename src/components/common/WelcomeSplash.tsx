import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export const WelcomeSplash: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      const finishTimer = setTimeout(() => {
        localStorage.setItem('moodsonix_visited', 'true');
        onComplete();
      }, 500);
      return () => clearTimeout(finishTimer);
    }, 1800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0A0A0F] text-[#F5F5F7] transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Brand Icon with Wave Animation */}
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
        <div className="absolute inset-0 rounded-3xl bg-[var(--accent)]/10 animate-ping opacity-25" />
        <div className="relative w-20 h-20 rounded-2xl bg-[#14141F] border border-white/10 flex items-center justify-center shadow-2xl">
          <svg className="w-12 h-12" viewBox="0 0 512 512">
            <rect x="136" y="216" width="28" height="80" rx="14" fill="#C8F542" className="bar-anim-1" />
            <rect x="184" y="156" width="28" height="200" rx="14" fill="#C8F542" className="bar-anim-2" />
            <rect x="232" y="116" width="28" height="280" rx="14" fill="#C8F542" className="bar-anim-3" />
            <rect x="280" y="176" width="28" height="160" rx="14" fill="#C8F542" className="bar-anim-4" />
            <rect x="328" y="236" width="28" height="40" rx="14" fill="#C8F542" className="bar-anim-5" />
          </svg>
        </div>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
        <span>Moodsonix</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent)] text-black font-mono font-semibold">2.0</span>
      </h1>
      <p className="text-xs text-[#A0A0AA] font-mono flex items-center gap-1.5 mt-1">
        <Sparkles className="w-3.5 h-3.5 text-[#C8F542]" />
        <span>AI-POWERED MUSIC DISCOVERY</span>
      </p>
    </div>
  );
};
