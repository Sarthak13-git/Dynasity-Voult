import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/auctions
 * Secure administrative endpoint to query all auctions with detailed relationships.
 * Supports filtering by status and searching by title/description.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in." },
        { status: 401 }
      );
    }

    // 2. Authorize role = admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admins only." },
        { status: 403 }
      );
    }

    // Run on-demand activation & settlement triggers
    try {
      await supabase.rpc("activate_scheduled_auctions");
      await supabase.rpc("settle_expired_auctions");
    } catch (rpcErr) {
      console.error("RPC activation/settlement triggers failed in admin route:", rpcErr);
    }

    // 3. Extract parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";

    // 4. Build auctions query
    let query = supabase
      .from("auctions")
      .select(`
        *,
        artifacts:artifact_id (
          id,
          title,
          description,
          thumbnail_url,
          images,
          estimated_value,
          origin,
          era,
          provenance,
          category,
          status,
          seller:seller_id (
            id,
            display_name,
            email
          )
        ),
        winner:winner_id (
          id,
          display_name,
          email
        ),
        highest_bidder:highest_bidder_id (
          id,
          display_name,
          email
        ),
        bids (
          id,
          amount,
          created_at,
          profiles:user_id (
            id,
            display_name,
            email
          )
        ),
        orders:orders(id, status, seller_earnings(id, payouts(id, status)))
      `)
      .order("created_at", { ascending: false });

    // Apply status filter (if not "all")
    if (status !== "all") {
      query = query.eq("status", status.toLowerCase());
    }

    const { data: auctions, error: dbError } = await query;
    if (dbError) throw dbError;

    // 5. In-memory search filter (cross-references auction title, description and artifact title)
    let filteredAuctions = auctions || [];
    if (search) {
      const lowerSearch = search.toLowerCase();
      filteredAuctions = filteredAuctions.filter((a: any) => {
        const titleMatch = a.title?.toLowerCase().includes(lowerSearch);
        const descMatch = a.description?.toLowerCase().includes(lowerSearch);
        const artTitleMatch = a.artifacts?.title?.toLowerCase().includes(lowerSearch);
        return titleMatch || descMatch || artTitleMatch;
      });
    }

    return NextResponse.json({
      success: true,
      auctions: filteredAuctions,
    });
  } catch (error: any) {
    console.error("❌ Error fetching admin auctions:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load auctions." },
      { status: 500 }
    );
  }
}
