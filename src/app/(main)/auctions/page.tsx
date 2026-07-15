"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Search, X } from "lucide-react";
import { performSmartSearch, SearchableItem } from "@/lib/search-utils";

interface BadgeConfig {
  text: string;
  icon: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

function getBidBadge(auction: any, userId: string | null): BadgeConfig | null {
  if (!userId) return null;

  if (auction.status === "live") {
    if (auction.highest_bidder_id === userId) {
      return {
        text: "You're Leading",
        icon: "🟢",
        bgColor: "rgba(16, 185, 129, 0.2)",
        textColor: "#10b981",
        borderColor: "rgba(16, 185, 129, 0.4)",
      };
    } else {
      return {
        text: "Outbid",
        icon: "🔴",
        bgColor: "rgba(239, 68, 68, 0.2)",
        textColor: "#ef4444",
        borderColor: "rgba(239, 68, 68, 0.4)",
      };
    }
  } else if (auction.status === "ended") {
    if (auction.winner_id === userId) {
      return {
        text: "You Won!",
        icon: "🏆",
        bgColor: "rgba(245, 158, 11, 0.2)",
        textColor: "#f59e0b",
        borderColor: "rgba(245, 158, 11, 0.4)",
      };
    } else {
      return {
        text: "Better luck next time",
        icon: "💔",
        bgColor: "rgba(107, 114, 128, 0.2)",
        textColor: "#9ca3af",
        borderColor: "rgba(107, 114, 128, 0.4)",
      };
    }
  }
  return null;
}

function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <span>{text}</span>;
  const tokens = highlight.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return <span>{text}</span>;
  
  const pattern = tokens.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <span>
      {parts.map((part, i) =>
        tokens.some(t => t.toLowerCase() === part.toLowerCase()) ? (
          <mark key={i} className="bg-yellow-400/90 text-black font-bold rounded-sm px-0.5">{part}</mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

export default function AuctionsPage() {
  const supabase = createClient();
  const [showMyBids, setShowMyBids] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [allAuctions, setAllAuctions] = useState<any[]>([]);
  const [myBidsAuctions, setMyBidsAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search States
  const [searchVal, setSearchVal] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Debouncing search query 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchVal);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchVal]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // 1. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }

        // 2. Run on-demand activation & settlement triggers
        await supabase.rpc("activate_scheduled_auctions");
        await supabase.rpc("settle_expired_auctions");

        // 3. Fetch live and upcoming auctions for default view
        const { data: auctions } = await supabase
          .from("auctions")
          .select("*, artifacts(*)")
          .in("status", ["live", "upcoming"]);

        if (auctions) {
          setAllAuctions(auctions);
        }

        // 4. Fetch auctions the user has bid on (if logged in)
        if (user) {
          const { data: userBids } = await supabase
            .from("bids")
            .select("auction_id")
            .eq("user_id", user.id);

          if (userBids && userBids.length > 0) {
            const auctionIds = Array.from(new Set(userBids.map((b: any) => b.auction_id)));
            const { data: myBids } = await supabase
              .from("auctions")
              .select("*, artifacts(*)")
              .in("id", auctionIds);

            if (myBids) {
              setMyBidsAuctions(myBids);
            }
          }
        }
      } catch (err) {
        console.error("Error loading auctions page data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Map auctions to SearchableItem format
  const searchableAuctions = useMemo((): SearchableItem[] => {
    const source = showMyBids ? myBidsAuctions : allAuctions;
    return source.map((auc) => {
      const art = auc.artifacts || {};
      return {
        id: auc.id,
        title: auc.title || art.title || "",
        description: auc.description || art.description || "",
        category: art.category,
        origin: art.origin,
        era: art.era,
        provenance: art.provenance,
        shortHeadline: art.short_headline,
        historicalPeriod: art.historical_period,
        conditionReport: art.condition_report,
        ownershipHistory: art.ownership_history,
        rawItem: auc,
      };
    });
  }, [showMyBids, myBidsAuctions, allAuctions]);

  // Perform smart search
  const searchResults = useMemo(() => {
    return performSmartSearch(searchableAuctions, searchQuery);
  }, [searchableAuctions, searchQuery]);

  const hasExactSearchMatch = useMemo(() => {
    if (searchQuery.trim() === "") return true;
    return searchResults.some(r => r.isExact);
  }, [searchResults, searchQuery]);

  // Suggestions list
  const suggestions = useMemo(() => {
    const trimmedVal = searchVal.trim().toLowerCase();
    if (!trimmedVal || trimmedVal === searchQuery.toLowerCase()) return [];
    
    const matches = performSmartSearch(searchableAuctions, searchVal);
    // Limit to top 5 distinct titles
    const uniqueTitles = Array.from(new Set(matches.map(r => r.item.title || r.item.artifacts?.title)));
    return uniqueTitles.slice(0, 5);
  }, [searchableAuctions, searchVal, searchQuery]);

  // Filtered auctions based on search result ranking
  const filteredAuctions = useMemo(() => {
    if (searchQuery.trim() !== "") {
      return searchResults.map(r => r.item);
    }
    return showMyBids ? myBidsAuctions : allAuctions;
  }, [showMyBids, myBidsAuctions, allAuctions, searchQuery, searchResults]);

  const itemsToRender = useMemo(() => {
    return filteredAuctions.map((auc: any) => {
      const art = auc.artifacts || {};
      return {
        slug: art.slug || auc.id,
        title: auc.title || art.title || "",
        image: art.thumbnail_url || (art.images && art.images[0]) || "/auctions/luxury-items-showcase1.JPG",
        badge: getBidBadge(auc, userId),
      };
    });
  }, [filteredAuctions, userId]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header Image */}
      <div className="w-full pt-20">
        <img
          src="/auctions/luxury-items-showcase1.JPG"
          alt="Header Image"
          className="w-full block"
        />
      </div>

      {/* Controls Overlay */}
      <div className="max-w-7xl mx-auto px-6 relative z-20" style={{ marginTop: "-255px", marginBottom: "20px" }}>
        <div className="flex justify-between items-center bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="text-white font-serif tracking-widest uppercase text-sm">Auctions Showcase</span>
          </div>

          {/* Luxury Search Input Bar */}
          <div className="relative max-w-xs w-full">
            <div className="relative w-full bg-white/10 border border-white/15 rounded-full flex items-center px-4 py-2">
              <Search size={14} className="text-white/60 flex-shrink-0" />
              <input
                id="auctions-search"
                type="text"
                placeholder="Search auctions..."
                className="w-full ml-2 bg-transparent text-[11px] text-white focus:outline-none placeholder-white/40 uppercase tracking-wider font-semibold"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchQuery(searchVal);
                  }
                }}
              />
              {searchVal && (
                <button 
                  onClick={() => {
                    setSearchVal("");
                    setSearchQuery("");
                  }} 
                  className="text-white/60 hover:text-white transition-colors ml-2 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Suggestions list */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1.5 bg-black/95 border border-white/10 rounded-md shadow-2xl z-30 overflow-hidden">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSearchVal(sug);
                      setSearchQuery(sug);
                    }}
                    className="w-full text-left px-4 py-2 text-[10px] text-white/80 hover:bg-white/10 font-semibold uppercase tracking-wider transition-colors border-b border-white/5 last:border-b-0 cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              if (!userId) {
                alert("Please sign in to view your bids.");
                window.location.href = "/login";
                return;
              }
              setShowMyBids(!showMyBids);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 border ${
              showMyBids
                ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                : "bg-white/5 text-white border-white/10 hover:bg-white/10"
            }`}
          >
            <span>📊</span>
            <span>My Bids</span>
          </button>
        </div>
      </div>

      {searchQuery.trim() !== "" && !hasExactSearchMatch && itemsToRender.length > 0 && (
        <div className="max-w-md mx-auto my-6 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400 font-bold">
            No exact match found
          </p>
          <p className="text-sm font-serif italic text-white mt-1">
            Showing Similar Results
          </p>
        </div>
      )}

      {/* Horizontal Scrolling Category Section */}
      <section
        className="flex items-center gap-5 px-5 py-10 h-[500px] overflow-x-auto custom-scrollbar"
        style={{
          flexWrap: "nowrap",
          background: "linear-gradient(to right, #EAEAEA, #DBDBDB, #F2F2F2, #ADA996)",
          position: "relative",
          zIndex: 10,
        }}
      >
        {loading ? (
          <div className="w-full flex flex-col items-center justify-center text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-gray-800"></div>
            <p className="mt-4 text-sm text-gray-700 font-medium">Loading auctions...</p>
          </div>
        ) : itemsToRender.length > 0 ? (
          itemsToRender.map((item) => (
            <Link
              key={item.slug}
              href={`/auctions/${item.slug}`}
              className="block flex-shrink-0"
              style={{ textDecoration: "none" }}
            >
              <div
                className="flex flex-col items-center rounded-lg text-center transition-transform duration-700 hover:scale-[1.13]"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(45,44,51,1) 100%, rgba(59,80,115,1) 100%, rgba(7,53,150,1) 100%, rgba(0,212,255,1) 100%)",
                  height: "380px",
                  width: "450px",
                  marginLeft: "10px",
                  marginRight: "20px",
                  position: "relative",
                }}
              >
                {/* Badge Overlay */}
                {item.badge && (
                  <div
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase backdrop-blur-md flex items-center gap-1.5 shadow-lg border z-20"
                    style={{
                      backgroundColor: item.badge.bgColor,
                      color: item.badge.textColor,
                      borderColor: item.badge.borderColor,
                    }}
                  >
                    <span>{item.badge.icon}</span>
                    <span>{item.badge.text}</span>
                  </div>
                )}

                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-[300px] object-cover rounded-[4px]"
                />
                 <h3
                  className="text-white text-[22px] mt-2.5 px-4 truncate w-full"
                  style={{ fontFamily: "'Perpetua Titling MT', serif" }}
                >
                  <HighlightedText text={item.title} highlight={searchQuery} />
                </h3>
              </div>
            </Link>
          ))
        ) : (
          <div className="w-full flex flex-col items-center justify-center text-center py-16 px-6 border border-white/10 bg-black/20 backdrop-blur-sm rounded-xl">
            <span className="text-4xl mb-4">⏳</span>
            <h3 className="font-serif text-2xl font-medium text-white tracking-wide">
              {showMyBids ? "No Active Bids Recorded" : "No Active Auctions at this Time"}
            </h3>
            <p className="text-sm text-white/60 mt-3 max-w-md leading-relaxed">
              {showMyBids
                ? "You have not placed any bids on our live catalog items yet. Explore the gallery to begin bidding."
                : "Our curators are preparing the next collection of premium acquisitions. Join our notification list to receive an exclusive preview."}
            </p>
            {showMyBids && (
              <button
                onClick={() => setShowMyBids(false)}
                className="mt-6 px-8 py-3 bg-pandora-gold text-white font-semibold uppercase tracking-wider text-xs hover:bg-pandora-gold-light transition-all rounded-md cursor-pointer"
              >
                View Available Collections
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}


