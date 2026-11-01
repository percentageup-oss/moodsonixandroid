import type { Request, Response } from 'express';
import { Innertube, UniversalCache, Log, Parser } from 'youtubei.js';

try {
  Parser.setParserErrorHandler((context: any) => {
    if (context?.error_type === 'class_not_found' || context?.classname === 'ListView' || context?.classname === 'ListItemView') {
      return;
    }
  });
  Log.setLevel(Log.Level.ERROR);
} catch {}

let innertubeInstance: Innertube | null = null;
let innertubePromise: Promise<Innertube> | null = null;

async function getInnertube(): Promise<Innertube> {
  if (innertubeInstance) return innertubeInstance;
  if (innertubePromise) return innertubePromise;

  innertubePromise = (async () => {
    try {
      const yt = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
        retrieve_player: false
      });
      innertubeInstance = yt;
      return yt;
    } catch (err) {
      innertubePromise = null;
      throw err;
    }
  })();

  return innertubePromise;
}

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://piped-api.lunar.icu'
];

async function searchPiped(query: string) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`, {
        headers: { 'User-Agent': 'Moodsonix/2.0' }
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data.items)) continue;

      return data.items.slice(0, 25).map((item: any) => ({
        id: item.url ? item.url.replace('/watch?v=', '') : item.id || '',
        source: 'youtube' as const,
        title: item.title || 'Unknown Title',
        artist: item.uploaderName || item.channel || 'Unknown Artist',
        channel: item.uploaderName || 'Unknown Channel',
        album: null,
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.url ? item.url.replace('/watch?v=', '') : item.id}/hqdefault.jpg`,
        duration: item.duration || 180,
        url: `https://www.youtube.com/watch?v=${item.url ? item.url.replace('/watch?v=', '') : item.id}`,
        isPlayable: true
      }));
    } catch {
      // Continue
    }
  }
  return [];
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const query = (req.query?.q as string || '').trim();
  if (!query) {
    return res.status(200).json({ query: '', results: [], count: 0 });
  }

  const songs: any[] = [];

  try {
    const yt = await getInnertube();
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

      const album = item.album?.name || null;
      let duration = 180;
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
  } catch {
    // Innertube failed, will try piped fallback
  }

  let finalSongs = songs;
  if (finalSongs.length === 0) {
    finalSongs = await searchPiped(query);
  }

  // Deduplicate
  const seen = new Set<string>();
  const unique = finalSongs.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  return res.status(200).json({ query, results: unique, count: unique.length });
}
