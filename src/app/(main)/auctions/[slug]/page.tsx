import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PublicAuctionDetailClient from "./PublicAuctionDetailClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function AuctionDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  if (!slug) return notFound();

  const supabase = await createClient();

  // 1. Run on-demand activation & settlement triggers dynamically
  try {
    await supabase.rpc("activate_scheduled_auctions");
    await supabase.rpc("settle_expired_auctions");
  } catch (rpcErr) {
    console.error("RPC activation/settlement triggers failed:", rpcErr);
  }

  // 2. Query dynamic lot parameters joining artifact_media and documents
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  let auction: any = null;

  if (isUuid) {
    const { data } = await supabase
      .from("auctions")
      .select(`
        *,
        artifacts (
          *,
          artifact_media (*),
          artifact_documents (*)
        ),
        orders:orders(id, status, seller_earnings(id, payouts(id, status)))
      `)
      .eq("id", slug)
      .maybeSingle();
    auction = data;
  }

  if (!auction) {
    const { data } = await supabase
      .from("auctions")
      .select(`
        *,
        artifacts!inner (
          *,
          artifact_media (*),
          artifact_documents (*)
        ),
        orders:orders(id, status, seller_earnings(id, payouts(id, status)))
      `)
      .eq("artifacts.slug", slug)
      .maybeSingle();
    auction = data;
  }

  // 3. Security Verification: Reject unpublished, pending approval, or cancelled auctions
  if (!auction || !auction.artifacts) {
    return notFound();
  }

  if (auction.status === "cancelled") {
    return notFound();
  }

  // Pending approval, draft, or rejected auctions are strictly hidden from the public
  if (
    auction.artifacts.status === "pending_auction_approval" || 
    auction.artifacts.status === "rejected"
  ) {
    return notFound();
  }

  // 4. Fetch user authentication session and verify watchlist (favorites) status
  const { data: { user } } = await supabase.auth.getUser();
  let initialWatched = false;

  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("artifact_id", auction.artifacts.id)
      .maybeSingle();
    initialWatched = !!fav;
  }

  // 5. Fetch chronological bids log
  const { data: bidsData } = await supabase
    .from("bids")
    .select(`
      id,
      amount,
      created_at,
      profiles:user_id (
        display_name
      )
    `)
    .eq("auction_id", auction.id)
    .order("created_at", { ascending: false });

  const bids = (bidsData || []).map((b: any) => {
    const profile = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
    return {
      id: b.id,
      amount: Number(b.amount),
      user_id: b.user_id,
      created_at: b.created_at,
      profiles: {
        display_name: profile?.display_name || "Collector"
      }
    };
  });

  // 6. Query related active/live lots in similar category/era/origin
  const currentCategory = auction.artifacts.category;
  const currentEra = auction.artifacts.era;
  const currentOrigin = auction.artifacts.origin;

  const { data: relatedData } = await supabase
    .from("auctions")
    .select(`
      id,
      title,
      status,
      starting_bid,
      current_bid,
      end_time,
      artifacts!inner (
        id,
        title,
        thumbnail_url,
        category,
        origin,
        era,
        slug
      )
    `)
    .eq("status", "live")
    .neq("id", auction.id)
    .or(`category.eq.${currentCategory},origin.eq.${currentOrigin}`, { foreignTable: "artifacts" })
    .limit(4);

  let relatedAuctions = relatedData || [];

  // Fallback to load any active public lot if similar matches are fewer than 4
  if (relatedAuctions.length < 4) {
    const excludeIds = [auction.id, ...relatedAuctions.map((r) => r.id)];
    const { data: fallbackRelated } = await supabase
      .from("auctions")
      .select(`
        id,
        title,
        status,
        starting_bid,
        current_bid,
        end_time,
        artifacts!inner (
          id,
          title,
          thumbnail_url,
          category,
          origin,
          era,
          slug
        )
      `)
      .eq("status", "live")
      .not("id", "in", `(${excludeIds.join(",")})`)
      .limit(4 - relatedAuctions.length);

    if (fallbackRelated) {
      relatedAuctions = [...relatedAuctions, ...fallbackRelated];
    }
  }

  // 7. Render dynamic wrapper client component
  return (
    <PublicAuctionDetailClient
      initialAuction={auction}
      initialBids={bids}
      relatedAuctions={relatedAuctions}
      initialWatched={initialWatched}
      userId={user?.id || null}
    />
  );
}
