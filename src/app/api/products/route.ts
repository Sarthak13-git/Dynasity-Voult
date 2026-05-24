import { addArtifact } from "@/lib/supabase/db";
import { NextResponse } from "next/server";

/**
 * API route to add a product to database
 * POST /api/products
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { title, description, category, origin, era, year_estimate, provenance, estimated_value, currency, images } = body;

    // Validate required fields
    if (!title || !description || !category || !estimated_value) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Add to database
    const product = await addArtifact({
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
      status: "available",
      is_featured: false,
    });

    return NextResponse.json(
      { success: true, product, message: "Product added successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Error adding product:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add product" },
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
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    // You can add filtering logic here
    // For now, just return success message
    
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
