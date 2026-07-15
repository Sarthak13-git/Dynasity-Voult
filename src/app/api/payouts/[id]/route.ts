import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendPayoutStatusEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/payouts/[id]
 * Process or override status of a single payout request (admin-only).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: payoutId } = await params;
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

    // 3. Fetch payout details
    const { data: payout, error: payoutErr } = await supabase
      .from("payouts")
      .select("*")
      .eq("id", payoutId)
      .single();

    if (payoutErr || !payout) {
      return NextResponse.json(
        { success: false, error: "Payout transaction record not found." },
        { status: 404 }
      );
    }

    // 4. Fetch seller profile details
    const { data: seller, error: sellerErr } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", payout.seller_id)
      .single();

    if (sellerErr || !seller) {
      return NextResponse.json(
        { success: false, error: "Associated seller profile not found." },
        { status: 404 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const { action, notes } = body;
    const nowStr = new Date().toISOString();

    if (action && ["approve", "reject", "mark_processing", "mark_completed"].includes(action)) {
      let targetStatus = "pending";
      if (action === "approve") targetStatus = "approved";
      if (action === "reject") targetStatus = "rejected";
      if (action === "mark_processing") targetStatus = "processing";
      if (action === "mark_completed") targetStatus = "completed";

      const auditLog = `[${nowStr}] Action: ${action.toUpperCase()} by Admin (${user.email}). Remarks: ${notes || "None"}`;
      const newNotes = payout.notes ? `${payout.notes}\n${auditLog}` : auditLog;

      const updateFields: any = {
        status: targetStatus,
        notes: newNotes,
        updated_at: nowStr
      };

      if (targetStatus === "completed") {
        updateFields.processed_at = nowStr;
      }

      const { data: updatedPayout, error: updateErr } = await supabase
        .from("payouts")
        .update(updateFields)
        .eq("id", payoutId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Send status email to seller
      try {
        await sendPayoutStatusEmail(
          seller.email,
          seller.display_name || "Antiquarian Partner",
          payoutId,
          Number(payout.amount),
          targetStatus,
          notes || undefined
        );
      } catch (emailErr) {
        console.error("❌ Failed to send payout status email:", emailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Payout successfully updated to ${targetStatus}.`,
        payout: updatedPayout
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid payout override action specified." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("❌ Exception during payout processing:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process payout." },
      { status: 500 }
    );
  }
}
