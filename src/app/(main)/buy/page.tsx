import { createClient } from "@/lib/supabase/server";
import BuyClient from "./BuyClient";
import { BuyItem } from "@/lib/cart-store";

export const revalidate = 60; // Revalidate every minute

export default async function BuyPage() {
  const supabase = await createClient();
  
  const { data: artifacts, error } = await supabase
    .from("artifacts")
    .select(`
      *,
      seller:profiles!seller_id (
        store_name,
        status
      ),
      auctions (id),
      auction_applications (id, status)
    `)
    .not("buy_now_price", "is", null)
    .not("seller_id", "is", null)
    .eq("status", "available");

  let itemsToRender: BuyItem[] = [];

  if (artifacts && artifacts.length > 0) {
    // Exclude artifacts having any auction records or active auction applications
    const directSaleArtifacts = artifacts.filter((item: any) => {
      if (item.seller?.status === "suspended") return false;
      const hasAuction = item.auctions && item.auctions.length > 0;
      const hasActiveApplication = item.auction_applications && item.auction_applications.some(
        (app: any) => ["pending", "approved", "under_review"].includes(app.status)
      );
      return !hasAuction && !hasActiveApplication;
    });

    itemsToRender = directSaleArtifacts.map((item: any) => {
      const categoryMap: Record<string, string> = {
        antiquity: "Antiquities",
        sculpture: "Sculptures",
        manuscript: "Manuscripts",
        arms_and_armor: "Arms & Armor",
        decorative_art: "Decorative Arts",
        textile: "Textiles",
        objets_d_art: "Objets d'Art"
      };

      const mappedCategory = categoryMap[item.category] || item.category;

      return {
        id: item.id,
        slug: item.slug || item.id,
        title: item.title,
        description: item.description,
        shortHeadline: item.short_headline || undefined,
        historicalPeriod: item.historical_period || undefined,
        conditionReport: item.condition_report || undefined,
        ownershipHistory: item.ownership_history || undefined,
        provenance: item.provenance || undefined,
        price: item.buy_now_price || 0,
        formattedPrice: `$${(item.buy_now_price || 0).toLocaleString()}`,
        origin: item.origin,
        era: item.era,
        image: item.thumbnail_url || (item.images && item.images.length > 0 ? item.images[0] : "/buy/item-1.jpg"),
        images: item.images && item.images.length > 0 ? item.images : [item.thumbnail_url || "/buy/item-1.jpg"],
        category: mappedCategory,
        createdAt: item.created_at,
        sellerId: item.seller_id,
        sellerStoreName: item.seller?.store_name || undefined,
      };
    });
  }

  return <BuyClient buyItems={itemsToRender} />;
}