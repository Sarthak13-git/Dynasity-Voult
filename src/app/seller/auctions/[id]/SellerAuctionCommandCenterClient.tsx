"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, TrendingUp, Users, ShoppingBag, Radio, ShieldAlert, BarChart3, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getAuctionDisplayStatus } from "@/lib/auction-status";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export interface Bid {
  id: string;
  amount: number;
  user_id: string;
  created_at: string;
  profiles: {
    display_name: string;
  };
}

interface SellerAuctionCommandCenterClientProps {
  initialAuction: any;
  initialBids: Bid[];
  initialOrder: any;
  userId: string;
  userRole: string;
}

export default function SellerAuctionCommandCenterClient({
  initialAuction,
  initialBids,
  initialOrder,
  userId,
  userRole,
}: SellerAuctionCommandCenterClientProps) {
  const supabase = createClient();
  const [mounted, setMounted] = useState(false);

  // Live state managers
  const [auctionState, setAuctionState] = useState(initialAuction);
  const [bidsState, setBidsState] = useState<Bid[]>(initialBids);
  const [orderState, setOrderState] = useState(initialOrder);
  const [realtimeState, setRealtimeState] = useState<"live" | "reconnecting" | "offline">("offline");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;
  
  // Timing / Countdown
  const [clockOffset, setClockOffset] = useState(0);
  const [timeText, setTimeText] = useState("Loading timer...");
  const displayStatus = useMemo(() => {
    return getAuctionDisplayStatus({
      ...auctionState,
      orders: orderState
    }, clockOffset);
  }, [auctionState, orderState, clockOffset]);

  useEffect(() => {
    setMounted(true);
    
    // Calculate server clock drift/skew offset
    async function syncClock() {
      try {
        const startFetch = Date.now();
        const res = await fetch("/api/settings");
        const serverHeader = res.headers.get("Date");
        if (serverHeader) {
          const serverDate = new Date(serverHeader);
          const roundTrip = Date.now() - startFetch;
          const drift = serverDate.getTime() - (startFetch + roundTrip / 2);
          setClockOffset(drift);
        }
      } catch (err) {
        console.error("Failed to sync clock offset:", err);
      }
    }
    syncClock();
  }, []);

  // Supabase Realtime Channel Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`auction-bids-command-${auctionState.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bids",
          filter: `auction_id=eq.${auctionState.id}`
        },
        async (payload: any) => {
          try {
            // Fetch bidder profile name concurrently
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", payload.new.user_id)
              .single();

            const newBid: Bid = {
              id: payload.new.id,
              amount: Number(payload.new.amount),
              user_id: payload.new.user_id,
              created_at: payload.new.created_at,
              profiles: {
                display_name: profile?.display_name || "Collector"
              }
            };

            // Update local timeline state (append to top since newest first)
            setBidsState((prev) => [newBid, ...prev]);

            // Sync anti-sniping extensions by querying auctions table selectively
            const { data: updatedAuction } = await supabase
              .from("auctions")
              .select("end_time, current_bid, highest_bidder_id, last_bid_at, status")
              .eq("id", auctionState.id)
              .single();
            
            if (updatedAuction) {
              setAuctionState((prev: any) => ({
                ...prev,
                end_time: updatedAuction.end_time,
                current_bid: updatedAuction.current_bid,
                highest_bidder_id: updatedAuction.highest_bidder_id,
                last_bid_at: updatedAuction.last_bid_at,
                status: updatedAuction.status
              }));
            }
          } catch (err) {
            console.error("Error processing realtime bid insert:", err);
          }
        }
      );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setRealtimeState("live");
      } else if (status === "TIMED_OUT") {
        setRealtimeState("reconnecting");
      } else {
        setRealtimeState("offline");
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionState.id, supabase]);

  // Sync / refetch trigger for reconnects
  useEffect(() => {
    if (realtimeState === "live" && bidsState.length > 0) {
      // Re-fetch in case we missed bids while disconnected
      async function resyncData() {
        const { data: latestBids } = await supabase
          .from("bids")
          .select("*, profiles(display_name)")
          .eq("auction_id", auctionState.id)
          .order("created_at", { ascending: false });
        if (latestBids) setBidsState(latestBids);
      }
      resyncData();
    }
  }, [realtimeState, auctionState.id, supabase]);

  // Interval timer ticks (run client clock + drift offset)
  useEffect(() => {
    const timer = setInterval(() => {
      const serverNow = Date.now() + clockOffset;
      const startTime = new Date(auctionState.start_time).getTime();
      const endTime = new Date(auctionState.end_time).getTime();
      
      const displayStatus = getAuctionDisplayStatus({
        ...auctionState,
        orders: orderState
      }, clockOffset);

      let timeDiff = 0;

      // Status Logic Mapping
      if (serverNow < startTime) {
        timeDiff = startTime - serverNow;
      } else if (serverNow >= startTime && serverNow <= endTime) {
        timeDiff = endTime - serverNow;
      } else {
        timeDiff = 0;
      }

      // Format Countdown Text
      if (timeDiff <= 0) {
        if (displayStatus === "Paid Out") setTimeText("Payout Processed (Settled)");
        else if (displayStatus === "Sold") setTimeText("Payment Received");
        else if (displayStatus === "Awaiting Payment") setTimeText("Awaiting Checkout");
        else if (displayStatus === "Unsold") setTimeText("Expired (Unsold)");
        else setTimeText("Auction Closed");
      } else {
        const d = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
        const h = Math.floor((timeDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const m = Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000));
        const s = Math.floor((timeDiff % (60 * 1000)) / 1000);

        const dString = d > 0 ? `${d}d ` : "";
        const hString = String(h).padStart(2, "0");
        const mString = String(m).padStart(2, "0");
        const sString = String(s).padStart(2, "0");

        if (displayStatus === "Scheduled") {
          setTimeText(`Opens in ${dString}${hString}h ${mString}m ${sString}s`);
        } else if (displayStatus === "Extended") {
          setTimeText(`OVERTIME: ${hString}:${mString}:${sString}`);
        } else {
          setTimeText(`${dString}${hString}h ${mString}m ${sString}s remaining`);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auctionState.start_time, auctionState.end_time, clockOffset, orderState, auctionState.last_bid_at]);

  // Memoized Analytics Calculations
  const stats = useMemo(() => {
    const totalBids = bidsState.length;
    const uniqueBidders = new Set(bidsState.map((b) => b.user_id)).size;
    const highestBid = bidsState.length > 0 ? bidsState[0].amount : 0;
    const lowestBid = bidsState.length > 0 ? bidsState[bidsState.length - 1].amount : 0;
    const averageBid = totalBids > 0 ? bidsState.reduce((sum, b) => sum + Number(b.amount), 0) / totalBids : 0;

    // Median calculation
    let medianBid = 0;
    if (totalBids > 0) {
      const sorted = [...bidsState].map((b) => Number(b.amount)).sort((a, b) => a - b);
      const half = Math.floor(sorted.length / 2);
      medianBid = sorted.length % 2 !== 0 ? sorted[half] : (sorted[half - 1] + sorted[half]) / 2;
    }

    // Bid Frequency (Bids per hour)
    const start = new Date(auctionState.start_time).getTime();
    const end = new Date(auctionState.end_time).getTime();
    const elapsedHours = Math.max((Math.min(Date.now() + clockOffset, end) - start) / (65 * 60 * 1000), 0.1);
    const bidFrequency = totalBids / elapsedHours;

    // Volume
    const biddingVolume = bidsState.reduce((sum, b) => sum + Number(b.amount), 0);

    // Reserve Met
    const reservePrice = auctionState.reserve_price ? Number(auctionState.reserve_price) : 0;
    const reserveProgress = reservePrice > 0 ? Math.min((highestBid / reservePrice) * 100, 100) : 100;
    const reserveMet = reservePrice > 0 ? highestBid >= reservePrice : true;

    return {
      totalBids,
      uniqueBidders,
      highestBid,
      lowestBid,
      averageBid,
      medianBid,
      bidFrequency,
      biddingVolume,
      reserveProgress,
      reserveMet,
    };
  }, [bidsState, auctionState.start_time, auctionState.end_time, auctionState.reserve_price, clockOffset]);

  // Mask bidder display names
  const maskBidderName = (name: string): string => {
    if (!name) return "Anonymous Collector";
    const parts = name.split(" ");
    return parts
      .map((part) => {
        if (part.length <= 2) return part + "***";
        return part[0] + "***" + part[part.length - 1];
      })
      .join(" ");
  };

  const formatPrice = (val: number) => {
    return val.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  };

  // Recharts Chronological Data
  const chartData = useMemo(() => {
    return [...bidsState]
      .reverse()
      .map((bid, index) => ({
        name: `Bid #${index + 1}`,
        amount: Number(bid.amount),
        time: new Date(bid.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));
  }, [bidsState]);

  // Paginated timeline rows
  const paginatedBids = useMemo(() => {
    return bidsState.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [bidsState, currentPage]);

  const totalPages = Math.ceil(bidsState.length / itemsPerPage);

  const statusLabelMap: Record<string, { text: string; style: string }> = {
    "Pending Approval": { text: "Pending Approval", style: "bg-amber-100 text-amber-800 border-amber-300" },
    "Scheduled": { text: "Scheduled", style: "bg-blue-100 text-blue-800 border-blue-300" },
    "Live": { text: "Live Feed", style: "bg-green-105 text-green-700 border-green-300 animate-pulse-slow" },
    "Extended": { text: "Overtime (Extended)", style: "bg-amber-100 text-amber-700 border-amber-300 animate-pulse" },
    "Unsold": { text: "Closed (Unsold)", style: "bg-gray-100 text-gray-750 border-gray-300" },
    "Awaiting Payment": { text: "Awaiting Payment", style: "bg-purple-100 text-purple-700 border-purple-300 animate-pulse" },
    "Sold": { text: "Sold", style: "bg-green-100 text-green-700 border-green-350" },
    "Paid Out": { text: "Paid Out (Settled)", style: "bg-pandora-cream text-pandora-gold border-pandora-gold/30" },
    "Cancelled": { text: "Cancelled", style: "bg-red-100 text-red-700 border-red-300" },
    "Rejected": { text: "Rejected", style: "bg-red-100 text-red-700 border-red-300" },
  };

  const statusLabel = statusLabelMap[displayStatus] || { text: displayStatus, style: "bg-gray-100 text-gray-700 border-gray-300" };

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-16">
      
      {/* ─── BREADCRUMB / LIVE STATUS INDICATOR ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link
          href="/seller/auctions"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pandora-gray hover:text-pandora-gold transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Auctions List</span>
        </Link>

        {/* Realtime Status Connection */}
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest bg-white border border-gray-200 shadow-sm px-3.5 py-1.5 rounded-full">
          <span className={`h-2.5 w-2.5 rounded-full ${
            realtimeState === "live"
              ? "bg-green-600 animate-ping-slow"
              : realtimeState === "reconnecting"
                ? "bg-amber-500 animate-pulse"
                : "bg-red-600"
          }`} />
          <span className="text-gray-700">
            {realtimeState === "live" ? "Live Feed" : realtimeState === "reconnecting" ? "Reconnecting..." : "Offline"}
          </span>
        </div>
      </div>

      {/* ─── DASHBOARD HEADER ─── */}
      <div className="bg-pandora-charcoal text-white rounded-lg p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md border border-pandora-gold/10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-medium tracking-wide">
              {auctionState.artifacts?.title || auctionState.title}
            </h1>
            <span className={`px-3.5 py-1 rounded text-xs font-bold border uppercase tracking-wider ${statusLabel.style}`}>
              {statusLabel.text}
            </span>
          </div>
          <p className="text-white/60 text-sm mt-2 max-w-xl italic">
            {auctionState.artifacts?.short_headline || "Luxury Curation Showcase Listing"}
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center md:text-right min-w-[220px]">
          <span className="text-[10px] uppercase tracking-[0.25em] text-white/40 block">Time Metrics</span>
          <span className="text-lg font-bold font-serif text-pandora-gold-light mt-1.5 block tracking-wider">
            {timeText}
          </span>
          <span className="text-[10px] text-white/50 mt-1 block">
            Ends: {new Date(auctionState.end_time).toLocaleDateString()} {new Date(auctionState.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* ─── LIVE SUMMARY BAR ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm text-center">
        {[
          { label: "Starting Bid", val: formatPrice(auctionState.starting_bid) },
          { label: "Current Bid", val: stats.highestBid > 0 ? formatPrice(stats.highestBid) : "—" },
          { label: "Reserve Price", val: auctionState.reserve_price ? formatPrice(auctionState.reserve_price) : "No Reserve" },
          { 
            label: "Reserve Status", 
            val: auctionState.reserve_price 
              ? (stats.reserveMet ? "Reserve Met ✅" : "Below Reserve ⚠️") 
              : "Met (No Reserve)"
          },
          { label: "Increment", val: formatPrice(auctionState.bid_increment) },
          { label: "Started At", val: new Date(auctionState.start_time).toLocaleDateString() },
          { label: "Ends At", val: new Date(auctionState.end_time).toLocaleDateString() },
          { 
            label: "Last Bid Time", 
            val: auctionState.last_bid_at 
              ? new Date(auctionState.last_bid_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) 
              : "No Bids" 
          },
        ].map((item, idx) => (
          <div key={idx} className="border-r last:border-0 border-gray-100 pr-2">
            <span className="text-[9px] uppercase tracking-wider text-gray-400 block font-semibold">{item.label}</span>
            <span className="text-xs font-bold text-gray-900 mt-1 block truncate">{item.val}</span>
          </div>
        ))}
      </div>

      {/* ─── KPI GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Current / Highest Bid", value: stats.highestBid > 0 ? formatPrice(stats.highestBid) : "—", desc: "Starting bid set to " + formatPrice(auctionState.starting_bid), icon: TrendingUp, style: "text-green-600 bg-green-50" },
          { label: "Bids Activity", value: stats.totalBids.toString(), desc: `${stats.uniqueBidders} unique private collectors bidding`, icon: Users, style: "text-blue-600 bg-blue-50" },
          { label: "Average Bid Value", value: stats.averageBid > 0 ? formatPrice(stats.averageBid) : "—", desc: `Total volume: ${formatPrice(stats.biddingVolume)}`, icon: ShoppingBag, style: "text-purple-600 bg-purple-50" },
          { 
            label: "Reserve Progress", 
            value: auctionState.reserve_price ? `${stats.reserveProgress.toFixed(0)}%` : "N/A", 
            desc: auctionState.reserve_price 
              ? (stats.reserveMet ? "Reserve price condition met" : `Locked: Needs ${formatPrice(Number(auctionState.reserve_price))}`)
              : "No reserve constraints set", 
            icon: CheckCircle2, 
            style: stats.reserveMet ? "text-amber-600 bg-amber-50" : "text-gray-600 bg-gray-50" 
          },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{kpi.label}</span>
              <p className="text-3xl font-bold font-serif text-gray-900">{kpi.value}</p>
              <span className="text-[11px] text-gray-500 block leading-tight">{kpi.desc}</span>
            </div>
            <div className={`p-3 rounded-lg ${kpi.style}`}>
              <kpi.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* ─── LIVE BID TIMELINE & ANALYTICS CHARTS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Timeline (Takes up 2 cols on desktop) */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col justify-between">
          <div className="border-b px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-950 font-serif tracking-wide">Live Bidding Timeline</h3>
            <span className="text-xs bg-gray-150 px-2.5 py-1 rounded text-gray-650 font-semibold">{bidsState.length} total bids</span>
          </div>

          {bidsState.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 text-center">
              <div className="h-16 w-16 bg-[#FDFBF7] border border-dashed border-pandora-gold/40 flex items-center justify-center rounded-full text-2xl mb-4">🏛️</div>
              
              {displayStatus === "Scheduled" ? (
                <>
                  <h4 className="font-serif text-xl font-medium text-pandora-charcoal">Auction Scheduled</h4>
                  <p className="text-xs text-pandora-gray mt-2 max-w-sm leading-relaxed">
                    This curation showcase is scheduled to open soon. Live bidder timelines will initialize once the countdown closes.
                  </p>
                </>
              ) : (displayStatus === "Unsold" || displayStatus === "Cancelled") ? (
                <>
                  <h4 className="font-serif text-xl font-medium text-pandora-charcoal">No Bids Placed</h4>
                  <p className="text-xs text-pandora-gray mt-2 max-w-sm leading-relaxed">
                    This auction completed without any bids. The curation application has closed.
                  </p>
                </>
              ) : (
                <>
                  <h4 className="font-serif text-xl font-medium text-pandora-charcoal">No Live Bids Placed</h4>
                  <p className="text-xs text-pandora-gray mt-2 max-w-sm leading-relaxed">
                    Your auction is live and waiting for the first collector proposal. The starting bid is set to {formatPrice(auctionState.starting_bid)}.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              {/* Timeline list */}
              <div className="divide-y divide-gray-150 overflow-y-auto max-h-[500px]">
                {paginatedBids.map((bid, idx) => {
                  const globalIdx = bidsState.length - ((currentPage - 1) * itemsPerPage + idx);
                  
                  // Calculate increment from previous bid
                  const nextIndex = idx + 1 + (currentPage - 1) * itemsPerPage;
                  const previousBidAmount = nextIndex < bidsState.length ? Number(bidsState[nextIndex].amount) : Number(auctionState.starting_bid);
                  const increment = Number(bid.amount) - previousBidAmount;

                  return (
                    <div key={bid.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="font-serif font-bold text-sm text-pandora-gold bg-[#FDFBF7] border border-[#E8E2D9] h-8 w-8 rounded-full flex items-center justify-center shadow-sm">
                          #{globalIdx}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {maskBidderName(bid.profiles?.display_name)}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {new Date(bid.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} at {new Date(bid.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} UTC
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-serif font-bold text-base text-gray-950 block">{formatPrice(bid.amount)}</span>
                        <span className={`text-[10px] font-semibold mt-0.5 inline-block px-2 py-0.5 rounded ${
                          increment > 0 ? "text-green-700 bg-green-50" : "text-gray-600 bg-gray-50"
                        }`}>
                          +{formatPrice(increment)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination bar */}
              {totalPages > 1 && (
                <div className="border-t px-6 py-4 flex items-center justify-between text-xs">
                  <span className="text-gray-500">Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded hover:bg-gray-55 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded hover:bg-gray-55 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Analytics & Performance (1 col) */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6 flex flex-col justify-between">
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-950 font-serif tracking-wide">Live Curation Analytics</h3>
            <p className="text-xs text-gray-500 mt-1">Algorithmic bidding velocity and reserve escalation charts.</p>
          </div>

          {/* Line Chart */}
          <div className="flex-1 flex flex-col justify-center space-y-6">
            {bidsState.length < 2 ? (
              <div className="h-[200px] border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-center p-4 bg-gray-50 text-xs text-gray-400">
                Line chart updates in real-time once at least two bids are submitted.
              </div>
            ) : (
              <div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">Live Escalation Chart</span>
                {mounted ? (
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#B8860B" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#B8860B" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8E2D9" />
                        <XAxis dataKey="name" stroke="#A9A9A9" fontSize={9} />
                        <YAxis stroke="#A9A9A9" fontSize={9} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#1A1A1A", color: "#FFF", borderRadius: 4, fontSize: 11 }}
                          formatter={(value: any) => [formatPrice(Number(value)), "Amount"]}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#B8860B" fillOpacity={1} fill="url(#colorAmount)" strokeWidth={1.8} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[200px] bg-gray-50 animate-pulse flex items-center justify-center text-xs text-gray-400">Loading chart...</div>
                )}
              </div>
            )}

            {/* Statistics details */}
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 font-medium block">Highest Bid</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{stats.highestBid > 0 ? formatPrice(stats.highestBid) : "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Lowest Bid</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{stats.lowestBid > 0 ? formatPrice(stats.lowestBid) : "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Average Bid</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{stats.averageBid > 0 ? formatPrice(stats.averageBid) : "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Median Bid</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{stats.medianBid > 0 ? formatPrice(stats.medianBid) : "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Bid Frequency</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{stats.totalBids > 0 ? `${stats.bidFrequency.toFixed(1)} bids/hr` : "—"}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium block">Total Volume</span>
                  <span className="font-bold text-gray-900 text-sm mt-0.5 block">{stats.totalBids > 0 ? formatPrice(stats.biddingVolume) : "—"}</span>
                </div>
              </div>

              {/* Reserve progress bar */}
              {auctionState.reserve_price && (
                <div className="space-y-2 border-t pt-4 text-xs">
                  <div className="flex justify-between font-semibold text-gray-800">
                    <span>Reserve Progress</span>
                    <span>{stats.reserveProgress.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-150 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ease-out ${
                        stats.reserveMet ? "bg-green-600" : "bg-pandora-gold"
                      }`} 
                      style={{ width: `${stats.reserveProgress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 block leading-tight">
                    {stats.reserveMet ? "✅ Reserve price condition met." : `⚠️ Needs ${formatPrice(Number(auctionState.reserve_price) - stats.highestBid)} more to unlock reserve price.`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
