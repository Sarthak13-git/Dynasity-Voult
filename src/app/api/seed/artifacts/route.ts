import { seedBuyArtifacts } from "@/lib/supabase/seed";
import { NextResponse } from "next/server";

/**
 * API route to seed database with sample products
 * POST /api/seed/artifacts
 * 
 * Security: Add authentication check in production
 */
export async function POST(request: Request) {
  try {
    // ⚠️ TODO: Add admin authentication check here
    // Example:
    // const session = await getSession();
    // if (!session || session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log("🌱 Starting database seed...");
    
    const result = await seedBuyArtifacts();
    
    return NextResponse.json({
      success: true,
      message: `✅ Successfully added ${result?.length || 0} artifacts to database`,
      count: result?.length || 0,
      data: result,
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
