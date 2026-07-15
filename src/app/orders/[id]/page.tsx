import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Stripe from "stripe";
import { CheckCircle2, Calendar, Tag, Truck, ShoppingBag, ArrowLeft, XCircle, Clock, MapPin, Package } from "lucide-react";

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_for_build", {
  apiVersion: "2023-10-16" as any,
});

export const dynamic = "force-dynamic";

interface OrderPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: OrderPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const orderId = resolvedParams?.id;
  const sessionId = resolvedSearchParams?.session_id;

  if (!orderId) {
    return notFound();
  }

  const supabase = await createAdminClient();

  // 1. Fetch order details from database using service role (bypassing RLS for confirmation view)
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(`
      *,
      artifacts:artifact_id (
        id,
        title,
        description,
        images,
        thumbnail_url,
        buy_now_price,
        currency,
        estimated_value
      )
    `)
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) {
    console.error("❌ Database query error fetching order:", orderError);
  }

  // If order is not found, display a clean error layout with redirection
  if (!order) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] flex items-center justify-center px-6 pt-24 pb-16">
        <div className="max-w-md w-full text-center border border-[#E8E2D9] p-8 bg-white rounded-lg shadow-sm">
          <XCircle className="mx-auto h-16 w-16 text-red-500 mb-6 font-light" />
          <h1 className="font-serif text-3xl font-medium mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-8">
            We couldn't locate any order record matching the provided ID. Please verify your link or check your purchase history.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full px-6 py-3 border border-[#1A1A1A] bg-[#1A1A1A] text-white hover:bg-[#B8860B] hover:border-[#B8860B] transition-colors uppercase tracking-wider text-xs font-semibold rounded-md"
          >
            Go Back Home
          </Link>
        </div>
      </div>
    );
  }

  // 2. Validate Stripe Session if sessionId query parameter exists
  let stripeSession: Stripe.Checkout.Session | null = null;
  let stripeValidationError = "";

  if (sessionId) {
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

      // Verify this Stripe session matches our order ID to prevent spoofing
      if (stripeSession.metadata?.order_id !== orderId) {
        stripeValidationError = "The checkout session does not match this order.";
        console.error(`⚠️ Stripe session metadata mismatch. Expected: ${orderId}, Got: ${stripeSession.metadata?.order_id}`);
      }
    } catch (err: any) {
      stripeValidationError = "Could not verify Stripe checkout session.";
      console.error("❌ Error retrieving Stripe session:", err);
    }
  }

  // 3. Proactive status sync: If Stripe reports session is paid but DB is 'pending', update it immediately
  // handles webhook race conditions
  const stripeSessionAny = stripeSession as any;
  if (stripeSessionAny && stripeSessionAny.payment_status === "paid" && !stripeValidationError) {
    let shouldUpdateOrder = false;
    const updates: any = {};

    if (order.status === "pending") {
      updates.status = "payment_received";
      shouldUpdateOrder = true;
    }

    if (!order.shipping_address && stripeSessionAny.shipping_details) {
      updates.shipping_address = {
        name: stripeSessionAny.shipping_details.name,
        address: stripeSessionAny.shipping_details.address,
      };
      shouldUpdateOrder = true;
    }

    if (shouldUpdateOrder) {
      const { data: updatedOrder, error: updateError } = await supabase
        .from("orders")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select()
        .single();

      if (!updateError && updatedOrder) {
        order.status = updatedOrder.status;
        order.shipping_address = updatedOrder.shipping_address;
        console.log(`✅ Proactive sync: Order ${order.id} updated to status '${order.status}'`);
      } else {
        console.error("❌ Failed to update order status during sync:", updateError);
      }

      // Also mark the associated artifact as sold
      if (updates.status === "payment_received") {
        const { error: artifactError } = await supabase
          .from("artifacts")
          .update({
            status: "sold",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.artifact_id);

        if (artifactError) {
          console.error("❌ Failed to mark artifact as sold:", artifactError);
        }
      }
    }
  }

  const artifact = order.artifacts;
  const artifactImage = artifact?.thumbnail_url || (artifact?.images && artifact.images[0]) || "/buy/item-1.jpg";
  const orderDate = new Date(order.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedAmount = Number(order.amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Extract shipping details
  let shippingName = "";
  let shippingAddressLines: string[] = [];

  if (order.shipping_address) {
    const sAddr = order.shipping_address;
    shippingName = sAddr.name || "";
    
    const details = sAddr.address || sAddr;
    if (details.line1) shippingAddressLines.push(details.line1);
    if (details.line2) shippingAddressLines.push(details.line2);
    
    const cityStateZip = [details.city, details.state, details.postal_code].filter(Boolean).join(", ");
    if (cityStateZip) shippingAddressLines.push(cityStateZip);
    if (details.country) shippingAddressLines.push(details.country);
  }

  // Determine design status elements based on state
  const isPaid = ["payment_received", "processing", "packed", "shipped", "delivered"].includes(order.status);
  const isCancelled = order.status === "cancelled";
  const isPending = order.status === "pending";
  const isRefunded = order.status === "refunded";

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        
        {/* Top Header Card: Status Summary */}
        <div className="bg-white border border-[#E8E2D9] rounded-t-lg shadow-sm p-8 text-center">
          {isPaid && (
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
              </div>
              <p className="text-[#B8860B] text-xs font-semibold uppercase tracking-[0.25em] mb-2">
                Transaction Completed
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-medium mb-3">
                Thank you for your purchase!
              </h1>
              <p className="text-gray-600 max-w-md mx-auto text-sm leading-relaxed">
                Your payment was successfully processed. A confirmation email has been sent. Your historical acquisition has been cataloged.
              </p>
            </div>
          )}

          {isPending && (
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                <Clock className="h-12 w-12 text-amber-500" strokeWidth={1.5} />
              </div>
              <p className="text-amber-600 text-xs font-semibold uppercase tracking-[0.25em] mb-2">
                Awaiting Confirmation
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-medium mb-3">
                Payment is Pending
              </h1>
              <p className="text-gray-600 max-w-md mx-auto text-sm leading-relaxed">
                We are currently waiting for payment authorization. Once confirmed, your item status will automatically update.
              </p>
            </div>
          )}

          {isCancelled && (
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <XCircle className="h-12 w-12 text-red-500" strokeWidth={1.5} />
              </div>
              <p className="text-red-600 text-xs font-semibold uppercase tracking-[0.25em] mb-2">
                Order Cancelled
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-medium mb-3">
                Transaction Cancelled
              </h1>
              <p className="text-gray-600 max-w-md mx-auto text-sm leading-relaxed">
                The payment process was unsuccessful or cancelled. No charges were captured, and the artifact has been returned to the gallery collection.
              </p>
            </div>
          )}

          {isRefunded && (
            <div className="flex flex-col items-center">
              <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <XCircle className="h-12 w-12 text-gray-500" strokeWidth={1.5} />
              </div>
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-[0.25em] mb-2">
                Order Refunded
              </p>
              <h1 className="font-serif text-3xl md:text-4xl font-medium mb-3">
                Payment Refunded
              </h1>
              <p className="text-gray-600 max-w-md mx-auto text-sm leading-relaxed">
                A full refund has been issued for this order. The funds have been returned to your original payment method.
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-[#E8E2D9] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-left w-full md:w-auto">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Order Identifier</p>
              <p className="text-xs font-mono text-gray-700 bg-gray-50 border border-gray-100 px-3 py-1.5 rounded select-all">
                {order.id}
              </p>
            </div>
            <div className="text-left md:text-right w-full md:w-auto">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-1">Acquisition Date</p>
              <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5 md:justify-end">
                <Calendar className="h-4 w-4 text-[#B8860B]" />
                {orderDate}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Detailed Sections Card */}
        <div className="bg-white border-x border-b border-[#E8E2D9] rounded-b-lg shadow-sm p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Left Column: Artifact Details and Price Summary */}
            <div className="space-y-8">
              <div>
                <h3 className="font-serif text-lg font-medium border-b border-[#E8E2D9] pb-3 mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#B8860B]" />
                  Acquired Artifact
                </h3>
                
                <div className="flex gap-4 items-start">
                  <div className="relative h-20 w-20 flex-shrink-0 bg-gray-50 border border-[#E8E2D9] rounded overflow-hidden">
                    <Image
                      src={artifactImage}
                      alt={artifact?.title || "Artifact"}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-serif text-base font-semibold leading-snug mb-1">
                      {artifact?.title || "Premium Heritage Item"}
                    </h4>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {artifact?.description || "A curated historic masterpiece from our vault."}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-serif text-lg font-medium border-b border-[#E8E2D9] pb-3 mb-4 flex items-center gap-2">
                  <Tag className="h-5 w-5 text-[#B8860B]" />
                  Payment Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Hammer Price</span>
                    <span className="font-medium text-gray-800">${formattedAmount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-[#E8E2D9]/60 pt-3">
                    <span className="text-gray-500">Acquisition Fee</span>
                    <span className="font-medium text-emerald-600">Included</span>
                  </div>
                  <div className="flex justify-between items-center text-base font-semibold border-t border-[#E8E2D9] pt-3">
                    <span>Total Amount Paid</span>
                    <span className="text-[#B8860B]">${formattedAmount} {order.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2">
                    <span className="text-gray-400">Payment Status</span>
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      isPaid ? "bg-emerald-50 text-emerald-700" :
                      isPending ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {order.status === "payment_received" ? "Paid (Success)" :
                       order.status === "shipped" ? "Shipped" :
                       order.status === "delivered" ? "Delivered" :
                       order.status === "pending" ? "Pending" :
                       "Cancelled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Shipping Details & Tracking */}
            <div className="space-y-8">
              <div>
                <h3 className="font-serif text-lg font-medium border-b border-[#E8E2D9] pb-3 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#B8860B]" />
                  Shipping Destination
                </h3>
                {shippingAddressLines.length > 0 ? (
                  <div className="bg-[#FAF8F5] border border-[#E8E2D9] p-4 rounded text-sm space-y-1">
                    {shippingName && <p className="font-semibold text-gray-800 mb-1">{shippingName}</p>}
                    {shippingAddressLines.map((line, idx) => (
                      <p key={idx} className="text-gray-600">{line}</p>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-dashed border-[#E8E2D9] p-4 rounded text-center">
                    <p className="text-sm text-gray-500 italic">
                      No shipping address collected.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Our concierge team will contact you to coordinate transport.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-serif text-lg font-medium border-b border-[#E8E2D9] pb-3 mb-4 flex items-center gap-2">
                  <Truck className="h-5 w-5 text-[#B8860B]" />
                  Logistics & Transport
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Shipping Status</span>
                    <span className="font-medium text-gray-800 capitalize">
                      {(order.shipping_status || "not_shipped").replace("_", " ")}
                    </span>
                  </div>
                  
                  {order.tracking_number ? (
                    <div className="bg-[#FAF8F5] border border-[#E8E2D9] p-4 rounded mt-2">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-500">Tracking Code</span>
                        <span className="font-mono font-medium text-gray-800 bg-white border border-[#E8E2D9] px-2 py-0.5 rounded select-all">
                          {order.tracking_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#B8860B] mt-2 font-medium">
                        Carrier has dispatched the item. Track via carrier website.
                      </p>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 leading-relaxed bg-[#FAF8F5] p-4 rounded border border-[#E8E2D9]">
                      White-glove courier dispatch is prepared within 2-3 business days. You will be updated automatically with tracking info.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="mt-12 pt-8 border-t border-[#E8E2D9] flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/buyer/orders"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors uppercase tracking-wider text-xs font-semibold rounded-md text-[#1A1A1A] bg-transparent"
            >
              <ShoppingBag className="h-4 w-4" />
              View My Orders
            </Link>
            <Link
              href="/auctions"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#1A1A1A] text-white hover:bg-[#B8860B] transition-colors uppercase tracking-wider text-xs font-semibold rounded-md border border-transparent"
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Link>
          </div>
          
        </div>
      </div>
    </div>
  );
}
