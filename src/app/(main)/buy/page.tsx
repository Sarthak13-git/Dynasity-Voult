import { createClient } from "@/lib/supabase/server";
import BuyClient, { BuyItem } from "./BuyClient";
import { buyItems as fallbackBuyItems } from "@/lib/buy-data"; // Fallback in case DB is not seeded

export const revalidate = 60; // Revalidate every minute

export default async function BuyPage() {
  const supabase = await createClient();
  
  const { data: artifacts, error } = await supabase
    .from("artifacts")
    .select("*")
    .not("buy_now_price", "is", null)
    .eq("status", "available");

  let itemsToRender: BuyItem[] = [];

  if (artifacts && artifacts.length > 0) {
    itemsToRender = artifacts.map((item) => {
      // Map category back to human readable if needed, or use directly
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
        title: item.title,
        description: item.description,
        price: item.buy_now_price || 0,
        formattedPrice: `$${(item.buy_now_price || 0).toLocaleString()}`,
        origin: item.origin,
        era: item.era,
        image: item.images && item.images.length > 0 ? item.images[0] : "/buy/item-1.jpg",
        category: mappedCategory,
      };
    });
  } else {
    // If DB has not been seeded yet, fallback to local data
    itemsToRender = fallbackBuyItems;
  }

  return <BuyClient buyItems={itemsToRender} />;
}