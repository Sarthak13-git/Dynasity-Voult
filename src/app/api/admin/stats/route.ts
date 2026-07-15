import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stats
 * Secure API endpoint to fetch database statistics, recent activity,
 * and recent auctions for the admin overview dashboard.
 */
export async function GET() {
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

    // 3. Fetch KPI counts in parallel
    const [
      { count: totalUsers, error: usersErr },
      { count: totalSellers, error: sellersErr },
      { count: pendingRequests, error: requestsErr },
      { count: pendingApplications, error: applicationsErr },
      { count: activeAuctions, error: auctionsErr },
      { count: totalOrders, error: ordersErr },
      { data: paidOrders, error: revenueErr }
    ] = await Promise.all([
      // Total profiles
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      // Total sellers (role is 'seller' in DB schema)
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "seller"),
      // Pending verification requests
      supabase.from("seller_verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      // Pending premium auction applications
      supabase.from("auction_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      // Live auctions
      supabase.from("auctions").select("id", { count: "exact", head: true }).eq("status", "live"),
      // Total orders
      supabase.from("orders").select("id", { count: "exact", head: true }),
      // Sum of payment_received amounts
      supabase.from("orders").select("amount").eq("status", "payment_received")
    ]);

    if (usersErr) throw usersErr;
    if (sellersErr) throw sellersErr;
    if (requestsErr) throw requestsErr;
    if (applicationsErr) throw applicationsErr;
    if (auctionsErr) throw auctionsErr;
    if (ordersErr) throw ordersErr;
    if (revenueErr) throw revenueErr;

    const revenue = (paidOrders || []).reduce((sum, o) => sum + Number(o.amount), 0);

    // 4. Fetch recent activity details
    const [
      { data: recentBids },
      { data: recentUsers },
      { data: recentAuctionsData }
    ] = await Promise.all([
      supabase
        .from("bids")
        .select("amount, created_at, profiles:user_id(display_name, email), auctions(title)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("profiles")
        .select("email, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("auctions")
        .select("id, title, status, current_bid, starting_bid, bids(id)")
        .order("created_at", { ascending: false })
        .limit(5)
    ]);

    // Format merged activity logs
    const activities: any[] = [];
    (recentBids || []).forEach(b => {
      const bidderName = (b.profiles as any)?.display_name || (b.profiles as any)?.email?.split("@")[0] || "Bidder";
      activities.push({
        action: "New bid placed",
        detail: `"${(b.auctions as any)?.title || 'Auction'}" — $${Number(b.amount).toLocaleString()} by ${bidderName}`,
        time: b.created_at
      });
    });
    (recentUsers || []).forEach(u => {
      activities.push({
        action: "User registered",
        detail: u.email,
        time: u.created_at
      });
    });
    activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    // Format recent auctions table rows
    const auctionsList = (recentAuctionsData || []).map(a => ({
      name: a.title,
      status: a.status.charAt(0).toUpperCase() + a.status.slice(1),
      bids: a.bids ? a.bids.length : 0,
      highest: a.current_bid ? `$${Number(a.current_bid).toLocaleString()}` : `$${Number(a.starting_bid).toLocaleString()}`
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        totalSellers: totalSellers || 0,
        pendingRequests: pendingRequests || 0,
        pendingApplications: pendingApplications || 0,
        activeAuctions: activeAuctions || 0,
        totalOrders: totalOrders || 0,
        revenue
      },
      recentActivity: activities.slice(0, 6),
      recentAuctions: auctionsList
    });

  } catch (error: any) {
    console.error("❌ Error generating admin stats:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load dashboard metrics." },
      { status: 500 }
    );
  }
}
