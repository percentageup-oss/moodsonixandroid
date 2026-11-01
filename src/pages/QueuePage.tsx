import React from 'react';
import { useQueue } from '../context/QueueContext';
import { usePlayer } from '../context/PlayerContext';
import { Song } from '../types/music';
import { formatTime, cn } from '../lib/utils';
import {
  ListMusic,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  X,
  History,
  Music2,
  Disc
} from 'lucide-react';
import { MiniVisualizer } from '../components/music/MiniVisualizer';
import { SongRow } from '../components/music/SongRow';

interface QueuePageProps {
  onShareSong: (song: Song) => void;
  onNavigate: (page: string) => void;
}

export const QueuePage: React.FC<QueuePageProps> = ({ onShareSong, onNavigate }) => {
  const { queue, history, removeFromQueue, reorderQueue, clearQueue } = useQueue();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--accent)] font-semibold">
            // PLAYBACK QUEUE
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-0.5">
            Up Next & History
          </h1>
        </div>

        {queue.length > 0 && (
          <button
            onClick={clearQueue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] hover:bg-red-500/10 text-xs text-[var(--text-muted)] hover:text-red-400 border border-[var(--border-color)] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Queue</span>
          </button>
        )}
      </div>

      {/* NOW PLAYING SECTION */}
      {currentSong && (
        <section className="space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            // CURRENTLY PLAYING
          </span>

          <div className="p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-color)] flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[var(--surface)] border border-[var(--border-color)]">
                <img
                  src={currentSong.thumbnail}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <MiniVisualizer isPlaying={isPlaying} barCount={4} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm truncate text-[var(--accent)]">
                  {currentSong.title}
                </p>
                <p className="text-xs text-[var(--text-secondary)] truncate mt-0.5">
                  {currentSong.artist}
                </p>
                <span className="text-[10px] font-mono text-[var(--text-muted)] mt-1 inline-block">
                  {formatTime(currentSong.duration)}
                </span>
              </div>
            </div>

            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all shrink-0"
            >
              {isPlaying ? (
                <Disc className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>
        </section>
      )}

      {/* UP NEXT QUEUE */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
            // UP NEXT ({queue.length} TRACKS)
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] space-y-3">
            <ListMusic className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Your queue is empty</p>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Add songs from search or explore moods on the homepage to line up your next track.
            </p>
            <button
              onClick={() => onNavigate('search')}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-black font-semibold text-xs hover:bg-[var(--accent-hover)] transition-colors inline-block"
            >
              Find Music
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {queue.map((song, idx) => (
              <div
                key={`${song.id}-${idx}`}
                className="group flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-secondary)] border border-[var(--border-color)] transition-all"
              >
                <div
                  onClick={() => {
                    playSong(song);
                    removeFromQueue(idx);
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                >
                  <span className="w-6 text-center font-mono text-xs text-[var(--text-muted)] shrink-0">
                    {idx + 1}
                  </span>
                  <img
                    src={song.thumbnail}
                    alt={song.title}
                    className="w-10 h-10 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs truncate text-[var(--text-primary)] group-hover:text-[var(--accent)]">
                      {song.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate">
                      {song.artist}
                    </p>
                  </div>
                </div>

                {/* Queue Controls: Move up/down, remove */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[11px] font-mono text-[var(--text-muted)] mr-2 hidden sm:inline">
                    {formatTime(song.duration)}
                  </span>

                  {idx > 0 && (
                    <button
                      onClick={() => reorderQueue(idx, idx - 1)}
                      title="Move up"
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-elevated)] transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {idx < queue.length - 1 && (
                    <button
                      onClick={() => reorderQueue(idx, idx + 1)}
                      title="Move down"
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface-elevated)] transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => removeFromQueue(idx)}
                    title="Remove from queue"
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--surface-elevated)] transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* RECENTLY PLAYED HISTORY */}
      {history.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
              // PLAYBACK HISTORY ({history.length})
            </span>
          </div>

          <div className="space-y-1">
            {history.slice(0, 10).map((song, idx) => (
              <SongRow key={`${song.id}-hist-${idx}`} song={song} index={idx} onShare={onShareSong} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
