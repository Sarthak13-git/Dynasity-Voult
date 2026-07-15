import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/users
 * Retrieve users list for administrative management (admin-only).
 * Supports search, filters (tab), sorting, and pagination.
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

    // 3. Extract query parameters
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "all";
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sort") || "created_at"; // created_at or last_login
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;

    let sellerIds: string[] = [];
    let buyerIds: string[] = [];

    // Pre-query lists for relationship tabs
    if (tab === "sellers") {
      const { data: artifacts } = await supabase
        .from("artifacts")
        .select("seller_id");
      sellerIds = Array.from(new Set((artifacts || []).map((a) => a.seller_id).filter(Boolean))) as string[];
      
      if (sellerIds.length === 0) {
        return NextResponse.json({
          success: true,
          users: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
    } else if (tab === "buyers") {
      const [
        { data: orders },
        { data: bids }
      ] = await Promise.all([
        supabase.from("orders").select("user_id"),
        supabase.from("bids").select("user_id")
      ]);
      
      const unionIds = [
        ...(orders || []).map((o) => o.user_id),
        ...(bids || []).map((b) => b.user_id)
      ].filter(Boolean);
      
      buyerIds = Array.from(new Set(unionIds)) as string[];
      
      if (buyerIds.length === 0) {
        return NextResponse.json({
          success: true,
          users: [],
          pagination: { page, limit, total: 0, pages: 0 },
        });
      }
    }

    // 4. Build Profiles query
    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" });

    // Filter by Tab
    if (tab === "admins") {
      query = query.eq("role", "admin");
    } else if (tab === "suspended") {
      query = query.eq("status", "suspended");
    } else if (tab === "sellers") {
      query = query.in("id", sellerIds);
    } else if (tab === "buyers") {
      query = query.in("id", buyerIds);
    }

    // Search query
    if (search) {
      query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Sorting
    if (sortBy === "last_login") {
      query = query.order("last_login", { ascending: false, nullsFirst: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    // Pagination bounds
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: users, count, error: dbError } = await query;
    if (dbError) throw dbError;

    const total = count || 0;
    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      users: users || [],
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching users:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch users." },
      { status: 500 }
    );
  }
}
