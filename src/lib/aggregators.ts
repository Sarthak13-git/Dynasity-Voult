import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Interface representing Homepage live database stats
 */
export interface HomepageStats {
  artifactsCount: number;
  collectionsCount: number;
  countriesCount: number;
  activeAuctionsCount: number;
}

/**
 * Fetches homepage statistics concurrently from the live database.
 * Consolidates multiple queries on the artifacts table into a single request
 * to optimize network utilization and database load.
 */
export async function fetchHomepageStats(supabase: SupabaseClient): Promise<HomepageStats> {
  const [
    { data: artifactsData, error: artErr },
    { count: activeAuctionsCount, error: aucErr }
  ] = await Promise.all([
    supabase.from("artifacts").select("seller_id, origin"),
    supabase.from("auctions").select("id", { count: "exact", head: true }).eq("status", "live")
  ]);

  if (artErr) console.error("Error fetching artifacts stats data:", artErr);
  if (aucErr) console.error("Error fetching active auctions count:", aucErr);

  const artifactsList = artifactsData || [];

  // Normalize origin values: trim, lowercase, filter out null/empty strings
  const normalizedOrigins = artifactsList
    .map(o => o.origin?.trim().toLowerCase())
    .filter((o): o is string => !!o);
  
  const uniqueOrigins = new Set(normalizedOrigins).size;
  const uniqueSellers = new Set(artifactsList.map(s => s.seller_id).filter(Boolean)).size;

  return {
    artifactsCount: artifactsList.length,
    collectionsCount: uniqueSellers,
    countriesCount: uniqueOrigins,
    activeAuctionsCount: activeAuctionsCount || 0,
  };
}

/**
 * Interface representing Seller Dashboard KPI values and trends
 */
export interface SellerKPIs {
  totalListed: number;
  listedChangeText: string;
  listedTrend: "up" | "down" | "neutral";
  
  completedSales: number;
  soldChangeText: string;
  soldTrend: "up" | "down" | "neutral";
  
  totalSalesVal: number;
  salesChangeText: string;
  salesTrend: "up" | "down" | "neutral";
  
  avgPrice: number;
  avgPriceChangeText: string;
  avgPriceTrend: "up" | "down" | "neutral";
}

/**
 * Strict TypeScript definition representing a Seller Artifact item
 */
export interface SellerArtifact {
  id: string;
  created_at: string;
  updated_at?: string | null;
  status: string;
  buy_now_price?: number | null;
  estimated_value?: number | null;
  [key: string]: any; // Allow indexing extra properties
}

/**
 * Computes all seller statistics, completed sales metrics, and average price trends
 * from the list of raw artifacts owned by the logged-in seller.
 * Protects against division by zero and correctly handles date window transitions.
 */
export function calculateSellerKPIs(products: SellerArtifact[]): SellerKPIs {
  const totalListed = products.length;
  const now = Date.now();
  
  // 1. Total Products Listed Change (Listed within the last 7 days)
  const listedLast7Days = products.filter(
    (p) => new Date(p.created_at).getTime() >= now - 7 * 24 * 60 * 60 * 1000
  ).length;
  const listedChangeText = listedLast7Days > 0 ? `+${listedLast7Days} new this week` : "0 new this week";
  const listedTrend = listedLast7Days > 0 ? "up" : "neutral";

  // 2. Completed Sales
  const soldProducts = products.filter((p) => p.status === "sold");
  const completedSales = soldProducts.length;
  
  const soldLast30Days = soldProducts.filter(
    (p) => new Date(p.updated_at || p.created_at).getTime() >= now - 30 * 24 * 60 * 60 * 1000
  ).length;
  const soldChangeText = soldLast30Days > 0 ? `+${soldLast30Days} sold this month` : "0 sold this month";
  const soldTrend = soldLast30Days > 0 ? "up" : "neutral";

  // 3. Total Sales Value & Growth (Current 30 Days vs Previous 30 Days)
  const totalSalesVal = soldProducts.reduce((sum, p) => sum + (p.buy_now_price || p.estimated_value || 0), 0);

  const salesValCurrent30Days = soldProducts
    .filter((p) => new Date(p.updated_at || p.created_at).getTime() >= now - 30 * 24 * 60 * 60 * 1000)
    .reduce((sum, p) => sum + (p.buy_now_price || p.estimated_value || 0), 0);

  const salesValPrevious30Days = soldProducts
    .filter((p) => {
      const time = new Date(p.updated_at || p.created_at).getTime();
      return time >= now - 60 * 24 * 60 * 60 * 1000 && time < now - 30 * 24 * 60 * 60 * 1000;
    })
    .reduce((sum, p) => sum + (p.buy_now_price || p.estimated_value || 0), 0);

  let salesChangeText = "0% this month";
  let salesTrend: "up" | "down" | "neutral" = "neutral";

  if (salesValPrevious30Days > 0) {
    const growth = ((salesValCurrent30Days - salesValPrevious30Days) / salesValPrevious30Days) * 100;
    if (growth > 0) {
      salesChangeText = `+${growth.toFixed(1)}% this month`;
      salesTrend = "up";
    } else if (growth < 0) {
      salesChangeText = `${growth.toFixed(1)}% this month`;
      salesTrend = "down";
    }
  } else if (salesValCurrent30Days > 0) {
    salesChangeText = "New this month";
    salesTrend = "up";
  }

  // 4. Avg. Price (Current 30 Days vs Previous 30 Days)
  // Calculated on active listings (available, reserved, on_auction, pending_auction_approval)
  const activeProducts = products.filter((p) => p.status !== "sold");
  const avgPrice = activeProducts.length > 0
    ? activeProducts.reduce((sum, p) => sum + (p.estimated_value || 0), 0) / activeProducts.length
    : 0;

  const current30DaysActive = activeProducts.filter(
    (p) => new Date(p.created_at).getTime() >= now - 30 * 24 * 60 * 60 * 1000
  );
  const previous30DaysActive = activeProducts.filter(
    (p) => {
      const time = new Date(p.created_at).getTime();
      return time >= now - 60 * 24 * 60 * 60 * 1000 && time < now - 30 * 24 * 60 * 60 * 1000;
    }
  );

  const avgPriceCurrent30Days = current30DaysActive.length > 0
    ? current30DaysActive.reduce((sum, p) => sum + (p.estimated_value || 0), 0) / current30DaysActive.length
    : 0;

  const avgPricePrevious30Days = previous30DaysActive.length > 0
    ? previous30DaysActive.reduce((sum, p) => sum + (p.estimated_value || 0), 0) / previous30DaysActive.length
    : 0;

  let avgPriceChangeText = "0% vs last month";
  let avgPriceTrend: "up" | "down" | "neutral" = "neutral";

  if (avgPricePrevious30Days > 0) {
    const growth = ((avgPriceCurrent30Days - avgPricePrevious30Days) / avgPricePrevious30Days) * 100;
    if (growth > 0) {
      avgPriceChangeText = `+${growth.toFixed(1)}% vs last month`;
      avgPriceTrend = "up";
    } else if (growth < 0) {
      avgPriceChangeText = `${growth.toFixed(1)}% vs last month`;
      avgPriceTrend = "down";
    }
  } else if (avgPriceCurrent30Days > 0) {
    avgPriceChangeText = "New listings this month";
    avgPriceTrend = "up";
  }

  return {
    totalListed,
    listedChangeText,
    listedTrend,
    completedSales,
    soldChangeText,
    soldTrend,
    totalSalesVal,
    salesChangeText,
    salesTrend,
    avgPrice,
    avgPriceChangeText,
    avgPriceTrend,
  };
}
