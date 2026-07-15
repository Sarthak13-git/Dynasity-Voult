import { createClient } from "./client";
import { createAdminClient } from "./server";
import { buyItems } from "@/lib/buy-data";
import { auctionItems } from "@/lib/auction-data";

/**
 * Helper to parse starting bid string (e.g. "15 Million $" -> 15000000)
 */
function parseBidAmount(bidStr: string): number {
  const normalized = bidStr.toLowerCase().replace(/[^0-9.]/g, "");
  const num = parseFloat(normalized);
  if (bidStr.toLowerCase().includes("million")) {
    return num * 1000000;
  }
  return num || 1000;
}

/**
 * Seed database with sample artifacts from buyItems
 * Call this once from an admin page or API route
 */
export async function seedBuyArtifacts() {
  try {
    const supabase = await createAdminClient();

    // Fetch existing titles to prevent duplicates
    const { data: existing, error: fetchError } = await supabase
      .from("artifacts")
      .select("title");

    if (fetchError) throw fetchError;

    const existingTitles = new Set((existing || []).map((item) => item.title));

    const newItems = buyItems.filter((item) => !existingTitles.has(item.title));

    if (newItems.length === 0) {
      console.log("ℹ️ No new buy artifacts to seed.");
      return [];
    }

    const artifacts = newItems.map((item) => ({
      title: item.title,
      description: item.description,
      origin: item.origin,
      era: item.era,
      category: item.category.toLowerCase().replace(" & ", "_").replace(/\s+/g, "_"),
      images: [item.image],
      thumbnail_url: item.image,
      estimated_value: item.price,
      buy_now_price: item.price,
      currency: "USD",
      status: "available" as const,
      is_featured: false,
    }));

    console.log(`🚀 Seeding ${artifacts.length} buy artifacts...`);
    
    const { data, error: insertError } = await supabase
      .from("artifacts")
      .insert(artifacts)
      .select();

    if (insertError) throw insertError;

    console.log("✅ Buy artifacts added successfully:", data?.length);
    return data;
  } catch (error) {
    console.error("❌ Error seeding buy artifacts:", error);
    throw error;
  }
}

/**
 * Seed auction items and their corresponding live auctions in Supabase
 */
export async function seedAuctionArtifactsAndAuctions() {
  try {
    const supabase = await createAdminClient();
    const seededAuctions = [];

    console.log(`🚀 Seeding ${auctionItems.length} auction items and auctions...`);

    for (const item of auctionItems) {
      // 1. Check if artifact already exists by slug
      let { data: existingArtifact, error: fetchError } = await supabase
        .from("artifacts")
        .select("id")
        .eq("slug", item.slug)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let artifactId = existingArtifact?.id;

      if (!artifactId) {
        // Parse category based on item slug/type
        let category = "other";
        if (item.slug === "lotus-reverie") category = "painting";
        else if (item.slug === "amoria-ring") category = "jewelry";
        else if (item.slug === "skymoon") category = "timepiece";
        else if (item.slug === "imperator-aurum") category = "weapon";
        else if (item.slug === "enfield" || item.slug === "bugatti") category = "decorative_art";

        // Parse starting bid
        const estimatedValue = parseBidAmount(item.startingBid);

        // Insert new artifact
        const { data: newArtifact, error: insertArtError } = await supabase
          .from("artifacts")
          .insert({
            title: item.title,
            description: item.description,
            story: item.story,
            slug: item.slug,
            origin: item.slug === "bugatti" ? "France" : item.slug === "enfield" ? "United Kingdom" : "Unknown",
            era: item.slug === "enfield" ? "1930s" : item.slug === "imperator-aurum" ? "1885" : "Modern",
            category,
            images: [item.image, ...item.images],
            thumbnail_url: item.image,
            videos: item.videos,
            estimated_value: estimatedValue,
            status: "on_auction",
            is_featured: true,
          })
          .select("id")
          .single();

        if (insertArtError) throw insertArtError;
        artifactId = newArtifact.id;
      }

      // 2. Check if auction already exists for this artifact
      const { data: existingAuction, error: fetchAucError } = await supabase
        .from("auctions")
        .select("id")
        .eq("artifact_id", artifactId)
        .maybeSingle();

      if (fetchAucError) throw fetchAucError;

      if (!existingAuction) {
        const startingBid = parseBidAmount(item.startingBid);
        
        // Insert new live auction
        const { data: newAuction, error: insertAucError } = await supabase
          .from("auctions")
          .insert({
            artifact_id: artifactId,
            title: item.title,
            description: item.description,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            starting_bid: startingBid,
            current_bid: startingBid,
            bid_increment: item.slug === "bugatti" ? 50000 : 5000,
            status: "live",
          })
          .select()
          .single();

        if (insertAucError) throw insertAucError;
        seededAuctions.push(newAuction);
      }
    }

    console.log("✅ Auction items and auctions seeded successfully:", seededAuctions.length);
    return seededAuctions;
  } catch (error) {
    console.error("❌ Error seeding auctions:", error);
    throw error;
  }
}
