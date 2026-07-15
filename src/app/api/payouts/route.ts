import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/payouts
 * Fetch earning summaries and lists grouped by seller (admin-only).
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

    // 2. Verify role = admin
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

    // 3. Query all seller earnings joined with profile name
    const { data: earnings, error: earnError } = await supabase
      .from("seller_earnings")
      .select(`
        *,
        profiles:seller_id (display_name, email)
      `);

    if (earnError) throw earnError;

    // 4. Query all payouts to match status
    const { data: payouts, error: payoutsErr } = await supabase
      .from("payouts")
      .select(`
        *,
        profiles:seller_id (display_name, email)
      `)
      .order("created_at", { ascending: false });

    if (payoutsErr) throw payoutsErr;

    // 5. Aggregate in memory
    const sellerSummaries: Record<string, any> = {};
    (earnings || []).forEach((earn) => {
      const sId = earn.seller_id;
      const prof = earn.profiles as any;
      const name = prof?.display_name || prof?.email || "Unknown Seller";
      const email = prof?.email || "";

      if (!sellerSummaries[sId]) {
        sellerSummaries[sId] = {
          seller_id: sId,
          seller_name: name,
          seller_email: email,
          total_gross: 0,
          total_commission: 0,
          total_net: 0,
          available_to_withdraw: 0,
        };
      }

      sellerSummaries[sId].total_gross += Number(earn.gross_amount);
      sellerSummaries[sId].total_commission += Number(earn.commission_amount);
      sellerSummaries[sId].total_net += Number(earn.net_amount);

      if (!earn.payout_id) {
        sellerSummaries[sId].available_to_withdraw += Number(earn.net_amount);
      }
    });

    return NextResponse.json({
      success: true,
      summaries: Object.values(sellerSummaries),
      payouts: payouts || [],
    });
  } catch (error: any) {
    console.error("❌ Error fetching payouts:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch payouts." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payouts
 * Create a new payout batch (admin-only).
 * Resolves sellers with pending withdrawable balance >= $100 and creates pending payouts.
 */
export async function POST() {
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

    // 2. Fetch user profile role
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

    const isAdmin = profile.role === "admin";

    // 3. Query unpaid earnings
    let query = supabase
      .from("seller_earnings")
      .select("*")
      .is("payout_id", null);

    // If not admin, restrict to self
    if (!isAdmin) {
      query = query.eq("seller_id", user.id);
    }

    const { data: unpaidEarnings, error: earnError } = await query;
    if (earnError) throw earnError;

    // Group earnings by seller
    const sellerEarningsMap: Record<string, typeof unpaidEarnings> = {};
    (unpaidEarnings || []).forEach((earn) => {
      const sId = earn.seller_id;
      if (!sellerEarningsMap[sId]) {
        sellerEarningsMap[sId] = [];
      }
      sellerEarningsMap[sId].push(earn);
    });

    const createdPayouts = [];
    const nowStr = new Date().toISOString();

    // 4. Loop over sellers, check if balance >= $100
    for (const [sellerId, earningsList] of Object.entries(sellerEarningsMap)) {
      const totalNet = earningsList.reduce((sum, e) => sum + Number(e.net_amount), 0);

      if (totalNet >= 100) {
        // Find date range
        const dates = earningsList.map((e) => new Date(e.created_at).getTime());
        const minDate = new Date(Math.min(...dates)).toISOString().slice(0, 10);
        const maxDate = new Date(Math.max(...dates)).toISOString().slice(0, 10);

        // A. Insert Payout record
        const { data: newPayout, error: payoutErr } = await supabase
          .from("payouts")
          .insert({
            seller_id: sellerId,
            amount: totalNet,
            currency: "USD",
            status: "pending",
            period_start: minDate,
            period_end: maxDate,
            created_at: nowStr,
            notes: isAdmin ? "Automatic payout batch creation" : "Seller self-requested payout",
          })
          .select()
          .single();

        if (payoutErr) {
          console.error(`❌ Failed to create payout for seller ${sellerId}:`, payoutErr);
          continue;
        }

        // B. Link seller earnings to payout_id
        const earningIds = earningsList.map((e) => e.id);
        const { error: linkErr } = await supabase
          .from("seller_earnings")
          .update({ payout_id: newPayout.id })
          .in("id", earningIds);

        if (linkErr) {
          console.error(`❌ Failed to link earnings to payout ${newPayout.id}:`, linkErr);
          // Rollback the created payout
          await supabase.from("payouts").delete().eq("id", newPayout.id);
          continue;
        }

        createdPayouts.push(newPayout);
      }
    }

    if (createdPayouts.length === 0) {
      return NextResponse.json(
        { success: false, error: "Withdrawable balance must be at least $100.00 to request a payout." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: isAdmin 
        ? `Successfully generated ${createdPayouts.length} pending payouts.`
        : "Payout requested successfully. An administrator will review and process it.",
      payouts: createdPayouts,
    });
  } catch (error: any) {
    console.error("❌ Error generating payout batch:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create payout batch." },
      { status: 500 }
    );
  }
}
