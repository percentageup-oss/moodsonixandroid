import React from 'react';
import { Song } from '../../types/music';
import { usePlayer } from '../../context/PlayerContext';
import { useQueue } from '../../context/QueueContext';
import { formatTime, cn } from '../../lib/utils';
import { Play, Pause, Heart, ListPlus } from 'lucide-react';

interface SongCardProps {
  song: Song;
  onShare?: (song: Song) => void;
}

export const SongCard: React.FC<SongCardProps> = ({ song }) => {
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { addToQueue, toggleLike, isLiked } = useQueue();

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
        'group relative flex flex-col p-3 rounded-2xl cursor-pointer transition-all duration-200 border bg-[var(--surface)] hover:bg-[var(--surface-secondary)]',
        isCurrent
          ? 'border-[var(--accent)] shadow-sm'
          : 'border-[var(--border-color)] hover:border-white/15'
      )}
    >
      {/* Artwork with floating play button */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[var(--surface-secondary)] mb-3 border border-[var(--border-color)]">
        <img
          src={song.thumbnail}
          alt={song.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />

        {/* Play Button Overlay */}
        <button
          onClick={handlePlayClick}
          className={cn(
            'absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform',
            isCurrent
              ? 'bg-[var(--accent)] text-black scale-100 opacity-100'
              : 'bg-[var(--accent)] text-black opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-105'
          )}
        >
          {isSongPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Duration badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono text-white/90">
          {formatTime(song.duration)}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-medium text-sm truncate',
            isCurrent ? 'text-[var(--accent)] font-semibold' : 'text-[var(--text-primary)]'
          )}
        >
          {song.title}
        </p>
        <p className="text-xs text-[var(--text-secondary)] truncate mt-1">
          {song.artist}
        </p>
      </div>

      {/* Quick Actions Footer */}
      <div
        className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--border-color)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => toggleLike(song)}
          title={liked ? 'Unlike' : 'Like'}
          className={cn(
            'p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-elevated)]',
            liked ? 'text-red-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          <Heart className={cn('w-3.5 h-3.5', liked && 'fill-current')} />
        </button>

        <button
          onClick={() => addToQueue(song)}
          title="Add to queue"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface-elevated)] transition-colors"
        >
          <ListPlus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
