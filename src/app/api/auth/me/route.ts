import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/me
 * Returns the current authenticated user or null
 */
export async function GET() {
  try {
    const { authenticated, user } = await verifySession();

    if (!authenticated || !user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error("[api/auth/me] Error:", error);
    return NextResponse.json(
      { authenticated: false, user: null, error: "Internal error" },
      { status: 500 }
    );
  }
}
