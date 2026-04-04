import { config } from "./config";
import type { TautulliUser, WatchHistoryItem } from "@/types";

async function tautulliGet<T>(cmd: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${config.tautulli.url}/api/v2`);
  url.searchParams.set("apikey", config.tautulli.apiKey);
  url.searchParams.set("cmd", cmd);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  console.log(`[tautulli] Request: ${config.tautulli.url}/api/v2?cmd=${cmd}`);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Tautulli API error: ${res.status} ${res.statusText}\nURL: ${config.tautulli.url}/api/v2?cmd=${cmd}\nResponse: ${body.substring(0, 500)}`
    );
  }

  const json = await res.json();
  if (json.response?.result !== "success") {
    throw new Error(
      `Tautulli command '${cmd}' failed: ${json.response?.message ?? "unknown error"}`
    );
  }

  return json.response.data as T;
}

/**
 * Fetch all Plex users from Tautulli.
 */
export async function getUsers(): Promise<TautulliUser[]> {
  interface RawUser {
    user_id: number;
    friendly_name: string;
    username: string;
    thumb: string;
    is_active: number;
  }

  const data = await tautulliGet<RawUser[]>("get_users");

  return data
    .filter((u) => u.user_id !== 0) // filter out the "local" placeholder
    .map((u) => ({
      userId: String(u.user_id),
      username: u.friendly_name || u.username,
      thumb: u.thumb || "",
    }));
}

/**
 * Fetch watch history for a user.
 * Returns deduplicated entries at movie/show level.
 * Only includes items that were meaningfully watched (>=80% complete).
 * For TV shows: average percent_complete across episodes >= 80,
 * OR at least 60% of episodes have percent_complete >= 80.
 */
export async function getWatchHistory(
  userId: string,
  limit: number = 1000
): Promise<WatchHistoryItem[]> {
  interface RawHistoryResponse {
    data: Array<{
      reference_id: number;
      title: string;
      year: string;
      rating_key: string;
      grandparent_title: string;
      grandparent_rating_key: string;
      media_type: string;
      stopped: number;
      percent_complete: number;
    }>;
    recordsTotal: number;
  }

  const data = await tautulliGet<RawHistoryResponse>("get_history", {
    user_id: userId,
    length: String(limit),
    order_column: "date",
    order_dir: "desc",
  });

  const rows = data.data || [];

  // Deduplicated movies: title -> WatchHistoryItem
  const moviesMap = new Map<string, WatchHistoryItem>();

  // TV shows: title -> episode percent_complete values
  const showsMap = new Map<
    string,
    {
      title: string;
      year: string;
      ratingKey: string;
      grandparentTitle: string;
      grandparentRatingKey: string;
      percentCompletes: number[];
    }
  >();

  for (const row of rows) {
    const pct =
      typeof row.percent_complete === "number" ? row.percent_complete : 0;

    if (row.media_type === "movie") {
      // Only count if >= 80% watched
      if (pct < 80) continue;
      const key = row.title;
      if (!moviesMap.has(key)) {
        moviesMap.set(key, {
          title: row.title,
          year: row.year ? String(row.year) : "",
          ratingKey: row.rating_key,
          mediaType: "movie",
          percentComplete: pct,
        });
      }
    } else if (row.media_type === "episode") {
      const showTitle = row.grandparent_title || row.title;
      const existing = showsMap.get(showTitle);
      if (existing) {
        existing.percentCompletes.push(pct);
      } else {
        showsMap.set(showTitle, {
          title: showTitle,
          year: row.year ? String(row.year) : "",
          ratingKey: row.grandparent_rating_key || row.rating_key,
          grandparentTitle: row.grandparent_title,
          grandparentRatingKey: row.grandparent_rating_key,
          percentCompletes: [pct],
        });
      }
    }
    // Skip music, trailers, etc.
  }

  const results: WatchHistoryItem[] = Array.from(moviesMap.values());

  for (const [, show] of showsMap) {
    const { percentCompletes } = show;
    const avgPct =
      percentCompletes.reduce((a, b) => a + b, 0) / percentCompletes.length;
    const fractionComplete =
      percentCompletes.filter((p) => p >= 80).length / percentCompletes.length;

    // Include show if average >= 80 OR at least 60% of episodes are >= 80
    if (avgPct < 80 && fractionComplete < 0.6) continue;

    results.push({
      title: show.title,
      year: show.year,
      ratingKey: show.ratingKey,
      mediaType: "tv",
      grandparentTitle: show.grandparentTitle,
      grandparentRatingKey: show.grandparentRatingKey,
      percentComplete: Math.round(avgPct),
    });
  }

  return results;
}

/**
 * Fetch metadata for a single item (to extract TMDB GUIDs).
 */
export async function getMetadata(
  ratingKey: string
): Promise<{ tmdbId?: number; mediaType?: string }> {
  interface RawMetadata {
    guids?: string[];
    media_type?: string;
  }

  try {
    const data = await tautulliGet<RawMetadata>("get_metadata", {
      rating_key: ratingKey,
    });

    let tmdbId: number | undefined;

    if (data.guids) {
      for (const guid of data.guids) {
        // GUIDs look like "tmdb://12345"
        const match = guid.match(/tmdb:\/\/(\d+)/);
        if (match) {
          tmdbId = parseInt(match[1], 10);
          break;
        }
      }
    }

    return { tmdbId, mediaType: data.media_type };
  } catch (err) {
    console.error(`Failed to get metadata for rating key ${ratingKey}:`, err);
    return {};
  }
}

/**
 * Get all library section IDs from Tautulli.
 */
export async function getLibrarySections(): Promise<
  Array<{ sectionId: string; sectionName: string; sectionType: string }>
> {
  interface RawSection {
    section_id: string;
    section_name: string;
    section_type: string;
  }

  const data = await tautulliGet<RawSection[]>("get_libraries");

  return data
    .filter((s) => s.section_type === "movie" || s.section_type === "show")
    .map((s) => ({
      sectionId: s.section_id,
      sectionName: s.section_name,
      sectionType: s.section_type,
    }));
}

/**
 * Get library media info for a specific section.
 * Returns rating keys for each item in the library.
 */
export async function getLibraryMediaInfo(
  sectionId: string
): Promise<Array<{ ratingKey: string; title: string; year: string }>> {
  interface RawLibResponse {
    data: Array<{
      rating_key: string;
      title: string;
      year: string;
    }>;
    recordsTotal: number;
  }

  const data = await tautulliGet<RawLibResponse>("get_library_media_info", {
    section_id: sectionId,
    length: "10000",
  });

  return (data.data || []).map((item) => ({
    ratingKey: item.rating_key,
    title: item.title,
    year: item.year ? String(item.year) : "",
  }));
}
