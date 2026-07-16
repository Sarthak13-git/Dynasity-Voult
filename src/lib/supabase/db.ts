import { createClient } from "./client";

// Type definitions
export interface ArtifactData {
  id?: string;
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
  status?: "draft" | "archived" | "available" | "on_auction" | "sold" | "on_exhibition" | "reserved";
  is_featured?: boolean;
  slug?: string;
  story?: string;
  videos?: string[];
}

export interface AuctionData {
  id?: string;
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
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

  if (error) throw new Error(error.message);
  return data;
}

// ============ CLIENT-SIDE HELPER OPERATIONS ============

/**
 * Get auction by its artifact's slug (public - client component friendly)
 */
export async function getAuctionBySlug(slug: string) {
  const supabase = createClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  let auction = null;

  if (isUuid) {
    const { data, error } = await supabase
      .from("auctions")
      .select("*, artifacts(*)")
      .eq("id", slug)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    auction = data;
  }

  if (!auction) {
    const { data, error } = await supabase
      .from("auctions")
      .select("*, artifacts!inner(*)")
      .eq("artifacts.slug", slug)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    auction = data;
  }

  return auction;
}

/**
 * Place a bid on an auction (authenticated user client operation via API)
 */
export async function placeBid(auctionId: string, userId: string, amount: number) {
  const response = await fetch("/api/bids", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auction_id: auctionId,
      bid_amount: amount,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Failed to place bid");
  }
  return data.bid;
}

/**
 * Get bid history for an auction sorted by highest bid (public)
 */
export async function getBidHistory(auctionId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("bids")
    .select("*, profiles(display_name, email)")
    .eq("auction_id", auctionId)
    .order("amount", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}
