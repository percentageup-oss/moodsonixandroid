import { Capacitor } from '@capacitor/core';
import {
  MediaSession,
  type MediaImage,
  type MediaSessionPlaybackState,
  type MediaSessionAction,
  type MetadataOptions,
  type PositionStateOptions,
  type ActionHandler
} from '@capgo/capacitor-media-session';

export type {
  MediaImage,
  MediaSessionPlaybackState,
  MediaSessionAction,
  MetadataOptions,
  PositionStateOptions,
  ActionHandler
};

export interface NativeMetadata {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: MediaImage[];
}

export interface NativePositionState {
  duration?: number;
  position?: number;
  playbackRate?: number;
}

/**
 * Updates native media notification metadata on Android / iOS lock screen and notification shade.
 * Safe no-op on web / PWA.
 */
export async function setNativeMetadata(options: NativeMetadata): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await MediaSession.setMetadata({
      title: options.title,
      artist: options.artist,
      album: options.album,
      artwork: options.artwork
    });
  } catch (err) {
    console.warn('[Moodsonix] Native MediaSession setMetadata failed:', err);
  }
}

/**
 * Updates native playback state ('playing' | 'paused' | 'none').
 * The notification appears on native Android when set to 'playing'.
 * Safe no-op on web / PWA.
 */
export async function setNativePlaybackState(playbackState: MediaSessionPlaybackState): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await MediaSession.setPlaybackState({ playbackState });
  } catch (err) {
    console.warn('[Moodsonix] Native MediaSession setPlaybackState failed:', err);
  }
}

/**
 * Updates native position state (duration, position, playbackRate).
 * Safe no-op on web / PWA.
 */
export async function setNativePositionState(options: NativePositionState): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await MediaSession.setPositionState({
      duration: options.duration,
      position: options.position,
      playbackRate: options.playbackRate
    });
  } catch (err) {
    console.warn('[Moodsonix] Native MediaSession setPositionState failed:', err);
  }
}

/**
 * Registers an action handler for native media controls:
 * 'play', 'pause', 'nexttrack', 'previoustrack', 'seekto', 'stop'
 * Safe no-op on web / PWA.
 */
export async function setNativeActionHandler(
  action: MediaSessionAction,
  handler: ActionHandler | null
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await MediaSession.setActionHandler({ action }, handler);
  } catch (err) {
    console.warn(`[Moodsonix] Native MediaSession setActionHandler "${action}" failed:`, err);
  }
}

// Convenient alias exports
export const setMetadata = setNativeMetadata;
export const setPlaybackState = setNativePlaybackState;
export const setPositionState = setNativePositionState;
export const setActionHandler = setNativeActionHandler;
