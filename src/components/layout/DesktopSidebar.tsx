import React from 'react';
import { useQueue } from '../../context/QueueContext';
import { useUser } from '../../context/UserContext';
import { cn } from '../../lib/utils';
import {
  Home,
  Search,
  ListMusic,
  Heart,
  User,
  Sparkles,
  Keyboard,
  Download,
  FolderInput,
  Sliders,
  LogOut,
  LogIn
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface DesktopSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onOpenTools: () => void;
  onOpenPlaylistImporter: () => void;
  onOpenShortcuts: () => void;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentPage,
  onNavigate,
  onOpenTools,
  onOpenPlaylistImporter,
  onOpenShortcuts
}) => {
  const { queue, likedSongs } = useQueue();
  const { user, setShowAuthModal, logout } = useUser();

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'queue', label: 'Queue', icon: ListMusic, badge: queue.length > 0 ? queue.length : undefined },
    { id: 'liked', label: 'Liked Songs', icon: Heart, badge: likedSongs.length > 0 ? likedSongs.length : undefined },
    { id: 'account', label: 'Account', icon: User }
  ];

  return (
    <aside className="w-60 h-screen flex flex-col bg-[var(--surface)] border-r border-[var(--border-color)] p-4 select-none shrink-0 z-20">
      {/* Brand Header */}
      <div
        onClick={() => onNavigate('home')}
        className="flex items-center gap-2.5 px-2 py-3 mb-4 cursor-pointer group"
      >
        <div className="w-9 h-9 rounded-xl bg-[#14141F] border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[var(--accent)]/40 transition-colors shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 512 512">
            <rect x="136" y="216" width="28" height="80" rx="14" fill="#C8F542" />
            <rect x="184" y="156" width="28" height="200" rx="14" fill="#C8F542" />
            <rect x="232" y="116" width="28" height="280" rx="14" fill="#C8F542" />
            <rect x="280" y="176" width="28" height="160" rx="14" fill="#C8F542" />
            <rect x="328" y="236" width="28" height="40" rx="14" fill="#C8F542" />
          </svg>
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
            Moodsonix
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--accent)] text-black font-semibold">2.0</span>
          </h1>
          <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
            // AI MUSIC STREAM
          </p>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 mb-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all',
                isActive
                  ? 'bg-[var(--surface-elevated)] text-[var(--accent)] font-semibold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)]'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('w-4 h-4', isActive && 'text-[var(--accent)]')} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.5 rounded-md bg-[var(--surface-secondary)] font-mono text-[10px] text-[var(--text-muted)]">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Productivity & Tools Section */}
      <div className="pt-3 border-t border-[var(--border-color)] space-y-1 mb-auto">
        <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)] block mb-2">
          // UTILITIES
        </span>

        {/* Tools Drawer Button */}
        <button
          onClick={onOpenTools}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <Sliders className="w-4 h-4 text-[var(--accent)]" />
          <span>Focus & Ambient</span>
        </button>

        {/* Import Playlist Button */}
        <button
          onClick={onOpenPlaylistImporter}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <FolderInput className="w-4 h-4 text-emerald-400" />
          <span>Import Playlist</span>
        </button>

        {/* Keyboard Shortcuts Hint */}
        <button
          onClick={onOpenShortcuts}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-secondary)] transition-colors"
        >
          <Keyboard className="w-4 h-4 text-[var(--text-muted)]" />
          <span>Shortcuts</span>
        </button>
      </div>

      {/* Footer Section: Install PWA + User profile */}
      <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
        <PWAInstallButton />

        {/* User Card */}
        <div className="p-2.5 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-color)] flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-color)] flex items-center justify-center text-xs font-semibold text-[var(--accent)] shrink-0">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate text-[var(--text-primary)]">
                {user.displayName}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                {user.isGuest ? 'Guest Explorer' : user.email}
              </p>
            </div>
          </div>

          {user.isGuest ? (
            <button
              onClick={() => setShowAuthModal(true)}
              title="Sign in"
              className="p-1.5 rounded-lg text-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <LogIn className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--surface-elevated)] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
