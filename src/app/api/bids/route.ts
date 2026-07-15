import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  sendBidPlacedNotificationEmail,
  sendOutbidNotificationEmail,
} from "@/lib/email";

/**
 * POST /api/bids
 * Place a new bid on a live auction.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Please sign in to place a bid." },
        { status: 401 }
      );
    }

    // Rate limit check: max 5 bids per 10 seconds per user
    const rateLimitKey = `ratelimit:bids:${user.id}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, 5, "10 s");

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait before placing another bid." },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // 2. Verify role permission (must be seller or admin)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name, status")
      .eq("id", user.id)
      .single();

    if (!profile || profile.status === "suspended") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Your account has been suspended." },
        { status: 403 }
      );
    }

    if (profile.role !== "buyer" && profile.role !== "seller" && profile.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to place bids." },
        { status: 403 }
      );
    }

    // 3. Extract parameters
    const body = await request.json();
    const { auction_id, bid_amount } = body;

    if (!auction_id || !bid_amount) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: auction_id and bid_amount" },
        { status: 400 }
      );
    }

    const numericBidAmount = Number(bid_amount);
    if (isNaN(numericBidAmount) || numericBidAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid bid_amount. Must be a positive number." },
        { status: 400 }
      );
    }

    // 4. Query auction details, checking status and joining artifact for ownership checks
    const { data: auction, error: aucError } = await supabase
      .from("auctions")
      .select(`
        *,
        artifacts:artifact_id (
          id,
          title,
          seller_id,
          seller:profiles!seller_id (
            status
          )
        )
      `)
      .eq("id", auction_id)
      .maybeSingle();

    if (aucError || !auction) {
      return NextResponse.json(
        { success: false, error: "Auction not found" },
        { status: 404 }
      );
    }

    const sellerStatus = (auction.artifacts as any)?.seller?.status;
    if (sellerStatus === "suspended") {
      return NextResponse.json(
        { success: false, error: "Bidding failed: The seller account for this artifact has been suspended." },
        { status: 403 }
      );
    }

    const now = new Date();
    const startTime = new Date(auction.start_time);
    const endTime = new Date(auction.end_time);

    const isUpcomingButStarted = auction.status === "upcoming" && now >= startTime && now < endTime;

    if (auction.status !== "live" && !isUpcomingButStarted) {
      return NextResponse.json(
        { success: false, error: `Auction is not live (Status: ${auction.status}). Bids cannot be placed.` },
        { status: 400 }
      );
    }

    if (now < startTime) {
      return NextResponse.json(
        { success: false, error: "Bidding has not started yet for this auction." },
        { status: 400 }
      );
    }

    if (now > endTime) {
      return NextResponse.json(
        { success: false, error: "This auction has already ended." },
        { status: 400 }
      );
    }

    // Prevent sellers from bidding on their own listings
    const artifactSellerId = (auction.artifacts as any)?.seller_id;
    if (artifactSellerId === user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot bid on your own artifact" },
        { status: 403 }
      );
    }

    // 5. Enforce minimum bid requirements
    const currentHighest = auction.current_bid || auction.starting_bid;
    const minRequiredBid = auction.current_bid
      ? auction.current_bid + (auction.bid_increment || 100)
      : auction.starting_bid;

    if (numericBidAmount < minRequiredBid) {
      return NextResponse.json(
        {
          success: false,
          error: `Bid amount must be at least $${minRequiredBid.toLocaleString()}`,
        },
        { status: 400 }
      );
    }

    // 6. Record previous highest bidder details before inserting the new bid (for outbid email)
    let previousBidderProfile: any = null;
    if (auction.highest_bidder_id && auction.highest_bidder_id !== user.id) {
      const { data: prevProfile } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("id", auction.highest_bidder_id)
        .maybeSingle();
      previousBidderProfile = prevProfile;
    }

    // 7. Insert the new bid record (which runs trigger validation, auto-activation, and updates the auction)
    const { data: newBid, error: insertError } = await supabase
      .from("bids")
      .insert({
        auction_id,
        user_id: user.id,
        amount: numericBidAmount,
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 9. Send email notifications asynchronously (fire-and-forget)
    const origin = request.headers.get("origin") || request.headers.get("referer") || "https://dynasity-voult.com";
    const originUrl = origin.endsWith("/") ? origin.slice(0, -1) : origin;
    const auctionUrl = `${originUrl}/auctions/${auction_id}`;
    const artifactTitle = (auction.artifacts as any)?.title || "Artifact";

    (async () => {
      try {
        // Email 1: Notify the new highest bidder (current user)
        const email1Res = await sendBidPlacedNotificationEmail(
          user.email || "",
          profile.display_name || "Bidder",
          artifactTitle,
          numericBidAmount,
          auctionUrl
        );

        if (email1Res.success) {
          console.log(`✅ Bid placed email sent to ${user.email}. Msg ID: ${email1Res.messageId}`);
        } else {
          console.error(`❌ Failed to send bid placed email to ${user.email}:`, email1Res.error);
        }

        // Email 2: Notify previous highest bidder of outbid alert (if exists)
        if (previousBidderProfile?.email) {
          const email2Res = await sendOutbidNotificationEmail(
            previousBidderProfile.email,
            previousBidderProfile.display_name || "Bidder",
            artifactTitle,
            numericBidAmount,
            auctionUrl
          );

          if (email2Res.success) {
            console.log(`✅ Outbid email sent to ${previousBidderProfile.email}. Msg ID: ${email2Res.messageId}`);
          } else {
            console.error(`❌ Failed to send outbid email to ${previousBidderProfile.email}:`, email2Res.error);
          }
        }
      } catch (emailErr: any) {
        console.error("❌ Unexpected error in bid webhook notification dispatch:", emailErr);
      }
    })();

    // 10. Return success with the new bid record details
    return NextResponse.json({
      success: true,
      message: "Bid placed successfully.",
      bid: newBid,
    });
  } catch (error: any) {
    console.error("❌ Error placing bid:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to place bid." },
      { status: 500 }
    );
  }
}
