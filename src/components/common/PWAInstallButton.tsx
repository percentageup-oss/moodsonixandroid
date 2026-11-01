import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className, variant = 'full' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={cn(
          'flex items-center gap-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-all font-medium text-xs shadow-sm',
          variant === 'compact' ? 'p-2' : 'px-3 py-2 w-full justify-center',
          className
        )}
      >
        <Download className="w-3.5 h-3.5" />
        {variant === 'full' && <span>Install App</span>}
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={cn(
            'flex items-center gap-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] text-[var(--accent)] hover:bg-[var(--surface-secondary)] transition-all font-medium text-xs shadow-sm',
            variant === 'compact' ? 'p-2' : 'px-3 py-2 w-full justify-center',
            className
          )}
        >
          <Download className="w-3.5 h-3.5" />
          {variant === 'full' && <span>Install on iOS</span>}
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-color)] p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--border-color)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Install Moodsonix on iOS</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-[var(--text-muted)] hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--surface)] text-[var(--accent)] shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <p>1. Tap the <strong>Share</strong> button in the Safari toolbar at the bottom.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[var(--surface)] text-[var(--accent)] shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <p>2. Scroll down and tap <strong>Add to Home Screen</strong>.</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-[var(--accent)] text-black py-2 text-xs font-semibold hover:bg-[var(--accent-hover)] transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
