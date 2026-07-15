import { seedBuyArtifacts, seedAuctionArtifactsAndAuctions } from "@/lib/supabase/seed";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * API route to seed database with sample products
 * POST /api/seed/artifacts
 * 
 * Security: Restricted to admin users only.
 */
export async function POST(request: Request) {
  try {
    // ────────── NEW AUTH & ROLE CHECK SECURITY GUARD ──────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // 1. Authentication check
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorization check (Query the profiles table for admin role)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized: Only admins can seed artifacts" },
        { status: 403 }
      );
    }
    // ──────────────────────────────────────────────────────────

    console.log("🌱 Starting database seed...");
    
    const buyResult = await seedBuyArtifacts();
    const auctionResult = await seedAuctionArtifactsAndAuctions();
    
    return NextResponse.json({
      success: true,
      message: "✅ Database successfully seeded with catalog items and live auctions",
      buyCount: buyResult?.length || 0,
      auctionCount: auctionResult?.length || 0,
    });
  } catch (error) {
    console.error("❌ Seed error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET method to check seed status (optional)
 */
export async function GET() {
  return NextResponse.json({
    message: "POST to /api/seed/artifacts to seed the database",
    note: "Make sure you have set your Supabase credentials in .env.local",
  });
}
