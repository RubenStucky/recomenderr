import { NextResponse } from "next/server";
import { getUsers } from "@/lib/tautulli";

export async function GET() {
  try {
    const users = await getUsers();
    return NextResponse.json({ users });
  } catch (err) {
    console.error("[api/users] Error:", err);
    return NextResponse.json(
      {
        error: "Failed to fetch users from Tautulli",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
