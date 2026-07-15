"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAuctionDisplayStatus } from "@/lib/auction-status";
import {
  Clock, DollarSign, Award, Trophy, Heart, Share2, 
  Rotate3d, Play, Image as ImageIcon, Video, 
  ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, 
  Copy, Mail, Facebook, Send, Twitter, ShieldCheck
} from "lucide-react";

export interface Bid {
  id: string;
  amount: number;
  user_id: string;
  created_at: string;
  profiles: {
    display_name: string;
  };
}

interface PublicAuctionDetailClientProps {
  initialAuction: any;
  initialBids: Bid[];
  relatedAuctions: any[];
  initialWatched: boolean;
  userId: string | null;
}

export default function PublicAuctionDetailClient({
  initialAuction,
  initialBids,
  relatedAuctions,
  initialWatched,
  userId,
}: PublicAuctionDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();

  // Unified state managers
  const [auctionState, setAuctionState] = useState(initialAuction);
  const [bidsState, setBidsState] = useState<Bid[]>(initialBids);
  const [watchedState, setWatchedState] = useState(initialWatched);
  const [watchLoading, setWatchLoading] = useState(false);
  const [realtimeState, setRealtimeState] = useState<"live" | "reconnecting" | "offline">("offline");

  // Tab navigation
  const [activeTab, setActiveTab] = useState<"description" | "provenance" | "history" | "condition" | "bids">("description");

  // Media Gallery & Fullscreen Modal states
  const [activeGalleryTab, setActiveGalleryTab] = useState<"3d" | "video" | "gallery">("gallery");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoomState, setZoomState] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Time & countdown offsets
  const [clockOffset, setClockOffset] = useState(0);
  const [timeLeftText, setTimeLeftText] = useState("Loading...");
  const [auctionStatus, setAuctionStatus] = useState<"scheduled" | "live" | "ended">("scheduled");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const computedDisplayStatus = useMemo(() => {
    return getAuctionDisplayStatus(auctionState, clockOffset);
  }, [auctionState, clockOffset]);

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifact_id: auctionState.artifacts?.id,
          auction_id: auctionState.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        alert(data.error || "Failed to initiate checkout");
      }
    } catch (err) {
      console.error(err);
      alert("Error initiating checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const modalRef = useRef<HTMLDivElement>(null);

  // Parse media prioritize ordering: Hero, Front, Back, Left, Right, Gallery, Video, 3D Model
  const mediaRows = useMemo(() => auctionState.artifacts?.artifact_media || [], [auctionState]);

  const uniqueImages = useMemo(() => {
    const list: string[] = [];
    const pushImg = (url: string | null | undefined) => {
      if (url && !list.includes(url)) list.push(url);
    };

    // 1. Hero
    const heroRow = mediaRows.find((m: any) => m.view_label === "hero" && m.media_type === "image");
    pushImg(heroRow?.url);

    // 2. Front
    const frontRow = mediaRows.find((m: any) => m.view_label === "front" && m.media_type === "image");
    pushImg(frontRow?.url);

    // 3. Back
    const backRow = mediaRows.find((m: any) => m.view_label === "back" && m.media_type === "image");
    pushImg(backRow?.url);

    // 4. Left
    const leftRow = mediaRows.find((m: any) => m.view_label === "left" && m.media_type === "image");
    pushImg(leftRow?.url);

    // 5. Right
    const rightRow = mediaRows.find((m: any) => m.view_label === "right" && m.media_type === "image");
    pushImg(rightRow?.url);

    // 6. Gallery
    const galleryRows = mediaRows.filter((m: any) => m.view_label === "gallery" && m.media_type === "image");
    galleryRows.forEach((r: any) => pushImg(r.url));

    // Fallbacks
    if (auctionState.artifacts?.images && Array.isArray(auctionState.artifacts.images)) {
      auctionState.artifacts.images.forEach((img: any) => pushImg(img));
    }

    if (list.length === 0) {
      list.push("/auctions/luxury-items-showcase1.JPG");
    }
    return list;
  }, [mediaRows, auctionState.artifacts]);

  // Video URL (7)
  const activeVideoUrl = useMemo(() => {
    const videoRow = mediaRows.find((m: any) => m.media_type === "video");
    return videoRow?.url || (auctionState.artifacts?.videos && auctionState.artifacts.videos[0]) || null;
  }, [mediaRows, auctionState.artifacts]);

  // 3D Model URL (8)
  const active3DModelUrl = useMemo(() => {
    const model3D = mediaRows.find((m: any) => m.media_type === "model_3d");
    return model3D?.url || null;
  }, [mediaRows]);

  const has3D = !!active3DModelUrl;
  const hasVideo = !!activeVideoUrl;

  // Initialize gallery view priorities on mount
  useEffect(() => {
    if (has3D) {
      setActiveGalleryTab("3d");
    } else if (hasVideo) {
      setActiveGalleryTab("video");
    } else {
      setActiveGalleryTab("gallery");
    }
  }, [has3D, hasVideo]);

  // Drift Correction Setup
  useEffect(() => {
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
        console.error("Drift clock sync failed:", err);
      }
    }
    syncClock();
  }, []);

  // Supabase Realtime Stream for Public Bid events
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-public-bids-${auctionState.id}`)
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
            // Fetch bidder profile name
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

            setBidsState((prev) => [newBid, ...prev]);

            // Sync anti-sniping duration extension details
            const { data: updatedAuction } = await supabase
              .from("auctions")
              .select("end_time, current_bid, highest_bidder_id, last_bid_at, status")
              .eq("id", auctionState.id)
              .single();

            if (updatedAuction) {
              if (new Date(updatedAuction.end_time).getTime() > new Date(auctionState.end_time).getTime()) {
                setFeedbackMsg("Auction Extended");
                setTimeout(() => setFeedbackMsg(""), 5000);
              }

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
            console.error("Realtime update processing failed:", err);
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
  }, [auctionState.id, auctionState.end_time, supabase]);

  // Sync / refetch trigger on realtime reconnects
  useEffect(() => {
    if (realtimeState === "live" && bidsState.length > 0) {
      async function resyncBids() {
        const { data: latestBids } = await supabase
          .from("bids")
          .select("*, profiles(display_name)")
          .eq("auction_id", auctionState.id)
          .order("created_at", { ascending: false });
          if (latestBids) {
            setBidsState(latestBids.map((b: any) => {
              const p = Array.isArray(b.profiles) ? b.profiles[0] : b.profiles;
              return {
                id: b.id,
                amount: Number(b.amount),
                user_id: b.user_id,
                created_at: b.created_at,
                profiles: {
                  display_name: p?.display_name || "Collector"
                }
              };
            }));
          }
      }
      resyncBids();
    }
  }, [realtimeState, auctionState.id, supabase]);

  // Countdown timer ticks
  useEffect(() => {
    const timer = setInterval(() => {
      const serverNow = Date.now() + clockOffset;
      const startTime = new Date(auctionState.start_time).getTime();
      const endTime = new Date(auctionState.end_time).getTime();

      let status: "scheduled" | "live" | "ended" = "scheduled";
      let timeDiff = 0;

      if (serverNow < startTime) {
        status = "scheduled";
        timeDiff = startTime - serverNow;
      } else if (serverNow >= startTime && serverNow <= endTime) {
        status = "live";
        timeDiff = endTime - serverNow;
      } else {
        status = "ended";
        timeDiff = 0;
      }

      setAuctionStatus(status);

      if (timeDiff <= 0) {
        setTimeLeftText(status === "ended" ? computedDisplayStatus : "00:00:00");
      } else {
        const d = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
        const h = Math.floor((timeDiff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const m = Math.floor((timeDiff % (60 * 60 * 1000)) / (60 * 1000));
        const s = Math.floor((timeDiff % (60 * 1000)) / 1000);

        const pad = (n: number) => String(n).padStart(2, "0");
        const dStr = d > 0 ? `${d}d ` : "";
        setTimeLeftText(`${dStr}${pad(h)}:${pad(m)}:${pad(s)}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auctionState.start_time, auctionState.end_time, clockOffset, computedDisplayStatus]);

  // Gallery slider logic
  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev === 0 ? uniqueImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev === uniqueImages.length - 1 ? 0 : prev + 1));
  };

  // Keyboard navigation inside modal
  useEffect(() => {
    if (isModalOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft") {
          handlePrevImage();
        } else if (e.key === "ArrowRight") {
          handleNextImage();
        } else if (e.key === "Escape") {
          setIsModalOpen(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isModalOpen, activeImageIndex, uniqueImages.length]);

  // Focus trap inside gallery modal
  useEffect(() => {
    if (isModalOpen && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], [tabindex="0"]'
      );
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;

      const handleTrap = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      };
      document.addEventListener("keydown", handleTrap);
      first?.focus();
      return () => document.removeEventListener("keydown", handleTrap);
    }
  }, [isModalOpen]);

  // Mobile swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;

    if (diff > 50) {
      handleNextImage();
    } else if (diff < -50) {
      handlePrevImage();
    }
    setTouchStart(null);
  };

  // Watchlist favorites Toggle
  const handleWatchlistToggle = async () => {
    const redirectUrl = `/auctions/${auctionState.artifacts?.slug || auctionState.id}`;
    if (!userId) {
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    setWatchLoading(true);
    try {
      if (watchedState) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", userId)
          .eq("artifact_id", auctionState.artifacts.id);
        if (error) throw error;
        setWatchedState(false);
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: userId,
            artifact_id: auctionState.artifacts.id
          });
        if (error) throw error;
        setWatchedState(true);
      }
    } catch (err) {
      console.error("Watchlist action failed:", err);
    } finally {
      setWatchLoading(false);
    }
  };

  // Share action link generators
  const shareDetails = useMemo(() => {
    if (typeof window === "undefined") return { url: "", title: "" };
    const url = window.location.href;
    const title = `Bid on "${auctionState.artifacts?.title || auctionState.title}" - Dynasity-Voult Live Curation Showcase`;
    return { url, title };
  }, [auctionState]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareDetails.url);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const formatPrice = (val: number) => {
    return val.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  };

  // Masked private names
  const maskName = (name: string): string => {
    if (!name) return "Anonymous Collector";
    const parts = name.split(" ");
    return parts
      .map((p) => {
        if (p.length <= 2) return p + "***";
        return p[0] + "***" + p[p.length - 1];
      })
      .join(" ");
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalBids = bidsState.length;
    const uniqueBidders = new Set(bidsState.map((b) => b.user_id)).size;
    const currentPrice = bidsState.length > 0 ? bidsState[0].amount : Number(auctionState.starting_bid);
    const reservePrice = auctionState.reserve_price ? Number(auctionState.reserve_price) : 0;
    const reserveProgress = reservePrice > 0 ? Math.min((currentPrice / reservePrice) * 100, 100) : 100;
    const reserveMet = reservePrice > 0 ? currentPrice >= reservePrice : true;

    return {
      totalBids,
      uniqueBidders,
      currentPrice,
      reserveProgress,
      reserveMet,
    };
  }, [bidsState, auctionState.starting_bid, auctionState.reserve_price]);

  return (
    <div className="min-h-screen bg-pandora-charcoal text-white select-none">
      
      {/* Script for 3D model viewer loading */}
      <Script
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js"
        type="module"
        strategy="afterInteractive"
      />

      <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 pt-28 pb-16">
        
        {/* Realtime status bar indicator */}
        {feedbackMsg && (
          <div className="mb-6 bg-pandora-gold text-white text-xs text-center py-2.5 rounded font-bold uppercase tracking-widest animate-bounce">
            {feedbackMsg}!
          </div>
        )}

        {/* Dynamic Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT/MAIN CONTAINER: Media Gallery, Information details */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Lot Header */}
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-pandora-gold">
                  Lot Showcase Curation
                </span>
                <span className={`h-2 w-2 rounded-full ${
                  realtimeState === "live" ? "bg-green-500 animate-ping-slow" : "bg-red-500"
                }`} />
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight mt-2 text-white">
                {auctionState.artifacts?.title || auctionState.title}
              </h1>
              <p className="text-white/60 text-xs mt-2 italic tracking-wide">
                {auctionState.artifacts?.short_headline || "Verified Historical Masterwork"}
              </p>
            </div>

            {/* Media Showcase Panel */}
            <div className="relative w-full aspect-[4/3] md:h-[500px] bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
              
              {/* Active Tab rendering */}
              {activeGalleryTab === "3d" && has3D && (
                <div className="w-full h-full relative">
                  {React.createElement("model-viewer", {
                    src: active3DModelUrl,
                    ar: true,
                    "ar-modes": "webxr scene-viewer quick-look",
                    "camera-controls": true,
                    poster: uniqueImages[0],
                    "shadow-intensity": "1",
                    "auto-rotate": true,
                    style: { width: "100%", height: "100%", backgroundColor: "transparent" },
                    className: "w-full h-full",
                  })}
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                    <Rotate3d size={14} className="text-pandora-gold animate-spin" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white">3D Model</span>
                  </div>
                </div>
              )}

              {activeGalleryTab === "video" && hasVideo && (
                <div className="w-full h-full relative">
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    controls
                    className="w-full h-full object-cover"
                  >
                    <source src={activeVideoUrl} type="video/mp4" />
                  </video>
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
                    <Play size={14} className="text-pandora-gold fill-pandora-gold" />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-white">Video Tour</span>
                  </div>
                </div>
              )}

              {activeGalleryTab === "gallery" && (
                <div className="w-full h-full relative flex items-center justify-center">
                  <Image
                    src={uniqueImages[activeImageIndex]}
                    alt="Auction lot view"
                    fill
                    priority
                    className="object-cover cursor-zoom-in hover:scale-[1.01] transition-transform duration-300"
                    onClick={() => setIsModalOpen(true)}
                  />

                  {/* Left / Right arrows */}
                  {uniqueImages.length > 1 && (
                    <>
                      <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 border border-white/10 p-2.5 rounded-full text-white hover:bg-pandora-gold/80 transition-colors"
                        aria-label="Previous view"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 border border-white/10 p-2.5 rounded-full text-white hover:bg-pandora-gold/80 transition-colors"
                        aria-label="Next view"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}

                  {/* Lot Counter */}
                  <div className="absolute bottom-4 right-4 bg-black/60 border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest text-white">
                    {activeImageIndex + 1} / {uniqueImages.length}
                  </div>
                </div>
              )}
            </div>

            {/* Media Gallery Controls Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              
              {/* Media Select Tabs */}
              <div className="flex gap-1.5 p-1 bg-white/5 border border-white/15 rounded-full">
                {has3D && (
                  <button
                    onClick={() => setActiveGalleryTab("3d")}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                      activeGalleryTab === "3d" ? "bg-pandora-gold text-white" : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Rotate3d size={12} />
                    3D view
                  </button>
                )}
                {hasVideo && (
                  <button
                    onClick={() => setActiveGalleryTab("video")}
                    className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                      activeGalleryTab === "video" ? "bg-pandora-gold text-white" : "text-white/60 hover:text-white"
                    }`}
                  >
                    <Video size={12} />
                    Video
                  </button>
                )}
                <button
                  onClick={() => setActiveGalleryTab("gallery")}
                  className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                    activeGalleryTab === "gallery" ? "bg-pandora-gold text-white" : "text-white/60 hover:text-white"
                  }`}
                >
                  <ImageIcon size={12} />
                  Images ({uniqueImages.length})
                </button>
              </div>

              {/* Gallery Thumbnails List */}
              {activeGalleryTab === "gallery" && uniqueImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto max-w-full pb-1">
                  {uniqueImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-14 h-10 border rounded overflow-hidden shrink-0 transition-all ${
                        activeImageIndex === idx ? "border-pandora-gold scale-105" : "border-white/10 opacity-50 hover:opacity-100"
                      }`}
                    >
                      <Image src={img} alt="Thumbnail view" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Curation Specifications Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 border-t border-b border-white/10 text-center">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/40 block">Origin</span>
                <span className="font-serif text-sm font-semibold text-white mt-1 block">{auctionState.artifacts?.origin || "Not Declared"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/40 block">Period</span>
                <span className="font-serif text-sm font-semibold text-white mt-1 block">{auctionState.artifacts?.era || "Not Declared"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/40 block">Category</span>
                <span className="font-serif text-sm font-semibold text-white mt-1 block capitalize">{auctionState.artifacts?.category || "Lot Showcase"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-white/40 block">Lot Valuation</span>
                <span className="font-serif text-sm font-semibold text-pandora-gold mt-1 block">
                  {auctionState.artifacts?.estimated_value ? formatPrice(Number(auctionState.artifacts.estimated_value)) : "Upon Request"}
                </span>
              </div>
            </div>

            {/* Details tabs */}
            <div className="border border-white/10 rounded-xl bg-black/10 overflow-hidden">
              <div className="flex border-b border-white/10 bg-black/30 overflow-x-auto">
                {[
                  { key: "description", label: "Description" },
                  { key: "provenance", label: "History & Provenance" },
                  { key: "history", label: "Ownership History" },
                  { key: "condition", label: "Condition Report" },
                  { key: "bids", label: `Bids History (${bidsState.length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-6 py-4 text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0 border-b-2 ${
                      activeTab === tab.key
                        ? "border-pandora-gold text-pandora-gold"
                        : "border-transparent text-white/50 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="p-6 md:p-8 min-h-[250px] leading-relaxed text-sm text-white/70">
                {activeTab === "description" && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-xl font-medium text-white">Overview</h3>
                    <p className="whitespace-pre-wrap">{auctionState.artifacts?.description || "No overview documentation provided."}</p>
                  </div>
                )}

                {activeTab === "provenance" && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-xl font-medium text-white">History & Provenance Narrative</h3>
                    {auctionState.artifacts?.provenance ? (
                      <p className="whitespace-pre-wrap">{auctionState.artifacts.provenance}</p>
                    ) : (
                      <div className="border border-dashed border-white/10 p-8 text-center text-white/40 text-xs italic">
                        No official provenance history recorded for this lot.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "history" && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-xl font-medium text-white">Custody ownership history</h3>
                    {auctionState.artifacts?.ownership_history ? (
                      <p className="whitespace-pre-wrap">{auctionState.artifacts.ownership_history}</p>
                    ) : (
                      <div className="border border-dashed border-white/10 p-8 text-center text-white/40 text-xs italic">
                        No ownership custody records submitted.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "condition" && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-xl font-medium text-white">Preservation & Condition Statement</h3>
                    {auctionState.artifacts?.condition_report ? (
                      <p className="whitespace-pre-wrap">{auctionState.artifacts.condition_report}</p>
                    ) : (
                      <div className="border border-dashed border-white/10 p-8 text-center text-white/40 text-xs italic">
                        No structural alterations or condition logs declared.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "bids" && (
                  <div className="space-y-4">
                    <h3 className="font-serif text-xl font-medium text-white">Showcase Bidding Ledger</h3>
                    {bidsState.length === 0 ? (
                      <div className="border border-dashed border-white/10 p-8 text-center text-white/40 text-xs italic">
                        No bids placed on this lot yet. Be the first collector to bid.
                      </div>
                    ) : (
                      <div className="divide-y divide-white/10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {bidsState.map((bid, idx) => (
                          <div key={bid.id} className="py-3 flex justify-between items-center text-xs">
                            <div>
                              <p className="font-semibold text-white">{maskName(bid.profiles?.display_name)}</p>
                              <span className="text-[10px] text-white/40 block mt-0.5">
                                {new Date(bid.created_at).toLocaleString()}
                              </span>
                            </div>
                            <span className="font-serif font-bold text-sm text-pandora-gold">{formatPrice(bid.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT CONTAINER: Sticky Sidebar */}
          <div>
            <aside className="lg:sticky lg:top-28 space-y-6">
              
              {/* Sticky Dashboard metrics */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl backdrop-blur-md space-y-6">
                
                {/* Pricing / Timer Section */}
                <div className="flex justify-between items-start border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/40 block">Current Offer</span>
                    <span className="font-serif text-3xl font-bold text-pandora-gold block mt-1">
                      {formatPrice(stats.currentPrice)}
                    </span>
                    <span className="text-[10px] text-white/50 mt-1 block">
                      Starting Bid: {formatPrice(Number(auctionState.starting_bid))}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-white/40 block flex items-center gap-1 justify-end">
                      <Clock size={10} />
                      {auctionStatus === "live" ? "Time Left" : auctionStatus === "scheduled" ? "Starts In" : "Status"}
                    </span>
                    <span className="font-mono text-base font-bold text-white mt-1.5 block tracking-wider">
                      {timeLeftText}
                    </span>
                  </div>
                </div>

                {/* Bidding stats counters */}
                <div className="grid grid-cols-2 gap-4 text-center border-b border-white/10 pb-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/40 block">Total Bids</span>
                    <span className="font-serif text-xl font-bold text-white mt-1 block">{stats.totalBids}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-white/40 block">Collectors</span>
                    <span className="font-serif text-xl font-bold text-white mt-1 block">{stats.uniqueBidders}</span>
                  </div>
                </div>

                {/* Reserve price progress */}
                {auctionState.reserve_price && (
                  <div className="space-y-2 border-b border-white/10 pb-4 text-xs">
                    <div className="flex justify-between text-white/70">
                      <span>Reserve Progress</span>
                      <span>{stats.reserveProgress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ease-out ${
                          stats.reserveMet ? "bg-green-500" : "bg-pandora-gold"
                        }`} 
                        style={{ width: `${stats.reserveProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        stats.reserveMet ? "text-green-500 bg-green-500/10" : "text-amber-500 bg-amber-500/10"
                      }`}>
                        {stats.reserveMet ? "Reserve Met ✅" : "Reserve Locked 🔒"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Bid Actions Button */}
                <div>
                  {computedDisplayStatus === "Awaiting Payment" && auctionState.winner_id === userId ? (
                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading}
                      className="w-full block py-4 bg-green-600 text-white text-center font-bold text-xs uppercase tracking-widest rounded-md hover:bg-green-700 hover:scale-[1.01] active:scale-98 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      {checkoutLoading ? "Redirecting to Stripe..." : "Proceed to Checkout / Pay"}
                    </button>
                  ) : computedDisplayStatus === "Awaiting Payment" ? (
                    <button
                      disabled
                      className="w-full py-4 bg-white/10 text-white/40 text-center font-bold text-xs uppercase tracking-widest rounded-md cursor-not-allowed"
                    >
                      Awaiting Payment (Won Lot)
                    </button>
                  ) : computedDisplayStatus === "Live" || computedDisplayStatus === "Extended" ? (
                    <Link
                      href={`/auctions/${auctionState.artifacts?.slug || auctionState.id}/bid`}
                      className="w-full block py-4 bg-pandora-gold text-white text-center font-bold text-xs uppercase tracking-widest rounded-md hover:bg-pandora-gold-light hover:scale-[1.01] active:scale-98 transition-all shadow-md shadow-pandora-gold/10"
                    >
                      Enter Bidding Console
                    </Link>
                  ) : computedDisplayStatus === "Scheduled" ? (
                    <button
                      disabled
                      className="w-full py-4 bg-white/10 text-white/40 text-center font-bold text-xs uppercase tracking-widest rounded-md cursor-not-allowed"
                    >
                      Bidding Room Scheduled
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-4 bg-white/10 text-white/40 text-center font-bold text-xs uppercase tracking-widest rounded-md cursor-not-allowed"
                    >
                      Bidding Closed ({computedDisplayStatus})
                    </button>
                  )}
                </div>

                {/* Watchlist & Share Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleWatchlistToggle}
                    disabled={watchLoading}
                    className={`flex-1 py-3 border rounded-md font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                      watchedState
                        ? "bg-pandora-gold/20 border-pandora-gold text-pandora-gold"
                        : "border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Heart size={14} className={watchedState ? "fill-pandora-gold" : ""} />
                    <span>{watchedState ? "Watching" : "Watch Lot"}</span>
                  </button>

                  <button
                    onClick={() => setShareMenuOpen(!shareMenuOpen)}
                    className="flex-1 py-3 border border-white/10 rounded-md font-bold text-[10px] uppercase tracking-wider text-white/60 hover:bg-white/5 hover:text-white flex items-center justify-center gap-2 transition-all"
                  >
                    <Share2 size={14} />
                    <span>Share</span>
                  </button>
                </div>

                {/* Share Dropdown Options */}
                {shareMenuOpen && (
                  <div className="bg-black/40 border border-white/10 rounded-lg p-3 grid grid-cols-5 gap-2 text-center text-xs animate-fadeIn">
                    <button
                      onClick={handleCopyLink}
                      className="p-2 hover:bg-white/5 rounded text-white flex flex-col items-center gap-1 transition-colors"
                      title="Copy URL"
                    >
                      <Copy size={14} />
                      <span className="text-[8px] uppercase tracking-wider">{copyFeedback ? "Copied" : "Copy"}</span>
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareDetails.title + " " + shareDetails.url)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 hover:bg-white/5 rounded text-white flex flex-col items-center gap-1 transition-colors"
                      title="WhatsApp"
                    >
                      <Send size={14} className="text-green-500 rotate-45" />
                      <span className="text-[8px] uppercase tracking-wider">WA</span>
                    </a>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareDetails.title)}&url=${encodeURIComponent(shareDetails.url)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 hover:bg-white/5 rounded text-white flex flex-col items-center gap-1 transition-colors"
                      title="Twitter / X"
                    >
                      <Twitter size={14} className="text-sky-400" />
                      <span className="text-[8px] uppercase tracking-wider">X</span>
                    </a>
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareDetails.url)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 hover:bg-white/5 rounded text-white flex flex-col items-center gap-1 transition-colors"
                      title="Facebook"
                    >
                      <Facebook size={14} className="text-blue-500" />
                      <span className="text-[8px] uppercase tracking-wider">FB</span>
                    </a>
                    <a
                      href={`mailto:?subject=${encodeURIComponent(shareDetails.title)}&body=${encodeURIComponent(shareDetails.url)}`}
                      className="p-2 hover:bg-white/5 rounded text-white flex flex-col items-center gap-1 transition-colors"
                      title="Email"
                    >
                      <Mail size={14} className="text-amber-500" />
                      <span className="text-[8px] uppercase tracking-wider">Mail</span>
                    </a>
                  </div>
                )}

              </div>

              {/* Dynamic Guarantee Shield */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-3 text-xs leading-relaxed text-white/50">
                <ShieldCheck size={20} className="text-pandora-gold flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-0.5 uppercase tracking-wider text-[10px]">Curation Integrity Assurance</span>
                  This lot is backed by absolute origin authenticity certificates, appraisals, and provenance reviews.
                </div>
              </div>

            </aside>
          </div>

        </div>

        {/* RELATED AUCTIONS SECTION (Phase G) */}
        {relatedAuctions.length > 0 && (
          <div className="mt-16 border-t border-white/10 pt-12 space-y-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-pandora-gold block">
                Matching Lots
              </span>
              <h2 className="font-serif text-2xl font-medium tracking-wide mt-2 text-white">
                Similar Showcase Lots
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedAuctions.map((item: any) => {
                const currentBidAmount = item.current_bid || item.starting_bid;
                return (
                  <Link
                    key={item.id}
                    href={`/auctions/${item.artifacts?.slug || item.id}`}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-pandora-gold/40 hover:scale-[1.01] transition-all flex flex-col group"
                  >
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-3 bg-black/30">
                      <Image
                        src={item.artifacts?.thumbnail_url || "/auctions/luxury-items-showcase1.JPG"}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">
                      {item.artifacts?.origin || "Lot Showcase"}
                    </span>
                    <h4 className="font-serif text-sm font-semibold text-white group-hover:text-pandora-gold transition-colors truncate">
                      {item.artifacts?.title || item.title}
                    </h4>
                    <div className="mt-auto pt-3 border-t border-white/5 flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[9px] text-white/40 uppercase tracking-wider block">Current Bid</span>
                        <span className="font-bold text-pandora-gold font-serif mt-0.5 block">{formatPrice(Number(currentBidAmount))}</span>
                      </div>
                      <span className="text-[9px] text-white/50 bg-white/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        {getAuctionDisplayStatus(item)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ─── FULLSCREEN LIGHTBOX MODAL (Phase B) ─── */}
      {isModalOpen && (
        <div 
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Image Fullscreen Gallery"
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 md:p-6"
        >
          {/* Topbar inside Modal */}
          <div className="w-full max-w-[1200px] flex items-center justify-between border-b border-white/10 pb-3">
            <span className="text-xs uppercase tracking-widest text-white/60">
              Lot View: {activeImageIndex + 1} / {uniqueImages.length}
            </span>
            
            <div className="flex gap-4">
              {/* Zoom toggle button */}
              <button
                onClick={() => setZoomState(!zoomState)}
                className="text-white/60 hover:text-white p-1 rounded transition-colors"
                title="Toggle Zoom"
                aria-label={zoomState ? "Zoom Out" : "Zoom In"}
              >
                {zoomState ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
              </button>
              
              {/* Close Button */}
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setZoomState(false);
                }}
                className="text-white/60 hover:text-white p-1 rounded transition-colors"
                title="Close Gallery"
                aria-label="Close Gallery"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Main modal slider container */}
          <div 
            className="flex-1 w-full max-w-[1200px] flex items-center justify-center relative overflow-hidden my-4"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {/* Prev Image Button */}
            {uniqueImages.length > 1 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-2 z-10 bg-black/50 border border-white/15 p-3 rounded-full text-white hover:bg-pandora-gold/80 transition-colors"
                aria-label="Previous Image"
              >
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Slide Image */}
            <div className={`relative w-full h-full max-h-[70vh] flex items-center justify-center transition-transform duration-300 ${
              zoomState ? "scale-150 overflow-auto cursor-zoom-out" : "scale-100 cursor-zoom-in"
            }`}
              onClick={() => setZoomState(!zoomState)}
            >
              <Image
                src={uniqueImages[activeImageIndex]}
                alt="Fullscreen view"
                fill
                className="object-contain"
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
            </div>

            {/* Next Image Button */}
            {uniqueImages.length > 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-2 z-10 bg-black/50 border border-white/15 p-3 rounded-full text-white hover:bg-pandora-gold/80 transition-colors"
                aria-label="Next Image"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {uniqueImages.length > 1 && (
            <div className="w-full max-w-[800px] flex gap-2.5 overflow-x-auto justify-center pb-2">
              {uniqueImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveImageIndex(idx);
                    setZoomState(false);
                  }}
                  className={`relative w-16 h-12 rounded border shrink-0 transition-all ${
                    activeImageIndex === idx ? "border-pandora-gold scale-105" : "border-white/10 opacity-40 hover:opacity-100"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                >
                  <Image src={img} alt="Thumbnail strip view" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
