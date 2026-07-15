import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendPayoutStatusEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * POST /api/payouts/withdraw
 * Create a new withdrawal request for a seller.
 */
export async function POST(request: Request) {
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

    // 2. Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email, display_name")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found." },
        { status: 404 }
      );
    }

    const isSeller = profile.role === "seller" || profile.role === "admin";
    if (!isSeller) {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only sellers can request withdrawals." },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const { amount: rawAmount, bank_account, upi, notes } = body;
    const amount = parseFloat(rawAmount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid withdrawal amount specified." },
        { status: 400 }
      );
    }

    if (!bank_account && !upi) {
      return NextResponse.json(
        { success: false, error: "Please provide either a bank account number or a UPI ID." },
        { status: 400 }
      );
    }

    // 4. Query all unpaid earnings where order status = 'delivered'
    const { data: earnings, error: earnError } = await supabase
      .from("seller_earnings")
      .select(`
        id,
        net_amount,
        created_at,
        orders!inner (
          status
        )
      `)
      .eq("seller_id", user.id)
      .is("payout_id", null)
      .eq("orders.status", "delivered");

    if (earnError) throw earnError;

    const availableBalance = (earnings || []).reduce((sum, e) => sum + Number(e.net_amount), 0);

    // 5. Validation check
    if (amount > availableBalance) {
      return NextResponse.json(
        { success: false, error: `Insufficient withdrawable balance. Available: $${availableBalance.toFixed(2)} USD` },
        { status: 400 }
      );
    }

    // 6. Create payout request record
    const { data: newPayout, error: payoutErr } = await supabase
      .from("payouts")
      .insert({
        seller_id: user.id,
        amount: amount,
        currency: "USD",
        status: "pending",
        bank_account: bank_account || null,
        upi: upi || null,
        notes: notes || "Seller custom requested payout withdrawal",
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (payoutErr) throw payoutErr;

    // 7. Associate/Link earnings to this payout record sequentially
    let accumulated = 0;
    const earningIdsToLink = [];
    
    // Sort earnings chronologically (earliest first)
    const sortedEarnings = [...(earnings || [])].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const earn of sortedEarnings) {
      earningIdsToLink.push(earn.id);
      accumulated += Number(earn.net_amount);
      if (accumulated >= amount) break;
    }

    if (earningIdsToLink.length > 0) {
      const { error: linkErr } = await supabase
        .from("seller_earnings")
        .update({ payout_id: newPayout.id })
        .in("id", earningIdsToLink);

      if (linkErr) {
        // Rollback created payout if linking fails
        await supabase.from("payouts").delete().eq("id", newPayout.id);
        throw linkErr;
      }
    }

    // 8. Trigger "Payout Requested" email to seller
    try {
      await sendPayoutStatusEmail(
        profile.email,
        profile.display_name || "Antiquarian Partner",
        newPayout.id,
        amount,
        "pending",
        notes || undefined
      );
    } catch (emailErr) {
      console.error("❌ Failed to send Payout Requested email notification:", emailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully. An administrator will review your request.",
      payout: newPayout,
    });
  } catch (error: any) {
    console.error("❌ Error requesting withdrawal:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process withdrawal request." },
      { status: 500 }
    );
  }
}
