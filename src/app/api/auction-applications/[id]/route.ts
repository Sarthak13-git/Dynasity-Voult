import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  sendAuctionApplicationApprovedEmail,
  sendAuctionApplicationRejectedEmail,
} from "@/lib/email";

interface PatchApplicationBody {
  status: "approved" | "rejected";
  rejection_reason?: string;
  admin_comments?: string;
}

/**
 * PATCH /api/auction-applications/[id]
 * Review (approve or reject) a seller's auction application.
 * Admin-only endpoint.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await (params as any);

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing application ID." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: You must be logged in." },
        { status: 401 }
      );
    }

    // Verify user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only admins can review auction applications." },
        { status: 403 }
      );
    }

    const body: PatchApplicationBody = await request.json();
    const { status, rejection_reason, admin_comments } = body;

    if (!status || (status !== "approved" && status !== "rejected")) {
      return NextResponse.json(
        { success: false, error: "Invalid status. Must be 'approved' or 'rejected'." },
        { status: 400 }
      );
    }

    if (status === "rejected" && !rejection_reason?.trim()) {
      return NextResponse.json(
        { success: false, error: "Rejection reason is required for rejection status." },
        { status: 400 }
      );
    }

    // Fetch existing application to verify it exists and is still pending (or we allow editing)
    const { data: application, error: selectError } = await supabase
      .from("auction_applications")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (selectError || !application) {
      return NextResponse.json(
        { success: false, error: "Application not found." },
        { status: 404 }
      );
    }

    // Perform update
    const updatePayload: any = {
      status,
      admin_comments: admin_comments || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (status === "rejected") {
      updatePayload.rejection_reason = rejection_reason;

      // Revert artifact status to available
      const { error: artUpdateError } = await supabase
        .from("artifacts")
        .update({ status: "available" })
        .eq("id", application.artifact_id);

      if (artUpdateError) {
        console.error("❌ Failed to revert artifact status to available on rejection:", artUpdateError);
        throw artUpdateError;
      }
    } else {
      updatePayload.rejection_reason = null; // Clear rejection reason if approved
    }

    const { data: updatedApp, error: updateError } = await supabase
      .from("auction_applications")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // --- INTEGRATE RESEND EMAIL NOTIFICATIONS ---
    // Perform detailed data retrieval to obtain seller details and artifact title.
    // Executed asynchronously in a fire-and-forget manner to prevent blocking the API response.
    (async () => {
      try {
        const { data: appDetail, error: detailError } = await supabase
          .from("auction_applications")
          .select(`
            *,
            artifacts:artifact_id (
              id,
              title
            ),
            profiles:seller_id (
              display_name,
              email
            )
          `)
          .eq("id", id)
          .maybeSingle();

        if (detailError || !appDetail) {
          console.error("❌ Error fetching application details for email:", detailError);
          return;
        }

        const sellerEmail = (appDetail.profiles as any)?.email;
        const sellerName = (appDetail.profiles as any)?.display_name || "Seller";
        const artifactTitle = (appDetail.artifacts as any)?.title || "Artifact";

        const origin = request.headers.get("origin") || request.headers.get("referer") || "https://dynasity-voult.com";
        const originUrl = origin.endsWith("/") ? origin.slice(0, -1) : origin;

        if (status === "approved") {
          // Look up if the auction has been registered
          const { data: auction, error: dbErr } = await supabase
            .from("auctions")
            .select("id, start_time")
            .eq("artifact_id", (appDetail.artifacts as any).id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (dbErr) {
            console.error("❌ Database error fetching auction in email flow:", dbErr);
          }

          const auctionId = auction?.id || "scheduled";
          const auctionUrl = `${originUrl}/auctions/${auctionId}`;
          const auctionStartTime = auction?.start_time
            ? new Date(auction.start_time).toLocaleString()
            : new Date(Date.now() + 60 * 60 * 1000).toLocaleString(); // Default +1 hour

          const emailRes = await sendAuctionApplicationApprovedEmail(
            sellerEmail,
            sellerName,
            artifactTitle,
            auctionStartTime,
            auctionUrl
          );

          if (emailRes.success) {
            console.log(`✅ Approved email sent for application ${id}. Msg ID: ${emailRes.messageId}`);
          } else {
            console.error(`❌ Failed to send approved email for application ${id}:`, emailRes.error);
          }
        } else if (status === "rejected") {
          const emailRes = await sendAuctionApplicationRejectedEmail(
            sellerEmail,
            sellerName,
            artifactTitle,
            rejection_reason || "No explanation provided by curation board review."
          );

          if (emailRes.success) {
            console.log(`✅ Rejected email sent for application ${id}. Msg ID: ${emailRes.messageId}`);
          } else {
            console.error(`❌ Failed to send rejected email for application ${id}:`, emailRes.error);
          }
        }
      } catch (err: any) {
        console.error("❌ Unexpected error in fire-and-forget email dispatch:", err);
      }
    })();
    // --------------------------------------------

    return NextResponse.json({
      success: true,
      message: `Application has been successfully ${status}.`,
      application: updatedApp,
    });
  } catch (error: any) {
    console.error("❌ Error reviewing auction application:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to review auction application." },
      { status: 500 }
    );
  }
}
