import { NextRequest, NextResponse } from "next/server";
import { syncAndGenerate } from "@/lib/recommender";

export async function POST(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json(
      { error: "Missing required parameter: userId" },
      { status: 400 }
    );
  }

  try {
    const result = await syncAndGenerate(userId);
    return NextResponse.json({
      success: true,
      itemsProcessed: result.itemsProcessed,
    });
  } catch (err) {
    console.error("[api/sync] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Sync failed",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
