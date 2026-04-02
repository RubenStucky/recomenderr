import * as tautulli from "./tautulli";
import * as tmdb from "./tmdb";
import {
  getWatchHistory as getWatchHistoryFromDb,
  getUserRecommendations as getUserRecommendationsFromDb,
  upsertWatchHistory,
  upsertLibraryContent,
  clearLibraryContent,
  clearUserRecommendations,
  upsertUserRecommendation,
  getCachedTmdbDetails,
  isInLibrary,
} from "./db";
import type {
  ScoredRecommendation,
  BecauseYouWatched,
  RecommendationResult,
  WatchHistoryRow,
} from "@/types";

// ─── Scoring Weights (tunable) ──────────────────────────────────────────────

const WEIGHT_FREQUENCY = 0.5;
const WEIGHT_GENRE = 0.3;
const WEIGHT_POPULARITY = 0.2;

// ─── Main Pipeline ──────────────────────────────────────────────────────────

/**
 * Full sync: fetch watch history from Tautulli, resolve to TMDB IDs,
 * fetch metadata & recommendations, refresh library, generate scores.
 */
export async function syncAndGenerate(
  userId: string
): Promise<{ itemsProcessed: number }> {
  console.log(`[recommender] Starting sync for user ${userId}…`);

  // 1. Fetch watch history from Tautulli
  const watchItems = await tautulli.getWatchHistory(userId);
  console.log(`[recommender] Found ${watchItems.length} watched items`);

  // 2. Resolve each to a TMDB ID and store
  let processed = 0;
  for (const item of watchItems) {
    try {
      // Try to get TMDB ID via Tautulli metadata (GUIDs)
      let tmdbId: number | undefined;
      const meta = await tautulli.getMetadata(item.ratingKey);
      tmdbId = meta.tmdbId;

      // Fallback: search TMDB by title
      if (!tmdbId) {
        const searchResult = await tmdb.searchByTitle(
          item.title,
          item.year || undefined,
          item.mediaType
        );
        if (searchResult) {
          tmdbId = searchResult.id;
        }
      }

      if (!tmdbId) {
        console.warn(
          `[recommender] Could not resolve TMDB ID for: ${item.title}`
        );
        continue;
      }

      // Fetch & cache TMDB details
      await tmdb.getDetails(tmdbId, item.mediaType);

      // Store in watch history
      upsertWatchHistory({
        user_id: userId,
        tmdb_id: tmdbId,
        media_type: item.mediaType,
        title: item.title,
        watched_at: Math.floor(Date.now() / 1000),
        rating_key: item.ratingKey,
      });

      processed++;
    } catch (err) {
      console.error(
        `[recommender] Error processing "${item.title}":`,
        err
      );
    }
  }

  // 3. Refresh library content
  await refreshLibraryContent();

  // 4. Generate recommendations
  await generateRecommendations(userId);

  console.log(`[recommender] Sync complete. Processed ${processed} items.`);
  return { itemsProcessed: processed };
}

/**
 * Refresh the library_content table from Tautulli library sections.
 */
async function refreshLibraryContent() {
  try {
    const sections = await tautulli.getLibrarySections();
    clearLibraryContent();

    for (const section of sections) {
      const items = await tautulli.getLibraryMediaInfo(section.sectionId);
      const mediaType = section.sectionType === "movie" ? "movie" : "tv";

      for (const item of items) {
        const meta = await tautulli.getMetadata(item.ratingKey);
        if (meta.tmdbId) {
          upsertLibraryContent({
            tmdb_id: meta.tmdbId,
            media_type: mediaType,
            title: item.title,
            updated_at: Math.floor(Date.now() / 1000),
          });
        }
      }
    }
  } catch (err) {
    console.error("[recommender] Library content refresh failed:", err);
  }
}

/**
 * Core recommendation generation using watch history from DB.
 */
export async function generateRecommendations(
  userId: string
): Promise<RecommendationResult> {
  const watchHistory = getWatchHistoryFromDb(userId);

  if (watchHistory.length === 0) {
    return { becauseYouWatched: [], recommendedForYou: [], notInLibrary: [] };
  }

  // Build a set of watched TMDB IDs for quick lookup
  const watchedSet = new Set(
    watchHistory.map((w) => `${w.tmdb_id}:${w.media_type}`)
  );

  // ─── Step 1: Collect TMDB recommendations per watched title ──────────
  const rawRecommendations = new Map<
    number,
    {
      tmdbId: number;
      mediaType: "movie" | "tv";
      appearances: number;
      sources: Array<{ title: string; tmdbId: number }>;
    }
  >();

  for (const watched of watchHistory.slice(0, 30)) {
    try {
      const recs = await tmdb.getRecommendations(
        watched.tmdb_id,
        watched.media_type as "movie" | "tv"
      );

      for (const rec of recs) {
        const recMediaType = (rec.media_type || watched.media_type) as
          | "movie"
          | "tv";
        const key = rec.id;

        // Skip if already watched
        if (watchedSet.has(`${rec.id}:${recMediaType}`)) continue;

        const existing = rawRecommendations.get(key);
        if (existing) {
          existing.appearances++;
          existing.sources.push({
            title: watched.title,
            tmdbId: watched.tmdb_id,
          });
        } else {
          rawRecommendations.set(key, {
            tmdbId: rec.id,
            mediaType: recMediaType,
            appearances: 1,
            sources: [
              { title: watched.title, tmdbId: watched.tmdb_id },
            ],
          });
        }
      }
    } catch (err) {
      console.error(
        `[recommender] Failed getting recommendations for ${watched.title}:`,
        err
      );
    }
  }

  // ─── Step 2: Build user genre profile ─────────────────────────────────
  const genreWeights = buildGenreProfile(watchHistory);

  // ─── Step 3: Score each recommendation ────────────────────────────────
  const maxAppearances = Math.max(
    1,
    ...Array.from(rawRecommendations.values()).map((r) => r.appearances)
  );

  const scored: ScoredRecommendation[] = [];

  for (const [, rec] of rawRecommendations) {
    try {
      // Fetch details (from cache if available)
      let details = getCachedTmdbDetails(rec.tmdbId);
      if (!details) {
        const fetched = await tmdb.getDetails(rec.tmdbId, rec.mediaType);
        if (!fetched) continue;
        details = getCachedTmdbDetails(rec.tmdbId);
        if (!details) continue;
      }

      const genreIds: number[] = JSON.parse(details.genres || "[]");

      // Frequency score
      const frequencyScore = rec.appearances / maxAppearances;

      // Genre overlap score
      const genreScore = computeGenreScore(genreIds, genreWeights);

      // Popularity score (normalized, capped at 1)
      const popularityScore = Math.min((details.popularity || 0) / 100, 1);

      // Combined score
      const finalScore =
        frequencyScore * WEIGHT_FREQUENCY +
        genreScore * WEIGHT_GENRE +
        popularityScore * WEIGHT_POPULARITY;

      // Primary source (the one that contributed the most)
      const primarySource = rec.sources[0];

      const inLib = isInLibrary(rec.tmdbId, rec.mediaType);

      scored.push({
        tmdbId: rec.tmdbId,
        mediaType: rec.mediaType,
        title: details.title,
        year: details.year || "",
        posterPath: details.poster_path,
        overview: details.overview || "",
        score: Math.round(finalScore * 1000) / 1000,
        sourceTitle: primarySource.title,
        sourceTmdbId: primarySource.tmdbId,
        inLibrary: inLib,
        voteAverage: details.vote_average,
        genres: genreIds,
      });
    } catch (err) {
      console.error(
        `[recommender] Error scoring recommendation ${rec.tmdbId}:`,
        err
      );
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // ─── Step 4: Discover-based recommendations ──────────────────────────
  const topGenreIds = getTopGenreIds(genreWeights, 3);
  const topKeywordIds = getTopKeywordIds(watchHistory, 5);
  const discoverResults: ScoredRecommendation[] = [];

  for (const mediaType of ["movie", "tv"] as const) {
    try {
      const discovered = await tmdb.discoverByPreferences({
        mediaType,
        genreIds: topGenreIds,
        keywordIds: topKeywordIds,
      });

      for (const disc of discovered) {
        const key = `${disc.id}:${mediaType}`;
        if (watchedSet.has(key)) continue;
        if (rawRecommendations.has(disc.id)) continue; // already scored

        const inLib = isInLibrary(disc.id, mediaType);
        discoverResults.push({
          tmdbId: disc.id,
          mediaType,
          title: disc.title || disc.name || "",
          year: (disc.release_date || disc.first_air_date || "").substring(
            0,
            4
          ),
          posterPath: disc.poster_path,
          overview: disc.overview || "",
          score: Math.min((disc.popularity || 0) / 100, 1) * 0.5,
          sourceTitle: "Your taste profile",
          sourceTmdbId: 0,
          inLibrary: inLib,
          voteAverage: disc.vote_average,
          genres: disc.genre_ids || [],
        });
      }
    } catch (err) {
      console.error(`[recommender] Discover failed for ${mediaType}:`, err);
    }
  }

  // ─── Step 5: Build structured output ─────────────────────────────────

  // "Because you watched" groups — top 5 source titles
  const sourceGroups = new Map<number, BecauseYouWatched>();
  for (const item of scored) {
    if (!sourceGroups.has(item.sourceTmdbId)) {
      sourceGroups.set(item.sourceTmdbId, {
        sourceTitle: item.sourceTitle,
        sourceTmdbId: item.sourceTmdbId,
        items: [],
      });
    }
    sourceGroups.get(item.sourceTmdbId)!.items.push(item);
  }

  const becauseYouWatched = Array.from(sourceGroups.values())
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 5)
    .map((group) => ({
      ...group,
      items: group.items.slice(0, 15), // limit each row
    }));

  // "Recommended for you" — top 30 by score
  const recommendedForYou = scored.slice(0, 30);

  // "Not in library" — all items that aren't in library
  const notInLibrary = [...scored, ...discoverResults]
    .filter((r) => !r.inLibrary)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  // ─── Step 6: Store in DB ──────────────────────────────────────────────
  const now = Math.floor(Date.now() / 1000);
  clearUserRecommendations(userId);

  const allRecs = deduplicateRecommendations([...scored, ...discoverResults]);
  for (const rec of allRecs) {
    upsertUserRecommendation({
      user_id: userId,
      tmdb_id: rec.tmdbId,
      media_type: rec.mediaType,
      score: rec.score,
      source_title: rec.sourceTitle,
      source_tmdb_id: rec.sourceTmdbId,
      in_library: rec.inLibrary ? 1 : 0,
      generated_at: now,
    });
  }

  return { becauseYouWatched, recommendedForYou, notInLibrary };
}

/**
 * Rebuild recommendations from cached DB data only (fast path).
 */
export function rebuildFromCache(userId: string): RecommendationResult | null {
  const rows = getUserRecommendationsFromDb(userId);

  if (rows.length === 0) return null;

  const scored: ScoredRecommendation[] = rows.map((row) => {
    const cached = getCachedTmdbDetails(row.tmdb_id);
    return {
      tmdbId: row.tmdb_id,
      mediaType: row.media_type as "movie" | "tv",
      title: cached?.title || "",
      year: cached?.year || "",
      posterPath: cached?.poster_path || null,
      overview: cached?.overview || "",
      score: row.score,
      sourceTitle: row.source_title || "",
      sourceTmdbId: row.source_tmdb_id || 0,
      inLibrary: row.in_library === 1,
      voteAverage: cached?.vote_average || 0,
      genres: cached ? JSON.parse(cached.genres || "[]") : [],
    };
  });

  // Rebuild groups
  const sourceGroups = new Map<number, BecauseYouWatched>();
  for (const item of scored) {
    if (item.sourceTmdbId === 0) continue; // discover items
    if (!sourceGroups.has(item.sourceTmdbId)) {
      sourceGroups.set(item.sourceTmdbId, {
        sourceTitle: item.sourceTitle,
        sourceTmdbId: item.sourceTmdbId,
        items: [],
      });
    }
    sourceGroups.get(item.sourceTmdbId)!.items.push(item);
  }

  const becauseYouWatched = Array.from(sourceGroups.values())
    .sort((a, b) => b.items.length - a.items.length)
    .slice(0, 5)
    .map((g) => ({ ...g, items: g.items.slice(0, 15) }));

  const recommendedForYou = scored.slice(0, 30);
  const notInLibrary = scored
    .filter((r) => !r.inLibrary)
    .slice(0, 30);

  return { becauseYouWatched, recommendedForYou, notInLibrary };
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function buildGenreProfile(
  watchHistory: WatchHistoryRow[]
): Map<number, number> {
  const weights = new Map<number, number>();
  for (const item of watchHistory) {
    const cached = getCachedTmdbDetails(item.tmdb_id);
    if (!cached) continue;
    const genreIds: number[] = JSON.parse(cached.genres || "[]");
    for (const gid of genreIds) {
      weights.set(gid, (weights.get(gid) || 0) + 1);
    }
  }
  return weights;
}

function computeGenreScore(
  recGenres: number[],
  userGenreWeights: Map<number, number>
): number {
  if (recGenres.length === 0 || userGenreWeights.size === 0) return 0;

  let totalWeight = 0;
  for (const w of userGenreWeights.values()) totalWeight += w;
  if (totalWeight === 0) return 0;

  let overlap = 0;
  for (const gid of recGenres) {
    overlap += userGenreWeights.get(gid) || 0;
  }

  return overlap / totalWeight;
}

function getTopGenreIds(
  genreWeights: Map<number, number>,
  count: number
): number[] {
  return Array.from(genreWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([id]) => id);
}

function getTopKeywordIds(
  watchHistory: WatchHistoryRow[],
  count: number
): number[] {
  const keywordCounts = new Map<number, number>();
  for (const item of watchHistory) {
    const cached = getCachedTmdbDetails(item.tmdb_id);
    if (!cached) continue;
    const keywordIds: number[] = JSON.parse(cached.keywords || "[]");
    for (const kid of keywordIds) {
      keywordCounts.set(kid, (keywordCounts.get(kid) || 0) + 1);
    }
  }
  return Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([id]) => id);
}

function deduplicateRecommendations(
  recs: ScoredRecommendation[]
): ScoredRecommendation[] {
  const seen = new Map<string, ScoredRecommendation>();
  for (const rec of recs) {
    const key = `${rec.tmdbId}:${rec.mediaType}`;
    const existing = seen.get(key);
    if (!existing || rec.score > existing.score) {
      seen.set(key, rec);
    }
  }
  return Array.from(seen.values());
}
