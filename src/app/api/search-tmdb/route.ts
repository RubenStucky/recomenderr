import { NextRequest, NextResponse } from "next/server";
import { searchMulti } from "@/lib/tmdb";
import { isInLibrary } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 1) {
      return NextResponse.json({ results: [] });
    }

    const tmdbResults = await searchMulti(q, 10);

    const results = tmdbResults.map((r) => ({
      tmdbId: r.id,
      mediaType: r.mediaType,
      title: r.title,
      year: r.year,
      posterPath: r.posterPath,
      inLibrary: isInLibrary(r.id, r.mediaType),
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[api/search-tmdb] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
