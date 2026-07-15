import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import SellerAuctionCommandCenterClient from "./SellerAuctionCommandCenterClient";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SellerAuctionCommandCenterPage({ params }: PageProps) {
  const { id: auctionId } = await params;
  if (!auctionId) {
    return notFound();
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return redirect(`/login?redirect=/seller/auctions/${auctionId}`);
  }

  // Load the user profile to check roles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return notFound();
  }

  // Fetch auction with artifacts in a single query to prevent N+1 queries
  const { data: auction, error: auctionError } = await supabase
    .from("auctions")
    .select(`
      *,
      artifacts:artifact_id (
        id,
        title,
        short_headline,
        description,
        estimated_value,
        seller_id,
        thumbnail_url,
        category,
        origin,
        era
      )
    `)
    .eq("id", auctionId)
    .maybeSingle();

  if (auctionError || !auction) {
    return notFound();
  }

  // Verify ownership server-side (Admins are also allowed to view command centers)
  const isOwner = auction.artifacts?.seller_id === user.id;
  const isAdmin = profile.role === "admin";

  if (!isOwner && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] flex items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center border border-[#E8E2D9] p-8 bg-white rounded-lg shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-650 mb-6">
            <span className="text-3xl font-serif font-bold">403</span>
          </div>
          <h1 className="font-serif text-3xl font-medium mb-4 text-pandora-charcoal">Access Forbidden</h1>
          <p className="text-sm text-pandora-gray mb-8 leading-relaxed">
            You do not have permission to access this seller command center. Only the owner of this artifact or system administrators are authorized to view these live bidding metrics.
          </p>
          <Link
            href="/seller/auctions"
            className="inline-flex items-center justify-center w-full px-6 py-3 border border-[#1A1A1A] bg-[#1A1A1A] text-white hover:bg-pandora-gold hover:border-pandora-gold transition-all uppercase tracking-wider text-xs font-semibold rounded-md shadow-sm"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Fetch initial bids chronologically (limit to 100 on initial load to optimize performance)
  const { data: initialBids, error: bidsError } = await supabase
    .from("bids")
    .select(`
      id,
      amount,
      user_id,
      created_at,
      profiles:user_id (
        display_name
      )
    `)
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: false });

  if (bidsError) {
    console.error("❌ Error loading initial bids:", bidsError);
  }

  // Fetch associated order to inspect payment settlement status
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, seller_earnings(id, payouts(id, status))")
    .eq("auction_id", auctionId)
    .maybeSingle();

  if (orderError) {
    console.error("❌ Error checking order settlement status:", orderError);
  }

  const formattedBids = (initialBids || []).map((bid: any) => {
    const profile = Array.isArray(bid.profiles) ? bid.profiles[0] : bid.profiles;
    return {
      id: bid.id,
      amount: Number(bid.amount),
      user_id: bid.user_id,
      created_at: bid.created_at,
      profiles: {
        display_name: profile?.display_name || "Collector"
      }
    };
  });

  return (
    <SellerAuctionCommandCenterClient
      initialAuction={auction}
      initialBids={formattedBids}
      initialOrder={order || null}
      userId={user.id}
      userRole={profile.role}
    />
  );
}
