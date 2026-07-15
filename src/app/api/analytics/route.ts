import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics
 * Owner analytics API dashboard backend. Admin restricted.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in." },
        { status: 401 }
      );
    }

    // Verify user profile role is admin
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

    // Fetch data in parallel for efficiency
    const [
      { data: orders, error: ordersError },
      { data: profiles, error: profilesError },
      { data: auctions, error: auctionsError },
      { data: bids, error: bidsError },
      { data: artifacts, error: artifactsError }
    ] = await Promise.all([
      supabase.from("orders").select("id, amount, status, created_at, user_id, artifact_id"),
      supabase.from("profiles").select("id, created_at, display_name, email"),
      supabase.from("auctions").select("id, status, winner_id"),
      supabase.from("bids").select("id, user_id, amount, created_at, profiles:user_id(display_name, email)"),
      supabase.from("artifacts").select("id, title, estimated_value, currency, category, thumbnail_url").not("seller_id", "is", null).order("estimated_value", { ascending: false }).limit(5)
    ]);

    if (ordersError) throw ordersError;
    if (profilesError) throw profilesError;
    if (auctionsError) throw auctionsError;
    if (bidsError) throw bidsError;
    if (artifactsError) throw artifactsError;

    // 1. Calculate KPI Metrics
    const totalRevenue = (orders || [])
      .filter((o) => o.status === "payment_received")
      .reduce((sum, o) => sum + Number(o.amount), 0);

    const totalUsers = (profiles || []).length;
    const totalAuctions = (auctions || []).length;
    const activeAuctions = (auctions || []).filter((a) => a.status === "live").length;
    const totalOrders = (orders || []).length;
    const pendingOrders = (orders || []).filter((o) => o.status === "pending").length;

    // 2. Revenue by Month (last 12 months)
    const monthlyRevenueMap: Record<string, number> = {};
    const monthsArray: string[] = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
      monthsArray.push(label);
      monthlyRevenueMap[label] = 0;
    }

    (orders || [])
      .filter((o) => o.status === "payment_received")
      .forEach((o) => {
        const d = new Date(o.created_at);
        const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
        if (monthlyRevenueMap[label] !== undefined) {
          monthlyRevenueMap[label] += Number(o.amount);
        }
      });

    const revenueByMonth = monthsArray.map((month) => ({
      name: month,
      revenue: monthlyRevenueMap[month],
    }));

    // 3. Auction Success Rate (ended auctions with winner vs no winner)
    const endedAuctions = (auctions || []).filter((a) => a.status === "ended");
    const successfulAuctionsCount = endedAuctions.filter((a) => a.winner_id !== null).length;
    const failedAuctionsCount = endedAuctions.filter((a) => a.winner_id === null).length;

    const auctionSuccessRate = [
      { name: "Successful (Winner)", value: successfulAuctionsCount },
      { name: "Unsuccessful (No Winner)", value: failedAuctionsCount },
    ];

    // 4. Orders by Status
    const orderStatusCounts: Record<string, number> = {
      pending: 0,
      payment_received: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    (orders || []).forEach((o) => {
      if (orderStatusCounts[o.status] !== undefined) {
        orderStatusCounts[o.status] += 1;
      }
    });

    const statusLabelMap: Record<string, string> = {
      pending: "Pending",
      payment_received: "Paid",
      shipped: "Shipped",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };

    const ordersByStatus = Object.keys(orderStatusCounts).map((status) => ({
      status: statusLabelMap[status] || status,
      count: orderStatusCounts[status],
    }));

    // 5. User Growth (new users per week for the last 12 weeks)
    const weeksArray: { label: string; start: Date; end: Date; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const startStr = start.toLocaleString("default", { month: "short", day: "numeric" });
      const endStr = end.toLocaleString("default", { month: "short", day: "numeric" });
      weeksArray.push({
        label: `${startStr} - ${endStr}`,
        start,
        end,
        count: 0,
      });
    }

    (profiles || []).forEach((p) => {
      const cDate = new Date(p.created_at);
      const week = weeksArray.find((w) => cDate >= w.start && cDate < w.end);
      if (week) {
        week.count += 1;
      }
    });

    const userGrowth = weeksArray.map((w) => ({
      week: w.label,
      users: w.count,
    }));

    // 6. Recent Orders (last 10 orders with buyer details and artifact title)
    const { data: recentOrdersDetails, error: recentError } = await supabase
      .from("orders")
      .select(`
        id,
        amount,
        currency,
        status,
        created_at,
        profiles:user_id (display_name, email),
        artifacts:artifact_id (title, thumbnail_url)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    // 7. Top Bidders (users with most bids placed)
    const bidderCountsMap: Record<string, { display_name: string; email: string; count: number }> = {};
    (bids || []).forEach((b) => {
      const uId = b.user_id;
      const profileInfo = b.profiles as any;
      const name = profileInfo?.display_name || "Unknown Bidder";
      const email = profileInfo?.email || "";
      if (!bidderCountsMap[uId]) {
        bidderCountsMap[uId] = { display_name: name, email, count: 0 };
      }
      bidderCountsMap[uId].count += 1;
    });

    const topBidders = Object.values(bidderCountsMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          totalRevenue,
          totalUsers,
          totalAuctions,
          activeAuctions,
          totalOrders,
          pendingOrders,
        },
        charts: {
          revenueByMonth,
          auctionSuccessRate,
          ordersByStatus,
          userGrowth,
        },
        tables: {
          topExpensiveItems: artifacts || [],
          recentOrders: recentOrdersDetails || [],
          topBidders,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Error generating analytics:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate analytics." },
      { status: 500 }
    );
  }
}
