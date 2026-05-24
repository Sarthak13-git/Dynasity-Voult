import { addArtifactsBulk, addAuction } from "@/lib/supabase/db";
import { buyItems } from "@/lib/buy-data";
import { auctionItems } from "@/lib/auction-data";

/**
 * Seed database with sample artifacts from buyItems
 * Call this once from an admin page or API route
 */
export async function seedBuyArtifacts() {
  try {
    const artifacts = buyItems.map((item) => ({
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
    const result = await addArtifactsBulk(artifacts);
    console.log("✅ Buy artifacts added successfully:", result?.length);
    return result;
  } catch (error) {
    console.error("❌ Error seeding buy artifacts:", error);
    throw error;
  }
}

/**
 * Map auction items to artifacts (you'll need to get artifact IDs first)
 * This is a helper to show the structure
 */
export function formatAuctionArtifacts() {
  return auctionItems.map((item) => ({
    title: item.title,
    description: item.description,
    story: item.story,
    startingBid: item.startingBid,
    image: item.image,
    category: "antiquity", // Default category - adjust based on item
  }));
}
