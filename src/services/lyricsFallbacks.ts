import { Song, LyricsData } from '../types/music';
import { parseLRC } from './musicApi';

const SOURCE_TIMEOUT_MS = 5000;

interface QueryAttempt {
  artist: string;
  title: string;
}

interface NeteaseProxyResponse {
  songId?: string;
  neteaseId?: number | string;
  lrc?: string | null;
  notFound?: boolean;
}

interface LyricsOvhResponse {
  lyrics?: string;
  error?: string;
}

/**
 * Clean YouTube / streaming decorations from artist & title for retry lookups.
 * Removes "(Official Video)", "[HD]", "ft. ...", "feat. ...", "- Topic", etc.
 */
export function cleanLyricsMetadata(rawTitle: string, rawArtist: string): {
  cleanedTitle: string;
  cleanedArtist: string;
  artistFromTitle?: string;
} {
  let artist = (rawArtist || '').trim();
  artist = artist
    .replace(/\s*-\s*topic$/gi, '')
    .replace(/\s+(?:official\s*channel|official\s*artist\s*channel|official)$/gi, '')
    .replace(/([a-z0-9])VEVO$/g, '$1')
    .replace(/\s+(?:ft\.?|feat\.?|featuring)\s+.+$/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  let title = (rawTitle || '').trim();

  // Strip trailing pipe / slash metadata and "- Topic"
  title = title
    .replace(/\|.*$/g, '')
    .replace(/\s+\/\/.*$/g, '')
    .replace(/\s*-\s*topic$/gi, '');

  // Extract "Artist - Title" if formatted with hyphen/en-dash/em-dash
  let artistFromTitle: string | undefined;
  const dashMatch = title.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (dashMatch) {
    artistFromTitle = dashMatch[1]
      .replace(/\s+(?:ft\.?|feat\.?|featuring)\s+.+$/gi, '')
      .trim();
    title = dashMatch[2].trim();
  }

  // Remove bracketed/parenthesized video/audio/quality/feature tags
  const bracketNoiseRegex =
    /\s*[([{\u3010][^)\]}\u3011]*\b(?:official|music\s*video|video|audio|lyrics?|lyric\s*video|visualizer|hd|hq|4k|8k|1080p|720p|mv|m\/v|remaster(?:ed)?|live|version|ver\.?|edit|explicit|clean|prod\.?|ft\.?|feat\.?|featuring|topic|ost|soundtrack)\b[^)\]}\u3011]*[)\]}\u3011]/gi;
  title = title.replace(bracketNoiseRegex, ' ');

  // Remove unbracketed "ft. ...", "feat. ...", "featuring ..."
  title = title.replace(/\s+(?:ft\.?|feat\.?|featuring)\s+[^()\[\]]+$/gi, '');

  // Remove trailing standalone promotional phrases
  title = title.replace(
    /\s*[-–—]?\s*\b(?:official\s*(?:music\s*)?video|official\s*audio|lyric\s*video|visualizer|full\s*audio)\b.*$/gi,
    ''
  );

  // Strip wrapping quotes and collapse spaces
  title = title
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const isGenericArtist =
    !artist ||
    /^(?:unknown(?:\s+artist)?|youtube(?:\s+music)?|various\s+artists)$/i.test(artist);

  const effectiveArtist = isGenericArtist && artistFromTitle ? artistFromTitle : artist;

  return {
    cleanedTitle: title || (rawTitle || '').trim(),
    cleanedArtist: effectiveArtist,
    artistFromTitle
  };
}

/**
 * Build ordered query attempts for a single source:
 * 1. Original raw (artist, title)
 * 2. Cleaned (artist, title) retry before moving on to the next source
 */
function buildAttempts(song: Song): QueryAttempt[] {
  const attempts: QueryAttempt[] = [];
  const seen = new Set<string>();

  const addAttempt = (artist: string, title: string) => {
    const a = artist.trim();
    const t = title.trim();
    if (!t) return;
    const key = `${a.toLowerCase()}::${t.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      attempts.push({ artist: a, title: t });
    }
  };

  // Attempt 1: raw metadata
  addAttempt(song.artist || '', song.title || '');

  // Attempt 2+: cleaned metadata
  const { cleanedTitle, cleanedArtist, artistFromTitle } = cleanLyricsMetadata(
    song.title || '',
    song.artist || ''
  );

  if (artistFromTitle && artistFromTitle.toLowerCase() !== cleanedArtist.toLowerCase()) {
    addAttempt(artistFromTitle, cleanedTitle);
  }
  addAttempt(cleanedArtist, cleanedTitle);

  // Also try primary artist before comma/& if collaboration string
  const primaryArtist = cleanedArtist.split(/\s*(?:,|&|\sx\s)\s*/i)[0]?.trim();
  if (primaryArtist && primaryArtist !== cleanedArtist) {
    addAttempt(primaryArtist, cleanedTitle);
  }

  return attempts;
}

/**
 * Safe JSON fetch with strict timeout, res.ok check, content-type check, and try/catch.
 */
async function safeFetchJson<T>(
  url: string,
  timeoutMs: number,
  parentSignal?: AbortSignal
): Promise<T | null> {
  if (parentSignal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  if (timeoutMs <= 0) return null;

  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  parentSignal?.addEventListener('abort', onParentAbort, { once: true });
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal
    });

    if (!res.ok) return null;

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/json')) {
      return null;
    }

    return (await res.json()) as T;
  } catch (err: any) {
    if (parentSignal?.aborted) {
      throw err;
    }
    return null;
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);
  }
}

/**
 * Fallback Source #2: Netease via /api/lyrics-netease serverless route (5s total timeout)
 */
async function tryNeteaseLyrics(
  song: Song,
  attempts: QueryAttempt[],
  signal?: AbortSignal
): Promise<LyricsData | null> {
  const deadline = Date.now() + SOURCE_TIMEOUT_MS;

  for (let i = 0; i < attempts.length; i++) {
    const remaining = deadline - Date.now();
    if (remaining <= 150) break;

    const hasMoreAttempts = i < attempts.length - 1;
    const attemptTimeout = hasMoreAttempts ? Math.min(2800, remaining) : remaining;

    const { artist, title } = attempts[i];
    const params = new URLSearchParams({
      id: song.id || '',
      artist,
      title,
      duration: String(song.duration || 0)
    });

    const data = await safeFetchJson<NeteaseProxyResponse>(
      `/api/lyrics-netease?${params.toString()}`,
      attemptTimeout,
      signal
    );

    const rawLrc = typeof data?.lrc === 'string' ? data.lrc.trim() : '';
    if (data && !data.notFound && rawLrc) {
      const synced = parseLRC(rawLrc);
      if (synced.length > 0) {
        return {
          songId: song.id,
          provider: 'netease',
          syncedLyrics: synced,
          plainLyrics: synced.map((line) => line.text).filter(Boolean).join('\n') || null,
          notFound: false,
          attribution: 'Source: Netease'
        };
      }

      return {
        songId: song.id,
        provider: 'netease',
        syncedLyrics: null,
        plainLyrics: rawLrc,
        notFound: false,
        attribution: 'Source: Netease'
      };
    }
  }

  return null;
}

/**
 * Fallback Source #3: lyrics.ovh plain text API (5s total timeout)
 * GET https://api.lyrics.ovh/v1/{artist}/{title}
 */
async function tryLyricsOvh(
  song: Song,
  attempts: QueryAttempt[],
  signal?: AbortSignal
): Promise<LyricsData | null> {
  const deadline = Date.now() + SOURCE_TIMEOUT_MS;
  const validAttempts = attempts.filter((a) => a.artist && a.title);

  for (let i = 0; i < validAttempts.length; i++) {
    const remaining = deadline - Date.now();
    if (remaining <= 150) break;

    const hasMoreAttempts = i < validAttempts.length - 1;
    const attemptTimeout = hasMoreAttempts ? Math.min(2800, remaining) : remaining;

    const { artist, title } = validAttempts[i];
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;

    const data = await safeFetchJson<LyricsOvhResponse>(url, attemptTimeout, signal);
    const rawPlain = typeof data?.lyrics === 'string' ? data.lyrics : '';
    const normalizedPlain = rawPlain
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/^Paroles de la chanson .+?\n/i, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (normalizedPlain) {
      return {
        songId: song.id,
        provider: 'lyrics.ovh',
        syncedLyrics: null,
        plainLyrics: normalizedPlain,
        notFound: false,
        attribution: 'Source: lyrics.ovh'
      };
    }
  }

  return null;
}

/**
 * Run fallback lyrics sources sequentially ONLY after LRCLIB finds nothing:
 * 2. Netease (synced LRC or plain fallback via /api/lyrics-netease)
 * 3. lyrics.ovh (plain text via https://api.lyrics.ovh/v1/{artist}/{title})
 */
export async function fetchLyricsFallbacks(
  song: Song,
  signal?: AbortSignal
): Promise<LyricsData | null> {
  const attempts = buildAttempts(song);
  if (attempts.length === 0) return null;

  // Source 2: Netease
  const neteaseResult = await tryNeteaseLyrics(song, attempts, signal);
  if (neteaseResult) {
    return neteaseResult;
  }

  // Source 3: lyrics.ovh (runs only if Netease returned no lyrics)
  const ovhResult = await tryLyricsOvh(song, attempts, signal);
  if (ovhResult) {
    return ovhResult;
  }

  return null;
}
