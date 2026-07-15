import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendAuctionWonEmail, sendAuctionLostEmail } from "@/lib/email";

/**
 * GET /api/auctions/settle
 * Admin-only endpoint to fetch settled auctions and dispatch notification emails.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate session user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please log in." },
        { status: 401 }
      );
    }

    // 2. Authorize admin privileges
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Admin access required." },
        { status: 403 }
      );
    }

    // 3. Query all auctions that ended but have not sent settlement emails yet
    const { data: endedAuctions, error: selectError } = await supabase
      .from("auctions")
      .select(`
        *,
        artifacts:artifact_id (
          id,
          title
        )
      `)
      .eq("status", "ended")
      .eq("emails_sent", false);

    if (selectError) {
      throw selectError;
    }

    let emailsSentCount = 0;
    const origin = request.headers.get("origin") || request.headers.get("referer") || "https://dynasity-voult.com";
    const originUrl = origin.endsWith("/") ? origin.slice(0, -1) : origin;

    // 4. Process each ended auction
    for (const auction of (endedAuctions || [])) {
      const artifactId = auction.artifact_id;
      const artifactTitle = (auction.artifacts as any)?.title || "Premium Artifact";
      const finalBid = auction.current_bid || auction.starting_bid;

      // Case A: Auction ended with a winning bidder
      if (auction.winner_id) {
        // Query winner profile email
        const { data: winnerProfile } = await supabase
          .from("profiles")
          .select("display_name, email")
          .eq("id", auction.winner_id)
          .maybeSingle();

        // Query all bids for this auction to notify other participants
        const { data: bids } = await supabase
          .from("bids")
          .select(`
            user_id,
            profiles:user_id (
              display_name,
              email
            )
          `)
          .eq("auction_id", auction.id);

        // Filter out unique bidders who lost (excludes the winner)
        const loserBidders = new Map<string, { name: string; email: string }>();
        if (bids) {
          bids.forEach((bid: any) => {
            if (bid.user_id !== auction.winner_id && bid.profiles) {
              loserBidders.set(bid.user_id, {
                name: bid.profiles.display_name || "Bidder",
                email: bid.profiles.email,
              });
            }
          });
        }

        // Send Won Email to winner
        if (winnerProfile?.email) {
          const checkoutUrl = `${originUrl}/checkout?artifact_id=${artifactId}&auction_id=${auction.id}`;
          const winnerName = winnerProfile.display_name || "Winner";
          
          const wonRes = await sendAuctionWonEmail(
            winnerProfile.email,
            winnerName,
            artifactTitle,
            finalBid,
            checkoutUrl
          );
          if (wonRes.success) emailsSentCount++;
        }

        // Send Lost Email to other bidders
        for (const [_, loser] of loserBidders.entries()) {
          if (loser.email) {
            const lostRes = await sendAuctionLostEmail(
              loser.email,
              loser.name,
              artifactTitle,
              finalBid
            );
            if (lostRes.success) emailsSentCount++;
          }
        }
      }

      // 5. Mark auction as emails sent so we don't duplicate
      const { error: updateError } = await supabase
        .from("auctions")
        .update({
          emails_sent: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", auction.id);

      if (updateError) {
        console.error(`❌ Error setting emails_sent status for auction ${auction.id}:`, updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${endedAuctions?.length || 0} ended auctions.`,
      emailsSent: emailsSentCount,
    });

  } catch (error: any) {
    console.error("❌ Error in auctions settlement email route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process settlement emails." },
      { status: 500 }
    );
  }
}
