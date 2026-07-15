import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/seller-requests
 * Fetch verification requests. Admins see all, users see their own.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    let query = supabase.from("seller_verification_requests").select("*");

    if (profile?.role === "admin") {
      if (statusFilter) {
        query = query.eq("status", statusFilter);
      }
    } else {
      query = query.eq("user_id", user.id);
    }

    // Order by newest first
    const { data: requests, error: queryError } = await query.order("created_at", { ascending: false });

    if (queryError) {
      throw queryError;
    }

    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    console.error("Error fetching seller requests:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/seller-requests
 * Submit a new seller verification request
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      legal_name,
      store_name,
      phone,
      email,
      country,
      address,
      city,
      postal_code,
      government_id_url,
      address_proof_url,
      selfie_verification_url,
      tax_id,
      bank_account,
      seller_agreement_accepted,
      permanent_ban_acknowledgement,
    } = body;

    // Validation
    if (
      !legal_name ||
      !store_name ||
      !phone ||
      !email ||
      !country ||
      !address ||
      !city ||
      !postal_code ||
      !government_id_url ||
      !address_proof_url ||
      !selfie_verification_url ||
      !tax_id ||
      !bank_account ||
      !seller_agreement_accepted ||
      !permanent_ban_acknowledgement
    ) {
      return NextResponse.json(
        { error: "Missing required fields or acknowledgements." },
        { status: 400 }
      );
    }

    // 1. Create verification request row in pending state
    const { data: verificationRequest, error: insertError } = await supabase
      .from("seller_verification_requests")
      .insert({
        user_id: user.id,
        legal_name,
        store_name,
        phone,
        email,
        country,
        address,
        city,
        postal_code,
        government_id_url,
        address_proof_url,
        selfie_verification_url,
        tax_id,
        bank_account,
        seller_agreement_accepted,
        permanent_ban_acknowledgement,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Helper to register file metadata in artifact_documents
    const registerDoc = async (url: string, type: string) => {
      const fileName = url.split("/").pop() || "document";
      const { error } = await supabase.from("artifact_documents").insert({
        user_id: user.id,
        document_type: type,
        file_url: url,
        file_name: fileName,
        file_size: 0, // client is not required to pass sizes
        uploaded_by: user.id,
      });
      if (error) console.error(`Failed to register ${type} metadata:`, error);
    };

    // 2. Register verification documents in artifact_documents
    await registerDoc(government_id_url, "government_id");
    await registerDoc(address_proof_url, "address_proof");
    await registerDoc(selfie_verification_url, "selfie_verification");

    return NextResponse.json({ success: true, data: verificationRequest });
  } catch (err: any) {
    console.error("Error creating verification request:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
