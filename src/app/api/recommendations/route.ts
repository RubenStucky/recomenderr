import { NextRequest, NextResponse } from "next/server";
import { getUserRecommendationAge } from "@/lib/db";
import {
  generateRecommendations,
  rebuildFromCache,
} from "@/lib/recommender";

const SIX_HOURS = 6 * 60 * 60;

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json(
      { error: "Missing required parameter: userId" },
      { status: 400 }
    );
  }

  try {
    // Check if we have fresh cached recommendations
    const latestGenerated = getUserRecommendationAge(userId);
    const now = Math.floor(Date.now() / 1000);

    if (latestGenerated && now - latestGenerated < SIX_HOURS) {
      // Return cached results
      const cached = rebuildFromCache(userId);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Stale or missing — regenerate
    const result = await generateRecommendations(userId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/recommendations] Error:", err);
    return NextResponse.json(
      {
        error: "Failed to generate recommendations",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
