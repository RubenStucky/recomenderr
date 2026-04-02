import { NextRequest, NextResponse } from "next/server";
import { requestMedia } from "@/lib/seerr";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tmdbId, mediaType } = body;

    if (!tmdbId || !mediaType) {
      return NextResponse.json(
        { error: "Missing required fields: tmdbId, mediaType" },
        { status: 400 }
      );
    }

    if (mediaType !== "movie" && mediaType !== "tv") {
      return NextResponse.json(
        { error: "mediaType must be 'movie' or 'tv'" },
        { status: 400 }
      );
    }

    const result = await requestMedia(tmdbId, mediaType);
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (err) {
    console.error("[api/request] Error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
