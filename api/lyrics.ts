function cleanSongTitle(rawTitle: string): { title: string; artistHint?: string } {
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

function parseLRC(lrcText: string) {
  const lines = lrcText.split('\n');
  const result: any[] = [];
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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const songId = (req.query?.id as string || '').trim();
  const rawTitle = (req.query?.title as string || '').trim();
  const rawArtist = (req.query?.artist as string || '').trim();
  const duration = parseInt(req.query?.duration as string || '0', 10);

  const { title: cleanTitle, artistHint } = cleanSongTitle(rawTitle);
  const searchArtist = rawArtist || artistHint || '';

  try {
    const params = new URLSearchParams({
      track_name: cleanTitle,
      artist_name: searchArtist
    });
    if (duration > 0) params.append('duration', duration.toString());

    const lrclibRes = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
      headers: { 'User-Agent': 'Moodsonix/2.0 (contact: moodsonix@example.com)' }
    });

    if (lrclibRes.ok) {
      const data = await lrclibRes.json();
      if (data.syncedLyrics || data.plainLyrics) {
        return res.status(200).json({
          songId,
          provider: 'lrclib',
          syncedLyrics: data.syncedLyrics ? parseLRC(data.syncedLyrics) : null,
          plainLyrics: data.plainLyrics || null,
          notFound: false,
          attribution: 'Lyrics from LRCLIB'
        });
      }
    }
  } catch {}

  try {
    const searchQuery = `${cleanTitle} ${searchArtist}`.trim();
    const searchRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(searchQuery)}`, {
      headers: { 'User-Agent': 'Moodsonix/2.0' }
    });

    if (searchRes.ok) {
      const candidates = await searchRes.json();
      if (Array.isArray(candidates) && candidates.length > 0) {
        const best = candidates[0];
        if (best && (best.syncedLyrics || best.plainLyrics)) {
          return res.status(200).json({
            songId,
            provider: 'lrclib',
            syncedLyrics: best.syncedLyrics ? parseLRC(best.syncedLyrics) : null,
            plainLyrics: best.plainLyrics || null,
            notFound: false,
            attribution: 'Lyrics from LRCLIB'
          });
        }
      }
    }
  } catch {}

  return res.status(200).json({
    songId,
    provider: 'none',
    syncedLyrics: null,
    plainLyrics: null,
    notFound: true,
    attribution: ''
  });
}
