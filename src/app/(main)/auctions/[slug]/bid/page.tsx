"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { notFound, useRouter } from "next/navigation";
import { use } from "react";
import { Clock, Trophy, ArrowLeft, History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuctionBySlug, getBidHistory, placeBid } from "@/lib/supabase/db";

interface BidEntry {
  user: string;
  amount: number;
  time: string;
}

export default function BiddingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [dbAuction, setDbAuction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [bidCount, setBidCount] = useState(0);
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [feedback, setFeedback] = useState("");
  
  // Real-time ticking state
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Function to fetch current bid history
  const loadBidHistory = useCallback(async (auctionId: string) => {
    try {
      const bids = await getBidHistory(auctionId);
      setBidCount(bids.length);
      const formattedBids = bids.map((b: any) => ({
        user: b.profiles?.display_name || b.profiles?.email?.split("@")[0] || "Bidder",
        amount: b.amount,
        time: new Date(b.created_at).toLocaleTimeString()
      }));
      setBidHistory(formattedBids);
      if (formattedBids.length > 0) {
        const highest = formattedBids[0].amount;
        setCurrentHighestBid(highest);
      }
    } catch (err) {
      console.error("Error loading bid history:", err);
    }
  }, []);

  // 1. Fetch Auth User & Database Auction
  useEffect(() => {
    async function initPage() {
      try {
        // Get current auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, role")
            .eq("id", session.user.id)
            .single();
          
          setCurrentUser({
            id: session.user.id,
            email: session.user.email,
            displayName: profile?.display_name || session.user.email?.split("@")[0] || "User",
            role: profile?.role || "buyer"
          });
        }

        // Run on-demand activation & settlement triggers
        await supabase.rpc("activate_scheduled_auctions");
        await supabase.rpc("settle_expired_auctions");

        // Get auction from DB
        const auction = await getAuctionBySlug(slug);
        if (auction) {
          setDbAuction(auction);
          setCurrentHighestBid(auction.current_bid || auction.starting_bid);
          await loadBidHistory(auction.id);
        } else {
          // If no database auction exists, call notFound
          notFound();
        }
      } catch (err) {
        console.error("Error loading auction:", err);
      } finally {
        setLoading(false);
      }
    }

    initPage();
  }, [slug, supabase, loadBidHistory]);

  // 2. Real-time Subscription for DB Auction & Bids Updates
  useEffect(() => {
    if (!dbAuction) return;

    // Listen to INSERT on bids and UPDATE on auctions
    const channel = supabase
      .channel(`realtime-bidding-${dbAuction.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${dbAuction.id}`,
        },
        async (payload) => {
          console.log("Realtime bid received:", payload);
          await loadBidHistory(dbAuction.id);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${dbAuction.id}`,
        },
        async (payload) => {
          console.log("Realtime auction update received:", payload.new);
          const updatedAuction = payload.new;
          
          // Toast if auction extended (anti-sniping)
          setDbAuction((prevAuction: any) => {
            if (prevAuction && new Date(updatedAuction.end_time).getTime() > new Date(prevAuction.end_time).getTime()) {
              setFeedback("Auction Extended");
              setTimeout(() => {
                setFeedback((prev) => prev === "Auction Extended" ? "" : prev);
              }, 5000);
            }
            return updatedAuction;
          });
          
          setCurrentHighestBid(updatedAuction.current_bid || updatedAuction.starting_bid);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dbAuction, supabase, loadBidHistory]);

  // Timer loop updating currentTime
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePlaceBidAction = async (amount: number) => {
    if (!currentUser) {
      setFeedback("Please sign in to place a bid.");
      return;
    }
    if (!dbAuction) return;

    try {
      setFeedback("");
      await placeBid(dbAuction.id, currentUser.id, amount);
    } catch (err: any) {
      setFeedback(err.message || "Failed to submit bid to database.");
      console.error(err);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(bidAmount);

    if (isNaN(amount)) {
      setFeedback("Please enter a valid number.");
      return;
    }

    const minIncrement = dbAuction?.bid_increment || 100;
    const minBid = currentHighestBid === (dbAuction?.starting_bid || 0) && bidCount === 0
      ? dbAuction?.starting_bid
      : currentHighestBid + minIncrement;

    if (amount < minBid) {
      setFeedback(`Bid must be at least $${minBid.toLocaleString()}!`);
      return;
    }

    if (!currentUser) {
      setFeedback("You must be logged in to bid.");
      return;
    }

    if (confirm(`Are you sure you want to place a bid of $${amount.toLocaleString()}?`)) {
      handlePlaceBidAction(amount);
      setFeedback("");
      setBidAmount("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-pandora-charcoal flex items-center justify-center text-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pandora-gold"></div>
          <p className="mt-4 text-[13px] tracking-wider uppercase text-white/50">Loading Auction Room...</p>
        </div>
      </div>
    );
  }

  // Derive Lifecycle State
  const startTimeMs = dbAuction ? new Date(dbAuction.start_time).getTime() : 0;
  const endTimeMs = dbAuction ? new Date(dbAuction.end_time).getTime() : 0;
  
  let derivedStatus: "scheduled" | "live" | "ended" = "scheduled";
  let timeLeftMs = 0;
  
  if (dbAuction) {
    if (currentTime < startTimeMs) {
      derivedStatus = "scheduled";
      timeLeftMs = startTimeMs - currentTime;
    } else if (currentTime < endTimeMs) {
      derivedStatus = "live";
      timeLeftMs = endTimeMs - currentTime;
    } else {
      derivedStatus = "ended";
      timeLeftMs = 0;
    }
  }

  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return "00:00:00";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const pad = (n: number) => String(n).padStart(2, "0");
    
    return `${days > 0 ? `${days}d ` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const itemTitle = dbAuction?.title || "Premium Artifact";

  // Winner/Concluded view when ended
  if (derivedStatus === "ended") {
    const winner = bidHistory.length > 0 ? bidHistory[0] : null;
    return (
      <div className="min-h-screen bg-pandora-charcoal flex items-center justify-center text-white px-6">
        <div className="relative text-center p-12 max-w-lg w-full border border-pandora-gold/30 bg-pandora-charcoal-light/30 backdrop-blur-sm flex flex-col items-center">
          <Trophy size={48} className="text-pandora-gold-light mb-6" strokeWidth={1} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-pandora-gold-light mb-4">
            Auction Concluded
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-8">
            {winner ? "The Winner Is" : "No Bids Placed"}
          </h1>
          
          {winner ? (
            <div className="w-full border-t border-b border-white/10 py-6 mb-8">
              <p className="font-serif text-3xl font-medium text-white mb-2">
                {winner.user}
              </p>
              <p className="text-[13px] uppercase tracking-[0.2em] text-white/60 mb-4">
                Winning Bid
              </p>
              <p className="font-serif text-4xl font-medium text-pandora-gold-light">
                ${winner.amount.toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="w-full border-t border-b border-white/10 py-6 mb-8 text-white/60 font-serif italic text-lg">
              No bids were placed on this artifact.
            </div>
          )}
          
          <button
            onClick={() => router.push("/auctions")}
            className="group inline-flex items-center gap-3 border border-pandora-gold px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-pandora-gold transition-all hover:bg-pandora-gold hover:text-white"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            Return to Auctions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pandora-charcoal text-white selection:bg-pandora-gold selection:text-white pb-24">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-8 border-b border-white/10">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 hover:text-pandora-gold transition-colors"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-pandora-gold-light animate-pulse">
          {derivedStatus === "live" ? "🔴 Live Database Auction" : "⏳ Scheduled Auction"}
        </p>
        <div className="w-20" />
      </header>

      <main className="mx-auto max-w-[1200px] px-6 lg:px-12 mt-16">
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl md:text-6xl font-medium text-white mb-4">
            {itemTitle}
          </h1>
          <p className="text-[13px] uppercase tracking-[0.2em] text-white/50">
            Premium Archive
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Bidding Form */}
          <div className="lg:col-span-7 space-y-12">
            
            {/* Status Panel */}
            <div className="border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <Clock size={18} className="text-pandora-gold-light" />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-pandora-gold-light">
                  Bidding Status
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    Current Highest Bid
                  </p>
                  <p className="font-serif text-4xl font-medium text-pandora-gold-light">
                    ${currentHighestBid.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    {derivedStatus === "live" ? "Time Remaining" : "Starts In"}
                  </p>
                  <p className="font-serif text-3xl font-medium text-white flex items-baseline gap-2">
                    {formatTimeRemaining(timeLeftMs)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    Total Bids
                  </p>
                  <p className="font-serif text-2xl font-medium text-white">
                    {bidCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Place Bid Panel */}
            <div className="border border-pandora-gold/20 bg-pandora-gold/5 p-8 backdrop-blur-sm">
              {derivedStatus === "scheduled" ? (
                <div className="text-center py-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pandora-gold-light mb-2">
                    Bidding Begins Soon
                  </p>
                  <p className="text-[13px] text-white/60 font-serif italic">
                    The bidding controls will automatically activate once the start time arrives.
                  </p>
                </div>
              ) : !currentUser ? (
                <div className="text-center py-6">
                  <p className="text-[13px] text-white/60 mb-6 font-serif italic">
                    You must be logged in to participate in the auction.
                  </p>
                  <button
                    onClick={() => router.push(`/login?redirect=/auctions/${slug}/bid`)}
                    className="inline-block border border-pandora-gold px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-pandora-gold hover:bg-pandora-gold hover:text-white transition-all"
                  >
                    Sign In to Bid
                  </button>
                </div>
              ) : (
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-pandora-gold-light mb-4">
                    Place Your Bid
                  </h2>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div>
                      <label htmlFor="bid-amount" className="block text-[11px] uppercase tracking-[0.2em] text-white/60 mb-3">
                        Enter bid amount (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-serif text-xl">$</span>
                        <input
                          type="number"
                          id="bid-amount"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(e.target.value)}
                          placeholder={`${currentHighestBid + (dbAuction?.bid_increment || 100)}`}
                          required
                          className="w-full bg-transparent border-b border-white/20 px-10 py-4 text-2xl font-serif text-white focus:outline-none focus:border-pandora-gold-light transition-colors placeholder:text-white/20"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      className="group relative w-full overflow-hidden border border-pandora-gold px-8 py-5 text-[12px] font-semibold uppercase tracking-[0.15em] text-pandora-gold transition-all hover:bg-pandora-gold hover:text-white mt-4"
                    >
                      <span className="relative z-10">Submit Bid</span>
                    </button>
                  </form>
                </div>
              )}

              {feedback && (
                <p className={`mt-4 text-[13px] font-medium tracking-wide ${feedback === "Auction Extended" ? "text-pandora-gold-light animate-bounce" : "text-red-400"}`}>
                  {feedback === "Auction Extended" ? "🎉 Auction Extended (Anti-Sniping Overtime)!" : feedback}
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Bid History */}
          <div className="lg:col-span-5">
            <div className="border border-white/10 bg-black/20 p-8 h-full min-h-[500px]">
              <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
                <History size={18} className="text-white/60" />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
                  Bid History
                </h2>
              </div>
              
              <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {bidHistory.length === 0 ? (
                  <p className="text-[13px] text-white/40 italic font-serif">
                    No bids placed yet. Be the first to bid.
                  </p>
                ) : (
                  bidHistory.map((entry, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between pb-4 border-b ${idx === 0 ? 'border-pandora-gold/30' : 'border-white/5'}`}
                    >
                      <div>
                        <p className={`font-serif text-lg ${idx === 0 ? 'text-pandora-gold-light' : 'text-white'}`}>
                          {entry.user}
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.1em] text-white/40 mt-1">
                          {entry.time}
                        </p>
                      </div>
                      <p className={`font-serif text-xl ${idx === 0 ? 'text-pandora-gold-light font-medium' : 'text-white/70'}`}>
                        ${entry.amount.toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
