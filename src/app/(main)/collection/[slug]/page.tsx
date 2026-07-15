import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import BuyClient from "../../buy/BuyClient";
import { BuyItem } from "@/lib/cart-store";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CollectionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) return notFound();

  const supabase = await createClient();

  // 1. Fetch collection matching slug, joining seller profile status
  const { data: collection, error: collError } = await supabase
    .from("collections")
    .select(`
      *,
      seller:profiles!seller_id (
        status
      )
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (collError || !collection) {
    return notFound();
  }

  // Reject if collection owner is suspended
  if ((collection.seller as any)?.status === "suspended") {
    return notFound();
  }

  // Check visibility/status (unless caller is admin, but since this is a public page we enforce public rules)
  if (collection.status !== "published" || collection.visibility !== "public") {
    return notFound();
  }

  // 2. Fetch linked artifacts in correct sort order
  const { data: mappings, error: mapError } = await supabase
    .from("collection_artifacts")
    .select(`
      sort_order,
      artifacts (
        *,
        seller:profiles!seller_id (
          store_name,
          status
        ),
        auctions (id),
        auction_applications (id, status)
      )
    `)
    .eq("collection_id", collection.id)
    .order("sort_order", { ascending: true });

  if (mapError || !mappings) {
    return notFound();
  }

  // Extract artifacts and apply eligibility rules
  const rawArtifacts = mappings
    .map((m: any) => m.artifacts)
    .filter(Boolean);

  const eligibleArtifacts = rawArtifacts.filter((item: any) => {
    // Basic fields
    if (!item.seller_id || item.status !== "available" || !item.buy_now_price || item.seller?.status === "suspended") {
      return false;
    }
    // No active auction or auction applications
    const hasAuction = item.auctions && item.auctions.length > 0;
    const hasActiveApp = item.auction_applications && item.auction_applications.some(
      (app: any) => ["pending", "approved", "under_review"].includes(app.status)
    );
    return !hasAuction && !hasActiveApp;
  });

  const categoryMap: Record<string, string> = {
    antiquity: "Antiquities",
    sculpture: "Sculptures",
    manuscript: "Manuscripts",
    arms_and_armor: "Arms & Armor",
    decorative_art: "Decorative Arts",
    textile: "Textiles",
    objets_d_art: "Objets d'Art"
  };

  const itemsToRender: BuyItem[] = eligibleArtifacts.map((item: any) => {
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

  return (
    <BuyClient
      buyItems={itemsToRender}
      title={collection.title}
      description={collection.description || undefined}
      subtitle="Curated Collection"
    />
  );
}
