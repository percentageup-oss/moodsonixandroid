import React, { useState } from 'react';
import { Song } from '../../types/music';
import { usePlayer } from '../../context/PlayerContext';
import { useQueue } from '../../context/QueueContext';
import { formatTime, cn } from '../../lib/utils';
import { Play, Pause, Heart, ListPlus, Share2, MoreVertical, Disc } from 'lucide-react';
import { MiniVisualizer } from './MiniVisualizer';

interface SongRowProps {
  song: Song;
  index?: number;
  onShare?: (song: Song) => void;
}

export const SongRow: React.FC<SongRowProps> = ({ song, index, onShare }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { addToQueue, playNext, toggleLike, isLiked } = useQueue();
  const [showMenu, setShowMenu] = useState(false);

  const isCurrent = currentSong?.id === song.id;
  const isSongPlaying = isCurrent && isPlaying;
  const liked = isLiked(song.id);

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song);
    }
  };

  return (
    <div
      onClick={handlePlayClick}
      className={cn(
        'group relative flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border border-transparent',
        isCurrent
          ? 'bg-[var(--surface-elevated)] border-[var(--border-color)] text-[var(--accent)] shadow-sm'
          : 'hover:bg-[var(--surface-secondary)] text-[var(--text-primary)]'
      )}
    >
      {/* Left: Index / Play & Thumbnail */}
      <div className="flex items-center gap-3 min-w-0">
        {typeof index === 'number' && (
          <div className="w-5 text-center text-xs font-mono text-[var(--text-muted)] group-hover:hidden">
            {isCurrent ? <MiniVisualizer isPlaying={isPlaying} /> : (index + 1)}
          </div>
        )}

        <div className="relative w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-[var(--surface)] border border-[var(--border-color)]">
          <img
            src={song.thumbnail}
            alt={song.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div
            className={cn(
              'absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity',
              isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            {isSongPlaying ? (
              <Pause className="w-5 h-5 text-[var(--accent)] fill-[var(--accent)]" />
            ) : (
              <Play className="w-5 h-5 text-white fill-white ml-0.5" />
            )}
          </div>
        </div>

        {/* Title and Artist */}
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-medium text-sm truncate',
              isCurrent ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-primary)]'
            )}
          >
            {song.title}
          </p>
          <p className="text-xs text-[var(--text-secondary)] truncate flex items-center gap-1.5 mt-0.5">
            <span>{song.artist}</span>
            {song.album && (
              <>
                <span className="text-[var(--text-muted)]">•</span>
                <span className="text-[var(--text-muted)] truncate">{song.album}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right Controls: Duration, Like, Menu */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Like Button */}
        <button
          onClick={() => toggleLike(song)}
          title={liked ? 'Unlike' : 'Like'}
          className={cn(
            'p-2 rounded-lg transition-colors hover:bg-[var(--surface-elevated)]',
            liked ? 'text-red-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          <Heart className={cn('w-4 h-4', liked && 'fill-current')} />
        </button>

        {/* Duration */}
        <span className="text-xs font-mono text-[var(--text-muted)] w-10 text-right hidden sm:inline-block">
          {formatTime(song.duration)}
        </span>

        {/* More Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            title="Options"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-xl py-1.5 z-40 text-xs backdrop-blur-md">
                <button
                  onClick={() => {
                    addToQueue(song);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
                >
                  <ListPlus className="w-4 h-4 text-[var(--accent)]" />
                  <span>Add to Queue</span>
                </button>
                <button
                  onClick={() => {
                    playNext(song);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
                >
                  <Disc className="w-4 h-4 text-[var(--accent)]" />
                  <span>Play Next</span>
                </button>
                {onShare && (
                  <button
                    onClick={() => {
                      onShare(song);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--surface)] transition-colors"
                  >
                    <Share2 className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span>Share Song</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
