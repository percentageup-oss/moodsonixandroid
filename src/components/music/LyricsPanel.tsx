import React, { useEffect, useRef } from 'react';
import { Song } from '../../types/music';
import { useLyrics } from '../../hooks/useLyrics';
import { usePlayer } from '../../context/PlayerContext';
import { cn } from '../../lib/utils';
import { Music2, Loader2, Sparkles } from 'lucide-react';

interface LyricsPanelProps {
  currentSong: Song | null;
  className?: string;
}

export const LyricsPanel: React.FC<LyricsPanelProps> = ({ currentSong, className }) => {
  const { currentTime, seekTo } = usePlayer();
  const { lyrics, isLoading, error, activeLineIndex } = useLyrics(currentSong, currentTime);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLParagraphElement>(null);

  // Auto-scroll active lyric line to center of lyrics panel
  useEffect(() => {
    if (activeLineRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeEl = activeLineRef.current;
      const containerHeight = container.clientHeight;
      const targetScroll = activeEl.offsetTop - containerHeight / 2 + activeEl.clientHeight / 2;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: 'smooth'
      });
    }
  }, [activeLineIndex]);

  if (!currentSong) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-center p-6 text-[var(--text-muted)]', className)}>
        <Music2 className="w-10 h-10 mb-3 opacity-30 stroke-[1.5]" />
        <p className="text-sm font-medium">Play a song to view lyrics</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-center p-6', className)}>
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mb-3" />
        <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
          // FINDING LYRICS
        </p>
      </div>
    );
  }

  if (error || !lyrics || lyrics.notFound) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full text-center p-6 text-[var(--text-muted)]', className)}>
        <Music2 className="w-10 h-10 mb-3 opacity-30 stroke-[1.5]" />
        <p className="text-sm font-medium text-[var(--text-secondary)]">No lyrics found</p>
        <p className="text-xs mt-1 text-[var(--text-muted)]">Lyrics could not be found for this track</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full overflow-hidden select-none', className)}>
      {/* Header bar / Attribution */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-[var(--border-color)] shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
            {lyrics.syncedLyrics ? '// SYNCHRONIZED LYRICS' : '// PLAIN LYRICS'}
          </span>
        </div>
        {lyrics.attribution && (
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            {lyrics.attribution}
          </span>
        )}
      </div>

      {/* Lyrics Scrollable Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-4 py-8 px-2 scroll-smooth text-center"
      >
        {lyrics.syncedLyrics && lyrics.syncedLyrics.length > 0 ? (
          lyrics.syncedLyrics.map((line, idx) => {
            const isActive = idx === activeLineIndex;
            const isPast = idx < activeLineIndex;

            return (
              <p
                key={`${line.time}-${idx}`}
                ref={isActive ? activeLineRef : null}
                onClick={() => seekTo(line.time)}
                className={cn(
                  'cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-xl leading-relaxed text-balance',
                  isActive
                    ? 'text-lg md:text-xl font-bold text-[var(--accent)] scale-105 shadow-sm'
                    : isPast
                    ? 'text-sm md:text-base font-medium text-[var(--text-secondary)] opacity-60 hover:opacity-100 hover:text-[var(--text-primary)]'
                    : 'text-sm md:text-base font-medium text-[var(--text-muted)] hover:opacity-100 hover:text-[var(--text-primary)]'
                )}
              >
                {line.text || '♪'}
              </p>
            );
          })
        ) : lyrics.plainLyrics ? (
          <div className="text-left max-w-lg mx-auto whitespace-pre-line text-sm md:text-base leading-relaxed text-[var(--text-secondary)] font-normal">
            {lyrics.plainLyrics}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No lyrics available</p>
        )}

        {(lyrics.provider === 'netease' || lyrics.provider === 'lyrics.ovh') && (
          <p className="pt-4 text-[11px] font-mono text-[var(--text-muted)] text-center">
            Source: {lyrics.provider === 'netease' ? 'Netease' : 'lyrics.ovh'}
          </p>
        )}
      </div>
    </div>
  );
};
