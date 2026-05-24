import { createClient } from "./client";
import { createClient as createServerClient } from "./server";

// Type definitions
export interface ArtifactData {
  title: string;
  description?: string;
  origin?: string;
  era?: string;
  year_estimate?: string;
  provenance?: string;
  category: string;
  images?: string[];
  thumbnail_url?: string;
  estimated_value: number;
  buy_now_price?: number;
  currency?: string;
  status?: "archived" | "available" | "on_auction" | "sold" | "on_exhibition" | "reserved";
  is_featured?: boolean;
}

export interface AuctionData {
  artifact_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  starting_bid: number;
  current_bid?: number;
  reserve_price?: number;
  bid_increment?: number;
  status?: "upcoming" | "live" | "ended" | "cancelled";
}

// ============ CLIENT-SIDE OPERATIONS ============

/**
 * Get all artifacts (public - works in client components)
 */
export async function getAllArtifacts() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get a single artifact by ID (public)
 */
export async function getArtifactById(id: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all auctions (public)
 */
export async function getAllAuctions() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("auctions")
    .select("*, artifacts(*)")
    .order("start_time", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get auction by ID with artifact details
 */
export async function getAuctionById(id: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("auctions")
    .select("*, artifacts(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Search artifacts by title or category
 */
export async function searchArtifacts(query: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .or(`title.ilike.%${query}%,category.ilike.%${query}%`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get artifacts by category
 */
export async function getArtifactsByCategory(category: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// ============ SERVER-SIDE OPERATIONS (For admin/protected actions) ============

/**
 * Add a single artifact to database (Server only)
 * Requires authentication
 */
export async function addArtifact(artifactData: ArtifactData) {
  const supabase = await createServerClient();

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
      },
    ])
    .select();

  if (error) throw error;
  return data?.[0];
}

/**
 * Add multiple artifacts in bulk (Server only)
 */
export async function addArtifactsBulk(artifactsData: ArtifactData[]) {
  const supabase = await createServerClient();

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
  }));

  const { data, error } = await supabase
    .from("artifacts")
    .insert(formattedData)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Update an artifact (Server only)
 */
export async function updateArtifact(id: string, updates: Partial<ArtifactData>) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("artifacts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an artifact (Server only)
 */
export async function deleteArtifact(id: string) {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("artifacts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Add an auction (Server only)
 */
export async function addAuction(auctionData: AuctionData) {
  const supabase = await createServerClient();

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

  if (error) throw error;
  return data?.[0];
}

/**
 * Update auction bid (Server only)
 */
export async function updateAuctionBid(auctionId: string, newBid: number) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("auctions")
    .update({ current_bid: newBid })
    .eq("id", auctionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Close an auction (Server only)
 */
export async function closeAuction(auctionId: string, winnerId?: string) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("auctions")
    .update({
      status: "ended",
      winner_id: winnerId || null,
    })
    .eq("id", auctionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
