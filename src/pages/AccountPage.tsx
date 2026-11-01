import React from 'react';
import { useUser } from '../context/UserContext';
import { useQueue } from '../context/QueueContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import {
  User,
  Shield,
  Heart,
  History,
  ListMusic,
  Sliders,
  LogIn,
  LogOut,
  Sparkles,
  Download,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { PWAInstallButton } from '../components/common/PWAInstallButton';

interface AccountPageProps {
  onOpenTools: () => void;
  onOpenShortcuts: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onOpenTools, onOpenShortcuts }) => {
  const { user, logout, setShowAuthModal, maxGuestSearches } = useUser();
  const { likedSongs, history, queue, clearQueue } = useQueue();
  const { theme, setTheme } = useTheme();

  const handleClearCache = () => {
    localStorage.removeItem('moodsonix_last_song');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 max-w-2xl">
      {/* Header */}
      <div>
        <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
          // USER PROFILE & PREFERENCES
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-0.5">
          Account & Settings
        </h1>
      </div>

      {/* User Status Card */}
      <div className="p-6 rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-color)] flex items-center justify-center text-xl font-bold text-[var(--accent)] shrink-0">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{user.displayName}</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {user.isGuest ? 'Guest Explorer (Local Storage)' : user.email}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface)] text-[10px] font-mono text-[var(--accent)] border border-[var(--border-color)]">
                  <Sparkles className="w-3 h-3" />
                  {user.isGuest ? 'GUEST TIER' : 'SYNCED ACCOUNT'}
                </span>
              </div>
            </div>
          </div>

          {user.isGuest ? (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-black font-semibold text-xs hover:bg-[var(--accent-hover)] transition-all shadow-md glow-accent-sm shrink-0 flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          ) : (
            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-xl bg-[var(--surface-secondary)] hover:bg-red-500/10 text-xs font-medium text-[var(--text-muted)] hover:text-red-400 border border-[var(--border-color)] transition-colors shrink-0 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        {/* Guest Limit Progress Bar if Guest */}
        {user.isGuest && (
          <div className="mt-6 pt-4 border-t border-[var(--border-color)] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
              <span>// GUEST SEARCH USAGE:</span>
              <span className="text-[var(--text-primary)] font-semibold">
                {user.searchesCount} / {maxGuestSearches} searches
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--surface-secondary)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all"
                style={{ width: `${Math.min(100, (user.searchesCount / maxGuestSearches) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Sign in to unlock unlimited music discovery, cloud backups, and cross-device sync.
            </p>
          </div>
        )}
      </div>

      {/* Listening Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] text-center">
          <Heart className="w-5 h-5 mx-auto text-red-500 mb-1.5" />
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{likedSongs.length}</p>
          <p className="text-[10px] font-mono uppercase text-[var(--text-muted)] mt-0.5">Liked Songs</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] text-center">
          <History className="w-5 h-5 mx-auto text-[var(--accent)] mb-1.5" />
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{history.length}</p>
          <p className="text-[10px] font-mono uppercase text-[var(--text-muted)] mt-0.5">History Tracks</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] text-center">
          <ListMusic className="w-5 h-5 mx-auto text-emerald-400 mb-1.5" />
          <p className="text-xl font-bold font-mono text-[var(--text-primary)]">{queue.length}</p>
          <p className="text-[10px] font-mono uppercase text-[var(--text-muted)] mt-0.5">Queue Songs</p>
        </div>
      </div>

      {/* Application Settings & Utilities */}
      <div className="space-y-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
          // APPLICATION PREFERENCES
        </span>

        <div className="space-y-2">
          {/* Quick theme change */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Interface Theme</h3>
              <p className="text-[11px] text-[var(--text-muted)]">
                Active: <span className="capitalize text-[var(--accent)]">{theme.replace('theme-', '')}</span>
              </p>
            </div>
            <button
              onClick={onOpenTools}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] text-xs text-[var(--text-primary)] hover:border-[var(--accent)] border border-[var(--border-color)] transition-colors"
            >
              Change Theme
            </button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Desktop Shortcuts</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Quick controls: Space, Arrow keys, N, P, M</p>
            </div>
            <button
              onClick={onOpenShortcuts}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface-secondary)] text-xs text-[var(--text-primary)] hover:border-[var(--accent)] border border-[var(--border-color)] transition-colors"
            >
              View Keys
            </button>
          </div>

          {/* Install PWA */}
          <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-primary)]">Progressive Web App</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Install Moodsonix for home screen & offline app shell</p>
            </div>
            <PWAInstallButton variant="compact" />
          </div>
        </div>
      </div>
    </div>
  );
};
