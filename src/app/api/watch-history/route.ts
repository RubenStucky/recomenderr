import { NextRequest, NextResponse } from "next/server";
import {
  getWatchHistoryWithMeta,
  getUserRatings,
} from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing required query param: userId" },
        { status: 400 }
      );
    }

    const history = getWatchHistoryWithMeta(userId);
    const ratings = getUserRatings(userId);

    const ratingMap = new Map<string, number>();
    for (const r of ratings) {
      ratingMap.set(`${r.tmdb_id}:${r.media_type}`, r.rating);
    }

    const items = history.map((row) => {
      const rating = ratingMap.get(`${row.tmdb_id}:${row.media_type}`) ?? null;
      return {
        tmdbId: row.tmdb_id,
        mediaType: row.media_type,
        title: row.title,
        year: row.year ?? "",
        posterPath: row.poster_path,
        watchedAt: row.watched_at,
        rating,
      };
    });

    // Unrated first, then rated
    const unrated = items.filter((i) => i.rating === null);
    const rated = items.filter((i) => i.rating !== null);
    const sorted = [...unrated, ...rated];

    const totalWatched = items.length;
    const totalRated = rated.length;

    return NextResponse.json({ items: sorted, totalWatched, totalRated });
  } catch (err) {
    console.error("[api/watch-history] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
