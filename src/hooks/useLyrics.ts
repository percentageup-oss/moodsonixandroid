import { useState, useEffect, useRef } from 'react';
import { Song, LyricsData } from '../types/music';
import { fetchLyrics as fetchLyricsService } from '../services/musicApi';

export function useLyrics(currentSong: Song | null, currentTime: number) {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const activeSongId = useRef<string | null>(null);

  useEffect(() => {
    if (!currentSong) {
      setLyrics(null);
      setIsLoading(false);
      return;
    }

    activeSongId.current = currentSong.id;
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();

    const loadLyrics = async () => {
      try {
        const data = await fetchLyricsService(currentSong, controller.signal);
        if (activeSongId.current === currentSong.id) {
          setLyrics(data);
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && activeSongId.current === currentSong.id) {
          setError(err.message || 'Could not fetch lyrics');
          setIsLoading(false);
        }
      }
    };

    loadLyrics();

    return () => {
      controller.abort();
    };
  }, [currentSong?.id]);

  // Calculate current active line index for synced lyrics
  let activeLineIndex = -1;
  if (lyrics?.syncedLyrics && lyrics.syncedLyrics.length > 0) {
    for (let i = 0; i < lyrics.syncedLyrics.length; i++) {
      if (currentTime >= lyrics.syncedLyrics[i].time - 0.2) {
        activeLineIndex = i;
      } else {
        break;
      }
    }
  }

  return {
    lyrics,
    isLoading,
    error,
    activeLineIndex
  };
}
