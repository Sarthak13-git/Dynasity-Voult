import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import Stripe from "stripe";
import { getBaseUrl } from "@/lib/get-base-url";

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_for_build", {
  apiVersion: "2023-10-16" as any,
});

/**
 * POST /api/checkout
 * Create a Stripe checkout session for direct buys or auction wins.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: You must be logged in to checkout." },
        { status: 401 }
      );
    }

    // Rate limit check: max 5 checkout requests per 30 seconds per user
    const rateLimitKey = `ratelimit:checkout:${user.id}`;
    const rateLimitResult = await checkRateLimit(rateLimitKey, 5, "30 s");

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait before attempting checkout again." },
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

    // Check if buyer profile is suspended
    const { data: buyerProfile } = await supabase
      .from("profiles")
      .select("status")
      .eq("id", user.id)
      .maybeSingle();

    if (buyerProfile?.status === "suspended") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Your account has been suspended." },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { artifact_id, auction_id } = body;

    if (!artifact_id) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: artifact_id" },
        { status: 400 }
      );
    }

    const { data: artifact, error: artError } = await supabase
      .from("artifacts")
      .select(`
        *,
        seller:profiles!seller_id (
          status
        )
      `)
      .eq("id", artifact_id)
      .not("seller_id", "is", null)
      .maybeSingle();

    if (artError || !artifact || (artifact.seller as any)?.status === "suspended") {
      return NextResponse.json(
        { success: false, error: "Artifact not found or invalid" },
        { status: 404 }
      );
    }

    // Prevent seller from purchasing their own item
    if (artifact.seller_id === user.id) {
      return NextResponse.json(
        { success: false, error: "You cannot purchase your own artifact" },
        { status: 403 }
      );
    }

    let price = 0;

    // 4. Validate auction win if auction_id is provided
    if (auction_id) {
      const { data: auction, error: aucError } = await supabase
        .from("auctions")
        .select("*")
        .eq("id", auction_id)
        .maybeSingle();

      if (aucError || !auction || auction.status !== "ended") {
        return NextResponse.json(
          { success: false, error: "Auction not found or not ended" },
          { status: 400 }
        );
      }

      // Check if user is the actual winner of the auction
      if (auction.winner_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Only the auction winner can checkout" },
          { status: 403 }
        );
      }

      if (auction.current_bid === null || auction.current_bid === undefined) {
        return NextResponse.json(
          { success: false, error: "Auction ended without any valid bids" },
          { status: 400 }
        );
      }

      price = Number(auction.current_bid);
    } else {
      // 5. Validate direct buy
      if (artifact.status !== "available" || !artifact.buy_now_price) {
        return NextResponse.json(
          { success: false, error: "Artifact not available for purchase" },
          { status: 400 }
        );
      }

      price = Number(artifact.buy_now_price);
    }

    // 6. Calculate origin from request headers — never fall back to hardcoded localhost
    const origin = request.headers.get("origin") || request.headers.get("referer") || getBaseUrl();
    const originUrl = origin.endsWith("/") ? origin.slice(0, -1) : origin;

    // 7. Insert the pending order into the orders table first to get order_id
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        artifact_id,
        auction_id: auction_id || null,
        amount: price,
        currency: artifact.currency || "USD",
        status: "pending",
        payment_intent_id: "pending_stripe_session", // Temporary placeholder to be updated with checkout session ID
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("❌ Database error inserting order:", orderError);
      return NextResponse.json(
        { success: false, error: "Failed to create order record." },
        { status: 500 }
      );
    }

    // 8. Create Stripe Checkout Session
    let session;
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.");
      }

      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: (artifact.currency || "USD").toLowerCase(),
              product_data: {
                name: artifact.title,
                images: artifact.thumbnail_url ? [artifact.thumbnail_url] : [],
                description: artifact.description || undefined,
              },
              unit_amount: Math.round(price * 100), // Stripe expects unit_amount in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${originUrl}/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${originUrl}/buy/${artifact.slug || artifact.id}`,
        metadata: {
          order_id: order.id,
          artifact_id,
          auction_id: auction_id || "",
          user_id: user.id,
        },
      });
    } catch (stripeError: any) {
      console.error("❌ Stripe session creation failed:", stripeError);

      // Clean up/delete the placeholder order record to avoid junk entries
      await supabase.from("orders").delete().eq("id", order.id);

      return NextResponse.json(
        { success: false, error: "Payment processing failed" },
        { status: 500 }
      );
    }

    // 9. Update the orders table record with the final Stripe Checkout Session ID
    const { error: updateError } = await supabase
      .from("orders")
      .update({ payment_intent_id: session.id })
      .eq("id", order.id);

    if (updateError) {
      console.error("❌ Database error updating order with Stripe session:", updateError);
    }

    // 10. Return success with Stripe URL and order ID
    return NextResponse.json({
      success: true,
      sessionUrl: session.url,
      order_id: order.id,
    });
  } catch (error: any) {
    console.error("❌ Error in checkout API handler:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
