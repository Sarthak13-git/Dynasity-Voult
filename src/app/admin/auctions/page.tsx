"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatHistoricalDate } from "@/lib/format-historical-date";

import { getAuctionDisplayStatus } from "@/lib/auction-status";
import {
  Search,
  MoreVertical,
  Eye,
  RefreshCw,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  X,
  Clock,
  ShieldCheck,
  FileText,
  ExternalLink,
} from "lucide-react";

export default function AdminAuctionsPage() {
  const router = useRouter();
  const supabase = createClient();

  // Component States
  const [auctions, setAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedAuction, setSelectedAuction] = useState<any | null>(null);

  // Load Auctions from API
  const loadAuctions = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = `/api/admin/auctions?status=${statusFilter}&search=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok && json.success) {
        setAuctions(json.auctions || []);
      } else {
        setError(json.error || "Failed to load auctions.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to database auctions API.");
    } finally {
      setLoading(false);
    }
  };

  // Verify admin authorization on mount
  useEffect(() => {
    async function verifyAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login?redirect=/admin/auctions");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.role !== "admin") {
        router.push("/");
        return;
      }
      loadAuctions();
    }
    verifyAdmin();
  }, [router, supabase]);

  // Debounced search and status change triggers
  useEffect(() => {
    const timer = setTimeout(() => {
      loadAuctions();
    }, 300);
    return () => clearTimeout(timer);
  }, [statusFilter, searchQuery]);

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Status categories
  const statuses = [
    { label: "All Auctions", value: "all" },
    { label: "Live", value: "live" },
    { label: "Upcoming", value: "upcoming" },
    { label: "Ended", value: "ended" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <div className="relative">
      {/* Page Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auction Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor, inspect, and manage premium heritage auctions in real-time.
          </p>
        </div>
        <button
          onClick={loadAuctions}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh Listings
        </button>
      </div>

      {/* Search & Tabs Filter Panel */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1">
          {statuses.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all ${
                statusFilter === tab.value
                  ? "bg-white text-pandora-charcoal shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search auctions or artifacts..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Loading / Error States */}
      {loading && auctions.length === 0 ? (
        <div className="flex h-[40vh] items-center justify-center rounded-xl border border-gray-100 bg-white shadow-xs">
          <div className="text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-pandora-charcoal mx-auto" />
            <p className="text-sm text-gray-500 font-medium">Querying auctions from Supabase...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 flex items-start gap-3 text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-sm">Failed to Load Auctions</h3>
            <p className="text-xs text-red-700 mt-1">{error}</p>
            <button
              onClick={loadAuctions}
              className="mt-3 rounded bg-red-800 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-red-900 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      ) : auctions.length === 0 ? (
        <div className="flex h-[30vh] flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-8 text-center shadow-xs">
          <Calendar className="h-10 w-10 text-gray-300 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900">No Auctions Found</h3>
          <p className="mt-1 text-xs text-gray-500 max-w-md">
            No listings found matching status <span className="font-semibold">"{statusFilter}"</span> and search query <span className="font-semibold">"{searchQuery || "none"}"</span>.
          </p>
        </div>
      ) : (
        /* Items Table */
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/50">
                  <th className="px-6 py-4">Artifact Item</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Current Bid / Start</th>
                  <th className="px-6 py-4">Bids</th>
                  <th className="px-6 py-4">Start Time</th>
                  <th className="px-6 py-4">End Time</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auctions.map((auction) => {
                  const art = auction.artifacts || {};
                  const bidsCount = auction.bids ? auction.bids.length : 0;
                  const currentOrStarting = auction.current_bid !== null ? auction.current_bid : auction.starting_bid;
                  
                  const displayStatus = getAuctionDisplayStatus(auction);
                  return (
                    <tr
                      key={auction.id}
                      className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedAuction(auction)}
                    >
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                            {art.thumbnail_url || (art.images && art.images[0]) ? (
                              <Image
                                src={art.thumbnail_url || art.images[0]}
                                alt={auction.title}
                                fill
                                className="object-cover transition-transform group-hover:scale-105"
                                sizes="40px"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gray-400 bg-gray-100 uppercase">
                                NO IMG
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {auction.title || art.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate mt-0.5">
                              {art.origin || "Unknown Origin"} • {formatHistoricalDate(art.creation_year, art.calendar_era, art.is_estimated)}
                            </p>

                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            displayStatus === "Live" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            displayStatus === "Extended" ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" :
                            displayStatus === "Scheduled" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            displayStatus === "Awaiting Payment" ? "bg-purple-50 text-purple-700 border-purple-200" :
                            displayStatus === "Sold" ? "bg-green-50 text-green-700 border-green-200" :
                            displayStatus === "Paid Out" ? "bg-sky-50 text-sky-700 border-sky-200" :
                            "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {displayStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        <div className="text-sm font-semibold text-gray-950">
                          ${Number(currentOrStarting).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider block mt-0.5">
                          {auction.current_bid !== null ? "Current Bid" : "Starting Price"}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                          {bidsCount}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(auction.start_time)}
                      </td>
                      <td className="px-6 py-4.5 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(auction.end_time)}
                      </td>
                      <td className="px-6 py-4.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() =>
                              setActiveMenu(activeMenu === auction.id ? null : auction.id)
                            }
                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          >
                            <MoreVertical size={16} />
                          </button>
                          {activeMenu === auction.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveMenu(null)}
                              />
                              <div className="absolute right-0 mt-1 z-20 w-40 origin-top-right rounded-lg border border-gray-150 bg-white py-1 shadow-lg focus:outline-none">
                                <button
                                  onClick={() => {
                                    setSelectedAuction(auction);
                                    setActiveMenu(null);
                                  }}
                                  className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Eye size={14} className="text-gray-400" />
                                  View Details
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auction Detail Side Drawer/Modal */}
      {selectedAuction && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300">
          {/* Overlay Click closer */}
          <div
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedAuction(null)}
          />

          {/* Drawer Body */}
          <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-150 px-6 py-5">
              <div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border ${
                    getAuctionDisplayStatus(selectedAuction) === "Live" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    getAuctionDisplayStatus(selectedAuction) === "Extended" ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse" :
                    getAuctionDisplayStatus(selectedAuction) === "Scheduled" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    getAuctionDisplayStatus(selectedAuction) === "Awaiting Payment" ? "bg-purple-50 text-purple-700 border-purple-200" :
                    getAuctionDisplayStatus(selectedAuction) === "Sold" ? "bg-green-50 text-green-700 border-green-200" :
                    getAuctionDisplayStatus(selectedAuction) === "Paid Out" ? "bg-sky-50 text-sky-700 border-sky-200" :
                    "bg-gray-100 text-gray-700 border-gray-200"
                  }`}
                >
                  {getAuctionDisplayStatus(selectedAuction)}
                </span>
                <h2 className="mt-1 text-lg font-bold text-gray-900">
                  {selectedAuction.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedAuction(null)}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Image & Artifact Overview */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50 md:col-span-1">
                  {(selectedAuction.artifacts?.thumbnail_url || (selectedAuction.artifacts?.images && selectedAuction.artifacts?.images[0])) ? (
                    <Image
                      src={selectedAuction.artifacts?.thumbnail_url || selectedAuction.artifacts?.images[0]}
                      alt={selectedAuction.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400 bg-gray-150">
                      NO IMAGE
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 flex flex-col justify-center space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
                    Artifact Information
                  </h3>
                  <div className="text-xl font-bold text-gray-950">
                    {selectedAuction.artifacts?.title}
                  </div>
                  <p className="text-xs text-gray-500">
                    ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px] font-mono text-gray-600">{selectedAuction.artifacts?.id}</code>
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                      Origin: {selectedAuction.artifacts?.origin || "Unknown"}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                      Era: {selectedAuction.artifacts?.era || "Unknown"}
                    </span>
                    <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                      Estimated Creation: {formatHistoricalDate(selectedAuction.artifacts?.creation_year, selectedAuction.artifacts?.calendar_era, selectedAuction.artifacts?.is_estimated)}
                    </span>
                    {selectedAuction.artifacts?.historical_period && (
                      <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                        Period: {selectedAuction.artifacts.historical_period}
                      </span>
                    )}
                    <span className="rounded bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                      Category: {selectedAuction.artifacts?.category || "Other"}
                    </span>
                  </div>

                </div>
              </div>

              {/* Description */}
              <div className="rounded-lg bg-gray-50 p-4 border border-gray-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Description / Condition Report
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedAuction.description || selectedAuction.artifacts?.description || "No description provided."}
                </p>
              </div>

              {/* Bid Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-150 p-4 bg-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Starting Bid
                  </span>
                  <div className="mt-1 text-lg font-bold text-gray-950">
                    ${Number(selectedAuction.starting_bid).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-150 p-4 bg-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Current Bid
                  </span>
                  <div className="mt-1 text-lg font-bold text-emerald-600">
                    {selectedAuction.current_bid !== null 
                      ? `$${Number(selectedAuction.current_bid).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : "No bids placed"}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-150 p-4 bg-white col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Reserve Price
                  </span>
                  <div className="mt-1 text-lg font-bold text-gray-900">
                    {selectedAuction.reserve_price !== null 
                      ? `$${Number(selectedAuction.reserve_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      : "No Reserve"}
                  </div>
                </div>
              </div>

              {/* Seller and Winner Sections */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Seller Info */}
                <div className="rounded-xl border border-gray-150 p-5 bg-white space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <User size={14} className="text-gray-400" />
                    Seller Details
                  </div>
                  {selectedAuction.artifacts?.seller ? (
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedAuction.artifacts.seller.display_name || "Private Seller"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedAuction.artifacts.seller.email}
                      </p>
                      <span className="inline-block mt-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-100 uppercase">
                        Verified Seller
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">No seller associated.</p>
                  )}
                </div>

                {/* Winner Info */}
                <div className="rounded-xl border border-gray-150 p-5 bg-white space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <ShieldCheck size={14} className="text-gray-400" />
                    Auction Winner
                  </div>
                  {selectedAuction.winner ? (
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {selectedAuction.winner.display_name || "Winner"}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedAuction.winner.email}
                      </p>
                      <span className="inline-block mt-2 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-100 uppercase">
                        Settled Winner
                      </span>
                    </div>
                  ) : selectedAuction.status === "ended" ? (
                    <div>
                      <p className="text-sm text-gray-600 font-medium italic">
                        {selectedAuction.current_bid !== null && selectedAuction.reserve_price !== null && selectedAuction.current_bid < selectedAuction.reserve_price
                          ? "Ended (Reserve not met)"
                          : "Ended (No bids placed)"}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-400 italic">
                        {selectedAuction.status === "upcoming" ? "Awaiting start..." : "Bidding in progress..."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Scheduling Details */}
              <div className="rounded-xl border border-gray-150 p-5 bg-white space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <Clock size={14} className="text-gray-400" />
                  Auction Timeline
                </div>
                <div className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block">Start Time</span>
                    <span className="font-semibold text-gray-800">{formatDate(selectedAuction.start_time)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">End Time</span>
                    <span className="font-semibold text-gray-800">{formatDate(selectedAuction.end_time)}</span>
                  </div>
                </div>
              </div>

              {/* Provenance & Certificates Documents Section */}
              <div className="rounded-xl border border-gray-150 p-5 bg-white space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <FileText size={14} className="text-gray-400" />
                  Verification Documents
                </div>
                <div className="divide-y divide-gray-100 text-sm">
                  {/* Authenticity Certificate */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-800 block">Authenticity Certificate</span>
                      <span className="text-xs text-gray-400">Official certification document URL</span>
                    </div>
                    {selectedAuction.artifacts?.authenticity_certificate ? (
                      <a
                        href={selectedAuction.artifacts.authenticity_certificate}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        Open File <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not Uploaded</span>
                    )}
                  </div>

                  {/* Acquisition Proof */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-800 block">Acquisition Proof</span>
                      <span className="text-xs text-gray-400">Proof of purchase or heritage inheritance</span>
                    </div>
                    {selectedAuction.artifacts?.acquisition_proof_url ? (
                      <a
                        href={selectedAuction.artifacts.acquisition_proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        Open File <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not Uploaded</span>
                    )}
                  </div>

                  {/* Provenance Record */}
                  <div className="py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-gray-800 block">Provenance Records</span>
                      <span className="text-xs text-gray-400">Historical line of ownership transfer</span>
                    </div>
                    {selectedAuction.artifacts?.provenance_document_url ? (
                      <a
                        href={selectedAuction.artifacts.provenance_document_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                      >
                        Open File <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Not Uploaded</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bids Log */}
              <div className="rounded-xl border border-gray-150 p-5 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Bidding History ({selectedAuction.bids ? selectedAuction.bids.length : 0})
                  </div>
                </div>
                {(!selectedAuction.bids || selectedAuction.bids.length === 0) ? (
                  <p className="text-xs text-gray-400 italic py-2">No bids recorded for this auction.</p>
                ) : (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {selectedAuction.bids.map((bid: any, bidIdx: number) => {
                        const bidderName = bid.profiles?.display_name || bid.profiles?.email || "Unknown Bidder";
                        return (
                          <li key={bid.id}>
                            <div className="relative pb-8">
                              {bidIdx !== selectedAuction.bids.length - 1 ? (
                                <span
                                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                  aria-hidden="true"
                                />
                              ) : null}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span className="h-8 w-8 rounded-full bg-gray-150 flex items-center justify-center ring-8 ring-white text-xs font-bold text-pandora-charcoal">
                                    {selectedAuction.bids.length - bidIdx}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      Bid placed by <span className="font-semibold text-gray-800">{bidderName}</span>
                                    </p>
                                  </div>
                                  <div className="text-right text-xs whitespace-nowrap text-gray-500">
                                    <span className="font-bold text-gray-900 mr-2">${Number(bid.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    <span className="text-[10px] text-gray-400">{formatDate(bid.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Closer */}
            <div className="border-t border-gray-150 px-6 py-4.5 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedAuction(null)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
