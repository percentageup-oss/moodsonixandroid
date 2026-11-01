const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://piped-api.lunar.icu'
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const urlOrId = (req.query?.url as string || req.query?.id as string || '').trim();
  if (!urlOrId) {
    return res.status(400).json({ error: 'Playlist URL or ID is required' });
  }

  let playlistId = urlOrId;
  const listMatch = urlOrId.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) playlistId = listMatch[1];

  for (const instance of PIPED_INSTANCES) {
    try {
      const pipedRes = await fetch(`${instance}/playlists/${playlistId}`);
      if (pipedRes.ok) {
        const pipedData = await pipedRes.json();
        const tracks = (pipedData.relatedStreams || []).map((s: any) => ({
          id: s.url ? s.url.replace('/watch?v=', '') : '',
          source: 'youtube',
          title: s.title || 'Unknown Title',
          artist: s.uploaderName || 'Unknown Artist',
          channel: s.uploaderName || 'YouTube',
          album: null,
          thumbnail: s.thumbnail || '',
          duration: s.duration || 180,
          url: `https://www.youtube.com/watch?v=${s.url ? s.url.replace('/watch?v=', '') : ''}`,
          isPlayable: true
        }));

        return res.status(200).json({
          id: playlistId,
          title: pipedData.name || 'Imported Playlist',
          thumbnail: pipedData.thumbnailUrl || '',
          trackCount: tracks.length,
          tracks
        });
      }
    } catch {}
  }

  return res.status(404).json({ error: 'Playlist not found or is private' });
}
