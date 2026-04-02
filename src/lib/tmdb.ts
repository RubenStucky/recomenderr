import { config } from "./config";
import {
  getCachedTmdbDetails,
  upsertTmdbCache,
  getCachedRecommendations,
  upsertRecommendation,
} from "./db";
import type {
  TMDBSearchResult,
  TMDBDetails,
  TMDBRecommendation,
  TMDBDiscoverResult,
  DiscoverParams,
  TMDBCacheRow,
} from "@/types";

// ─── Rate limiter ───────────────────────────────────────────────────────────

let lastRequestTime = 0;
const MIN_DELAY_MS = 260; // ~40 requests per 10 seconds

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_DELAY_MS) {
    await new Promise((r) => setTimeout(r, MIN_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();

  const headers: Record<string, string> = {
    "Accept": "application/json",
  };

  // Support both v3 API key and v4 Bearer token
  // JWT tokens start with "eyJ", short hex strings are v3 keys
  if (config.tmdb.apiKey.startsWith("eyJ")) {
    headers["Authorization"] = `Bearer ${config.tmdb.apiKey}`;
  }

  const res = await fetch(url, { next: { revalidate: 0 }, headers });

  // Handle rate limiting
  if (res.status === 429) {
    console.warn("TMDB rate limit hit, backing off 10 seconds…");
    await new Promise((r) => setTimeout(r, 10_000));
    lastRequestTime = Date.now();
    return fetch(url, { next: { revalidate: 0 }, headers });
  }

  return res;
}

function tmdbUrl(path: string, params: Record<string, string> = {}): string {
  const url = new URL(`${config.tmdb.baseUrl}${path}`);
  // Only add api_key param for v3 keys (short hex strings), not JWT bearer tokens
  if (!config.tmdb.apiKey.startsWith("eyJ")) {
    url.searchParams.set("api_key", config.tmdb.apiKey);
  }
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Search TMDB by title.  Returns the first match or null.
 */
export async function searchByTitle(
  title: string,
  year?: string,
  mediaType: "movie" | "tv" = "movie"
): Promise<TMDBSearchResult | null> {
  const params: Record<string, string> = { query: title };
  if (year) params.year = year;

  const url = tmdbUrl(`/search/${mediaType}`, params);
  const res = await rateLimitedFetch(url);
  if (!res.ok) {
    console.error(`TMDB search failed: ${res.status}`);
    return null;
  }

  const json = await res.json();
  const results: TMDBSearchResult[] = json.results ?? [];
  return results.length > 0 ? results[0] : null;
}

/**
 * Get full details for a TMDB title, with caching.
 */
export async function getDetails(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<TMDBDetails | null> {
  // Check cache first
  const cached = getCachedTmdbDetails(tmdbId);
  if (cached) {
    // Return a TMDBDetails-compatible object from the cache row
    return cacheRowToDetails(cached);
  }

  const url = tmdbUrl(`/${mediaType}/${tmdbId}`, {
    append_to_response: "keywords",
  });
  const res = await rateLimitedFetch(url);
  if (!res.ok) {
    console.error(`TMDB details failed for ${mediaType}/${tmdbId}: ${res.status}`);
    return null;
  }

  const details: TMDBDetails = await res.json();

  // Extract keyword IDs
  const keywordIds: number[] = [];
  if (details.keywords) {
    const kws = details.keywords.keywords || details.keywords.results || [];
    for (const kw of kws) keywordIds.push(kw.id);
  }

  // Cache the result
  const cacheRow: TMDBCacheRow = {
    tmdb_id: details.id,
    media_type: mediaType,
    title: details.title || details.name || "",
    year: extractYear(details),
    poster_path: details.poster_path,
    overview: details.overview || "",
    genres: JSON.stringify(details.genres.map((g) => g.id)),
    keywords: JSON.stringify(keywordIds),
    vote_average: details.vote_average,
    popularity: details.popularity,
    fetched_at: Math.floor(Date.now() / 1000),
  };

  upsertTmdbCache(cacheRow);

  return details;
}

/**
 * Get TMDB's per-title recommendations, with caching.
 */
export async function getRecommendations(
  tmdbId: number,
  mediaType: "movie" | "tv"
): Promise<TMDBRecommendation[]> {
  // Check cache
  const cached = getCachedRecommendations(tmdbId, mediaType);
  if (cached.length > 0) {
    // We have cached recommendation IDs — fetch their details from cache
    return Promise.resolve(
      cached.map((row) => ({
        id: row.recommended_tmdb_id,
        media_type: row.recommended_media_type,
        poster_path: null,
        overview: "",
        genre_ids: [],
        vote_average: 0,
        popularity: 0,
      }))
    );
  }

  const url = tmdbUrl(`/${mediaType}/${tmdbId}/recommendations`);
  const res = await rateLimitedFetch(url);
  if (!res.ok) {
    console.error(`TMDB recommendations failed for ${mediaType}/${tmdbId}: ${res.status}`);
    return [];
  }

  const json = await res.json();
  const results: TMDBRecommendation[] = json.results ?? [];
  const now = Math.floor(Date.now() / 1000);

  // Cache each recommendation relationship
  for (const rec of results) {
    upsertRecommendation({
      source_tmdb_id: tmdbId,
      source_media_type: mediaType,
      recommended_tmdb_id: rec.id,
      recommended_media_type: rec.media_type || mediaType,
      fetched_at: now,
    });
  }

  return results;
}

/**
 * Discover titles based on aggregated user preferences.
 */
export async function discoverByPreferences(
  params: DiscoverParams
): Promise<TMDBDiscoverResult[]> {
  const queryParams: Record<string, string> = {
    sort_by: "popularity.desc",
    "vote_count.gte": "50",
  };

  if (params.genreIds.length > 0) {
    queryParams.with_genres = params.genreIds.join(",");
  }
  if (params.keywordIds.length > 0) {
    // Pipe-separated = OR logic in TMDB discover
    queryParams.with_keywords = params.keywordIds.join("|");
  }
  if (params.minVoteAverage) {
    queryParams["vote_average.gte"] = String(params.minVoteAverage);
  }

  const url = tmdbUrl(`/discover/${params.mediaType}`, queryParams);
  const res = await rateLimitedFetch(url);
  if (!res.ok) {
    console.error(`TMDB discover failed: ${res.status}`);
    return [];
  }

  const json = await res.json();
  return json.results ?? [];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractYear(details: TMDBDetails): string {
  const date = details.release_date || details.first_air_date || "";
  return date ? date.substring(0, 4) : "";
}

function cacheRowToDetails(row: TMDBCacheRow): TMDBDetails {
  const genreIds: number[] = JSON.parse(row.genres || "[]");
  return {
    id: row.tmdb_id,
    title: row.media_type === "movie" ? row.title : undefined,
    name: row.media_type === "tv" ? row.title : undefined,
    release_date: row.media_type === "movie" ? `${row.year}-01-01` : undefined,
    first_air_date: row.media_type === "tv" ? `${row.year}-01-01` : undefined,
    poster_path: row.poster_path,
    overview: row.overview || "",
    genres: genreIds.map((id) => ({ id, name: "" })),
    vote_average: row.vote_average,
    popularity: row.popularity,
  };
}
