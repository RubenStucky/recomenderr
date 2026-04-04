import { NextRequest, NextResponse } from "next/server";
import { searchLibrary } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    if (q.length < 1) {
      return NextResponse.json({ results: [] });
    }

    const rows = searchLibrary(q);

    const results = rows.map((row) => ({
      tmdbId: row.tmdb_id,
      mediaType: row.media_type,
      title: row.title,
      year: row.year ?? "",
      posterPath: row.poster_path,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error("[api/search-local] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
