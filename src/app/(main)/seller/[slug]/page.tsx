import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BuyItem } from "@/lib/cart-store";
import BuyClient from "../../buy/BuyClient";
import { MapPin, Calendar, Award, Star, Users, ExternalLink, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("store_name, store_description")
    .eq("role", "seller");
  
  const seller = profiles?.find(s => {
    const sSlug = (s.store_name || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    return sSlug === slug;
  });

  const storeName = seller?.store_name || "Heritage Storefront";
  const bio = seller?.store_description || "Explore authenticated historical artifacts.";

  return {
    title: `${storeName} | Dynasity-Voult`,
    description: `Explore authenticated historical artifacts from ${storeName}. ${bio}`,
  };
}

export default async function SellerStorePage({ params }: PageProps) {
  const { slug } = await params;
  if (!slug) return notFound();

  const supabase = await createClient();

  // 1. Fetch all seller profiles to match slug
  const { data: sellers, error: sellerError } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "seller");

  if (sellerError || !sellers) {
    return notFound();
  }

  const seller = sellers.find(s => {
    const sSlug = (s.store_name || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    return sSlug === slug;
  });

  if (!seller || seller.status === "suspended") {
    return notFound();
  }

  // 2. Fetch country from approved verification request
  const { data: request } = await supabase
    .from("seller_verification_requests")
    .select("country")
    .eq("user_id", seller.id)
    .eq("status", "approved")
    .maybeSingle();

  const country = request?.country || "Worldwide";
  const joinedDate = new Date(seller.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // 3. Fetch products owned by seller that are available for direct sale
  const { data: artifacts, error: artError } = await supabase
    .from("artifacts")
    .select("*, auctions(id), auction_applications(id, status)")
    .eq("seller_id", seller.id)
    .eq("status", "available")
    .not("buy_now_price", "is", null);

  const eligibleArtifacts = (artifacts || []).filter((item: any) => {
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

  const sellerProducts: BuyItem[] = eligibleArtifacts.map((item: any) => {
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
      sellerStoreName: seller.store_name || undefined
    };
  });

  // 4. Fetch collections owned by seller that are public and published
  const { data: collections } = await supabase
    .from("collections")
    .select("*, collection_artifacts(artifact_id)")
    .eq("seller_id", seller.id)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  const sellerCollections = (collections || []).map((c: any) => ({
    id: c.id,
    title: c.title,
    slug: c.slug,
    description: c.description,
    cover_image_url: c.cover_image_url,
    product_count: c.collection_artifacts?.length || 0,
  }));

  return (
    <div className="min-h-screen bg-pandora-ivory pt-20">
      
      {/* ─── SELLER HEADER BANNER ─── */}
      <div className="relative h-[250px] w-full bg-pandora-charcoal overflow-hidden border-b border-pandora-gold/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(184,134,11,0.25)_0%,_transparent_70%)]" />
        <div className="mx-auto max-w-[1400px] h-full w-full px-6 lg:px-12 relative flex items-end pb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6 w-full">
            {/* Logo */}
            <div className="relative h-24 w-24 shrink-0 rounded-full border-2 border-pandora-gold bg-pandora-ivory shadow-xl overflow-hidden flex items-center justify-center -mb-16 md:-mb-12 z-10">
              {seller.avatar_url ? (
                <Image src={seller.avatar_url} alt="" fill className="object-cover" />
              ) : (
                <span className="font-serif text-3xl font-semibold text-pandora-charcoal">
                  {(seller.store_name || seller.display_name || "S")[0].toUpperCase()}
                </span>
              )}
            </div>

            {/* Title Metadata info */}
            <div className="text-left space-y-2 md:mb-2 flex-grow">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-3xl font-medium tracking-wide text-white">
                  {seller.store_name || "Heritage Storefront"}
                </h1>
                {seller.status === "active" && (
                  <span className="inline-flex items-center gap-1 rounded bg-pandora-gold/20 px-2.5 py-0.5 text-[10px] font-bold text-pandora-gold-light border border-pandora-gold/30 uppercase tracking-widest">
                    <Award size={10} className="fill-pandora-gold-light" />
                    Verified Partner
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-white/70">
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-pandora-gold" />
                  {country}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-pandora-gold" />
                  Joined {joinedDate}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN BODY WORKSPACE ─── */}
      <div className="mx-auto max-w-[1400px] px-6 lg:px-12 pt-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* LEFT: BIO & COLLECTIONS (8 cols) */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Bio info */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-pandora-charcoal">
                Curator Biography & Statement
              </h2>
              <p className="text-sm text-pandora-gray leading-relaxed text-justify">
                {seller.store_description || 
                  "This partner curator presents an exclusive collection of antiquities, fine art, and historic treasures. Every item Consigned undergoes rigorous documentation, stylistic review, and physical appraisal to maintain the highest standards of preservation."}
              </p>
            </div>

            {/* Collections Grid */}
            {sellerCollections.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xs font-bold uppercase tracking-wider text-pandora-charcoal">
                  Curated Collections ({sellerCollections.length})
                </h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {sellerCollections.map((collection) => (
                    <Link
                      key={collection.id}
                      href={`/collection/${collection.slug}`}
                      className="group relative block aspect-[16/9] w-full overflow-hidden bg-pandora-cream rounded-md border border-pandora-cream/40 shadow-sm transition-all duration-500 hover:shadow-md"
                    >
                      {collection.cover_image_url ? (
                        <Image
                          src={collection.cover_image_url}
                          alt={collection.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-pandora-charcoal to-pandora-charcoal/80 text-white/40">
                          <span className="font-serif italic text-sm">Curated Collection</span>
                        </div>
                      )}
                      {/* Dark Overlay with Title */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex flex-col justify-end p-4 z-10">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-pandora-gold">
                          {collection.product_count} {collection.product_count === 1 ? 'Object' : 'Objects'}
                        </p>
                        <h3 className="font-serif text-lg font-medium text-white tracking-wide mt-1">
                          {collection.title}
                        </h3>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: CREDENTIAL STATS SIDEBAR (4 cols) */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              
              {/* Stats Box */}
              <div className="bg-white border border-pandora-cream rounded-xl p-6 md:p-8 space-y-6 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-pandora-charcoal border-b border-pandora-cream pb-3">
                  Store Metrics
                </h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-pandora-gray block">Total Products</span>
                    <span className="font-serif text-2xl font-bold text-pandora-charcoal mt-1 block">
                      {sellerProducts.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-pandora-gray block">Collections</span>
                    <span className="font-serif text-2xl font-bold text-pandora-charcoal mt-1 block">
                      {sellerCollections.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-pandora-gray block">Rating</span>
                    <span className="font-serif text-2xl font-bold text-pandora-charcoal mt-1 block flex items-center gap-1.5">
                      4.9
                      <Star size={16} className="fill-pandora-gold text-pandora-gold -mt-1" />
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-pandora-gray block">Followers</span>
                    <span className="font-serif text-2xl font-bold text-pandora-charcoal mt-1 block flex items-center gap-1.5">
                      1.2K
                      <Users size={16} className="text-pandora-gold -mt-1" />
                    </span>
                  </div>
                </div>

                <div className="h-px bg-pandora-cream w-full" />

                {/* Placeholder Future-safe Social Links */}
                <div className="space-y-4">
                  <span className="text-[10px] uppercase tracking-wider text-pandora-gray block">External Contacts</span>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-pandora-gray flex items-center gap-1.5 hover:text-pandora-gold cursor-pointer transition-colors">
                      <Globe size={14} className="text-pandora-gold" />
                      Official Website
                      <ExternalLink size={10} className="opacity-50" />
                    </span>
                  </div>
                </div>

              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ─── DYNAMIC GALLERY REUSING BUYCLIENT ─── */}
      <div className="border-t border-pandora-cream/40 bg-white">
        <BuyClient
          buyItems={sellerProducts}
          hideHero={true}
        />
      </div>

    </div>
  );
}
