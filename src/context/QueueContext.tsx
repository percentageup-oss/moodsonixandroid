import React, { createContext, useContext, useState, useEffect } from 'react';
import { Song } from '../types/music';

interface QueueContextType {
  queue: Song[];
  history: Song[];
  likedSongs: Song[];
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  setQueueList: (songs: Song[]) => void;
  toggleLike: (song: Song) => void;
  isLiked: (songId: string) => boolean;
  addToHistory: (song: Song) => void;
  getNextTrack: () => Song | null;
  consumeNextTrack: () => Song | null;
  getPreviousTrack: () => Song | null;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queue, setQueue] = useState<Song[]>(() => {
    const saved = localStorage.getItem('moodsonix_queue');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [history, setHistory] = useState<Song[]>(() => {
    const saved = localStorage.getItem('moodsonix_history');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  const [likedSongs, setLikedSongs] = useState<Song[]>(() => {
    const saved = localStorage.getItem('moodsonix_liked');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('moodsonix_queue', JSON.stringify(queue));
  }, [queue]);

  useEffect(() => {
    localStorage.setItem('moodsonix_history', JSON.stringify(history.slice(0, 100)));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('moodsonix_liked', JSON.stringify(likedSongs));
  }, [likedSongs]);

  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, song]);
  };

  const playNext = (song: Song) => {
    setQueue(prev => [song, ...prev]);
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  const reorderQueue = (fromIndex: number, toIndex: number) => {
    setQueue(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const setQueueList = (songs: Song[]) => {
    setQueue(songs);
  };

  const toggleLike = (song: Song) => {
    setLikedSongs(prev => {
      const exists = prev.some(s => s.id === song.id);
      if (exists) {
        return prev.filter(s => s.id !== song.id);
      } else {
        return [song, ...prev];
      }
    });
  };

  const isLiked = (songId: string): boolean => {
    return likedSongs.some(s => s.id === songId);
  };

  const addToHistory = (song: Song) => {
    setHistory(prev => {
      const filtered = prev.filter(s => s.id !== song.id);
      return [song, ...filtered].slice(0, 50);
    });
  };

  const getNextTrack = (): Song | null => {
    return queue.length > 0 ? queue[0] : null;
  };

  const consumeNextTrack = (): Song | null => {
    if (queue.length === 0) return null;
    const nextSong = queue[0];
    setQueue(prev => prev.slice(1));
    return nextSong;
  };

  const getPreviousTrack = (): Song | null => {
    return history.length > 1 ? history[1] : (history[0] || null);
  };

  return (
    <QueueContext.Provider
      value={{
        queue,
        history,
        likedSongs,
        addToQueue,
        playNext,
        removeFromQueue,
        reorderQueue,
        clearQueue,
        setQueueList,
        toggleLike,
        isLiked,
        addToHistory,
        getNextTrack,
        consumeNextTrack,
        getPreviousTrack
      }}
    >
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) throw new Error('useQueue must be used within QueueProvider');
  return context;
};
