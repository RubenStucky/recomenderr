import { NextRequest, NextResponse } from "next/server";
import { upsertUserRating, getUserRating } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, tmdbId, mediaType, rating } = body as {
      userId: string;
      tmdbId: number;
      mediaType: string;
      rating: number;
    };

    if (!userId || !tmdbId || !mediaType || rating === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: userId, tmdbId, mediaType, rating" },
        { status: 400 }
      );
    }

    if (![-2, -1, 0, 1, 2].includes(rating)) {
      return NextResponse.json(
        { error: "rating must be one of -2, -1, 0, 1, 2" },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    upsertUserRating({
      user_id: userId,
      tmdb_id: tmdbId,
      media_type: mediaType,
      rating,
      rated_at: now,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/rate] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const tmdbId = searchParams.get("tmdbId");
    const mediaType = searchParams.get("mediaType");

    if (!userId || !tmdbId || !mediaType) {
      return NextResponse.json(
        { error: "Missing required query params: userId, tmdbId, mediaType" },
        { status: 400 }
      );
    }

    const row = getUserRating(userId, parseInt(tmdbId, 10), mediaType);
    return NextResponse.json({ rating: row?.rating ?? null });
  } catch (err) {
    console.error("[api/rate] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
