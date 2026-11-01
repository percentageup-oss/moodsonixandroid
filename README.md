# Moodsonix 2.0

**Mood-driven music streaming for the web.** Describe a vibe, get a playlist — with synced lyrics, an ambient sound mixer and a Pomodoro focus timer built in.

[**Live demo →**](https://moodsononix-web.vercel.app) &nbsp;·&nbsp; Installable PWA &nbsp;·&nbsp; React + TypeScript + Express

---

## Features

### Discover by mood
- **Mood cards** on the home screen: Rainy Night, Deep Focus, Late Night Drive, Calm Morning, Gym Energy, Chill Vibes, Cinematic and Feel-Good.
- **Mood AI search** — type a vibe in your own words ("rainy afternoon reading in a cafe") and Gemini (`gemini-2.5-flash`) turns it into a short YouTube Music search query. Without a `GEMINI_API_KEY`, a built-in rule-based mood mapper is used instead.
- **Regular search** across YouTube Music, with quick-pick suggestions.
- **Playlist import** — paste a public YouTube playlist URL or ID, then play it straight away or add every track to your queue.

### Listening
- Streams through the **YouTube IFrame Player**: audio-first, with a dockable video window you can toggle on and off.
- **Queue** with add, play next, remove and reorder; **liked songs**; **recently played** history.
- Repeat modes (off / all / one), volume and mute. Your last song and volume are restored on reload.
- **Playback quality** selector, from Data Saver (144p) up to Full HD (1080p), with estimated data use per hour.
- **Share links** — any track can be shared as `/?song=VIDEO_ID` and opens straight into playback.

### Lyrics
- **Synchronized lyrics** from [LRCLIB](https://lrclib.net) with the active line auto-scrolling to centre; falls back to plain lyrics when no synced version exists.
- Video titles are cleaned up (`(Official Video)`, `ft.`, `- Topic`, …) before lookup to improve matches.

### Focus & ambience
- **Pomodoro timer** — 25 min focus / 5 min break, auto-switches between sessions, plays a completion tone and can send browser notifications.
- **Ambient mixer** — Rainfall, Campfire and Nature, each with its own volume. All sounds are synthesized live with the Web Audio API, so there are no audio files to download.

### Personalization & PWA
- **Three themes** — Midnight, Neon and Slate — saved in your browser.
- **Keyboard shortcuts:** `Space` play/pause · `←` / `→` seek 10 s · `N` next · `P` previous · `M` mute (ignored while typing in a field).
- **Installable PWA** with an auto-updating service worker, an install button and an offline banner.
- Guests get **25 searches**; the sign-in form creates a local profile (see [Data & privacy](#data--privacy)).

---

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS v4, lucide-react |
| Backend | Express 4 (run with `tsx`), [`youtubei.js`](https://github.com/LuanRT/YouTube.js), [`@google/genai`](https://www.npmjs.com/package/@google/genai) |
| PWA | `vite-plugin-pwa` (Workbox) |
| Hosting | Any Node host, or Vercel (serverless functions in `api/`) |
| External services | YouTube, LRCLIB, Piped instances, iTunes Search API, Google Gemini (optional) |

---

## Getting started

**Prerequisites:** Node.js 18 or newer (20+ recommended) and npm.

```bash
git clone https://github.com/percentageup-oss/moodsononix.web2.0.git
cd moodsononix.web2.0
npm install
npm run dev
```

The app runs at **http://localhost:3000**. In development, Express serves the API and mounts Vite as middleware, so one process does everything.

### Enable Gemini mood search (optional)

`.env.example` lists the available variables. The server does **not** load `.env` files by itself, so set them in your shell:

```bash
export GEMINI_API_KEY="your-key"   # or: GEMINI_API_KEY=your-key npm run dev
npm run dev
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | Port the Express server listens on |
| `NODE_ENV` | `development` | `production` serves the built `dist/` instead of the Vite dev server |
| `GEMINI_API_KEY` | — | Optional. Enables AI-generated mood queries |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Express + Vite dev server with hot reload |
| `npm run build` | Production build of the frontend into `dist/` |
| `npm start` | Production server — serves `dist/` and the API (run `npm run build` first) |
| `npm run lint` | Type-check with `tsc --noEmit` |

To regenerate the PWA icons in `public/`, run `node scripts/generate-icons.js` from the repository root.

---

## Deployment

**Node host (VPS, Render, Railway, …)**

```bash
npm install
npm run build
GEMINI_API_KEY=your-key npm start
```

**Vercel**

`vercel.json` is already set up: it builds with `npm run build`, serves `dist/`, rewrites the `/api/*` routes to the functions in `api/`, and falls back to `index.html` for client-side routing. Add `GEMINI_API_KEY` under *Project Settings → Environment Variables* if you want Gemini enabled.

> **Note:** On Vercel, Mood AI currently falls back to the built-in mood mapper on the client; the Gemini-generated query is only used end-to-end when running the Express server.

---

## API

The same routes are served by `server.ts` (Express) and by `api/*.ts` (Vercel functions).

| Route | Description |
| --- | --- |
| `GET /api/search?q=` | Song search via YouTube Music, with a Piped fallback. Cached for 24 h on the Express server. |
| `POST /api/mood-search` | Body `{ "mood": "…" }`. Builds a search query for the mood (Gemini or rule-based) and, on Express, returns matching songs. |
| `GET /api/lyrics?id=&title=&artist=&duration=` | Synced or plain lyrics from LRCLIB. |
| `GET /api/playlist?url=` | Tracks of a public YouTube playlist (URL or ID). Cached for 6 h on the Express server. |
| `GET /api/song/:id` | Metadata for a single YouTube video ID. |

### Built-in fallbacks

If the API can't be reached (for example on static hosting), the client keeps working: search falls back to **Piped** directly, then the **iTunes Search API**, then a curated set of discovery tracks. Lyrics and playlists likewise fall back to calling LRCLIB and Piped straight from the browser.

---

## Project structure

```
├── api/                  Vercel serverless functions (search, mood-search, lyrics, playlist, song)
├── public/               PWA icons and static assets
├── scripts/
│   └── generate-icons.js Generates the PWA icon set
├── src/
│   ├── components/       common/ · layout/ · music/ · tools/
│   ├── context/          Player, Queue, Theme and User providers
│   ├── hooks/            useLyrics, useFocusTimer, usePWAInstall, useOnlineStatus
│   ├── pages/            Home, Search, Queue, Liked Songs, Account
│   ├── services/         musicApi.ts (resilient client API), ambientAudio.ts (Web Audio mixer)
│   └── types/            Shared TypeScript types
├── server.ts             Express server (API + Vite middleware / static files)
├── vercel.json           Vercel build and rewrite rules
└── vite.config.ts        Vite, Tailwind and PWA configuration
```

---

## Data & privacy

- There is **no database and no real authentication.** The sign-in form creates a profile stored only in your browser's `localStorage`; no password is collected.
- Your queue, liked songs, history, theme, volume, last-played song and profile are all kept in `localStorage` (keys prefixed `moodsonix_`). Clearing site data resets them.
- Network requests go to YouTube (playback and search), LRCLIB (lyrics), Piped instances and the iTunes Search API (fallbacks), Google Fonts, and Google Gemini if you enable it.

---

## Disclaimer

Moodsonix is an independent project and is not affiliated with YouTube, Google or LRCLIB. Audio and video are played through YouTube's embedded player, and lyrics are provided by LRCLIB. Please respect the terms of service of each of these services.
