import { Song, LyricsData, LyricLine, PlaylistInfo } from '../types/music';
import { fetchLyricsFallbacks } from './lyricsFallbacks';

interface LyricsCacheEntry {
  data: LyricsData;
  expiresAt: number;
}

const LYRICS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LYRICS_NOT_FOUND_TTL_MS = 60 * 60 * 1000; // 1 hour
const lyricsCache = new Map<string, LyricsCacheEntry>();

// Public fallback endpoints with CORS support
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://piped-api.lunar.icu'
];

// Helper to safely parse JSON from a fetch Response without throwing SyntaxError
export async function safeJsonResponse<T>(res: Response): Promise<{ data: T | null; isJson: boolean; text?: string }> {
  try {
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    if (!text || (!contentType.includes('application/json') && !text.trim().startsWith('{') && !text.trim().startsWith('['))) {
      return { data: null, isJson: false, text: text.slice(0, 100) };
    }
    const data = JSON.parse(text) as T;
    return { data, isJson: true };
  } catch {
    return { data: null, isJson: false };
  }
}

// Clean song title for lyrics search
export function cleanTitleForLyrics(rawTitle: string): { title: string; artistHint?: string } {
  let cleaned = rawTitle || '';
  let artistHint: string | undefined;

  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    if (parts.length >= 2) {
      artistHint = parts[0].trim();
      cleaned = parts.slice(1).join(' - ').trim();
    }
  }

  cleaned = cleaned.replace(/\s*[([{\u3010](official\s*(music\s*)?video|official\s*audio|lyrics?|lyric\s*video|audio|visualizer|video|hd|4k|mv|music\s*video)[)\]}\u3011]/gi, ' ');
  cleaned = cleaned.replace(/\s*-\s*topic$/gi, '');
  cleaned = cleaned.replace(/\s*ft\.?\s*[^()\[\]]+/gi, '');
  cleaned = cleaned.replace(/\s*feat\.?\s*[^()\[\]]+/gi, '');
  cleaned = cleaned.replace(/\|.*/g, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return { title: cleaned || rawTitle, artistHint };
}

// Parse LRC lyrics text into structured timestamp lines
export function parseLRC(lrcText: string): LyricLine[] {
  if (!lrcText) return [];
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const matches = Array.from(line.matchAll(timeRegex));
    if (matches.length > 0) {
      const text = line.replace(timeRegex, '').trim();
      for (const match of matches) {
        const mins = parseInt(match[1], 10);
        const secs = parseInt(match[2], 10);
        const frac = match[3] ? parseFloat('0.' + match[3]) : 0;
        const totalSeconds = mins * 60 + secs + frac;
        result.push({ time: totalSeconds, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

// Client-side search via Piped instances
async function searchPipedDirect(query: string, signal?: AbortSignal): Promise<Song[]> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`, {
        signal,
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) continue;
      const { data, isJson } = await safeJsonResponse<any>(res);
      if (!isJson || !data || !Array.isArray(data.items)) continue;

      const results = data.items
        .filter((item: any) => item && (item.url || item.id))
        .map((item: any): Song => {
          const videoId = item.url ? item.url.replace('/watch?v=', '') : (item.id || '');
          return {
            id: videoId,
            source: 'youtube',
            title: item.title || 'Unknown Title',
            artist: item.uploaderName || item.channel || 'Unknown Artist',
            channel: item.uploaderName || 'Unknown Channel',
            album: null,
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duration: item.duration || 180,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            isPlayable: true
          };
        });

      if (results.length > 0) return results;
    } catch {
      // Continue to next instance
    }
  }
  return [];
}

// Client-side search fallback via iTunes search API
async function searchItunesFallback(query: string, signal?: AbortSignal): Promise<Song[]> {
  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`, {
      signal
    });
    if (!res.ok) return [];
    const { data, isJson } = await safeJsonResponse<any>(res);
    if (!isJson || !data || !Array.isArray(data.results)) return [];

    return data.results.map((item: any, idx: number): Song => ({
      id: `itunes_${item.trackId || idx}`,
      source: item.previewUrl ? 'audio' : 'youtube',
      title: item.trackName || 'Unknown Title',
      artist: item.artistName || 'Unknown Artist',
      channel: item.artistName || 'Apple Music',
      album: item.collectionName || null,
      thumbnail: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '512x512bb') : '',
      duration: item.previewUrl ? 30 : Math.round((item.trackTimeMillis || 180000) / 1000),
      url: item.trackViewUrl || '',
      audioUrl: item.previewUrl || undefined,
      isPlayable: Boolean(item.previewUrl)
    }));
  } catch {
    return [];
  }
}

// Client-side rule-based mood mapper
export function getMoodQuery(mood: string): string {
  const m = mood.toLowerCase().trim();
  if (m.includes('rain') || m.includes('relax')) return `${mood} ambient lofi chill`;
  if (m.includes('focus') || m.includes('study')) return `${mood} instrumental deep focus study`;
  if (m.includes('gym') || m.includes('workout')) return `${mood} workout motivation phonk edm`;
  if (m.includes('drive') || m.includes('night')) return `${mood} synthwave retro night drive`;
  if (m.includes('morning') || m.includes('coffee')) return `${mood} calm acoustic morning coffee`;
  if (m.includes('chill') || m.includes('sleep')) return `${mood} lofi hip hop sleep chill`;
  return `${mood} music playlist`;
}

// Curated high-vibe discovery songs for offline or fresh starts
export const CURATED_DISCOVERY_TRACKS: Song[] = [
  {
    id: 'jfKfPfyJRdk',
    source: 'youtube',
    title: 'lofi hip hop radio - beats to relax/study to',
    artist: 'Lofi Girl',
    channel: 'Lofi Girl',
    album: 'Lofi Essentials',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    duration: 180,
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    isPlayable: true
  },
  {
    id: '4xDzrJKXOOY',
    source: 'youtube',
    title: 'synthwave radio - chill synth / retro beats',
    artist: 'Lofi Girl',
    channel: 'Lofi Girl',
    album: 'Synthwave Radio',
    thumbnail: 'https://i.ytimg.com/vi/4xDzrJKXOOY/hqdefault.jpg',
    duration: 180,
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    isPlayable: true
  },
  {
    id: '5yx6BWlEVcY',
    source: 'youtube',
    title: 'Chillhop Radio - jazzy & lofi hip hop beats',
    artist: 'Chillhop Music',
    channel: 'Chillhop Music',
    album: 'Chillhop Essentials',
    thumbnail: 'https://i.ytimg.com/vi/5yx6BWlEVcY/hqdefault.jpg',
    duration: 180,
    url: 'https://www.youtube.com/watch?v=5yx6BWlEVcY',
    isPlayable: true
  },
  {
    id: '7NOSDKb0HlU',
    source: 'youtube',
    title: 'Night drive lofi hip hop',
    artist: 'ChilledCow',
    channel: 'ChilledCow',
    album: 'Night Beats',
    thumbnail: 'https://i.ytimg.com/vi/7NOSDKb0HlU/hqdefault.jpg',
    duration: 210,
    url: 'https://www.youtube.com/watch?v=7NOSDKb0HlU',
    isPlayable: true
  },
  {
    id: 'kJQP7kiw5Fk',
    source: 'youtube',
    title: 'Despacito',
    artist: 'Luis Fonsi ft. Daddy Yankee',
    channel: 'Luis Fonsi',
    album: 'Vida',
    thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    duration: 228,
    url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    isPlayable: true
  },
  {
    id: 'kXYiU_JCYtU',
    source: 'youtube',
    title: 'Numb',
    artist: 'Linkin Park',
    channel: 'Linkin Park',
    album: 'Meteora',
    thumbnail: 'https://i.ytimg.com/vi/kXYiU_JCYtU/hqdefault.jpg',
    duration: 187,
    url: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
    isPlayable: true
  }
];

// Main exported resilient search function
export async function searchMusic(
  query: string,
  isMood = false,
  signal?: AbortSignal
): Promise<{ results: Song[]; generatedQuery?: string }> {
  const trimmed = query.trim();
  if (!trimmed) return { results: [] };

  // 1. Try local server API route first
  try {
    let endpoint = `/api/search?q=${encodeURIComponent(trimmed)}`;
    let body: string | undefined = undefined;
    let method = 'GET';

    if (isMood) {
      endpoint = '/api/mood-search';
      method = 'POST';
      body = JSON.stringify({ mood: trimmed });
    }

    const res = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body,
      signal
    });

    const { data, isJson } = await safeJsonResponse<any>(res);
    if (res.ok && isJson && data && Array.isArray(data.results) && data.results.length > 0) {
      return {
        results: data.results,
        generatedQuery: data.generatedQuery
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
    console.warn('[Moodsonix] Local API search failed or not available, falling back to client-side...', err);
  }

  // 2. Client-side fallback if server returned 404/HTML (e.g. static hosting on Vercel)
  const searchQuery = isMood ? getMoodQuery(trimmed) : trimmed;

  try {
    const pipedResults = await searchPipedDirect(searchQuery, signal);
    if (pipedResults.length > 0) {
      return {
        results: pipedResults,
        generatedQuery: isMood ? searchQuery : undefined
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
  }

  // 3. Fallback to iTunes search
  try {
    const itunesResults = await searchItunesFallback(searchQuery, signal);
    if (itunesResults.length > 0) {
      return {
        results: itunesResults,
        generatedQuery: isMood ? searchQuery : undefined
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
  }

  // 4. Return matching curated songs or query-labeled fallbacks
  const matchedCurated = CURATED_DISCOVERY_TRACKS.filter(t =>
    t.title.toLowerCase().includes(trimmed.toLowerCase()) ||
    t.artist.toLowerCase().includes(trimmed.toLowerCase())
  );

  if (matchedCurated.length > 0) {
    return { results: matchedCurated };
  }

  // Default discovery pool if empty
  return {
    results: CURATED_DISCOVERY_TRACKS,
    generatedQuery: isMood ? searchQuery : undefined
  };
}

// Resilient Lyrics fetcher (checks cache -> existing LRCLIB -> extra fallbacks if LRCLIB finds nothing)
export async function fetchLyrics(
  song: Song,
  signal?: AbortSignal
): Promise<LyricsData> {
  const cacheKey = song.id || `${song.title}-${song.artist}`;
  const cached = lyricsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 1. Try local server API (LRCLIB)
  try {
    const params = new URLSearchParams({
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: (song.duration || 0).toString()
    });

    const res = await fetch(`/api/lyrics?${params.toString()}`, { signal });
    const { data, isJson } = await safeJsonResponse<LyricsData>(res);
    if (res.ok && isJson && data && !data.notFound) {
      lyricsCache.set(cacheKey, { data, expiresAt: Date.now() + LYRICS_CACHE_TTL_MS });
      return data;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
  }

  // 2. Direct client-side LRCLIB call
  const { title: cleanTitle, artistHint } = cleanTitleForLyrics(song.title);
  const searchArtist = song.artist || artistHint || '';

  try {
    const getParams = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: searchArtist
    });
    if (song.duration && song.duration > 0) {
      getParams.append('duration', song.duration.toString());
    }

    const lrclibRes = await fetch(`https://lrclib.net/api/get?${getParams.toString()}`, { signal });
    const { data, isJson } = await safeJsonResponse<any>(lrclibRes);

    if (isJson && data && (data.syncedLyrics || data.plainLyrics)) {
      const lrclibPayload: LyricsData = {
        songId: song.id,
        provider: 'lrclib',
        syncedLyrics: data.syncedLyrics ? parseLRC(data.syncedLyrics) : null,
        plainLyrics: data.plainLyrics || null,
        notFound: false,
        attribution: 'Lyrics from LRCLIB'
      };
      lyricsCache.set(cacheKey, { data: lrclibPayload, expiresAt: Date.now() + LYRICS_CACHE_TTL_MS });
      return lrclibPayload;
    }

    // Try LRCLIB search endpoint
    const query = `${cleanTitle} ${searchArtist}`.trim();
    const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, { signal });
    const searchData = await safeJsonResponse<any>(searchRes);

    if (searchData.isJson && Array.isArray(searchData.data) && searchData.data.length > 0) {
      const best = searchData.data[0];
      if (best && (best.syncedLyrics || best.plainLyrics)) {
        const lrclibSearchPayload: LyricsData = {
          songId: song.id,
          provider: 'lrclib',
          syncedLyrics: best.syncedLyrics ? parseLRC(best.syncedLyrics) : null,
          plainLyrics: best.plainLyrics || null,
          notFound: false,
          attribution: 'Lyrics from LRCLIB'
        };
        lyricsCache.set(cacheKey, { data: lrclibSearchPayload, expiresAt: Date.now() + LYRICS_CACHE_TTL_MS });
        return lrclibSearchPayload;
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
  }

  // 3. Extra fallback sources (Netease -> lyrics.ovh), called ONLY when LRCLIB returned no lyrics
  try {
    const fallbackResult = await fetchLyricsFallbacks(song, signal);
    if (fallbackResult && !fallbackResult.notFound) {
      lyricsCache.set(cacheKey, { data: fallbackResult, expiresAt: Date.now() + LYRICS_CACHE_TTL_MS });
      return fallbackResult;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
  }

  const notFoundResult: LyricsData = {
    songId: song.id,
    provider: 'none',
    syncedLyrics: null,
    plainLyrics: null,
    notFound: true,
    attribution: ''
  };
  lyricsCache.set(cacheKey, { data: notFoundResult, expiresAt: Date.now() + LYRICS_NOT_FOUND_TTL_MS });
  return notFoundResult;
}

// Resilient Playlist Importer (checks server API, then falls back to Piped)
export async function fetchPlaylist(
  urlOrId: string,
  signal?: AbortSignal
): Promise<PlaylistInfo> {
  const trimmed = urlOrId.trim();
  let playlistId = trimmed;
  const listMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) playlistId = listMatch[1];

  // 1. Try local server API
  try {
    const res = await fetch(`/api/playlist?url=${encodeURIComponent(trimmed)}`, { signal });
    const { data, isJson } = await safeJsonResponse<PlaylistInfo>(res);
    if (res.ok && isJson && data && Array.isArray(data.tracks) && data.tracks.length > 0) {
      return data;
    }
  } catch (err: any) {
    if (err.name === 'AbortError') throw err;
  }

  // 2. Direct Piped API call
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/playlists/${playlistId}`, { signal });
      const { data, isJson } = await safeJsonResponse<any>(res);
      if (!isJson || !data || !Array.isArray(data.relatedStreams)) continue;

      const tracks: Song[] = data.relatedStreams.map((s: any): Song => {
        const vidId = s.url ? s.url.replace('/watch?v=', '') : '';
        return {
          id: vidId,
          source: 'youtube',
          title: s.title || 'Unknown Title',
          artist: s.uploaderName || 'Unknown Artist',
          channel: s.uploaderName || 'YouTube',
          album: null,
          thumbnail: s.thumbnail || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
          duration: s.duration || 180,
          url: `https://www.youtube.com/watch?v=${vidId}`,
          isPlayable: true
        };
      });

      if (tracks.length > 0) {
        return {
          id: playlistId,
          title: data.name || 'Imported Playlist',
          thumbnail: data.thumbnailUrl || (tracks[0] ? tracks[0].thumbnail : ''),
          trackCount: tracks.length,
          tracks
        };
      }
    } catch {
      // Continue
    }
  }

  throw new Error('Playlist not found, restricted, or unavailable');
}
