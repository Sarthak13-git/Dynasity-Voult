import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) return notFound();

  const supabase = await createClient();

  // 1. Fetch artifact matching slug or id, joining related models
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  let query = supabase
    .from("artifacts")
    .select(`
      *,
      seller:profiles!seller_id (
        id,
        display_name,
        email,
        avatar_url,
        store_name,
        status
      ),
      auctions (id, status),
      auction_applications (id, status)
    `)
    .not("seller_id", "is", null);

  if (isUuid) {
    query = query.eq("id", slug);
  } else {
    query = query.eq("slug", slug);
  }

  const { data: artifact, error } = await query.maybeSingle();

  if (error || !artifact || artifact.seller?.status === "suspended") {
    return notFound();
  }

  // 2. Relational safety check: redirect to auction if it is an auction item
  const hasAuction = artifact.auctions && artifact.auctions.length > 0;
  if (hasAuction) {
    const auction = artifact.auctions[0];
    return redirect(`/auctions/${auction.slug || auction.id}`);
  }

  // If has application that is active (approved, pending, under_review), also redirect or protect
  const hasActiveApp = artifact.auction_applications && artifact.auction_applications.some((app: any) => ["pending", "approved", "under_review"].includes(app.status));
  if (hasActiveApp) {
    return redirect("/auctions");
  }

  // 3. Fetch current user session and check if favorited
  const { data: { user } } = await supabase.auth.getUser();
  let isFavorited = false;
  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("artifact_id", artifact.id)
      .maybeSingle();
    isFavorited = !!fav;
  }

  const { data: relatedRaw } = await supabase
    .from("artifacts")
    .select("*, auctions(id), auction_applications(id, status)")
    .eq("category", artifact.category)
    .eq("status", "available")
    .not("seller_id", "is", null)
    .neq("id", artifact.id)
    .neq("title", artifact.title)
    .limit(4);


  // Filter out any related item with auction links
  const relatedItems = (relatedRaw || [])
    .filter((item: any) => {
      const hasAuc = item.auctions && item.auctions.length > 0;
      const hasActiveAppRel = item.auction_applications && item.auction_applications.some(
        (app: any) => ["pending", "approved", "under_review"].includes(app.status)
      );
      return !hasAuc && !hasActiveAppRel;
    })
    .map((item: any) => ({
      id: item.id,
      slug: item.slug || item.id,
      title: item.title,
      description: item.description,
      price: item.buy_now_price || 0,
      formattedPrice: `$${(item.buy_now_price || 0).toLocaleString()}`,
      origin: item.origin,
      era: item.era,
      image: item.thumbnail_url || (item.images && item.images.length > 0 ? item.images[0] : "/buy/item-1.jpg"),
      category: item.category,
    }));

  const { data: dbDocs } = await supabase
    .from("artifact_documents")
    .select("*")
    .eq("artifact_id", artifact.id)
    .order("created_at", { ascending: true });

  const { data: dbProv } = await supabase
    .from("artifact_provenance")
    .select("*")
    .eq("artifact_id", artifact.id)
    .order("sort_order", { ascending: true });

  return (
    <ProductDetailClient
      artifact={artifact}
      isFavorited={isFavorited}
      relatedProducts={relatedItems}
      userId={user?.id || null}
      documents={dbDocs || []}
      provenance={dbProv || []}
    />
  );
}
