"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Clock, DollarSign, Award, Trophy } from "lucide-react";

export default function AuctionMetricsClient({
  initialAuction,
  initialBidCount,
}: {
  initialAuction: any;
  initialBidCount: number;
}) {
  const supabase = createClient();
  const [auction, setAuction] = useState(initialAuction);
  const [bidCount, setBidCount] = useState(initialBidCount);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    // 1. Subscribe to updates on the specific auction and bids
    const channel = supabase
      .channel(`realtime-metrics-${auction.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${auction.id}`,
        },
        (payload) => {
          console.log("Realtime auction update in details page:", payload.new);
          const updated = payload.new;
          
          // Toast if auction extended (anti-sniping)
          if (new Date(updated.end_time).getTime() > new Date(auction.end_time).getTime()) {
            setFeedback("Auction Extended");
            setTimeout(() => {
              setFeedback((prev) => (prev === "Auction Extended" ? "" : prev));
            }, 5000);
          }
          setAuction(updated);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${auction.id}`,
        },
        async () => {
          // Fetch bid count again from db
          const { count } = await supabase
            .from("bids")
            .select("id", { count: "exact", head: true })
            .eq("auction_id", auction.id);
          if (count !== null) setBidCount(count);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auction.id, auction.end_time, supabase]);

  // Clock ticking effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const startMs = new Date(auction.start_time).getTime();
  const endMs = new Date(auction.end_time).getTime();

  let derivedStatus: "scheduled" | "live" | "ended" = "scheduled";
  let timeLeftMs = 0;

  if (currentTime < startMs) {
    derivedStatus = "scheduled";
    timeLeftMs = startMs - currentTime;
  } else if (currentTime < endMs) {
    derivedStatus = "live";
    timeLeftMs = endMs - currentTime;
  } else {
    derivedStatus = "ended";
    timeLeftMs = 0;
  }

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return "00:00:00:00";
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    const pad = (n: number) => String(n).padStart(2, "0");
    return `${days > 0 ? `${days}d ` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  const reserveMet = auction.reserve_price
    ? (auction.current_bid || auction.starting_bid) >= auction.reserve_price
    : true;

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-8 border border-white/10 bg-white/5 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center rounded-xl my-8 relative">
      {/* Current Bid */}
      <div className="flex flex-col items-center justify-center p-4">
        <DollarSign size={24} className="text-pandora-gold-light mb-2" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">Current Bid</span>
        <span className="font-serif text-3xl font-medium text-pandora-gold-light">
          ${(auction.current_bid || auction.starting_bid).toLocaleString()}
        </span>
      </div>

      {/* Bid Count */}
      <div className="flex flex-col items-center justify-center p-4">
        <Award size={24} className="text-white/60 mb-2" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">Bids Count</span>
        <span className="font-serif text-3xl font-medium text-white">{bidCount}</span>
      </div>

      {/* Time Remaining */}
      <div className="flex flex-col items-center justify-center p-4 relative">
        <Clock size={24} className="text-white/60 mb-2" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">
          {derivedStatus === "live" ? "Time Remaining" : derivedStatus === "scheduled" ? "Starts In" : "Status"}
        </span>
        <span className="font-serif text-3xl font-medium text-white">
          {derivedStatus === "ended" ? "Ended" : formatCountdown(timeLeftMs)}
        </span>
        {feedback === "Auction Extended" && (
          <span className="absolute -bottom-1 text-[10px] font-semibold text-pandora-gold-light animate-bounce">
            🎉 Auction Extended!
          </span>
        )}
      </div>

      {/* Reserve Indicator */}
      <div className="flex flex-col items-center justify-center p-4">
        <Trophy size={24} className="text-white/60 mb-2" />
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-1">Reserve Status</span>
        <span className={`font-serif text-xl font-medium ${reserveMet ? "text-green-400" : "text-amber-500"}`}>
          {reserveMet ? "Reserve Met" : "Reserve Not Met"}
        </span>
      </div>
    </div>
  );
}
