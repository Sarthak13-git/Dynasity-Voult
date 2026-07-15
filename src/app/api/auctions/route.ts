import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/auctions
 * Create a new auction listing
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

    // 1. Authorize role (admin only)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Only administrators can create auctions." },
        { status: 403 }
      );
    }

    const body = await request.json();
    console.log(`[API POST] Request body:`, body);
    const {
      artifact_id,
      title,
      description,
      start_time,
      end_time,
      starting_bid,
      reserve_price,
      bid_increment,
      product_title,
      product_category,
      product_description,
      product_estimated_value,
      product_images,
      product_videos,
    } = body;

    let targetArtifactId = artifact_id;

    if (!targetArtifactId) {
      if (!product_title || !product_category || !product_description || !product_estimated_value) {
        return NextResponse.json(
          { error: "Missing product details for direct auction creation." },
          { status: 400 }
        );
      }

      // 1. Generate unique slug for product
      const baseSlug = product_title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

      // 2. Insert product
      const { data: newProduct, error: productInsertError } = await supabase
        .from("artifacts")
        .insert({
          title: product_title,
          description: product_description,
          category: product_category,
          estimated_value: parseFloat(product_estimated_value),
          buy_now_price: parseFloat(product_estimated_value),
          images: product_images || [],
          thumbnail_url: product_images?.[0] || null,
          videos: product_videos || [],
          seller_id: user.id,
          status: "on_auction",
        })
        .select()
        .single();

      if (productInsertError) {
        throw productInsertError;
      }

      targetArtifactId = newProduct.id;

      // 3. Create approved auction application to satisfy validation rules
      const { error: appInsertError } = await supabase
        .from("auction_applications")
        .insert({
          artifact_id: targetArtifactId,
          seller_id: user.id,
          status: "approved",
          admin_comments: "Auto-approved via direct auction creation",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        });

      if (appInsertError) {
        throw appInsertError;
      }
    }

    // Validate required fields
    if (!targetArtifactId || !title || !start_time || !end_time || !starting_bid) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // --- ENFORCE AUCTION APPLICATION APPROVAL WORKFLOW ---
    // Check if there is an approved auction application for this targetArtifactId
    const { data: approvedApp, error: appError } = await supabase
      .from("auction_applications")
      .select("id")
      .eq("artifact_id", targetArtifactId)
      .eq("status", "approved")
      .maybeSingle();

    if (appError || !approvedApp) {
      return NextResponse.json(
        { error: "Artifact must have an approved auction application before creating an auction. Please submit an application through the seller dashboard." },
        { status: 403 }
      );
    }
    // -----------------------------------------------------

    // 2. Verify caller owns the target artifact
    const { data: artifact, error: artError } = await supabase
      .from("artifacts")
      .select("seller_id")
      .eq("id", targetArtifactId)
      .maybeSingle();

    if (artError || !artifact) {
      return NextResponse.json(
        { error: "Product not found." },
        { status: 404 }
      );
    }

    if (artifact.seller_id !== user.id && profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: You do not own this product." },
        { status: 403 }
      );
    }

    // 3. Prevent duplicate active auctions (upcoming/live) on same artifact
    const { data: activeAuction, error: activeError } = await supabase
      .from("auctions")
      .select("id")
      .eq("artifact_id", targetArtifactId)
      .in("status", ["upcoming", "live"])
      .maybeSingle();

    if (activeAuction) {
      return NextResponse.json(
        { error: "An active (upcoming or live) auction already exists for this product." },
        { status: 400 }
      );
    }

    console.log(`[API POST] Inserting into DB: start_time: ${start_time}, end_time: ${end_time}`);
    // 4. Perform Insert
    const { data: auction, error: dbError } = await supabase
      .from("auctions")
      .insert({
        artifact_id: targetArtifactId,
        title,
        description: description || "",
        start_time,
        end_time,
        starting_bid: parseFloat(starting_bid),
        current_bid: parseFloat(starting_bid),
        reserve_price: reserve_price ? parseFloat(reserve_price) : null,
        bid_increment: bid_increment ? parseFloat(bid_increment) : 100,
        status: "upcoming",
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    // 5. Update artifact status to on_auction
    const { error: artUpdateErr } = await supabase
      .from("artifacts")
      .update({ status: "on_auction" })
      .eq("id", targetArtifactId);

    if (artUpdateErr) {
      console.error("⚠️ Failed to update artifact status to on_auction:", artUpdateErr);
    }

    console.log(`[API POST] Database returned: start_time: ${auction.start_time}, end_time: ${auction.end_time}`);

    return NextResponse.json(
      { success: true, auction, message: "Auction created successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Error creating auction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create auction" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auctions
 * Edit an existing auction
 */
export async function PUT(request: Request) {
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
    console.log(`[API PUT] Request body:`, body);
    const {
      id,
      title,
      description,
      start_time,
      end_time,
      reserve_price,
      bid_increment,
    } = body;

    if (!id || !title || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 1. Fetch original auction to inspect ownership
    const { data: auction, error: selectError } = await supabase
      .from("auctions")
      .select("*, artifacts!inner(seller_id)")
      .eq("id", id)
      .maybeSingle();

    if (selectError || !auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // 2. Validate ownership or admin status
    const artifactSellerId = (auction.artifacts as any)?.seller_id;
    if (artifactSellerId !== user.id && (!profile || profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to modify this auction." },
        { status: 403 }
      );
    }

    // 3. Sellers cannot edit Live, Scheduled, or Ended/Cancelled auctions. Admins bypass.
    if (profile?.role !== "admin") {
      if (["live", "upcoming", "ended", "cancelled"].includes(auction.status)) {
        return NextResponse.json(
          { error: "Sellers cannot edit active, scheduled, or finished auctions." },
          { status: 400 }
        );
      }
    }

    // Admins cannot edit ended or cancelled auctions either
    if (auction.status === "ended" || auction.status === "cancelled") {
      return NextResponse.json(
        { error: "Ended or cancelled auctions cannot be edited." },
        { status: 400 }
      );
    }

    console.log(`[API PUT] Updating in DB: start_time: ${start_time}, end_time: ${end_time}`);
    // 4. Update fields
    const { data: updatedAuction, error: updateError } = await supabase
      .from("auctions")
      .update({
        title,
        description: description || "",
        start_time,
        end_time,
        reserve_price: reserve_price ? parseFloat(reserve_price) : null,
        bid_increment: bid_increment ? parseFloat(bid_increment) : 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(`[API PUT] Database returned: start_time: ${updatedAuction.start_time}, end_time: ${updatedAuction.end_time}`);

    return NextResponse.json({
      success: true,
      auction: updatedAuction,
      message: "Auction updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error updating auction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update auction" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auctions
 * Cancel an auction (updates status to 'cancelled')
 */
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing auction ID parameter" },
        { status: 400 }
      );
    }

    // 1. Fetch target auction
    const { data: auction, error: selectError } = await supabase
      .from("auctions")
      .select("*, artifacts!inner(seller_id)")
      .eq("id", id)
      .maybeSingle();

    if (selectError || !auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // 2. Validate ownership or admin status
    const artifactSellerId = (auction.artifacts as any)?.seller_id;
    if (artifactSellerId !== user.id && (!profile || profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to cancel this auction." },
        { status: 403 }
      );
    }

    // 3. Sellers cannot cancel Live, Scheduled, or Ended auctions. Admins bypass.
    if (profile?.role !== "admin") {
      if (["live", "upcoming", "ended"].includes(auction.status)) {
        return NextResponse.json(
          { error: "Sellers cannot cancel active, scheduled, or finished auctions." },
          { status: 400 }
        );
      }
    }

    // Admins cannot cancel ended auctions either
    if (auction.status === "ended") {
      return NextResponse.json(
        { error: "Ended auctions cannot be cancelled." },
        { status: 400 }
      );
    }

    // 4. Cancel auction by updating status to 'cancelled'
    const { data: cancelledAuction, error: cancelError } = await supabase
      .from("auctions")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (cancelError) throw cancelError;

    return NextResponse.json({
      success: true,
      auction: cancelledAuction,
      message: "Auction cancelled successfully",
    });
  } catch (error: any) {
    console.error("❌ Error cancelling auction:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel auction" },
      { status: 500 }
    );
  }
}
