import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Song, PlaybackState, RepeatMode } from '../types/music';
import { useQueue } from './QueueContext';
import { ambientAudio } from '../services/ambientAudio';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface PlayerContextType {
  currentSong: Song | null;
  playbackState: PlaybackState;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  quality: string;
  isNowPlayingOpen: boolean;
  setIsNowPlayingOpen: (open: boolean) => void;
  isVideoOpen: boolean;
  setIsVideoOpen: (open: boolean) => void;
  toggleVideo: () => void;
  cueSong: (song: Song) => void;
  playSong: (song: Song) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekTo: (seconds: number, fastSeek?: boolean) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeatMode: () => void;
  toggleShuffle: () => void;
  setQuality: (quality: string) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  playerError: string | null;
  clearPlayerError: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

const MEDIA_ARTWORK_SIZES = ['96x96', '128x128', '192x192', '256x256', '512x512'] as const;

function resolveArtworkUrl(src: string): string {
  try {
    return new URL(src, window.location.origin).href;
  } catch {
    return src;
  }
}

function inferImageMimeType(url: string): string {
  const lower = url.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
}

function isDirectAudioSong(song: Song | null): boolean {
  return Boolean(song && (song.source === 'audio' || song.audioUrl));
}

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { queue, history, consumeNextTrack, removeFromQueue, addToHistory, getPreviousTrack } = useQueue();

  const [currentSong, setCurrentSong] = useState<Song | null>(() => {
    try {
      const saved = localStorage.getItem('moodsonix_last_song');
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  });

  const [playbackState, setPlaybackState] = useState<PlaybackState>(() =>
    currentSong ? 'paused' : 'unstarted'
  );
  const [isSessionStopped, setIsSessionStopped] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(() => currentSong?.duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('moodsonix_volume');
      return saved ? parseInt(saved, 10) : 80;
    } catch {
      return 80;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [quality, setQualityState] = useState<string>('auto');
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState<boolean>(false);
  const [isVideoOpen, setIsVideoOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('moodsonix_video_toggle') === 'true';
    } catch {
      return false;
    }
  });
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Single persistent root <audio> element & single persistent YT.Player instance
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<any>(null);
  const isPlayerReady = useRef<boolean>(false);
  const pendingYtSongRef = useRef<{ song: Song; autoplay: boolean } | null>(null);
  const timeUpdateInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Track whether the user has interacted via tap/click/key so initial load never autoplays
  const hasUserInteractedRef = useRef<boolean>(false);

  // Latest value refs so persistent listeners & MediaSession handlers never go stale
  const currentSongRef = useRef<Song | null>(currentSong);
  const playbackStateRef = useRef<PlaybackState>(playbackState);
  const currentTimeRef = useRef<number>(currentTime);
  const durationRef = useRef<number>(duration);
  const playbackRateRef = useRef<number>(playbackRate);
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  const isShuffledRef = useRef<boolean>(isShuffled);

  const resumeRef = useRef<() => void>(() => {});
  const pauseRef = useRef<() => void>(() => {});
  const stopRef = useRef<() => void>(() => {});
  const nextTrackRef = useRef<() => void>(() => {});
  const previousTrackRef = useRef<() => void>(() => {});
  const seekToRef = useRef<(seconds: number, fastSeek?: boolean) => void>(() => {});
  const handleYtStateChangeRef = useRef<(event: any) => void>(() => {});
  const handleYtErrorRef = useRef<(event: any) => void>(() => {});

  const isPlaying = playbackState === 'playing';

  // Record first user gesture and resume any suspended AudioContext
  useEffect(() => {
    const markUserGesture = () => {
      hasUserInteractedRef.current = true;
      void ambientAudio.resumeContext();
    };

    window.addEventListener('pointerdown', markUserGesture, { capture: true, passive: true });
    window.addEventListener('touchstart', markUserGesture, { capture: true, passive: true });
    window.addEventListener('click', markUserGesture, { capture: true, passive: true });
    window.addEventListener('keydown', markUserGesture, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', markUserGesture, { capture: true });
      window.removeEventListener('touchstart', markUserGesture, { capture: true });
      window.removeEventListener('click', markUserGesture, { capture: true });
      window.removeEventListener('keydown', markUserGesture, { capture: true });
    };
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('moodsonix_video_toggle', String(next));
      } catch {}
      return next;
    });
  }, []);

  const handleSetIsVideoOpen = useCallback((open: boolean) => {
    setIsVideoOpen(open);
    try {
      localStorage.setItem('moodsonix_video_toggle', String(open));
    } catch {}
  }, []);

  // Safely update MediaSession position state
  const syncPositionState = useCallback((pos?: number, dur?: number, rate?: number) => {
    if (
      typeof navigator === 'undefined' ||
      !('mediaSession' in navigator) ||
      typeof navigator.mediaSession.setPositionState !== 'function'
    ) {
      return;
    }

    const totalDuration = typeof dur === 'number' ? dur : durationRef.current;
    const rawPosition = typeof pos === 'number' ? pos : currentTimeRef.current;
    const currentRate = typeof rate === 'number' && rate > 0 ? rate : (playbackRateRef.current > 0 ? playbackRateRef.current : 1);

    if (
      typeof totalDuration === 'number' &&
      Number.isFinite(totalDuration) &&
      totalDuration > 0 &&
      typeof rawPosition === 'number' &&
      Number.isFinite(rawPosition)
    ) {
      const clampedPosition = Math.max(0, Math.min(rawPosition, totalDuration));
      try {
        navigator.mediaSession.setPositionState({
          duration: totalDuration,
          playbackRate: currentRate,
          position: clampedPosition
        });
      } catch {
        // Ignore transient invalid state errors
      }
    }
  }, []);

  // Save & apply volume to both persistent <audio> and embedded YT player
  const setVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setVolumeState(clamped);
    volumeRef.current = clamped;
    try {
      localStorage.setItem('moodsonix_volume', clamped.toString());
    } catch {}

    if (audioRef.current) {
      audioRef.current.volume = clamped / 100;
      if (clamped > 0 && isMutedRef.current) {
        audioRef.current.muted = false;
      }
    }

    if (playerRef.current && isPlayerReady.current) {
      try {
        playerRef.current.setVolume(clamped);
        if (clamped > 0 && isMutedRef.current) {
          playerRef.current.unMute();
        }
      } catch {}
    }

    if (clamped > 0 && isMutedRef.current) {
      setIsMuted(false);
      isMutedRef.current = false;
    }
  }, []);

  const toggleMute = useCallback(() => {
    const nextMuted = !isMutedRef.current;
    setIsMuted(nextMuted);
    isMutedRef.current = nextMuted;

    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
    }

    if (playerRef.current && isPlayerReady.current) {
      try {
        if (nextMuted) {
          playerRef.current.mute();
        } else {
          playerRef.current.unMute();
        }
      } catch {}
    }
  }, []);

  const setQuality = useCallback((q: string) => {
    setQualityState(q);
    if (playerRef.current && isPlayerReady.current) {
      try {
        if (q !== 'auto') {
          playerRef.current.setPlaybackQuality(q);
        }
      } catch {}
    }
  }, []);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => !prev);
  }, []);

  // Seek to position on active player
  const seekTo = useCallback((seconds: number, fastSeek = false) => {
    const dur = durationRef.current;
    const clamped = dur > 0 ? Math.max(0, Math.min(seconds, dur)) : Math.max(0, seconds);

    if (isDirectAudioSong(currentSongRef.current)) {
      const audio = audioRef.current;
      if (audio) {
        try {
          if (fastSeek && typeof audio.fastSeek === 'function') {
            audio.fastSeek(clamped);
          } else {
            audio.currentTime = clamped;
          }
        } catch {}
      }
    } else if (playerRef.current && isPlayerReady.current) {
      try {
        playerRef.current.seekTo(clamped, true);
      } catch {}
    }

    setCurrentTime(clamped);
    currentTimeRef.current = clamped;
    syncPositionState(clamped, durationRef.current, playbackRateRef.current);
  }, [syncPositionState]);

  // Cue a song without starting playback (used on initial mount / shared URL load before user tap)
  const cueSong = useCallback((song: Song) => {
    setCurrentSong(song);
    currentSongRef.current = song;
    setIsSessionStopped(false);
    setPlayerError(null);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(song.duration || 0);
    durationRef.current = song.duration || 0;
    setPlaybackState('paused');
    playbackStateRef.current = 'paused';

    try {
      localStorage.setItem('moodsonix_last_song', JSON.stringify(song));
    } catch {}

    const audio = audioRef.current;

    if (isDirectAudioSong(song) && song.audioUrl) {
      if (playerRef.current && isPlayerReady.current) {
        try { playerRef.current.pauseVideo(); } catch {}
      }
      if (audio) {
        audio.pause();
        if (audio.getAttribute('src') !== song.audioUrl) {
          audio.src = song.audioUrl;
          audio.load();
        }
        audio.volume = volumeRef.current / 100;
        audio.muted = isMutedRef.current;
      }
    } else {
      if (audio) {
        audio.pause();
        if (audio.getAttribute('src')) {
          audio.removeAttribute('src');
          audio.load();
        }
      }
      if (playerRef.current && isPlayerReady.current) {
        try {
          playerRef.current.cueVideoById({
            videoId: song.id,
            startSeconds: 0
          });
        } catch {}
      } else {
        pendingYtSongRef.current = { song, autoplay: false };
      }
    }
  }, []);

  // Pause active player
  const pause = useCallback(() => {
    if (isDirectAudioSong(currentSongRef.current)) {
      const audio = audioRef.current;
      if (audio) {
        try {
          audio.pause();
        } catch {}
      }
      setPlaybackState('paused');
      playbackStateRef.current = 'paused';
    } else if (playerRef.current && isPlayerReady.current) {
      try {
        playerRef.current.pauseVideo();
      } catch {}
    }
    syncPositionState();
  }, [syncPositionState]);

  // Stop playback and reset position (wired to Media Session 'stop' action)
  const stop = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        if (audioRef.current.getAttribute('src')) {
          audioRef.current.currentTime = 0;
        }
      } catch {}
    }
    if (playerRef.current && isPlayerReady.current) {
      try {
        playerRef.current.pauseVideo();
        playerRef.current.seekTo(0, true);
      } catch {}
    }
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setPlaybackState('paused');
    playbackStateRef.current = 'paused';
    setIsSessionStopped(true);
  }, []);

  // Play a song (changes persistent <audio>.src for direct streams, or loads into persistent YT.Player)
  const playSong = useCallback((song: Song) => {
    hasUserInteractedRef.current = true;
    void ambientAudio.resumeContext();

    setCurrentSong(song);
    currentSongRef.current = song;
    setIsSessionStopped(false);
    setPlayerError(null);
    setCurrentTime(0);
    currentTimeRef.current = 0;
    setDuration(song.duration || 0);
    durationRef.current = song.duration || 0;

    try {
      localStorage.setItem('moodsonix_last_song', JSON.stringify(song));
    } catch {}
    addToHistory(song);

    const audio = audioRef.current;

    if (isDirectAudioSong(song) && song.audioUrl) {
      // Stop embedded YT player if it was active
      if (playerRef.current && isPlayerReady.current) {
        try {
          playerRef.current.pauseVideo();
        } catch {}
      }

      if (audio) {
        // Change src on the single persistent <audio> element without recreating it
        if (audio.getAttribute('src') !== song.audioUrl) {
          audio.src = song.audioUrl;
        } else {
          try { audio.currentTime = 0; } catch {}
        }
        audio.volume = volumeRef.current / 100;
        audio.muted = isMutedRef.current;

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            console.warn('[Moodsonix] Audio playback blocked:', err);
            setPlaybackState('paused');
            playbackStateRef.current = 'paused';
          });
        }
      }
      return;
    }

    // Embedded YouTube track: keep <audio> idle (do NOT play dummy audio to bypass third-party restrictions)
    if (audio) {
      audio.pause();
      if (audio.getAttribute('src')) {
        audio.removeAttribute('src');
        audio.load();
      }
    }

    if (playerRef.current && isPlayerReady.current) {
      try {
        playerRef.current.loadVideoById({
          videoId: song.id,
          startSeconds: 0
        });
        if (!isMutedRef.current) {
          playerRef.current.unMute();
        }
        playerRef.current.setVolume(volumeRef.current);
        const playPromise = playerRef.current.playVideo();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err: any) => {
            console.warn('[Moodsonix] Embedded playback blocked:', err);
            setPlaybackState('paused');
            playbackStateRef.current = 'paused';
          });
        }
      } catch (err) {
        console.error('[Moodsonix] Player loadVideoById error:', err);
        setPlaybackState('paused');
        playbackStateRef.current = 'paused';
      }
    } else {
      pendingYtSongRef.current = { song, autoplay: true };
    }
  }, [addToHistory]);

  // Resume playback
  const resume = useCallback(() => {
    hasUserInteractedRef.current = true;
    setIsSessionStopped(false);
    void ambientAudio.resumeContext();

    const song = currentSongRef.current;
    if (!song) return;

    if (isDirectAudioSong(song) && song.audioUrl) {
      const audio = audioRef.current;
      if (audio) {
        if (audio.getAttribute('src') !== song.audioUrl) {
          audio.src = song.audioUrl;
        }
        audio.volume = volumeRef.current / 100;
        audio.muted = isMutedRef.current;
        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            console.warn('[Moodsonix] Audio resume blocked:', err);
            setPlaybackState('paused');
            playbackStateRef.current = 'paused';
          });
        }
      }
      return;
    }

    if (playerRef.current && isPlayerReady.current) {
      try {
        let loadedVideoId = '';
        try {
          loadedVideoId = playerRef.current.getVideoData?.()?.video_id || '';
        } catch {}

        if (!loadedVideoId || loadedVideoId !== song.id) {
          playerRef.current.loadVideoById({
            videoId: song.id,
            startSeconds: currentTimeRef.current || 0
          });
        }
        if (!isMutedRef.current) {
          playerRef.current.unMute();
        }
        playerRef.current.setVolume(volumeRef.current);
        const playPromise = playerRef.current.playVideo();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err: any) => {
            console.warn('[Moodsonix] Playback blocked by autoplay policy:', err);
            setPlaybackState('paused');
            playbackStateRef.current = 'paused';
          });
        }
      } catch (err) {
        console.warn('[Moodsonix] Playback error on resume:', err);
        setPlaybackState('paused');
        playbackStateRef.current = 'paused';
      }
    } else {
      playSong(song);
    }
  }, [playSong]);

  // Next track (supports background track advancement without visibility blocking)
  const nextTrack = useCallback(() => {
    if (queue.length > 0) {
      if (isShuffledRef.current && queue.length > 1) {
        const randomIndex = Math.floor(Math.random() * queue.length);
        const picked = queue[randomIndex];
        removeFromQueue(randomIndex);
        if (picked) {
          playSong(picked);
          return;
        }
      }
      const nextSong = consumeNextTrack();
      if (nextSong) {
        playSong(nextSong);
        return;
      }
    }

    if (repeatModeRef.current === 'all' && history.length > 0) {
      const first = history[history.length - 1];
      if (first) {
        playSong(first);
        return;
      }
    }

    pause();
  }, [queue, history, consumeNextTrack, removeFromQueue, playSong, pause]);

  // Previous track
  const previousTrack = useCallback(() => {
    if (currentTimeRef.current > 4) {
      seekTo(0);
    } else {
      const prev = getPreviousTrack();
      if (prev && prev.id !== currentSongRef.current?.id) {
        playSong(prev);
      } else {
        seekTo(0);
      }
    }
  }, [getPreviousTrack, playSong, seekTo]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    hasUserInteractedRef.current = true;
    void ambientAudio.resumeContext();

    if (playbackStateRef.current === 'playing') {
      pause();
    } else if (currentSongRef.current) {
      resume();
    } else if (queue.length > 0) {
      const next = consumeNextTrack();
      if (next) playSong(next);
    }
  }, [pause, resume, queue, consumeNextTrack, playSong]);

  // Handle YouTube embedded player state changes (strictly mirror real player state)
  const handleYtStateChange = useCallback((event: any) => {
    // Ignore YT state events when playing a direct <audio> track
    if (isDirectAudioSong(currentSongRef.current)) return;

    const stateCode = event.data;
    let rate = 1;
    let time = currentTimeRef.current;
    let dur = durationRef.current;

    if (playerRef.current && isPlayerReady.current) {
      try {
        rate = playerRef.current.getPlaybackRate?.() || 1;
        const playerTime = playerRef.current.getCurrentTime?.();
        const playerDur = playerRef.current.getDuration?.();
        if (typeof playerTime === 'number' && Number.isFinite(playerTime)) {
          time = playerTime;
          setCurrentTime(playerTime);
          currentTimeRef.current = playerTime;
        }
        if (typeof playerDur === 'number' && Number.isFinite(playerDur) && playerDur > 0) {
          dur = playerDur;
          setDuration(playerDur);
          durationRef.current = playerDur;
        }
        setPlaybackRate(rate);
        playbackRateRef.current = rate;
      } catch {}
    }

    // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
    if (stateCode === 1) {
      setIsSessionStopped(false);
      setPlaybackState('playing');
      playbackStateRef.current = 'playing';
      syncPositionState(time, dur, rate);
    } else if (stateCode === 2) {
      setPlaybackState('paused');
      playbackStateRef.current = 'paused';
      syncPositionState(time, dur, rate);
    } else if (stateCode === 3) {
      setPlaybackState('buffering');
      playbackStateRef.current = 'buffering';
    } else if (stateCode === 5) {
      setPlaybackState('cued');
      playbackStateRef.current = 'cued';
      syncPositionState(time, dur, rate);
    } else if (stateCode === 0) {
      setPlaybackState('ended');
      playbackStateRef.current = 'ended';
      if (repeatModeRef.current === 'one' && currentSongRef.current) {
        seekTo(0);
        resume();
      } else {
        nextTrack();
      }
    }
  }, [nextTrack, resume, seekTo, syncPositionState]);

  // Handle YouTube errors
  const handleYtError = useCallback((event: any) => {
    if (isDirectAudioSong(currentSongRef.current)) return;

    const code = event.data;
    let message = 'Playback error occurred';
    if (code === 2) message = 'Invalid video ID parameter';
    if (code === 5) message = 'HTML5 player error';
    if (code === 100) message = 'This video was not found or was removed';
    if (code === 101 || code === 150) message = 'Embedded playback disabled by video owner. Skipping...';

    console.warn(`[Moodsonix] YouTube Player Error (${code}):`, message);
    setPlayerError(message);

    if (code === 101 || code === 150 || code === 100) {
      setTimeout(() => {
        nextTrackRef.current();
      }, 2500);
    }
  }, []);

  // Keep refs synchronized with latest callbacks and state
  useEffect(() => {
    currentSongRef.current = currentSong;
    playbackStateRef.current = playbackState;
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
    playbackRateRef.current = playbackRate;
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    repeatModeRef.current = repeatMode;
    isShuffledRef.current = isShuffled;

    resumeRef.current = resume;
    pauseRef.current = pause;
    stopRef.current = stop;
    nextTrackRef.current = nextTrack;
    previousTrackRef.current = previousTrack;
    seekToRef.current = seekTo;
    handleYtStateChangeRef.current = handleYtStateChange;
    handleYtErrorRef.current = handleYtError;
  });

  // Wire persistent root <audio> element event listeners ONCE on mount
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volumeRef.current / 100;
    audio.muted = isMutedRef.current;

    // If initial restored song is a direct audio stream, cue its src without autoplaying
    const initialSong = currentSongRef.current;
    if (initialSong && isDirectAudioSong(initialSong) && initialSong.audioUrl) {
      audio.src = initialSong.audioUrl;
      audio.load();
    }

    let lastPosSync = 0;

    const handlePlaying = () => {
      if (!isDirectAudioSong(currentSongRef.current)) return;
      setIsSessionStopped(false);
      setPlaybackState('playing');
      playbackStateRef.current = 'playing';
      const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationRef.current;
      const pos = audio.currentTime || 0;
      const rate = audio.playbackRate || 1;
      syncPositionState(pos, dur, rate);
    };

    const handlePause = () => {
      if (!isDirectAudioSong(currentSongRef.current)) return;
      if (audio.ended) return;
      setPlaybackState('paused');
      playbackStateRef.current = 'paused';
      const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationRef.current;
      syncPositionState(audio.currentTime || 0, dur, audio.playbackRate || 1);
    };

    const handleWaiting = () => {
      if (!isDirectAudioSong(currentSongRef.current)) return;
      setPlaybackState('buffering');
      playbackStateRef.current = 'buffering';
    };

    const handleLoadedMetadata = () => {
      if (!isDirectAudioSong(currentSongRef.current)) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        durationRef.current = audio.duration;
        syncPositionState(audio.currentTime || 0, audio.duration, audio.playbackRate || 1);
      }
    };

    const handleRateChange = () => {
      if (!isDirectAudioSong(currentSongRef.current)) return;
      const rate = audio.playbackRate || 1;
      setPlaybackRate(rate);
      playbackRateRef.current = rate;
      syncPositionState(audio.currentTime || 0, durationRef.current, rate);
    };

    const handleTimeUpdate = () => {
      if (!isDirectAudioSong(currentSongRef.current)) return;
      const pos = audio.currentTime || 0;
      setCurrentTime(pos);
      currentTimeRef.current = pos;

      if (Number.isFinite(audio.duration) && audio.duration > 0 && audio.duration !== durationRef.current) {
        setDuration(audio.duration);
        durationRef.current = audio.duration;
      }

      const now = Date.now();
      if (now - lastPosSync >= 1000) {
        lastPosSync = now;
        syncPositionState(pos, durationRef.current, audio.playbackRate || 1);
      }
    };

    const handleSeeked = () => {
      if (!isDirectAudioSong(currentSongRef.current)) return;
      const pos = audio.currentTime || 0;
      setCurrentTime(pos);
      currentTimeRef.current = pos;
      syncPositionState(pos, durationRef.current, audio.playbackRate || 1);
    };

    const handleEnded = () => {
      if (!isDirectAudioSong(currentSongRef.current)) return;
      setPlaybackState('ended');
      playbackStateRef.current = 'ended';
      if (repeatModeRef.current === 'one' && currentSongRef.current) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          setPlaybackState('paused');
          playbackStateRef.current = 'paused';
        });
      } else {
        nextTrackRef.current();
      }
    };

    const handleError = () => {
      if (!isDirectAudioSong(currentSongRef.current)) return;
      if (!audio.getAttribute('src')) return;
      setPlayerError('Audio stream could not be loaded.');
      setPlaybackState('paused');
      playbackStateRef.current = 'paused';
    };

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    audio.addEventListener('ratechange', handleRateChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
      audio.removeEventListener('ratechange', handleRateChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [syncPositionState]);

  // Initialize persistent YouTube IFrame Player ONCE (never destroy/recreate on song or route changes)
  useEffect(() => {
    let initialized = false;

    const initPlayer = () => {
      if (initialized || playerRef.current || !window.YT || !window.YT.Player) return;

      const hostEl = document.getElementById('youtube-player-iframe');
      if (!hostEl) return;

      initialized = true;
      const initialSong = currentSongRef.current;
      const initialYtVideoId = initialSong && !isDirectAudioSong(initialSong) ? initialSong.id : '';

      try {
        playerRef.current = new window.YT.Player('youtube-player-iframe', {
          height: '100%',
          width: '100%',
          videoId: initialYtVideoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin
          },
          events: {
            onReady: (event: any) => {
              isPlayerReady.current = true;
              try {
                event.target.setVolume(volumeRef.current);
                if (isMutedRef.current) {
                  event.target.mute();
                } else {
                  event.target.unMute();
                }
              } catch {}

              if (pendingYtSongRef.current) {
                const pending = pendingYtSongRef.current;
                pendingYtSongRef.current = null;
                if (pending.autoplay && hasUserInteractedRef.current) {
                  try {
                    event.target.loadVideoById({ videoId: pending.song.id, startSeconds: 0 });
                    const p = event.target.playVideo();
                    if (p && typeof p.catch === 'function') {
                      p.catch(() => {
                        setPlaybackState('paused');
                        playbackStateRef.current = 'paused';
                      });
                    }
                  } catch {}
                } else {
                  try {
                    event.target.cueVideoById({ videoId: pending.song.id, startSeconds: 0 });
                  } catch {}
                }
              }
            },
            onStateChange: (e: any) => handleYtStateChangeRef.current(e),
            onError: (e: any) => handleYtErrorRef.current(e)
          }
        });
      } catch (err) {
        console.error('[Moodsonix] YouTube Player initialization failed:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      if (window.YT && typeof window.YT.ready === 'function') {
        window.YT.ready(initPlayer);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
        isPlayerReady.current = false;
      }
    };
  }, []);

  // Poll embedded YT player position & update setPositionState regularly while YT track is playing
  useEffect(() => {
    let lastPositionUpdate = 0;

    if (isPlaying && !isDirectAudioSong(currentSong)) {
      timeUpdateInterval.current = setInterval(() => {
        if (playerRef.current && isPlayerReady.current) {
          try {
            const time = playerRef.current.getCurrentTime() || 0;
            const dur = playerRef.current.getDuration() || 0;
            const rate = playerRef.current.getPlaybackRate?.() || 1;

            setCurrentTime(time);
            currentTimeRef.current = time;

            if (dur > 0 && dur !== durationRef.current) {
              setDuration(dur);
              durationRef.current = dur;
            }
            if (rate > 0 && rate !== playbackRateRef.current) {
              setPlaybackRate(rate);
              playbackRateRef.current = rate;
            }

            const now = Date.now();
            if (now - lastPositionUpdate >= 1000) {
              lastPositionUpdate = now;
              syncPositionState(time, dur > 0 ? dur : durationRef.current, rate);
            }
          } catch {}
        }
      }, 250);
    } else {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
        timeUpdateInterval.current = null;
      }
    }

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
        timeUpdateInterval.current = null;
      }
    };
  }, [isPlaying, currentSong, syncPositionState]);

  // 1. Register Media Session action handlers ONCE on mount (wired directly to player functions)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const actionMap: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => resumeRef.current()],
      ['pause', () => pauseRef.current()],
      ['previoustrack', () => previousTrackRef.current()],
      ['nexttrack', () => nextTrackRef.current()],
      [
        'seekbackward',
        (details) => {
          const offset = details?.seekOffset ?? 10;
          seekToRef.current(Math.max(0, currentTimeRef.current - offset));
        }
      ],
      [
        'seekforward',
        (details) => {
          const offset = details?.seekOffset ?? 10;
          const dur = durationRef.current || 0;
          const pos = dur > 0 ? Math.min(dur, currentTimeRef.current + offset) : currentTimeRef.current + offset;
          seekToRef.current(pos);
        }
      ],
      [
        'seekto',
        (details) => {
          if (typeof details?.seekTime === 'number' && Number.isFinite(details.seekTime)) {
            seekToRef.current(details.seekTime, Boolean(details.fastSeek));
          }
        }
      ],
      ['stop', () => stopRef.current()]
    ];

    actionMap.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (err) {
        console.warn(`[Moodsonix] MediaSession action "${action}" not supported:`, err);
      }
    });

    return () => {
      if (!('mediaSession' in navigator)) return;
      actionMap.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {}
      });
    };
  }, []);

  // 2. Set navigator.mediaSession.metadata on every track change (96, 128, 192, 256, and 512 sizes)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    if (currentSong) {
      const rawThumb = currentSong.thumbnail || '/pwa-512x512.png';
      const resolvedThumb = resolveArtworkUrl(rawThumb);
      const mimeType = inferImageMimeType(resolvedThumb);

      const artwork: MediaImage[] = MEDIA_ARTWORK_SIZES.map((sizes) => ({
        src: resolvedThumb,
        sizes,
        type: mimeType
      }));

      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title || 'Unknown Title',
          artist: currentSong.artist || 'Unknown Artist',
          album: currentSong.album || 'Moodsonix',
          artwork
        });
      } catch (err) {
        console.warn('[Moodsonix] MediaSession metadata error:', err);
      }

      syncPositionState(0, currentSong.duration || durationRef.current, playbackRateRef.current);
    } else {
      try {
        navigator.mediaSession.metadata = null;
      } catch {}
    }
  }, [currentSong, syncPositionState]);

  // 3. Keep navigator.mediaSession.playbackState ("playing" or "paused") synced with real player state
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      if (!currentSong || isSessionStopped) {
        navigator.mediaSession.playbackState = 'none';
      } else if (playbackState === 'playing') {
        navigator.mediaSession.playbackState = 'playing';
      } else {
        navigator.mediaSession.playbackState = 'paused';
      }
    } catch {}

    syncPositionState();
  }, [playbackState, currentSong, isSessionStopped, syncPositionState]);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        playbackState,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        repeatMode,
        isShuffled,
        quality,
        isNowPlayingOpen,
        setIsNowPlayingOpen,
        isVideoOpen,
        setIsVideoOpen: handleSetIsVideoOpen,
        toggleVideo,
        cueSong,
        playSong,
        togglePlay,
        pause,
        resume,
        stop,
        seekTo,
        setVolume,
        toggleMute,
        setRepeatMode,
        cycleRepeatMode,
        toggleShuffle,
        setQuality,
        nextTrack,
        previousTrack,
        playerError,
        clearPlayerError: () => setPlayerError(null)
      }}
    >
      {/* Single persistent <audio> element mounted at the app root, never recreated or unmounted on route changes */}
      <audio
        ref={audioRef}
        id="moodsonix-root-audio"
        preload="metadata"
        playsInline
        aria-hidden="true"
      />
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
};
