export interface Song {
  id: string; // YouTube Video ID or track ID
  source: 'youtube' | 'audio';
  title: string;
  artist: string;
  channel: string;
  album?: string | null;
  thumbnail: string;
  duration: number; // in seconds
  url: string;
  audioUrl?: string; // Direct stream URL for native <audio> playback
  isPlayable: boolean;
}

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  songId: string;
  provider: 'lrclib' | 'netease' | 'lyrics.ovh' | 'youtube' | 'none';
  syncedLyrics: LyricLine[] | null;
  plainLyrics: string | null;
  notFound: boolean;
  attribution: string;
}

export interface PlaylistInfo {
  id: string;
  title: string;
  thumbnail?: string;
  trackCount: number;
  tracks: Song[];
}

export type PlaybackState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';

export type RepeatMode = 'off' | 'one' | 'all';

export type AppTheme = 'theme-midnight' | 'theme-neon' | 'theme-slate';

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  isGuest: boolean;
  searchesCount: number;
}
