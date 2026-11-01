import React, { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { useQueue } from '../../context/QueueContext';
import { formatTime, cn } from '../../lib/utils';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Heart,
  Sliders,
  FileText,
  ListMusic,
  Maximize2,
  AlertCircle,
  Tv,
  X
} from 'lucide-react';
import { QualityMenu } from '../music/QualityMenu';
import { MiniVisualizer } from '../music/MiniVisualizer';

export const PlayerBar: React.FC = () => {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    repeatMode,
    isShuffled,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    cycleRepeatMode,
    toggleShuffle,
    nextTrack,
    previousTrack,
    isNowPlayingOpen,
    setIsNowPlayingOpen,
    isVideoOpen,
    toggleVideo,
    playerError,
    clearPlayerError
  } = usePlayer();

  const { toggleLike, isLiked } = useQueue();
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  if (!currentSong) return null;

  const liked = isLiked(currentSong.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* Player Error Banner if video blocked */}
      {playerError && (
        <div className="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/90 text-white text-xs shadow-xl backdrop-blur-md">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{playerError}</span>
          <button onClick={clearPlayerError} className="p-0.5 ml-2 hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Player Bar */}
      <footer className="fixed bottom-[53px] md:bottom-0 left-0 right-0 z-30 bg-[var(--surface-elevated)]/95 backdrop-blur-xl border-t border-[var(--border-color)] px-4 py-2.5 md:py-3 select-none">
        {/* MOBILE MINI-PLAYER (compact row) */}
        <div
          onClick={() => setIsNowPlayingOpen(true)}
          className="md:hidden flex items-center justify-between gap-3 cursor-pointer"
        >
          {/* Track info & Artwork */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-[var(--surface-secondary)] border border-[var(--border-color)]">
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <MiniVisualizer isPlaying={isPlaying} barCount={3} />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs truncate text-[var(--text-primary)]">
                {currentSong.title}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {currentSong.artist}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={toggleVideo}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isVideoOpen
                  ? 'bg-[var(--accent)] text-black font-semibold'
                  : 'text-[var(--text-muted)] hover:text-white'
              )}
              title={isVideoOpen ? 'Hide video' : 'Show video'}
              aria-label="Toggle video preview"
            >
              <Tv className="w-4 h-4" />
            </button>

            <button
              onClick={() => toggleLike(currentSong)}
              className={cn(
                'p-2 rounded-full transition-colors',
                liked ? 'text-red-500' : 'text-[var(--text-muted)]'
              )}
            >
              <Heart className={cn('w-4 h-4', liked && 'fill-current')} />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-md active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Mobile progress line along top */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] bg-[var(--surface-secondary)]"
          >
            <div
              className="h-full bg-[var(--accent)] transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* DESKTOP FULL PLAYER (3 columns) */}
        <div className="hidden md:flex items-center justify-between gap-6 max-w-7xl mx-auto">
          {/* Left: Artwork, Title, Artist, Like */}
          <div className="flex items-center gap-3 w-1/4 min-w-[200px]">
            <div
              onClick={() => setIsNowPlayingOpen(true)}
              className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[var(--surface-secondary)] border border-[var(--border-color)] cursor-pointer group"
            >
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p
                onClick={() => setIsNowPlayingOpen(true)}
                className="font-medium text-xs truncate text-[var(--text-primary)] hover:underline cursor-pointer"
              >
                {currentSong.title}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                {currentSong.artist}
              </p>
            </div>

            <button
              onClick={() => toggleLike(currentSong)}
              className={cn(
                'p-2 rounded-lg transition-colors hover:bg-[var(--surface)]',
                liked ? 'text-red-500' : 'text-[var(--text-muted)] hover:text-white'
              )}
            >
              <Heart className={cn('w-4 h-4', liked && 'fill-current')} />
            </button>
          </div>

          {/* Center: Controls & Seek Bar */}
          <div className="flex flex-col items-center flex-1 max-w-xl">
            {/* Buttons */}
            <div className="flex items-center gap-4 mb-1">
              <button
                onClick={toggleShuffle}
                className={cn(
                  'p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors',
                  isShuffled ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-white'
                )}
                title={isShuffled ? 'Shuffle on' : 'Shuffle off'}
              >
                <Shuffle className="w-4 h-4" />
              </button>

              <button
                onClick={previousTrack}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface)] transition-colors"
                title="Previous track"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all glow-accent-sm"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface)] transition-colors"
                title="Next track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={cycleRepeatMode}
                className={cn(
                  'p-1.5 rounded-lg hover:bg-[var(--surface)] transition-colors',
                  repeatMode !== 'off' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-white'
                )}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </div>

            {/* Seek Bar */}
            <div className="w-full flex items-center gap-2">
              <span className="text-[10px] font-mono text-[var(--text-muted)] w-8 text-right">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative flex items-center group">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="w-full h-1 bg-[var(--surface)] rounded appearance-none cursor-pointer accent-[var(--accent)]"
                  style={{
                    background: `linear-gradient(to right, var(--accent) ${progressPercent}%, var(--surface) ${progressPercent}%)`
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-[var(--text-muted)] w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Right: Video Dock, Quality, Lyrics, Volume, Expand */}
          <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[200px]">
            {/* Video Player Toggle */}
            <button
              onClick={toggleVideo}
              className={cn(
                'p-2 rounded-lg transition-colors flex items-center gap-1 text-xs',
                isVideoOpen
                  ? 'bg-[var(--accent)] text-black font-semibold'
                  : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface)]'
              )}
              title={isVideoOpen ? 'Close video window' : 'Watch video stream'}
            >
              <Tv className="w-4 h-4" />
              <span className="hidden lg:inline text-[11px]">Video</span>
            </button>

            {/* Lyrics opener */}
            <button
              onClick={() => setIsNowPlayingOpen(true)}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface)] transition-colors"
              title="View lyrics"
            >
              <FileText className="w-4 h-4" />
            </button>

            {/* Stream Quality Menu */}
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu(!showQualityMenu)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--surface)] transition-colors"
                title="Stream quality"
              >
                <Sliders className="w-4 h-4" />
              </button>

              {showQualityMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowQualityMenu(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-3 z-50">
                    <QualityMenu onClose={() => setShowQualityMenu(false)} />
                  </div>
                </>
              )}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1.5 w-28">
              <button
                onClick={toggleMute}
                className="text-[var(--text-muted)] hover:text-white p-1"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-[var(--surface)] rounded appearance-none cursor-pointer accent-[var(--accent)]"
              />
            </div>

            {/* Fullscreen Expand */}
            <button
              onClick={() => setIsNowPlayingOpen(!isNowPlayingOpen)}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)] transition-colors"
              title="Open full player"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </>
  );
};
