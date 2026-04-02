# 🎬 Plex Recommender

A self-hosted recommendation dashboard that fetches your Plex watch history via Tautulli, generates smart recommendations using TMDB metadata and scoring, and allows one-click requesting through Overseerr/Jellyseerr.

![Dark Mode Dashboard](https://img.shields.io/badge/theme-dark-black) ![Next.js](https://img.shields.io/badge/Next.js-16-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Docker](https://img.shields.io/badge/Docker-ready-blue)

## Features

- **Per-user recommendations** — Select a Plex user and get personalized suggestions
- **Hybrid scoring engine** — Combines TMDB per-title recommendations, genre overlap, and popularity
- **"Because you watched"** — Grouped recommendation rows showing *why* each title was suggested
- **Library awareness** — Marks titles already available in your Plex library
- **One-click requesting** — Request missing titles through Overseerr/Jellyseerr directly from the dashboard
- **Smart caching** — SQLite-backed caching for TMDB metadata and recommendations (7-day TTL)
- **Rate-limit safe** — Built-in TMDB rate limiting with automatic backoff
- **Dark mode** — Sleek, streaming-platform-inspired dark UI

## Requirements

- [Tautulli](https://tautulli.com/) — for Plex watch history
- [TMDB API key](https://www.themoviedb.org/settings/api) — for metadata and recommendations
- [Overseerr](https://overseerr.dev/) or [Jellyseerr](https://github.com/Fallenbagel/jellyseerr) — for media requesting

## Quick Start (Docker Compose)

1. **Create a `.env` file** from the example:

   ```bash
   cp .env.example .env
   ```

2. **Fill in your API keys** in `.env`:

   ```env
   TAUTULLI_URL=http://tautulli:8181
   TAUTULLI_API_KEY=your_tautulli_api_key
   TMDB_API_KEY=your_tmdb_api_key
   SEERR_URL=http://overseerr:5055
   SEERR_API_KEY=your_seerr_api_key
   ```

3. **Run with Docker Compose:**

   ```bash
   docker-compose up -d
   ```

4. **Open** [http://localhost:3000](http://localhost:3000)

## Adding to Existing Docker Stack

```yaml
services:
  plex-recommender:
    image: your-registry/plex-recommender:latest
    container_name: plex-recommender
    ports:
      - "3000:3000"
    environment:
      - TAUTULLI_URL=http://tautulli:8181
      - TAUTULLI_API_KEY=your_key
      - TMDB_API_KEY=your_key
      - SEERR_URL=http://overseerr:5055
      - SEERR_API_KEY=your_key
    volumes:
      - recommender-data:/app/data
    restart: unless-stopped

volumes:
  recommender-data:
```

## Development

```bash
# Install dependencies
npm install

# Create .env from example
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How It Works

### Recommendation Pipeline

1. **Fetch watch history** from Tautulli (movies + TV shows, deduplicated)
2. **Resolve TMDB IDs** via Tautulli GUIDs or TMDB search fallback
3. **Collect TMDB recommendations** for each watched title (~20 per title)
4. **Score by frequency** — titles recommended by multiple watched items rank higher
5. **Score by genre overlap** — weighted by your genre watch profile
6. **Score by popularity** — tiebreaker using TMDB popularity
7. **Combine scores** — `0.5 × frequency + 0.3 × genre + 0.2 × popularity`
8. **Filter** watched content, mark library availability
9. **Supplement** with TMDB Discover based on top genres/keywords

### Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | SQLite via better-sqlite3 |
| Container | Docker + docker-compose |
| APIs | Tautulli, TMDB v3, Overseerr/Jellyseerr |

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/users` | GET | Fetch Plex users from Tautulli |
| `/api/recommendations?userId=X` | GET | Get recommendations (cached or generated) |
| `/api/sync?userId=X` | POST | Full sync: history + metadata + scoring |
| `/api/request` | POST | Request media via Overseerr/Jellyseerr |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TAUTULLI_URL` | Yes | Tautulli base URL |
| `TAUTULLI_API_KEY` | Yes | Tautulli API key |
| `TMDB_API_KEY` | Yes | TMDB v3 API key |
| `SEERR_URL` | Yes | Overseerr/Jellyseerr base URL |
| `SEERR_API_KEY` | Yes | Overseerr/Jellyseerr API key |
| `NEXT_PUBLIC_APP_NAME` | No | Custom app name (default: "Plex Recommender") |

## License

MIT
