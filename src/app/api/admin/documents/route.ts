import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendDocumentVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/documents
 * List all documents uploaded across the platform for curation verification review (Admin-only).
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    // 2. Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Admins only." }, { status: 403 });
    }

    // 3. Fetch all documents, joining artifacts and seller profiles
    const { data: documents, error: fetchError } = await supabase
      .from("artifact_documents")
      .select(`
        *,
        artifacts (
          title,
          thumbnail_url,
          seller_id,
          creation_year,
          calendar_era,
          is_estimated,
          historical_period,
          seller:profiles!seller_id (
            display_name,
            store_name,
            email
          )
        )

      `)
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    return NextResponse.json({
      success: true,
      documents: documents || [],
    });
  } catch (error: any) {
    console.error("❌ Admin documents list error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load verification logs." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/documents
 * Verify or Reject a document uploaded by a seller (Admin-only).
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    // 2. Verify admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: Admins only." }, { status: 403 });
    }

    // 3. Parse request payload
    const body = await request.json();
    const { document_id, action, rejection_reason } = body;

    if (!document_id || !["verify", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: "Missing required parameters." }, { status: 400 });
    }

    if (action === "reject" && !rejection_reason) {
      return NextResponse.json({ success: false, error: "Rejection reason is required." }, { status: 400 });
    }

    // 4. Fetch the target document along with seller metadata
    const { data: docRecord, error: findError } = await supabase
      .from("artifact_documents")
      .select(`
        *,
        artifacts (
          seller_id,
          seller:profiles!seller_id (
            display_name,
            store_name,
            email
          )
        )
      `)
      .eq("id", document_id)
      .maybeSingle();

    if (findError || !docRecord) {
      return NextResponse.json({ success: false, error: "Document record not found." }, { status: 404 });
    }

    const isVerified = action === "verify";
    const updatePayload = {
      is_verified: isVerified,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: isVerified ? null : rejection_reason,
    };

    // 5. Update verification fields
    const { data: updatedDoc, error: updateError } = await supabase
      .from("artifact_documents")
      .update(updatePayload)
      .eq("id", document_id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Failed to update verification status:", updateError);
      return NextResponse.json({ success: false, error: "Database update transaction failed." }, { status: 500 });
    }

    // 6. Send verification result email
    const sellerInfo = (docRecord.artifacts as any)?.seller;
    if (sellerInfo?.email) {
      const sellerEmail = sellerInfo.email;
      const sellerName = sellerInfo.store_name || sellerInfo.display_name || "Seller partner";
      const docTitle = docRecord.title || "Authenticity File";

      await sendDocumentVerificationEmail(sellerEmail, sellerName, docTitle, isVerified, rejection_reason);
      console.log(`✉️ Verification status email dispatched to: ${sellerEmail}`);
    }

    return NextResponse.json({
      success: true,
      document: updatedDoc,
      message: `Document successfully ${isVerified ? "verified" : "rejected"}.`,
    });
  } catch (error: any) {
    console.error("❌ Document review status modification exception:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update review status." },
      { status: 500 }
    );
  }
}
