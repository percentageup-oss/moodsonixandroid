import express, { Request, Response } from 'express';
import { Innertube, UniversalCache, Log, Parser } from 'youtubei.js';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import type { Song, LyricsData, LyricLine, PlaylistInfo } from './src/types/music.ts';

// Silence YouTube.js decipher warnings and unmapped parser view errors (ListView, ListItemView, etc.)
try {
  Parser.setParserErrorHandler((context: any) => {
    if (context?.error_type === 'class_not_found' || context?.classname === 'ListView' || context?.classname === 'ListItemView') {
      return;
    }
  });
  Log.setLevel(Log.Level.ERROR);
} catch {}

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// In-memory caches with expiration
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const searchCache = new Map<string, CacheEntry<Song[]>>();
const lyricsCache = new Map<string, CacheEntry<LyricsData>>();
const playlistCache = new Map<string, CacheEntry<PlaylistInfo>>();

// Piped fallback instances
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://piped-api.lunar.icu'
];
let preferredPipedInstance = PIPED_INSTANCES[0];

// YouTube.js client singleton
let innertubeInstance: Innertube | null = null;
let innertubePromise: Promise<Innertube> | null = null;

async function getInnertube(): Promise<Innertube> {
  if (innertubeInstance) return innertubeInstance;
  if (innertubePromise) return innertubePromise;

  innertubePromise = (async () => {
    try {
      console.log('[Moodsonix] Initializing YouTube.js client...');
      const yt = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
        retrieve_player: false
      });
      innertubeInstance = yt;
      console.log('[Moodsonix] YouTube.js initialized successfully.');
      return yt;
    } catch (err) {
      console.error('[Moodsonix] Failed to initialize YouTube.js:', err);
      innertubePromise = null;
      throw err;
    }
  })();

  return innertubePromise;
}

// Helper to clean YouTube title for lyrics searching
function cleanSongTitle(rawTitle: string): { title: string; artistHint?: string } {
  let cleaned = rawTitle || '';
  
  // Extract artist if in "Artist - Title" format
  let artistHint: string | undefined;
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ');
    if (parts.length >= 2) {
      artistHint = parts[0].trim();
      cleaned = parts.slice(1).join(' - ').trim();
    }
  }

  // Remove common promotional and metadata decorations
  cleaned = cleaned.replace(/\s*[([{\u3010](official\s*(music\s*)?video|official\s*audio|lyrics?|lyric\s*video|audio|visualizer|video|hd|4k|mv|music\s*video)[)\]}\u3011]/gi, ' ');
  cleaned = cleaned.replace(/\s*-\s*topic$/gi, '');
  cleaned = cleaned.replace(/\s*ft\.?\s*[^()\[\]]+/gi, '');
  cleaned = cleaned.replace(/\s*feat\.?\s*[^()\[\]]+/gi, '');
  cleaned = cleaned.replace(/\|.*/g, ''); // Remove trailing channel tags like "| Artist Official"
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  return { title: cleaned || rawTitle, artistHint };
}

// Parse LRC formatted string into structured timestamp lines
function parseLRC(lrcText: string): LyricLine[] {
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

// Fallback search via Piped
async function searchPiped(query: string): Promise<Song[]> {
  for (const instance of [preferredPipedInstance, ...PIPED_INSTANCES.filter(i => i !== preferredPipedInstance)]) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Moodsonix/2.0' }
      });
      clearTimeout(timeout);

      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data.items)) continue;

      preferredPipedInstance = instance;
      return data.items.slice(0, 25).map((item: any) => ({
        id: item.url ? item.url.replace('/watch?v=', '') : item.id || '',
        source: 'youtube' as const,
        title: item.title || 'Unknown Title',
        artist: item.uploaderName || item.channel || 'Unknown Artist',
        channel: item.uploaderName || 'Unknown Channel',
        album: null,
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.url ? item.url.replace('/watch?v=', '') : item.id}/hqdefault.jpg`,
        duration: item.duration || 0,
        url: `https://www.youtube.com/watch?v=${item.url ? item.url.replace('/watch?v=', '') : item.id}`,
        isPlayable: true
      }));
    } catch {
      // Continue to next fallback instance
    }
  }
  return [];
}

// Main Music Search Function
async function searchYouTubeMusic(query: string): Promise<Song[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  // Check 24-hr cache
  const cached = searchCache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  let songs: Song[] = [];

  // 1. Try YouTube.js Innertube
  try {
    const yt = await getInnertube();
    // Try YouTube Music search first
    const searchRes = await yt.music.search(query, { type: 'song' });
    const contents: any[] = (searchRes as any).contents || [];

    for (const item of contents) {
      const itemId = item?.id || item?.video_id;
      if (!itemId) continue;
      
      const title = item.title?.toString() || item.name || 'Unknown Song';
      let artist = 'Unknown Artist';
      if (item.artists && Array.isArray(item.artists) && item.artists.length > 0) {
        artist = item.artists.map((a: any) => a.name).join(', ');
      } else if (item.author?.name) {
        artist = item.author.name;
      }

      let album: string | null = null;
      if (item.album?.name) {
        album = item.album.name;
      }

      let duration = 0;
      if (item.duration?.seconds) {
        duration = item.duration.seconds;
      } else if (typeof item.duration === 'number') {
        duration = item.duration;
      }

      let thumbnail = `https://i.ytimg.com/vi/${itemId}/hqdefault.jpg`;
      if (item.thumbnails && item.thumbnails.length > 0) {
        thumbnail = item.thumbnails[item.thumbnails.length - 1].url;
      }

      songs.push({
        id: itemId,
        source: 'youtube',
        title,
        artist,
        channel: artist,
        album,
        thumbnail,
        duration,
        url: `https://www.youtube.com/watch?v=${itemId}`,
        isPlayable: true
      });
    }

    // If music search returned very few results, fallback to standard YT video search with music filter
    if (songs.length < 3) {
      const generalSearch = await yt.search(query + ' audio', { type: 'video' });
      const videos: any[] = (generalSearch as any).videos || [];
      for (const v of videos) {
        const vidId = v?.id || v?.video_id;
        if (!vidId || songs.some(s => s.id === vidId)) continue;
        songs.push({
          id: vidId,
          source: 'youtube',
          title: v.title?.toString() || 'Unknown Title',
          artist: v.author?.name || 'Unknown Artist',
          channel: v.author?.name || 'YouTube',
          album: null,
          thumbnail: v.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
          duration: v.duration?.seconds || 180,
          url: `https://www.youtube.com/watch?v=${vidId}`,
          isPlayable: true
        });
      }
    }
  } catch (err) {
    console.warn('[Moodsonix] Innertube search failed, attempting Piped fallback...', err);
  }

  // 2. If YouTube.js failed or empty, try Piped instances
  if (songs.length === 0) {
    songs = await searchPiped(query);
  }

  // Deduplicate by ID
  const seen = new Set<string>();
  const uniqueSongs = songs.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  // Save to cache (24 hours TTL)
  searchCache.set(normalized, {
    data: uniqueSongs,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000
  });

  return uniqueSongs;
}

// API Routes
app.get('/api/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json({ results: [] });
  }

  try {
    const results = await searchYouTubeMusic(query);
    res.json({ query, results, count: results.length });
  } catch (err: any) {
    console.error('[Moodsonix] Search route error:', err);
    res.status(500).json({ error: 'Search failed', details: err?.message || 'Unknown error' });
  }
});

// Mood-to-Search Route (AI-Powered)
app.post('/api/mood-search', async (req: Request, res: Response) => {
  const mood = (req.body.mood as string || '').trim();
  if (!mood) {
    return res.status(400).json({ error: 'Mood is required' });
  }

  let generatedQuery = mood;

  // Attempt Gemini API if key is available
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });
      const prompt = `You are a music curator for Moodsonix. Given the user's mood or vibe description: "${mood}", generate a concise, highly effective 3 to 6 word YouTube Music search query string that returns songs matching this mood.
Examples:
Mood: "rainy night study" -> "ambient rainy night study lofi instrumental"
Mood: "gym energy" -> "high energy workout motivation phonk edm"
Mood: "nostalgic drive" -> "synthwave retro 80s night drive"

Respond ONLY with the search query string. No quotes, no markdown, no punctuation.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      const text = response.text?.trim();
      if (text) {
        generatedQuery = text.replace(/["'\n\r]/g, '');
      }
    } catch (err) {
      console.warn('[Moodsonix] Gemini mood query generation failed, falling back to rule-based...', err);
    }
  }

  // Rule-based fallback if unchanged
  if (generatedQuery === mood) {
    const moodLower = mood.toLowerCase();
    if (moodLower.includes('rain') || moodLower.includes('relax')) {
      generatedQuery = `${mood} ambient lofi chill`;
    } else if (moodLower.includes('focus') || moodLower.includes('study')) {
      generatedQuery = `${mood} instrumental deep focus electronic`;
    } else if (moodLower.includes('gym') || moodLower.includes('workout')) {
      generatedQuery = `${mood} workout motivation phonk bass`;
    } else if (moodLower.includes('drive') || moodLower.includes('night')) {
      generatedQuery = `${mood} synthwave night drive chill`;
    } else {
      generatedQuery = `${mood} music playlist`;
    }
  }

  try {
    const results = await searchYouTubeMusic(generatedQuery);
    res.json({
      mood,
      generatedQuery,
      results,
      count: results.length
    });
  } catch (err: any) {
    console.error('[Moodsonix] Mood search route error:', err);
    res.status(500).json({ error: 'Mood search failed', details: err?.message });
  }
});

// LRCLIB Lyrics Endpoint
app.get('/api/lyrics', async (req: Request, res: Response) => {
  const songId = (req.query.id as string || '').trim();
  const rawTitle = (req.query.title as string || '').trim();
  const rawArtist = (req.query.artist as string || '').trim();
  const duration = parseInt(req.query.duration as string || '0', 10);

  if (!songId && !rawTitle) {
    return res.status(400).json({ error: 'Song ID or Title is required' });
  }

  const cacheKey = songId || `${rawTitle}-${rawArtist}`;
  const cached = lyricsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  const { title: cleanTitle, artistHint } = cleanSongTitle(rawTitle);
  const searchArtist = rawArtist || artistHint || '';

  // 1. Try LRCLIB exact lookup
  try {
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: searchArtist
    });
    if (duration > 0) params.append('duration', duration.toString());

    const lrclibRes = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: {
        'User-Agent': 'Moodsonix/2.0 (github: percentageup-oss/moodsonix2.0; contact: moodsonix@example.com)'
      }
    });

    if (lrclibRes.ok) {
      const data = await lrclibRes.json();
      if (data.syncedLyrics || data.plainLyrics) {
        const payload: LyricsData = {
          songId,
          provider: 'lrclib',
          syncedLyrics: data.syncedLyrics ? parseLRC(data.syncedLyrics) : null,
          plainLyrics: data.plainLyrics || null,
          notFound: false,
          attribution: 'Lyrics from LRCLIB'
        };
        lyricsCache.set(cacheKey, { data: payload, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        return res.json(payload);
      }
    }
  } catch {
    // Continue to search endpoint
  }

  // 2. Try LRCLIB search endpoint
  try {
    const searchQuery = `${cleanTitle} ${searchArtist}`.trim();
    const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: {
        'User-Agent': 'Moodsonix/2.0 (contact: moodsonix@example.com)'
      }
    });

    if (searchRes.ok) {
      const candidates = await searchRes.json();
      if (Array.isArray(candidates) && candidates.length > 0) {
        // Find best candidate by duration proximity and title match
        let bestCandidate = candidates[0];
        let minDiff = Infinity;

        for (const cand of candidates) {
          const diff = duration > 0 ? Math.abs((cand.duration || 0) - duration) : 0;
          if (diff < minDiff) {
            minDiff = diff;
            bestCandidate = cand;
          }
        }

        if (bestCandidate && (bestCandidate.syncedLyrics || bestCandidate.plainLyrics)) {
          const payload: LyricsData = {
            songId,
            provider: 'lrclib',
            syncedLyrics: bestCandidate.syncedLyrics ? parseLRC(bestCandidate.syncedLyrics) : null,
            plainLyrics: bestCandidate.plainLyrics || null,
            notFound: false,
            attribution: 'Lyrics from LRCLIB'
          };
          lyricsCache.set(cacheKey, { data: payload, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
          return res.json(payload);
        }
      }
    }
  } catch {
    // Fallback to YouTube Music lyrics
  }

  // 3. YouTube Music lyrics fallback via YouTube.js
  if (songId) {
    try {
      const yt = await getInnertube();
      const lyricsInfo = await yt.music.getLyrics(songId);
      if (lyricsInfo && (lyricsInfo as any).description?.toString()) {
        const text = (lyricsInfo as any).description.toString();
        const payload: LyricsData = {
          songId,
          provider: 'youtube',
          syncedLyrics: null,
          plainLyrics: text,
          notFound: false,
          attribution: 'Lyrics from YouTube Music'
        };
        lyricsCache.set(cacheKey, { data: payload, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
        return res.json(payload);
      }
    } catch {
      // Not found
    }
  }

  // Negative lookup cache (1 hour)
  const notFoundPayload: LyricsData = {
    songId,
    provider: 'none',
    syncedLyrics: null,
    plainLyrics: null,
    notFound: true,
    attribution: ''
  };
  lyricsCache.set(cacheKey, { data: notFoundPayload, expiresAt: Date.now() + 60 * 60 * 1000 });
  res.json(notFoundPayload);
});

// Netease Lyrics Proxy Endpoint (CORS proxy + closest duration matching + existing lyricsCache integration)
app.get('/api/lyrics-netease', async (req: Request, res: Response) => {
  const songId = ((req.query.id as string) || '').trim();
  const artist = ((req.query.artist as string) || '').trim();
  const title = ((req.query.title as string) || '').trim();
  const targetDuration = parseFloat((req.query.duration as string) || '0') || 0;

  const searchTerm = [artist, title].filter(Boolean).join(' ').trim();
  if (!searchTerm) {
    return res.status(200).json({ songId, lrc: null, notFound: true });
  }

  const neteaseHeaders = {
    Referer: 'https://music.163.com/',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    Accept: 'application/json, text/plain, */*'
  };

  const fetchNeteaseJson = async (url: string, timeoutMs: number): Promise<any | null> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const upstream = await fetch(url, {
        method: 'GET',
        headers: neteaseHeaders,
        signal: controller.signal
      });
      if (!upstream.ok) return null;

      const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
      if (
        (!contentType.includes('application/json') && !contentType.includes('text/plain')) ||
        contentType.includes('text/html')
      ) {
        return null;
      }

      return await upstream.json();
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const startTime = Date.now();
  const TOTAL_BUDGET_MS = 4800;

  try {
    const encodedQuery = encodeURIComponent(searchTerm).replace(/%20/g, '+');
    const searchUrl = `https://music.163.com/api/search/get?s=${encodedQuery}&type=1&limit=5`;
    const searchData = await fetchNeteaseJson(searchUrl, 2600);

    const songs: any[] = searchData?.result?.songs;
    if (!Array.isArray(songs) || songs.length === 0) {
      return res.status(200).json({ songId, lrc: null, notFound: true });
    }

    let bestSong = songs.find((s) => s && s.id) || songs[0];
    if (targetDuration > 0) {
      let minDiff = Infinity;
      for (const cand of songs) {
        if (!cand?.id) continue;
        const rawDur = Number(cand.duration ?? cand.dt ?? 0);
        const candSec = rawDur > 1000 ? rawDur / 1000 : rawDur;
        const diff = candSec > 0 ? Math.abs(candSec - targetDuration) : Infinity;
        if (diff < minDiff) {
          minDiff = diff;
          bestSong = cand;
        }
      }
    }

    if (!bestSong?.id) {
      return res.status(200).json({ songId, lrc: null, notFound: true });
    }

    const remainingMs = Math.max(1000, TOTAL_BUDGET_MS - (Date.now() - startTime));
    const lyricUrl = `https://music.163.com/api/song/lyric?id=${encodeURIComponent(String(bestSong.id))}&lv=1`;
    const lyricData = await fetchNeteaseJson(lyricUrl, remainingMs);

    const rawLyric = typeof lyricData?.lrc?.lyric === 'string' ? lyricData.lrc.lyric.trim() : '';
    if (!rawLyric || lyricData?.nolyric === true || lyricData?.uncollected === true) {
      return res.status(200).json({ songId, lrc: null, notFound: true });
    }

    // Save in existing server lyricsCache so subsequent /api/lyrics requests for this song hit cache
    const cacheKey = songId || `${title}-${artist}`;
    if (cacheKey) {
      const synced = parseLRC(rawLyric);
      const cachedPayload: LyricsData = {
        songId,
        provider: 'netease',
        syncedLyrics: synced.length > 0 ? synced : null,
        plainLyrics:
          synced.length > 0
            ? synced.map((l) => l.text).filter(Boolean).join('\n') || null
            : rawLyric,
        notFound: false,
        attribution: 'Source: Netease'
      };
      lyricsCache.set(cacheKey, {
        data: cachedPayload,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
      });
    }

    return res.status(200).json({
      songId,
      neteaseId: bestSong.id,
      lrc: rawLyric,
      notFound: false
    });
  } catch {
    return res.status(200).json({ songId, lrc: null, notFound: true });
  }
});

// YouTube Playlist Import Endpoint
app.get('/api/playlist', async (req: Request, res: Response) => {
  const urlOrId = (req.query.url as string || req.query.id as string || '').trim();
  if (!urlOrId) {
    return res.status(400).json({ error: 'Playlist URL or ID is required' });
  }

  // Extract playlist ID
  let playlistId = urlOrId;
  const listMatch = urlOrId.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) {
    playlistId = listMatch[1];
  }

  const cached = playlistCache.get(playlistId);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  try {
    const yt = await getInnertube();
    const playlist = await yt.getPlaylist(playlistId);
    const title = (playlist.info as any)?.title || 'Imported Playlist';
    const thumbnail = (playlist.info as any)?.thumbnails?.[0]?.url || '';
    
    const tracks: Song[] = [];
    const videos: any[] = (playlist as any).videos || [];

    for (const v of videos) {
      const vId = v?.id || v?.video_id;
      if (!vId) continue;
      tracks.push({
        id: vId,
        source: 'youtube',
        title: v.title?.toString() || 'Unknown Title',
        artist: v.author?.name || 'Unknown Artist',
        channel: v.author?.name || 'YouTube',
        album: null,
        thumbnail: v.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
        duration: v.duration?.seconds || 180,
        url: `https://www.youtube.com/watch?v=${vId}`,
        isPlayable: true
      });
    }

    const playlistInfo: PlaylistInfo = {
      id: playlistId,
      title,
      thumbnail,
      trackCount: tracks.length,
      tracks
    };

    playlistCache.set(playlistId, {
      data: playlistInfo,
      expiresAt: Date.now() + 6 * 60 * 60 * 1000
    });

    return res.json(playlistInfo);
  } catch (err: any) {
    console.warn('[Moodsonix] Innertube playlist lookup failed, trying Piped fallback...', err);
    // Piped fallback
    try {
      const resPiped = await fetch(`${preferredPipedInstance}/playlists/${playlistId}`);
      if (resPiped.ok) {
        const pipedData = await resPiped.json();
        const tracks: Song[] = (pipedData.relatedStreams || []).map((s: any) => ({
          id: s.url ? s.url.replace('/watch?v=', '') : '',
          source: 'youtube' as const,
          title: s.title || 'Unknown Title',
          artist: s.uploaderName || 'Unknown Artist',
          channel: s.uploaderName || 'YouTube',
          album: null,
          thumbnail: s.thumbnail || '',
          duration: s.duration || 180,
          url: `https://www.youtube.com/watch?v=${s.url ? s.url.replace('/watch?v=', '') : ''}`,
          isPlayable: true
        }));

        const playlistInfo: PlaylistInfo = {
          id: playlistId,
          title: pipedData.name || 'Imported Playlist',
          thumbnail: pipedData.thumbnailUrl || '',
          trackCount: tracks.length,
          tracks
        };

        playlistCache.set(playlistId, {
          data: playlistInfo,
          expiresAt: Date.now() + 6 * 60 * 60 * 1000
        });

        return res.json(playlistInfo);
      }
    } catch {
      // Failed
    }

    res.status(404).json({ error: 'Playlist not found or is private/unavailable' });
  }
});

// Single song info lookup
app.get('/api/song/:id', async (req: Request, res: Response) => {
  const videoId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
  if (!videoId) return res.status(400).json({ error: 'Video ID required' });

  try {
    const yt = await getInnertube();
    const info = await yt.getInfo(videoId);
    const basic = info.basic_info;

    const song: Song = {
      id: videoId,
      source: 'youtube',
      title: basic.title || 'Unknown Song',
      artist: basic.author || 'Unknown Artist',
      channel: basic.author || 'YouTube',
      album: null,
      thumbnail: basic.thumbnail?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: basic.duration || 180,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      isPlayable: true
    };
    res.json(song);
  } catch (err: any) {
    // Fallback song object if getInfo fails
    res.json({
      id: videoId,
      source: 'youtube',
      title: 'YouTube Track',
      artist: 'YouTube Music',
      channel: 'YouTube',
      album: null,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      duration: 180,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      isPlayable: true
    });
  }
});

// Mount Vite or serve static production build
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.npm_lifecycle_event === 'start';
  const isDev = !isProd;

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Moodsonix] Server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Moodsonix] Server startup error:', err);
  process.exit(1);
});
