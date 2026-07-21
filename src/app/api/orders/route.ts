import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/orders
 * Fetch orders. Admins can view all, buyers/sellers can view their own.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in." },
        { status: 401 }
      );
    }

    // Fetch user profile role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found." },
        { status: 404 }
      );
    }

    let ordersQuery = supabase.from("orders").select(`
      *,
      artifacts:artifact_id (
        id,
        title,
        estimated_value,
        buy_now_price,
        currency,
        thumbnail_url,
        seller_id,
        creation_year,
        calendar_era,
        is_estimated,
        historical_period
      ),

      profiles:user_id (
        id,
        display_name,
        email
      )
    `);

    // Enforce role-based retrieval
    if (profile.role === "seller") {
      // 1. Fetch seller's artifacts to check if they sold items
      const { data: sellerArtifacts } = await supabase
        .from("artifacts")
        .select("id")
        .eq("seller_id", user.id);

      const sellerArtifactIds = (sellerArtifacts || []).map((art) => art.id);

      // 2. Fetch orders where user is buyer OR seller of the artifact
      if (sellerArtifactIds.length > 0) {
        ordersQuery = ordersQuery.or(`user_id.eq.${user.id},artifact_id.in.(${sellerArtifactIds.join(",")})`);
      } else {
        ordersQuery = ordersQuery.eq("user_id", user.id);
      }
    } else if (profile.role === "buyer") {
      // Allow buyers to access their own orders
      ordersQuery = ordersQuery.eq("user_id", user.id);
    } else if (profile.role !== "admin") {
      // Other roles are Forbidden
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have access to view orders." },
        { status: 403 }
      );
    }

    const { data: orders, error: dbError } = await ordersQuery.order("created_at", {
      ascending: false,
    });

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error: any) {
    console.error("❌ Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch orders." },
      { status: 500 }
    );
  }
}
