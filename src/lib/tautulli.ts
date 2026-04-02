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
 */
export async function getWatchHistory(
  userId: string,
  limit: number = 50
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
  const seen = new Set<string>();
  const results: WatchHistoryItem[] = [];

  for (const row of rows) {
    // Determine media type — Tautulli uses "movie", "episode", "track", etc.
    let mediaType: "movie" | "tv";
    let title: string;
    let ratingKey: string;

    if (row.media_type === "movie") {
      mediaType = "movie";
      title = row.title;
      ratingKey = row.rating_key;
    } else if (row.media_type === "episode") {
      // Deduplicate TV shows by grandparent (show-level)
      mediaType = "tv";
      title = row.grandparent_title || row.title;
      ratingKey = row.grandparent_rating_key || row.rating_key;
    } else {
      continue; // skip music, etc.
    }

    const dedupKey = `${mediaType}:${title}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    results.push({
      title,
      year: row.year ? String(row.year) : "",
      ratingKey,
      mediaType,
      grandparentTitle:
        mediaType === "tv" ? row.grandparent_title : undefined,
      grandparentRatingKey:
        mediaType === "tv" ? row.grandparent_rating_key : undefined,
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
