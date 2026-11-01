const NETEASE_HEADERS = {
  Referer: 'https://music.163.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*'
};

async function fetchNeteaseJson(url: string, timeoutMs: number): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: NETEASE_HEADERS,
      signal: controller.signal
    });

    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    // Netease API responds with JSON payload using either application/json or text/plain; reject HTML error pages
    if (
      (!contentType.includes('application/json') && !contentType.includes('text/plain')) ||
      contentType.includes('text/html')
    ) {
      return null;
    }

    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const songId = ((req.query?.id as string) || '').trim();
  const artist = ((req.query?.artist as string) || '').trim();
  const title = ((req.query?.title as string) || '').trim();
  const targetDuration = parseFloat((req.query?.duration as string) || '0') || 0;

  const searchTerm = [artist, title].filter(Boolean).join(' ').trim();
  if (!searchTerm) {
    return res.status(200).json({ songId, lrc: null, notFound: true });
  }

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

    // Pick the result whose duration is closest to the current song (Netease durations are in ms)
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

    return res.status(200).json({
      songId,
      neteaseId: bestSong.id,
      lrc: rawLyric,
      notFound: false
    });
  } catch {
    return res.status(200).json({ songId, lrc: null, notFound: true });
  }
}
