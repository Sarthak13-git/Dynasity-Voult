import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_for_build", {
  apiVersion: "2023-10-16" as any,
});

/**
 * POST /api/webhooks/stripe
 * Stripe webhook receiver endpoint. Handles payment succeeds and fails to update order and product states.
 */
export async function POST(request: Request) {
  let body = "";
  try {
    body = await request.text();
  } catch (err: any) {
    console.error("❌ Failed to read raw request text in Stripe webhook:", err);
    return NextResponse.json({ success: false, error: "Failed to read request body" }, { status: 400 });
  }

  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("❌ Webhook missing stripe-signature header or STRIPE_WEBHOOK_SECRET env var.");
    return NextResponse.json({ success: false, error: "Unauthorized: Signature or secret missing" }, { status: 401 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ success: false, error: "Unauthorized: Invalid signature" }, { status: 401 });
  }

  console.log(`🔔 Received Stripe webhook event: ${event.type}`);

  try {
    const supabase = await createAdminClient();

    switch (event.type) {
      case "charge.succeeded": {
        const charge = event.data.object as Stripe.Charge;
        const orderId = charge.metadata?.order_id;

        if (!orderId) {
          console.error("⚠️ charge.succeeded event missing metadata.order_id");
          return NextResponse.json({ success: true, message: "Missing metadata.order_id (ignored)" });
        }

        // 1. Fetch order details to identify the artifact, amount, auction link, and current status
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .select("user_id, artifact_id, amount, auction_id, status")
          .eq("id", orderId)
          .maybeSingle();

        if (orderError || !order) {
          console.error(`❌ Order record ${orderId} not found in database. Error:`, orderError);
          return NextResponse.json({ success: true, message: "Order not found (ignored)" });
        }

        // STEP 2 & STEP 5 — Idempotency check: Exit early if already completed or cancelled/refunded
        if (order.status === "payment_received") {
          console.log(`ℹ️ Webhook retry for order ${orderId} already processed (status: payment_received). Exiting early.`);
          return NextResponse.json({ success: true, message: "Order already completed" });
        }

        if (order.status === "cancelled") {
          console.log(`ℹ️ Webhook retry for order ${orderId} already processed (status: cancelled). Exiting early.`);
          return NextResponse.json({ success: true, message: "Order already cancelled" });
        }

        // STEP 1 — Atomic Artifact Update: only update when status == "available"
        let updateArtifactSucceeded = false;
        if (!order.auction_id) {
          // Direct-sale atomic update
          const { data: updatedArtifacts, error: updateArtifactError } = await supabase
            .from("artifacts")
            .update({
              status: "sold",
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.artifact_id)
            .eq("status", "available")
            .select();

          if (updateArtifactError) {
            console.error(`❌ Failed to atomically update artifact status for artifact ${order.artifact_id}:`, updateArtifactError);
            throw updateArtifactError;
          }

          updateArtifactSucceeded = !!(updatedArtifacts && updatedArtifacts.length > 0);
        } else {
          // Auction win update: allow status transition from either reserved or available
          const { data: updatedArtifacts, error: updateArtifactError } = await supabase
            .from("artifacts")
            .update({
              status: "sold",
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.artifact_id)
            .in("status", ["reserved", "available"])
            .select();

          if (updateArtifactError) {
            console.error(`❌ Failed to update auction artifact status for artifact ${order.artifact_id}:`, updateArtifactError);
            throw updateArtifactError;
          }

          updateArtifactSucceeded = !!(updatedArtifacts && updatedArtifacts.length > 0);
        }

        // STEP 3 & STEP 4 — Branching based on update outcome
        if (updateArtifactSucceeded) {
          // A. Winning Buyer Flow
          console.log(`✅ Atomic lock secured. Processing win flow for order ${orderId}, artifact ${order.artifact_id}.`);
          
          const { data: updatedOrders, error: updateOrderError } = await supabase
            .from("orders")
            .update({
              status: "payment_received",
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId)
            .eq("status", "pending")
            .select();

          if (updateOrderError || !updatedOrders || updatedOrders.length !== 1) {
            console.error(`❌ Failed to update order status for order ${orderId} (mismatch or already processed):`, updateOrderError);
            throw new Error("Order status update failed or order already processed.");
          }

          // Calculate and record seller earnings automatically (STEP 6 - verified only after artifact & order updated)
          try {
            const { data: artifact } = await supabase
              .from("artifacts")
              .select("seller_id")
              .eq("id", order.artifact_id)
              .single();

            if (artifact && artifact.seller_id) {
              const isAuction = !!order.auction_id;
              const rateKey = isAuction ? "auction_commission_rate" : "direct_sale_commission";
              const defaultRate = isAuction ? 10 : 5;

              const { data: settingRow } = await supabase
                .from("platform_settings")
                .select("value")
                .eq("key", rateKey)
                .maybeSingle();

              let commissionRate = defaultRate;
              if (settingRow?.value) {
                try {
                  commissionRate = Number(JSON.parse(settingRow.value));
                } catch {
                  commissionRate = Number(settingRow.value) || defaultRate;
                }
              }

              const grossAmount = Number(order.amount);
              const commissionAmount = grossAmount * (commissionRate / 100);
              const netAmount = grossAmount - commissionAmount;

              const { error: earnError } = await supabase
                .from("seller_earnings")
                .insert({
                  seller_id: artifact.seller_id,
                  order_id: orderId,
                  artifact_id: order.artifact_id,
                  gross_amount: grossAmount,
                  commission_amount: commissionAmount,
                  net_amount: netAmount,
                  earning_type: isAuction ? "auction_win" : "direct_sale",
                  created_at: new Date().toISOString(),
                });

              if (earnError) {
                console.error("❌ Database error inserting seller earnings record:", earnError);
              } else {
                console.log(`✅ Seller earnings recorded for seller ${artifact.seller_id} on order ${orderId}. Gross: $${grossAmount}, Commission: $${commissionAmount}, Net: $${netAmount}`);
              }
            } else {
              console.warn(`⚠️ Could not resolve seller_id for artifact ${order.artifact_id}. Earnings skipped.`);
            }
          } catch (earningsErr) {
            console.error("❌ Exception occurred during automatic seller earnings processing:", earningsErr);
          }

          // Send confirmation email
          try {
            const { data: buyer } = await supabase
              .from("profiles")
              .select("email, display_name")
              .eq("id", order.user_id)
              .single();

            const { data: artifact } = await supabase
              .from("artifacts")
              .select("title")
              .eq("id", order.artifact_id)
              .single();

            if (buyer?.email && artifact?.title) {
              const { sendOrderConfirmedEmail } = require("@/lib/email");
              const orderUrl = `https://dynasity-voult.com/buyer/orders`;
              await sendOrderConfirmedEmail(
                buyer.email,
                buyer.display_name || "Collector",
                artifact.title,
                Number(order.amount),
                orderId,
                orderUrl
              );
              console.log(`✅ Order confirmation email sent to buyer ${buyer.email}`);
            }
          } catch (emailErr) {
            console.error("❌ Failed to send order confirmation email inside Stripe webhook:", emailErr);
          }

          console.log(`✅ Order ${orderId} marked as paid. Artifact ${order.artifact_id} marked as sold.`);
        } else {
          // B. Duplicate Buyer Flow (Lost the race)
          console.log(`⚠️ Atomic lock failed (artifact ${order.artifact_id} already sold). Refunding order ${orderId}.`);

          const { error: cancelOrderError } = await supabase
            .from("orders")
            .update({
              status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId);

          if (cancelOrderError) {
            console.error(`❌ Failed to update duplicate order ${orderId} to cancelled:`, cancelOrderError);
            throw cancelOrderError;
          }

          // Issue Stripe refund
          try {
            if (charge.id) {
              const refund = await stripe.refunds.create({
                charge: charge.id,
                reason: "duplicate",
                metadata: {
                  reason: "direct_sale_lost_race",
                  order_id: orderId,
                  artifact_id: order.artifact_id,
                }
              });
              console.log(`✅ Refunded charge ${charge.id} (Refund ID: ${refund.id}) for duplicate order ${orderId}.`);
            } else {
              console.warn(`⚠️ Charge ID missing on event for duplicate order ${orderId}. Automatic refund skipped.`);
            }
          } catch (refundError: any) {
            console.error(`❌ Stripe auto-refund failed for order ${orderId}:`, refundError);
            const noteText = `Auto-refund attempt failed. Error: ${refundError?.message || "Unknown error"}. Manual curator intervention required.`;
            await supabase
              .from("orders")
              .update({ notes: noteText })
              .eq("id", orderId);
          }
        }
        break;
      }

      case "charge.failed": {
        const charge = event.data.object as Stripe.Charge;
        const orderId = charge.metadata?.order_id;

        if (!orderId) {
          console.error("⚠️ charge.failed event missing metadata.order_id");
          return NextResponse.json({ success: true, message: "Missing metadata.order_id (ignored)" });
        }

        // Update order status to cancelled
        const { error: cancelOrderError } = await supabase
          .from("orders")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        if (cancelOrderError) {
          console.error(`❌ Failed to cancel order status for order ${orderId}:`, cancelOrderError);
          throw cancelOrderError;
        }

        console.log(`❌ Order ${orderId} has been marked as cancelled due to failed charge.`);
        break;
      }

      default:
        console.log(`ℹ️ Webhook: Ignored event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`❌ Error processing Stripe webhook event ${event.type}:`, error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process webhook event" },
      { status: 500 }
    );
  }
}
