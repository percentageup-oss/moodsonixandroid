import { useState, useEffect, useRef, useCallback } from 'react';
import { ambientAudio } from '../services/ambientAudio';

export type PomodoroMode = 'focus' | 'break';

export function useFocusTimer() {
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const FOCUS_DURATION = 25 * 60; // 25 min
  const BREAK_DURATION = 5 * 60;  // 5 min

  const totalDuration = mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION;

  const [timeLeft, setTimeLeft] = useState<number>(totalDuration);
  const endTimeRef = useRef<number | null>(null);

  const start = useCallback(() => {
    endTimeRef.current = Date.now() + timeLeft * 1000;
    setIsActive(true);
  }, [timeLeft]);

  const pause = useCallback(() => {
    setIsActive(false);
    endTimeRef.current = null;
  }, []);

  const resume = useCallback(() => {
    start();
  }, [start]);

  const reset = useCallback(() => {
    setIsActive(false);
    endTimeRef.current = null;
    setTimeLeft(mode === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
  }, [mode, FOCUS_DURATION, BREAK_DURATION]);

  const switchMode = useCallback((newMode: PomodoroMode) => {
    setMode(newMode);
    setIsActive(false);
    endTimeRef.current = null;
    setTimeLeft(newMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
  }, [FOCUS_DURATION, BREAK_DURATION]);

  useEffect(() => {
    let interval: any = null;

    if (isActive && endTimeRef.current) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((endTimeRef.current! - Date.now()) / 1000));
        setTimeLeft(remaining);

        if (remaining <= 0) {
          setIsActive(false);
          endTimeRef.current = null;

          if (soundEnabled) {
            ambientAudio.playCompletionTone();
          }

          // Trigger browser notification if permitted
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Moodsonix Focus Session', {
              body: mode === 'focus' ? 'Focus time complete! Take a well-earned break.' : 'Break over! Ready to focus?',
              icon: '/pwa-192x192.png'
            });
          }

          // Auto switch to next session
          const nextMode: PomodoroMode = mode === 'focus' ? 'break' : 'focus';
          setMode(nextMode);
          setTimeLeft(nextMode === 'focus' ? FOCUS_DURATION : BREAK_DURATION);
        }
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, mode, soundEnabled, FOCUS_DURATION, BREAK_DURATION]);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
    }
  };

  const progress = Math.max(0, Math.min(1, 1 - timeLeft / totalDuration));

  return {
    mode,
    isActive,
    timeLeft,
    totalDuration,
    progress,
    soundEnabled,
    setSoundEnabled,
    start,
    pause,
    resume,
    reset,
    switchMode,
    requestNotificationPermission
  };
}
