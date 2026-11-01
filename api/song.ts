export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const id = (req.query?.id as string || '').trim();
  if (!id) return res.status(400).json({ error: 'Video ID required' });

  return res.status(200).json({
    id,
    source: 'youtube',
    title: 'YouTube Track',
    artist: 'YouTube Music',
    channel: 'YouTube',
    album: null,
    thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    duration: 180,
    url: `https://www.youtube.com/watch?v=${id}`,
    isPlayable: true
  });
}
