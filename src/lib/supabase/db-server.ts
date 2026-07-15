import { createAdminClient } from "./server";
import { ArtifactData, AuctionData } from "./db";

// ============ SERVER-SIDE OPERATIONS (For admin/protected actions) ============

/**
 * Add a single artifact to database (Server only)
 * Bypasses RLS using the admin client
 */
export async function addArtifact(artifactData: ArtifactData) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("artifacts")
    .insert([
      {
        title: artifactData.title,
        description: artifactData.description || "",
        origin: artifactData.origin || "",
        era: artifactData.era || "",
        year_estimate: artifactData.year_estimate || null,
        provenance: artifactData.provenance || "",
        category: artifactData.category,
        images: artifactData.images || [],
        thumbnail_url: artifactData.thumbnail_url || null,
        estimated_value: artifactData.estimated_value,
        buy_now_price: artifactData.buy_now_price || null,
        currency: artifactData.currency || "USD",
        status: artifactData.status || "available",
        is_featured: artifactData.is_featured || false,
        slug: artifactData.slug || null,
        story: artifactData.story || null,
        videos: artifactData.videos || [],
      },
    ])
    .select();

  if (error) throw new Error(error.message);
  return data?.[0];
}

/**
 * Add multiple artifacts in bulk (Server only)
 */
export async function addArtifactsBulk(artifactsData: ArtifactData[]) {
  const supabase = await createAdminClient();

  const formattedData = artifactsData.map((artifact) => ({
    title: artifact.title,
    description: artifact.description || "",
    origin: artifact.origin || "",
    era: artifact.era || "",
    year_estimate: artifact.year_estimate || null,
    provenance: artifact.provenance || "",
    category: artifact.category,
    images: artifact.images || [],
    thumbnail_url: artifact.thumbnail_url || null,
    estimated_value: artifact.estimated_value,
    buy_now_price: artifact.buy_now_price || null,
    currency: artifact.currency || "USD",
    status: artifact.status || "available",
    is_featured: artifact.is_featured || false,
    slug: artifact.slug || null,
    story: artifact.story || null,
    videos: artifact.videos || [],
  }));

  const { data, error } = await supabase
    .from("artifacts")
    .insert(formattedData)
    .select();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Update an artifact (Server only)
 */
export async function updateArtifact(id: string, updates: Partial<ArtifactData>) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("artifacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Delete an artifact (Server only)
 */
export async function deleteArtifact(id: string) {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("artifacts")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/**
 * Add an auction (Server only)
 */
export async function addAuction(auctionData: AuctionData) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("auctions")
    .insert([
      {
        artifact_id: auctionData.artifact_id,
        title: auctionData.title,
        description: auctionData.description || null,
        start_time: auctionData.start_time,
        end_time: auctionData.end_time,
        starting_bid: auctionData.starting_bid,
        current_bid: auctionData.current_bid || auctionData.starting_bid,
        reserve_price: auctionData.reserve_price || null,
        bid_increment: auctionData.bid_increment || 100,
        status: auctionData.status || "upcoming",
      },
    ])
    .select();

  if (error) throw new Error(error.message);
  return data?.[0];
}

/**
 * Update auction bid (Server only)
 */
export async function updateAuctionBid(auctionId: string, newBid: number) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("auctions")
    .update({ current_bid: newBid })
    .eq("id", auctionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Close an auction (Server only)
 */
export async function closeAuction(auctionId: string, winnerId?: string) {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("auctions")
    .update({
      status: "ended",
      winner_id: winnerId || null,
    })
    .eq("id", auctionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
