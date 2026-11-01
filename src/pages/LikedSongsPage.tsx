import React, { useState } from 'react';
import { useQueue } from '../context/QueueContext';
import { usePlayer } from '../context/PlayerContext';
import { Song } from '../types/music';
import { SongRow } from '../components/music/SongRow';
import {
  Heart,
  Play,
  Shuffle,
  Search,
  Music2
} from 'lucide-react';

interface LikedSongsPageProps {
  onShareSong: (song: Song) => void;
  onNavigate: (page: string) => void;
}

export const LikedSongsPage: React.FC<LikedSongsPageProps> = ({ onShareSong, onNavigate }) => {
  const { likedSongs, setQueueList } = useQueue();
  const { playSong } = usePlayer();
  const [filterQuery, setFilterQuery] = useState('');

  const filtered = likedSongs.filter((song) => {
    const q = filterQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(q) ||
      song.artist.toLowerCase().includes(q)
    );
  });

  const handlePlayAll = () => {
    if (likedSongs.length === 0) return;
    const [first, ...rest] = likedSongs;
    setQueueList(rest);
    playSong(first);
  };

  const handleShuffleAll = () => {
    if (likedSongs.length === 0) return;
    const shuffled = [...likedSongs].sort(() => Math.random() - 0.5);
    const [first, ...rest] = shuffled;
    setQueueList(rest);
    playSong(first);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 max-w-4xl">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-6 rounded-3xl bg-gradient-to-br from-red-950/40 via-[var(--surface-elevated)] to-[var(--surface)] border border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-red-500/20 shrink-0">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-red-400 font-semibold">
              // PLAYLIST
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5">
              Liked Songs
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              {likedSongs.length} {likedSongs.length === 1 ? 'song' : 'songs'} saved to your library
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {likedSongs.length > 0 && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePlayAll}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-black font-semibold text-xs flex items-center gap-2 hover:bg-[var(--accent-hover)] transition-all shadow-md glow-accent-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Play All</span>
            </button>
            <button
              onClick={handleShuffleAll}
              className="px-4 py-2.5 rounded-xl bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] border border-[var(--border-color)] font-medium text-xs flex items-center gap-2 transition-colors"
            >
              <Shuffle className="w-4 h-4 text-[var(--accent)]" />
              <span>Shuffle</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter / Search within liked */}
      {likedSongs.length > 5 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search within your liked songs..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      )}

      {/* Song List */}
      {likedSongs.length === 0 ? (
        <div className="py-16 text-center text-[var(--text-muted)] space-y-3">
          <Heart className="w-12 h-12 mx-auto opacity-20 stroke-[1.5]" />
          <h3 className="text-sm font-semibold text-[var(--text-secondary)]">No liked songs yet</h3>
          <p className="text-xs max-w-sm mx-auto">
            Tap the heart icon on any song while listening or browsing to save it to your favorites.
          </p>
          <button
            onClick={() => onNavigate('search')}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-black font-semibold text-xs hover:bg-[var(--accent-hover)] transition-colors inline-block mt-2"
          >
            Discover Music
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-[var(--text-muted)]">
          <p className="text-xs">No favorites matching "{filterQuery}"</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((song, idx) => (
            <SongRow key={song.id} song={song} index={idx} onShare={onShareSong} />
          ))}
        </div>
      )}
    </div>
  );
};
