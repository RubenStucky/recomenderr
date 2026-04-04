import Database from "better-sqlite3";
import path from "path";

const DB_PATH =
  process.env.DB_PATH || path.join(process.cwd(), "data", "recommender.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initializeSchema(db);

  return db;
}

function initializeSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tmdb_cache (
      tmdb_id INTEGER PRIMARY KEY,
      media_type TEXT NOT NULL,
      title TEXT NOT NULL,
      year TEXT,
      poster_path TEXT,
      overview TEXT,
      genres TEXT,
      keywords TEXT,
      vote_average REAL,
      popularity REAL,
      fetched_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tmdb_recommendations (
      source_tmdb_id INTEGER NOT NULL,
      source_media_type TEXT NOT NULL,
      recommended_tmdb_id INTEGER NOT NULL,
      recommended_media_type TEXT NOT NULL,
      fetched_at INTEGER NOT NULL,
      PRIMARY KEY (source_tmdb_id, source_media_type, recommended_tmdb_id)
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      user_id TEXT NOT NULL,
      tmdb_id INTEGER NOT NULL,
      media_type TEXT NOT NULL,
      title TEXT NOT NULL,
      watched_at INTEGER,
      rating_key TEXT,
      percent_complete REAL DEFAULT 0,
      PRIMARY KEY (user_id, tmdb_id, media_type)
    );

    CREATE TABLE IF NOT EXISTS user_ratings (
      user_id TEXT NOT NULL,
      tmdb_id INTEGER NOT NULL,
      media_type TEXT NOT NULL,
      rating INTEGER NOT NULL,
      rated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, tmdb_id, media_type)
    );

    CREATE TABLE IF NOT EXISTS user_recommendations (
      user_id TEXT NOT NULL,
      tmdb_id INTEGER NOT NULL,
      media_type TEXT NOT NULL,
      score REAL NOT NULL,
      source_title TEXT,
      source_tmdb_id INTEGER,
      in_library INTEGER DEFAULT 0,
      generated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, tmdb_id, media_type)
    );

    CREATE TABLE IF NOT EXISTS library_content (
      tmdb_id INTEGER NOT NULL,
      media_type TEXT NOT NULL,
      title TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (tmdb_id, media_type)
    );

    CREATE TABLE IF NOT EXISTS user_season_ratings (
      user_id TEXT NOT NULL,
      tmdb_id INTEGER NOT NULL,
      season INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      rated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, tmdb_id, season)
    );
  `);

  // Migrations for existing databases
  try {
    database.exec(
      "ALTER TABLE watch_history ADD COLUMN percent_complete REAL DEFAULT 0"
    );
  } catch {
    // Column already exists — ignore
  }
}

// ─── Query helpers ──────────────────────────────────────────────────────────

export function getCachedTmdbDetails(tmdbId: number) {
  const db = getDb();
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  return db
    .prepare(
      "SELECT * FROM tmdb_cache WHERE tmdb_id = ? AND fetched_at > ?"
    )
    .get(tmdbId, sevenDaysAgo) as
    | import("@/types").TMDBCacheRow
    | undefined;
}

export function upsertTmdbCache(row: import("@/types").TMDBCacheRow) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO tmdb_cache
     (tmdb_id, media_type, title, year, poster_path, overview, genres, keywords, vote_average, popularity, fetched_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.tmdb_id,
    row.media_type,
    row.title,
    row.year,
    row.poster_path,
    row.overview,
    row.genres,
    row.keywords,
    row.vote_average,
    row.popularity,
    row.fetched_at
  );
}

export function getCachedRecommendations(
  sourceTmdbId: number,
  sourceMediaType: string
) {
  const db = getDb();
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
  return db
    .prepare(
      `SELECT * FROM tmdb_recommendations
       WHERE source_tmdb_id = ? AND source_media_type = ? AND fetched_at > ?`
    )
    .all(sourceTmdbId, sourceMediaType, sevenDaysAgo) as import("@/types").TMDBRecommendationRow[];
}

export function upsertRecommendation(
  row: import("@/types").TMDBRecommendationRow
) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO tmdb_recommendations
     (source_tmdb_id, source_media_type, recommended_tmdb_id, recommended_media_type, fetched_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(
    row.source_tmdb_id,
    row.source_media_type,
    row.recommended_tmdb_id,
    row.recommended_media_type,
    row.fetched_at
  );
}

export function getWatchHistory(userId: string) {
  const db = getDb();
  return db
    .prepare("SELECT * FROM watch_history WHERE user_id = ?")
    .all(userId) as import("@/types").WatchHistoryRow[];
}

export function upsertWatchHistory(row: import("@/types").WatchHistoryRow) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO watch_history
     (user_id, tmdb_id, media_type, title, watched_at, rating_key, percent_complete)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.user_id,
    row.tmdb_id,
    row.media_type,
    row.title,
    row.watched_at,
    row.rating_key,
    row.percent_complete ?? 0
  );
}

export function getUserRecommendations(userId: string) {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM user_recommendations WHERE user_id = ? ORDER BY score DESC"
    )
    .all(userId) as import("@/types").UserRecommendationRow[];
}

export function getUserRecommendationAge(userId: string): number | null {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT MAX(generated_at) as latest FROM user_recommendations WHERE user_id = ?"
    )
    .get(userId) as { latest: number | null } | undefined;
  return row?.latest ?? null;
}

export function clearUserRecommendations(userId: string) {
  const db = getDb();
  db.prepare("DELETE FROM user_recommendations WHERE user_id = ?").run(userId);
}

export function upsertUserRecommendation(
  row: import("@/types").UserRecommendationRow
) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO user_recommendations
     (user_id, tmdb_id, media_type, score, source_title, source_tmdb_id, in_library, generated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.user_id,
    row.tmdb_id,
    row.media_type,
    row.score,
    row.source_title,
    row.source_tmdb_id,
    row.in_library,
    row.generated_at
  );
}

export function getLibraryContent() {
  const db = getDb();
  return db.prepare("SELECT * FROM library_content").all() as import("@/types").LibraryContentRow[];
}

export function isInLibrary(tmdbId: number, mediaType: string): boolean {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT 1 FROM library_content WHERE tmdb_id = ? AND media_type = ?"
    )
    .get(tmdbId, mediaType);
  return !!row;
}

export function upsertLibraryContent(
  row: import("@/types").LibraryContentRow
) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO library_content
     (tmdb_id, media_type, title, updated_at)
     VALUES (?, ?, ?, ?)`
  ).run(row.tmdb_id, row.media_type, row.title, row.updated_at);
}

export function clearLibraryContent() {
  const db = getDb();
  db.prepare("DELETE FROM library_content").run();
}

// ─── User Ratings ────────────────────────────────────────────────────────────

export function upsertUserRating(row: import("@/types").UserRatingRow) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO user_ratings
     (user_id, tmdb_id, media_type, rating, rated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(row.user_id, row.tmdb_id, row.media_type, row.rating, row.rated_at);
}

export function getUserRating(
  userId: string,
  tmdbId: number,
  mediaType: string
): import("@/types").UserRatingRow | undefined {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM user_ratings WHERE user_id = ? AND tmdb_id = ? AND media_type = ?"
    )
    .get(userId, tmdbId, mediaType) as
    | import("@/types").UserRatingRow
    | undefined;
}

export function getUserRatings(userId: string): import("@/types").UserRatingRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM user_ratings WHERE user_id = ?")
    .all(userId) as import("@/types").UserRatingRow[];
}

// ─── Season Ratings ──────────────────────────────────────────────────────────

export interface UserSeasonRatingRow {
  user_id: string;
  tmdb_id: number;
  season: number;
  rating: number;
  rated_at: number;
}

export function upsertUserSeasonRating(row: UserSeasonRatingRow) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO user_season_ratings
     (user_id, tmdb_id, season, rating, rated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(row.user_id, row.tmdb_id, row.season, row.rating, row.rated_at);
}

export function getUserSeasonRatings(userId: string): UserSeasonRatingRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM user_season_ratings WHERE user_id = ? ORDER BY tmdb_id, season")
    .all(userId) as UserSeasonRatingRow[];
}

export function getWatchHistoryWithMeta(userId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT wh.tmdb_id, wh.media_type, wh.title, wh.watched_at,
              tc.year, tc.poster_path
       FROM watch_history wh
       LEFT JOIN tmdb_cache tc ON wh.tmdb_id = tc.tmdb_id AND wh.media_type = tc.media_type
       WHERE wh.user_id = ?
       ORDER BY wh.watched_at DESC NULLS LAST`
    )
    .all(userId) as Array<{
      tmdb_id: number;
      media_type: string;
      title: string;
      watched_at: number | null;
      year: string | null;
      poster_path: string | null;
    }>;
}

export function searchLibrary(query: string) {
  const db = getDb();
  const pattern = `%${query}%`;
  return db
    .prepare(
      `SELECT lc.tmdb_id, lc.media_type, lc.title, tc.year, tc.poster_path
       FROM library_content lc
       LEFT JOIN tmdb_cache tc ON lc.tmdb_id = tc.tmdb_id AND lc.media_type = tc.media_type
       WHERE LOWER(lc.title) LIKE LOWER(?)
       ORDER BY lc.title
       LIMIT 20`
    )
    .all(pattern) as Array<{
      tmdb_id: number;
      media_type: string;
      title: string;
      year: string | null;
      poster_path: string | null;
    }>;
}
