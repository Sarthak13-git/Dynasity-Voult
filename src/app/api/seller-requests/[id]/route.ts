import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * PATCH /api/seller-requests/[id]
 * Route for admin review (approval / rejection) of a seller verification request
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify caller is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin privileges required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, rejection_reason, admin_comments } = body;

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status parameter. Must be 'approved' or 'rejected'." },
        { status: 400 }
      );
    }

    // Update the request status
    const { data: updatedRequest, error: updateError } = await supabase
      .from("seller_verification_requests")
      .update({
        status,
        rejection_reason: status === "rejected" ? rejection_reason : null,
        admin_comments,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Note: The trg_handle_seller_verification_approval database trigger will run
    // on update to set role = 'seller' and status = 'active' automatically.
    // To ensure consistency and safety, let's explicitly update the profile if trigger didn't fire,
    // or let it be handled by trigger. The trigger handles it securely.

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (err: any) {
    console.error("Error updating seller request status:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
