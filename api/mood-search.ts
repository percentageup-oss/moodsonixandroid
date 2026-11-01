import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const mood = (req.body?.mood as string || req.query?.mood as string || '').trim();
  if (!mood) {
    return res.status(400).json({ error: 'Mood is required' });
  }

  let generatedQuery = mood;

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
Respond ONLY with the search query string. No quotes, no markdown, no punctuation.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      const text = response.text?.trim();
      if (text) {
        generatedQuery = text.replace(/["'\n\r]/g, '');
      }
    } catch {
      // Fallback
    }
  }

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

  return res.status(200).json({
    mood,
    generatedQuery,
    results: []
  });
}
