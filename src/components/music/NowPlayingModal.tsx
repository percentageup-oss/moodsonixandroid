import React, { useState } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { useQueue } from '../../context/QueueContext';
import { formatTime, cn } from '../../lib/utils';
import {
  ChevronDown,
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
  Share2,
  ListMusic,
  FileText,
  Sliders,
  Tv
} from 'lucide-react';
import { LyricsPanel } from './LyricsPanel';
import { QualityMenu } from './QualityMenu';
import { MiniVisualizer } from './MiniVisualizer';
import { SongRow } from './SongRow';

interface NowPlayingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare?: () => void;
}

export const NowPlayingModal: React.FC<NowPlayingModalProps> = ({ isOpen, onClose, onShare }) => {
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
    isVideoOpen,
    setIsVideoOpen,
    toggleVideo
  } = usePlayer();

  const { queue, toggleLike, isLiked } = useQueue();
  const [activeTab, setActiveTab] = useState<'track' | 'lyrics' | 'queue'>('track');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  if (!isOpen || !currentSong) return null;

  const liked = isLiked(currentSong.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg)]/98 backdrop-blur-2xl text-[var(--text-primary)] transition-all duration-300">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors"
          title="Minimize player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-color)]">
          <button
            onClick={() => setActiveTab('track')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all',
              activeTab === 'track'
                ? 'bg-[var(--surface-elevated)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            Track
          </button>
          <button
            onClick={() => setActiveTab('lyrics')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
              activeTab === 'lyrics'
                ? 'bg-[var(--surface-elevated)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lyrics</span>
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
              activeTab === 'queue'
                ? 'bg-[var(--surface-elevated)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Queue ({queue.length})</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={onShare}
          className="p-2 -mr-2 rounded-full hover:bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-white transition-colors"
          title="Share song"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden p-4 md:p-8 flex flex-col justify-center max-w-4xl mx-auto w-full">
        {activeTab === 'track' && (
          <div className="flex flex-col items-center justify-center max-w-md mx-auto w-full">
            {/* Big Artwork with lime glow */}
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden shadow-2xl bg-[var(--surface-secondary)] border border-[var(--border-color)] mb-8 group">
              <img
                src={currentSong.thumbnail}
                alt={currentSong.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => {
                  setIsVideoOpen(true);
                  onClose();
                }}
                className={cn(
                  'absolute top-3 right-3 px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all',
                  isVideoOpen
                    ? 'bg-[var(--accent)] text-black font-semibold'
                    : 'bg-black/70 text-white hover:bg-[var(--accent)] hover:text-black'
                )}
                title="Switch to video view"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Video View</span>
              </button>
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md">
                <MiniVisualizer isPlaying={isPlaying} barCount={5} />
              </div>
            </div>

            {/* Song Meta & Like */}
            <div className="flex items-center justify-between w-full mb-6">
              <div className="min-w-0 flex-1 pr-4">
                <h2 className="text-xl sm:text-2xl font-bold truncate tracking-tight text-[var(--text-primary)]">
                  {currentSong.title}
                </h2>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] truncate mt-1">
                  {currentSong.artist}
                </p>
              </div>
              <button
                onClick={() => toggleLike(currentSong)}
                className={cn(
                  'p-3 rounded-full hover:bg-[var(--surface-elevated)] transition-colors',
                  liked ? 'text-red-500' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                <Heart className={cn('w-6 h-6', liked && 'fill-current')} />
              </button>
            </div>

            {/* Seek Bar */}
            <div className="w-full space-y-2 mb-6">
              <div className="relative flex items-center group cursor-pointer py-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-[var(--surface-elevated)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                  style={{
                    background: `linear-gradient(to right, var(--accent) ${progressPercent}%, var(--surface-elevated) ${progressPercent}%)`
                  }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full mb-6">
              {/* Shuffle */}
              <button
                onClick={toggleShuffle}
                className={cn(
                  'p-2.5 rounded-full hover:bg-[var(--surface-elevated)] transition-colors',
                  isShuffled ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                )}
                title={isShuffled ? 'Shuffle on' : 'Shuffle off'}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              {/* Prev */}
              <button
                onClick={previousTrack}
                className="p-3 rounded-full text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
                title="Previous track"
              >
                <SkipBack className="w-6 h-6 fill-current" />
              </button>

              {/* Play / Pause with Accent Glow */}
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all glow-accent"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-1" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={nextTrack}
                className="p-3 rounded-full text-[var(--text-primary)] hover:bg-[var(--surface-elevated)] transition-colors"
                title="Next track"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </button>

              {/* Repeat */}
              <button
                onClick={cycleRepeatMode}
                className={cn(
                  'p-2.5 rounded-full hover:bg-[var(--surface-elevated)] transition-colors',
                  repeatMode !== 'off' ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                )}
                title={`Repeat: ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>

            {/* Volume & Quality Bottom Bar */}
            <div className="flex items-center justify-between w-full pt-4 border-t border-[var(--border-color)]">
              {/* Volume Slider */}
              <div className="flex items-center gap-2 max-w-[160px] w-full">
                <button
                  onClick={toggleMute}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
                  className="w-full h-1 bg-[var(--surface-elevated)] rounded appearance-none cursor-pointer accent-[var(--accent)]"
                />
              </div>

              {/* Quality Menu Opener */}
              <div className="relative">
                <button
                  onClick={() => setShowQualityMenu(!showQualityMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Quality</span>
                </button>

                {showQualityMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowQualityMenu(false)}
                    />
                    <div className="absolute bottom-full right-0 mb-2 z-50">
                      <QualityMenu onClose={() => setShowQualityMenu(false)} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lyrics' && (
          <div className="h-full max-w-2xl mx-auto w-full">
            <LyricsPanel currentSong={currentSong} />
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="h-full flex flex-col max-w-2xl mx-auto w-full overflow-hidden">
            <div className="pb-3 border-b border-[var(--border-color)] mb-4">
              <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
                // UP NEXT ({queue.length} TRACKS)
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {queue.length === 0 ? (
                <div className="py-16 text-center text-[var(--text-muted)]">
                  <ListMusic className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">Your queue is empty</p>
                  <p className="text-xs mt-1">Search songs or explore mood playlists to add tracks</p>
                </div>
              ) : (
                queue.map((song, idx) => (
                  <SongRow key={`${song.id}-${idx}`} song={song} index={idx} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
