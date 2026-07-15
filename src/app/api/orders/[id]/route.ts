import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendOrderStatusEmail } from "@/lib/email";

/**
 * PATCH /api/orders/[id]
 * Update status, courier_name, tracking_number, or notes of an order.
 * Accessible to Admin and the Seller owning the ordered artifact.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing order ID." },
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
        { success: false, error: "Unauthorized: Please log in." },
        { status: 401 }
      );
    }

    // Fetch current order state and its artifact details to check permissions
    const { data: currentOrder, error: fetchOrderError } = await supabase
      .from("orders")
      .select(`
        *,
        artifacts (
          seller_id,
          title
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (fetchOrderError || !currentOrder) {
      return NextResponse.json(
        { success: false, error: "Order not found." },
        { status: 404 }
      );
    }

    // Require admin or owner seller role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin";
    const isSeller = (currentOrder.artifacts as any)?.seller_id === user.id;

    if (!isAdmin && !isSeller) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to manage this order." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, courier_name, tracking_number, notes } = body;

    // Build update payload
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (status !== undefined) {
      const allowedStatus = ["pending", "payment_received", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"];
      if (!allowedStatus.includes(status)) {
        return NextResponse.json(
          { success: false, error: `Invalid order status: ${status}` },
          { status: 400 }
        );
      }
      updatePayload.status = status;
    }

    if (courier_name !== undefined) {
      updatePayload.courier_name = courier_name || null;
    }

    if (tracking_number !== undefined) {
      updatePayload.tracking_number = tracking_number || null;
    }

    if (notes !== undefined) {
      updatePayload.notes = notes || null;
    }

    // Perform database update
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Send transactional status update email if status changed to target values
    if (status !== undefined && currentOrder.status !== status) {
      const emailTriggers = ["packed", "shipped", "delivered", "cancelled"];
      if (emailTriggers.includes(status.toLowerCase())) {
        try {
          const { data: buyer } = await supabase
            .from("profiles")
            .select("email, display_name")
            .eq("id", currentOrder.user_id)
            .single();

          if (buyer?.email && (currentOrder.artifacts as any)?.title) {
            await sendOrderStatusEmail(
              buyer.email,
              buyer.display_name || "Collector",
              id,
              (currentOrder.artifacts as any).title,
              status,
              tracking_number || currentOrder.tracking_number || undefined,
              courier_name || currentOrder.courier_name || undefined
            );
          }
        } catch (emailErr) {
          console.error("❌ Failed to send order status notification email:", emailErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Order updated successfully.",
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error("❌ Error updating order:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update order." },
      { status: 500 }
    );
  }
}
