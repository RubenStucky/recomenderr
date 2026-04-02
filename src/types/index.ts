// ─── Tautulli Types ──────────────────────────────────────────────────────────

export interface TautulliUser {
  userId: string;
  username: string;
  thumb: string;
}

export interface WatchHistoryItem {
  title: string;
  year: string;
  ratingKey: string;
  mediaType: "movie" | "tv";
  grandparentTitle?: string;
  grandparentRatingKey?: string;
}

export interface LibraryItem {
  ratingKey: string;
  title: string;
  year: string;
  mediaType: "movie" | "tv";
  tmdbId?: number;
}

// ─── TMDB Types ─────────────────────────────────────────────────────────────

export interface TMDBSearchResult {
  id: number;
  title?: string; // movies
  name?: string; // tv shows
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
  poster_path: string | null;
  overview: string;
  genre_ids: number[];
  vote_average: number;
  popularity: number;
}

export interface TMDBDetails {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  overview: string;
  genres: Array<{ id: number; name: string }>;
  keywords?: {
    keywords?: Array<{ id: number; name: string }>; // movies
    results?: Array<{ id: number; name: string }>; // tv
  };
  vote_average: number;
  popularity: number;
}

export interface TMDBRecommendation {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  overview: string;
  genre_ids: number[];
  vote_average: number;
  popularity: number;
  media_type?: string;
}

export interface TMDBDiscoverResult {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  overview: string;
  genre_ids: number[];
  vote_average: number;
  popularity: number;
}

export interface DiscoverParams {
  mediaType: "movie" | "tv";
  genreIds: number[];
  keywordIds: number[];
  minVoteAverage?: number;
}

// ─── Seerr Types ────────────────────────────────────────────────────────────

export interface SeerrResponse {
  success: boolean;
  message?: string;
  status?: string;
}

export type MediaRequestStatus =
  | "unknown"
  | "pending"
  | "approved"
  | "available"
  | "declined";

export interface MediaStatus {
  id: number;
  mediaType: string;
  status: MediaRequestStatus;
}

// ─── Recommender Types ──────────────────────────────────────────────────────

export interface ScoredRecommendation {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year: string;
  posterPath: string | null;
  overview: string;
  score: number;
  sourceTitle: string;
  sourceTmdbId: number;
  inLibrary: boolean;
  voteAverage: number;
  genres: number[];
}

export interface BecauseYouWatched {
  sourceTitle: string;
  sourceTmdbId: number;
  items: ScoredRecommendation[];
}

export interface RecommendationResult {
  becauseYouWatched: BecauseYouWatched[];
  recommendedForYou: ScoredRecommendation[];
  notInLibrary: ScoredRecommendation[];
}

// ─── DB Row Types ───────────────────────────────────────────────────────────

export interface TMDBCacheRow {
  tmdb_id: number;
  media_type: string;
  title: string;
  year: string | null;
  poster_path: string | null;
  overview: string | null;
  genres: string; // JSON array of genre IDs
  keywords: string; // JSON array of keyword IDs
  vote_average: number;
  popularity: number;
  fetched_at: number;
}

export interface TMDBRecommendationRow {
  source_tmdb_id: number;
  source_media_type: string;
  recommended_tmdb_id: number;
  recommended_media_type: string;
  fetched_at: number;
}

export interface WatchHistoryRow {
  user_id: string;
  tmdb_id: number;
  media_type: string;
  title: string;
  watched_at: number | null;
  rating_key: string | null;
}

export interface UserRecommendationRow {
  user_id: string;
  tmdb_id: number;
  media_type: string;
  score: number;
  source_title: string | null;
  source_tmdb_id: number | null;
  in_library: number;
  generated_at: number;
}

export interface LibraryContentRow {
  tmdb_id: number;
  media_type: string;
  title: string;
  updated_at: number;
}
