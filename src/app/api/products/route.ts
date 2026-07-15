import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { PREMIUM_AUCTION_THRESHOLD, PREMIUM_AUCTION_THRESHOLD_LABEL } from "@/lib/constants";

/**
 * API route to add a product to database
 * POST /api/products
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate user session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorize seller role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "seller" && profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: Only registered sellers can list products." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      origin,
      era,
      year_estimate,
      provenance,
      estimated_value,
      currency,
      images,
    } = body;

    // Validate required fields
    if (!title || !description || !category || !estimated_value) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Enforce direct marketplace value limits
    const parsedValue = parseFloat(estimated_value);
    if (isNaN(parsedValue)) {
      return NextResponse.json(
        { error: "Estimated value must be a valid number" },
        { status: 400 }
      );
    }

    // Generate a unique slug based on title + a short random string
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // 3. Insert product enforcing owner-based seller_id mapping
    const { data: product, error: dbError } = await supabase
      .from("artifacts")
      .insert({
        title,
        description,
        category,
        origin: origin || "",
        era: era || "",
        year_estimate: year_estimate || null,
        provenance: provenance || "",
        slug,
        estimated_value: parsedValue,
        buy_now_price: parsedValue,
        currency: currency || "USD",
        images: images || [],
        thumbnail_url: images?.[0] || null,
        seller_id: user.id, // Enforce seller ownership
        status: parsedValue >= PREMIUM_AUCTION_THRESHOLD ? "pending_auction_approval" : "available",
        is_featured: false,
      })
      .select()
      .single();

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json(
      { success: true, product, message: "Product added successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("❌ Error adding product:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add product" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/products
 * Fetch all products (public)
 */
export async function GET(request: Request) {
  try {
    return NextResponse.json({
      message: "Get all products endpoint",
      note: "Import getAllArtifacts from @/lib/supabase/db to fetch products",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch products" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products
 * Delete a product by its ID
 */
export async function DELETE(request: Request) {
  try {
    // 1. Authenticate user session
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
        { error: "Missing product ID parameter" },
        { status: 400 }
      );
    }

    // 2. Fetch target product to inspect owner mapping & status validation
    const { data: artifact, error: selectError } = await supabase
      .from("artifacts")
      .select("seller_id, status")
      .eq("id", id)
      .maybeSingle();

    if (selectError) throw selectError;
    if (!artifact) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (artifact.status !== "available") {
      return NextResponse.json(
        { error: `Forbidden: Product is currently ${artifact.status} and cannot be deleted.` },
        { status: 400 }
      );
    }

    // 3. Authorize deletion: Caller must be the owner or an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (artifact.seller_id !== user.id && (!profile || profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to delete this product." },
        { status: 403 }
      );
    }

    // 4. Perform deletion
    const { error: deleteError } = await supabase
      .from("artifacts")
      .delete()
      .eq("id", id);

    if (deleteError) throw deleteError;

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully from database",
    });
  } catch (error: any) {
    console.error("❌ Error deleting product:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete product" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products
 * Edit a product by its ID
 */
export async function PATCH(request: Request) {
  try {
    // 1. Authenticate user session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve product ID
    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    const body = await request.json();
    if (!id) {
      id = body.id;
    }

    if (!id) {
      return NextResponse.json(
        { error: "Missing product ID parameter" },
        { status: 400 }
      );
    }

    // 2. Fetch target product to inspect owner mapping & status validation
    const { data: artifact, error: selectError } = await supabase
      .from("artifacts")
      .select("seller_id, status")
      .eq("id", id)
      .maybeSingle();

    if (selectError) throw selectError;
    if (!artifact) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (artifact.status !== "available") {
      return NextResponse.json(
        { error: `Forbidden: Product is currently ${artifact.status} and cannot be modified.` },
        { status: 400 }
      );
    }

    // 3. Authorize update: Caller must be the owner or an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (artifact.seller_id !== user.id && (!profile || profile.role !== "admin")) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to edit this product." },
        { status: 403 }
      );
    }

    const {
      title,
      description,
      category,
      origin,
      era,
      year_estimate,
      provenance,
      estimated_value,
      currency,
      images,
      status,
    } = body;

    // Validate required fields
    if (!title || !description || !category || !estimated_value) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 4. Perform update
    const { data: product, error: dbError } = await supabase
      .from("artifacts")
      .update({
        title,
        description,
        category,
        origin: origin || "",
        era: era || "",
        year_estimate: year_estimate || null,
        provenance: provenance || "",
        estimated_value: parseFloat(estimated_value),
        currency: currency || "USD",
        images: images || [],
        thumbnail_url: images?.[0] || null,
        status: status || "available",
      })
      .eq("id", id)
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      product,
      message: "Product updated successfully",
    });
  } catch (error: any) {
    console.error("❌ Error updating product:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update product" },
      { status: 500 }
    );
  }
}
