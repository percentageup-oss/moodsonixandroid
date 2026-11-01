import React, { useState } from 'react';
import { useQueue } from '../../context/QueueContext';
import { usePlayer } from '../../context/PlayerContext';
import { PlaylistInfo } from '../../types/music';
import { fetchPlaylist } from '../../services/musicApi';
import { cn } from '../../lib/utils';
import { X, ListPlus, Play, Loader2, AlertCircle, CheckCircle2, Music } from 'lucide-react';

interface PlaylistImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlaylistImporterModal: React.FC<PlaylistImporterModalProps> = ({ isOpen, onClose }) => {
  const { setQueueList, addToQueue } = useQueue();
  const { playSong } = usePlayer();

  const [inputUrl, setInputUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetchPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setPlaylist(null);
    setSuccessMsg(null);

    try {
      const data = await fetchPlaylist(inputUrl.trim());

      if (!data.tracks || data.tracks.length === 0) {
        throw new Error('Playlist contains no playable tracks or is restricted');
      }

      setPlaylist(data);
    } catch (err: any) {
      setError(err.message || 'Could not fetch playlist. Please check the URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayNow = () => {
    if (!playlist || playlist.tracks.length === 0) return;
    const firstSong = playlist.tracks[0];
    const remaining = playlist.tracks.slice(1);
    setQueueList(remaining);
    playSong(firstSong);
    setSuccessMsg(`Playing "${playlist.title}" (${playlist.tracks.length} tracks loaded)`);
    setTimeout(() => onClose(), 1200);
  };

  const handleAddToQueue = () => {
    if (!playlist) return;
    playlist.tracks.forEach(track => addToQueue(track));
    setSuccessMsg(`Added ${playlist.tracks.length} tracks to your queue!`);
    setTimeout(() => onClose(), 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-sm font-mono uppercase tracking-wider font-semibold text-[var(--text-primary)]">
              // IMPORT YOUTUBE PLAYLIST
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleFetchPlaylist} className="space-y-3 mb-4 shrink-0">
          <label className="block text-xs text-[var(--text-secondary)]">
            Paste a public YouTube playlist URL or ID:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=PL..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={isLoading || !inputUrl.trim()}
              className="px-4 py-2.5 rounded-xl bg-[var(--accent)] text-black font-semibold text-xs hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message */}
        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Preview of loaded playlist */}
        {playlist && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] mb-3 shrink-0">
              {playlist.thumbnail && (
                <img
                  src={playlist.thumbnail}
                  alt={playlist.title}
                  className="w-14 h-14 rounded-xl object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold truncate text-[var(--text-primary)]">{playlist.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{playlist.trackCount} Tracks loaded</p>
              </div>
            </div>

            {/* Track list preview */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 mb-4">
              {playlist.tracks.map((t, idx) => (
                <div
                  key={`${t.id}-${idx}`}
                  className="flex items-center gap-2.5 p-2 rounded-xl text-xs bg-[var(--surface)]/50"
                >
                  <span className="w-5 text-center font-mono text-[var(--text-muted)]">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-[var(--text-primary)]">{t.title}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{t.artist}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-color)] shrink-0">
              <button
                onClick={handlePlayNow}
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent)] text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[var(--accent-hover)] transition-colors shadow-md"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Now</span>
              </button>
              <button
                onClick={handleAddToQueue}
                className="flex-1 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] font-medium text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <ListPlus className="w-4 h-4 text-[var(--accent)]" />
                <span>Add to Queue</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
