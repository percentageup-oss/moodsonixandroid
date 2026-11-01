import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useQueue } from '../context/QueueContext';
import { usePlayer } from '../context/PlayerContext';
import { Song } from '../types/music';
import { searchMusic } from '../services/musicApi';
import { SongCard } from '../components/music/SongCard';
import { SongRow } from '../components/music/SongRow';
import {
  Search,
  Sparkles,
  Clock,
  CloudRain,
  Flame,
  FolderInput,
  Compass,
  Heart,
  TrendingUp,
  History,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';

interface HomePageProps {
  onNavigate: (page: string, query?: string) => void;
  onOpenTools: () => void;
  onOpenPlaylistImporter: () => void;
  onShareSong: (song: Song) => void;
}

const MOOD_CARDS = [
  { id: 'rainy', label: 'Rainy Night', desc: 'Raindrops & mellow keys', query: 'ambient rainy night study lofi', icon: CloudRain, color: 'from-blue-900/40 to-slate-900/60' },
  { id: 'focus', label: 'Deep Focus', desc: 'Minimal ambient flow', query: 'deep focus instrumental study electronic', icon: Compass, color: 'from-emerald-900/40 to-slate-900/60' },
  { id: 'drive', label: 'Late Night Drive', desc: 'Synthwave & retro neon', query: 'synthwave retro night drive', icon: Flame, color: 'from-purple-900/40 to-slate-900/60' },
  { id: 'morning', label: 'Calm Morning', desc: 'Acoustic guitar & birds', query: 'calm morning acoustic coffee', icon: Sparkles, color: 'from-amber-900/40 to-slate-900/60' },
  { id: 'gym', label: 'Gym Energy', desc: 'Aggressive bass & phonk', query: 'high energy workout motivation phonk', icon: TrendingUp, color: 'from-red-900/40 to-slate-900/60' },
  { id: 'chill', label: 'Chill Vibes', desc: 'Relaxing lofi beats', query: 'lofi hip hop chill beats to relax', icon: Compass, color: 'from-teal-900/40 to-slate-900/60' },
  { id: 'cinematic', label: 'Cinematic', desc: 'Epic orchestral scores', query: 'epic cinematic orchestral soundtrack', icon: Sparkles, color: 'from-indigo-900/40 to-slate-900/60' },
  { id: 'feelgood', label: 'Feel-Good', desc: 'Upbeat sunshine rhythms', query: 'feel good upbeat indie pop', icon: Sparkles, color: 'from-yellow-900/40 to-slate-900/60' }
];

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenTools,
  onOpenPlaylistImporter,
  onShareSong
}) => {
  const { user } = useUser();
  const { history, likedSongs } = useQueue();
  const { playSong } = usePlayer();

  const [searchInput, setSearchInput] = useState('');
  const [featuredTracks, setFeaturedTracks] = useState<Song[]>([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);

  // Time-adaptive greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Fetch initial curated discovery tracks on mount
  useEffect(() => {
    const fetchFeatured = async () => {
      setIsLoadingFeatured(true);
      try {
        const query = likedSongs.length > 0
          ? `${likedSongs[0].artist} music`
          : 'top hits music chill';
        const { results } = await searchMusic(query);
        if (results && results.length > 0) {
          setFeaturedTracks(results.slice(0, 10));
        }
      } catch {
        // Ignored
      } finally {
        setIsLoadingFeatured(false);
      }
    };

    fetchFeatured();
  }, [likedSongs.length]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onNavigate('search', searchInput.trim());
    }
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Hero Header with greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
            // MOOD-DRIVEN STREAMING
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] mt-1">
            {getGreeting()}{user.displayName ? `, ${user.displayName}` : ''}
          </h1>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
            What frequency are you tuning into today?
          </p>
        </div>

        {/* Quick Tools Access Bar */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenTools}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-all shadow-sm"
          >
            <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Focus & Ambient</span>
          </button>
          <button
            onClick={onOpenPlaylistImporter}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-primary)] hover:border-emerald-400 transition-all shadow-sm"
          >
            <FolderInput className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import Playlist</span>
          </button>
        </div>
      </div>

      {/* Prominent Music Search Bar Entry */}
      <form onSubmit={handleSearchSubmit} className="relative max-w-2xl">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search songs, artists, albums, or vibes..."
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-[var(--surface-secondary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all shadow-inner"
          />
          <button
            type="submit"
            className="absolute right-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-black font-semibold text-xs hover:bg-[var(--accent-hover)] transition-colors shadow-sm"
          >
            Search
          </button>
        </div>
      </form>

      {/* WHAT'S YOUR MOOD? Grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-mono uppercase tracking-wider font-semibold text-[var(--text-primary)]">
              // WHAT'S YOUR MOOD?
            </h2>
          </div>
          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
            Tap a mood for AI-curated YouTube Music
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {MOOD_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => onNavigate('search', card.query)}
                className={cn(
                  'group relative p-4 rounded-2xl cursor-pointer border border-[var(--border-color)] bg-gradient-to-br transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:shadow-lg overflow-hidden',
                  card.color
                )}
              >
                <div className="relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-black/40 backdrop-blur-md flex items-center justify-center text-[var(--accent)] mb-3 border border-white/10 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-sm text-white tracking-tight">{card.label}</h3>
                  <p className="text-xs text-white/70 mt-0.5">{card.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* MADE FOR YOU / DISCOVERY */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-mono uppercase tracking-wider font-semibold text-[var(--text-primary)]">
              // MADE FOR YOU
            </h2>
          </div>
          <button
            onClick={() => onNavigate('search', 'recommended trending songs')}
            className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
          >
            <span>Explore more</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoadingFeatured ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] animate-pulse">
                <div className="aspect-square w-full rounded-xl bg-[var(--surface-secondary)] mb-3" />
                <div className="h-4 bg-[var(--surface-secondary)] rounded w-3/4 mb-1.5" />
                <div className="h-3 bg-[var(--surface-secondary)] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {featuredTracks.map((song) => (
              <SongCard key={song.id} song={song} onShare={onShareSong} />
            ))}
          </div>
        )}
      </section>

      {/* RECENTLY PLAYED */}
      {history.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--accent)]" />
              <h2 className="text-sm font-mono uppercase tracking-wider font-semibold text-[var(--text-primary)]">
                // RECENTLY PLAYED
              </h2>
            </div>
            <button
              onClick={() => onNavigate('queue')}
              className="text-xs text-[var(--text-muted)] hover:text-white"
            >
              View Queue
            </button>
          </div>

          <div className="space-y-1">
            {history.slice(0, 5).map((song, idx) => (
              <SongRow key={`${song.id}-${idx}`} song={song} index={idx} onShare={onShareSong} />
            ))}
          </div>
        </section>
      )}

      {/* YOUR FAVORITES (if any) */}
      {likedSongs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-500 fill-current" />
              <h2 className="text-sm font-mono uppercase tracking-wider font-semibold text-[var(--text-primary)]">
                // YOUR FAVORITES ({likedSongs.length})
              </h2>
            </div>
            <button
              onClick={() => onNavigate('liked')}
              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 font-medium"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {likedSongs.slice(0, 5).map((song) => (
              <SongCard key={song.id} song={song} onShare={onShareSong} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
