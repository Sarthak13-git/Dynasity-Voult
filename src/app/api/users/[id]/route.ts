import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/[id]
 * Fetch full profile details and metrics for a single user (admin-only).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
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

    // 3. Fetch user profile details
    const { data: targetProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileErr || !targetProfile) {
      return NextResponse.json(
        { success: false, error: "User profile not found." },
        { status: 404 }
      );
    }

    // 4. Aggregate platform activity stats in parallel
    const [
      { count: bidsCount },
      { count: ordersCount },
      { count: artifactsCount },
      { data: sellerArtifacts }
    ] = await Promise.all([
      supabase.from("bids").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("artifacts").select("*", { count: "exact", head: true }).eq("seller_id", userId),
      supabase.from("artifacts").select("id").eq("seller_id", userId)
    ]);

    // Calculate auctions created
    let auctionsCount = 0;
    const artifactIds = (sellerArtifacts || []).map((art) => art.id);
    if (artifactIds.length > 0) {
      const { count } = await supabase
        .from("auctions")
        .select("*", { count: "exact", head: true })
        .in("artifact_id", artifactIds);
      auctionsCount = count || 0;
    }

    return NextResponse.json({
      success: true,
      user: {
        ...targetProfile,
        stats: {
          bids: bidsCount || 0,
          orders: ordersCount || 0,
          artifacts: artifactsCount || 0,
          auctions: auctionsCount || 0,
        },
      },
    });
  } catch (error: any) {
    console.error("❌ Error fetching user details:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve user details." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users/[id]
 * Update status (active/suspended) or role (buyer/seller/admin) for a single user (admin-only).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
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

    // 3. Parse and validate payload parameters
    const { status, role, reason } = await request.json();

    const updates: Record<string, any> = {};

    if (status !== undefined) {
      if (status !== "active" && status !== "suspended") {
        return NextResponse.json(
          { success: false, error: "Invalid status parameter. Must be 'active' or 'suspended'." },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (role !== undefined) {
      if (role !== "buyer" && role !== "seller" && role !== "admin") {
        return NextResponse.json(
          { success: false, error: "Invalid role parameter. Must be 'buyer', 'seller', or 'admin'." },
          { status: 400 }
        );
      }
      updates.role = role;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid update fields provided. Please specify status or role." },
        { status: 400 }
      );
    }

    // Fetch user details for notification dispatches
    const { data: targetUser } = await supabase
      .from("profiles")
      .select("email, display_name, role, status")
      .eq("id", userId)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 }
      );
    }

    // Save changes
    const { data: updatedProfile, error: dbError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (dbError) throw dbError;

    // 4. Simulate sending Email Notifications
    const emailTo = targetUser.email;
    const name = targetUser.display_name || "User";

    if (status !== undefined && status !== targetUser.status) {
      if (status === "suspended") {
        const banReason = reason || "Violation of platform policies";
        console.log(`📧 React Email Alert: Send to ${emailTo}`);
        console.log(`Subject: Your Dynasity-Voult account has been suspended`);
        console.log(`Body: Hello ${name},\n\nYour account has been suspended. Reason: ${banReason}\n\nIf you believe this is a mistake, contact support.`);
      } else if (status === "active") {
        console.log(`📧 React Email Alert: Send to ${emailTo}`);
        console.log(`Subject: Your Dynasity-Voult account has been reactivated`);
        console.log(`Body: Hello ${name},\n\nYour account has been reactivated. You may resume bidding and listing items on the house market.`);
      }
    }

    if (role !== undefined && role !== targetUser.role) {
      console.log(`📧 React Email Alert: Send to ${emailTo}`);
      console.log(`Subject: Your account role has been updated on Dynasity-Voult`);
      console.log(`Body: Hello ${name},\n\nYour role has been changed to "${role}". Please log in to view updated console permissions.`);
    }

    return NextResponse.json({
      success: true,
      message: "User status/role updated successfully.",
      user: updatedProfile,
    });
  } catch (error: any) {
    console.error("❌ Error updating user:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update user parameters." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * User deletions are explicitly disallowed to retain audit logs.
 */
export async function DELETE() {
  return NextResponse.json(
    { success: false, error: "Deletions are not permitted on user accounts. Please use status suspension instead to preserve transaction history and logs." },
    { status: 405 }
  );
}
