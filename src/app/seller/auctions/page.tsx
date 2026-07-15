"use client";

import { useEffect, useState } from "react";
import { Calendar, AlertCircle, Eye, Edit2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { getAuctionDisplayStatus } from "@/lib/auction-status";

interface Artifact {
  id: string;
  title: string;
  category: string;
  thumbnail_url: string;
  seller_id: string;
  videos?: string[];
  estimated_value?: number;
  description?: string;
}

interface Auction {
  id: string;
  artifact_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  starting_bid: number;
  current_bid: number;
  reserve_price: number | null;
  bid_increment: number;
  status: "upcoming" | "live" | "ended" | "cancelled";
  created_at: string;
  artifacts: Artifact;
  highest_bidder: { display_name: string | null; email: string } | null;
  bids: { user_id: string }[];
}

function TimeRemainingCell({ startTime, endTime, status }: { startTime: string; endTime: string; status: string }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();

    const updateTimer = () => {
      const now = Date.now();
      if (status === "cancelled") {
        setTimeLeft("Cancelled");
        return;
      }
      if (now < startMs) {
        const diff = startMs - now;
        setTimeLeft(`Starts in: ${formatMs(diff)}`);
      } else if (now < endMs) {
        const diff = endMs - now;
        setTimeLeft(formatMs(diff));
      } else {
        setTimeLeft("Ended");
      }
    };

    const formatMs = (ms: number) => {
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${days > 0 ? `${days}d ` : ""}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, endTime, status]);

  return <span>{timeLeft}</span>;
}

export default function SellerAuctionsPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"live" | "scheduled" | "ended" | "pending" | "rejected">("live");
  const [userId, setUserId] = useState<string | null>(null);

  // Edit and Info Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoAuction, setInfoAuction] = useState<Auction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    reserve_price: "",
    bid_increment: "100",
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }
      setUserId(user.id);

      // Run on-demand activation & settlement triggers
      await supabase.rpc("activate_scheduled_auctions");
      await supabase.rpc("settle_expired_auctions");

      // 2. Get user's auctions with bidder joins and bids list
      const { data: auctionsData, error: auctionsError } = await supabase
        .from("auctions")
        .select(`
          *,
          artifacts!inner(*),
          highest_bidder:highest_bidder_id(display_name, email),
          bids(user_id, amount),
          orders:orders(id, status, seller_earnings(id, payouts(id, status)))
        `)
        .eq("artifacts.seller_id", user.id)
        .order("created_at", { ascending: false });

      if (auctionsError) throw auctionsError;
      setAuctions((auctionsData as any) || []);

      // 3. Get user's auction applications
      const { data: appsData, error: appsError } = await supabase
        .from("auction_applications")
        .select(`
          *,
          artifacts:artifact_id (*)
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (appsError) throw appsError;
      setApplications(appsData || []);

    } catch (err: any) {
      console.error("Error loading seller dashboard data:", err);
      setError(err.message || "Failed to load auctions data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditClick = (auction: Auction) => {
    const displayStatus = getAuctionDisplayStatus(auction as any);
    if (["Live", "Extended", "Scheduled", "Awaiting Payment", "Sold", "Paid Out", "Ended", "Cancelled", "Rejected"].includes(displayStatus)) {
      alert("This auction status does not allow modifications.");
      return;
    }

    setSelectedAuction(auction);

    // Format dates to datetime-local format
    const formatToLocalDatetime = (isoString: string) => {
      const date = new Date(isoString);
      const tzOffset = date.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
      return localISOTime;
    };

    setFormData({
      title: auction.title,
      description: auction.description || "",
      start_time: formatToLocalDatetime(auction.start_time),
      end_time: formatToLocalDatetime(auction.end_time),
      reserve_price: auction.reserve_price ? auction.reserve_price.toString() : "",
      bid_increment: auction.bid_increment.toString(),
    });
    setShowEditModal(true);
  };

  const handleEditAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuction) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        id: selectedAuction.id,
        ...formData,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : "",
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : "",
      };

      const response = await fetch("/api/auctions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update auction");
      }

      setSuccess("Auction updated successfully!");
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAuction = async (auctionId: string) => {
    const target = auctions.find((a) => a.id === auctionId);
    if (target) {
      const displayStatus = getAuctionDisplayStatus(target);
      if (["Live", "Extended", "Scheduled", "Awaiting Payment", "Sold", "Paid Out", "Ended", "Cancelled", "Rejected"].includes(displayStatus)) {
        alert("This auction status does not allow cancellations.");
        return;
      }
    }

    if (!confirm("Are you sure you want to cancel this auction? Cancelled auctions cannot receive bids.")) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/auctions?id=${auctionId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel auction");
      }

      setSuccess("Auction cancelled successfully!");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pandora-charcoal"></div>
          <p className="mt-4 text-gray-500">Loading Auctions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            My Auctions
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Track bidding analytics and manage approved curation records
          </p>
        </div>

        <Link
          href="/seller/apply-for-auction"
          className="flex items-center gap-2 rounded-lg bg-pandora-charcoal px-4 py-2.5 text-sm font-medium text-white hover:bg-pandora-charcoal/80 transition-colors"
        >
          <span>✨</span>
          <span>Apply for Auction</span>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">✓ {success}</p>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-white rounded-lg p-1.5 shadow-sm max-w-2xl mb-6">
        {([
          { key: "live", label: "Live Auctions" },
          { key: "scheduled", label: "Scheduled" },
          { key: "ended", label: "Ended" },
          { key: "pending", label: "Waiting For Approval" },
          { key: "rejected", label: "Rejected" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md py-2 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${activeTab === tab.key
                ? "bg-pandora-charcoal text-white"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Auctions Showcase */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-200">
              {(activeTab === "live" || activeTab === "scheduled" || activeTab === "ended") ? (
                <>
                  <th className="px-6 py-3">Auction Info</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Bidding Stats</th>
                  <th className="px-6 py-3">Reserve Status</th>
                  <th className="px-6 py-3">Timing</th>
                  <th className="px-6 py-3">Time Remaining</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </>
              ) : activeTab === "pending" ? (
                <>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Estimated Value</th>
                  <th className="px-6 py-3">Submission Date</th>
                  <th className="px-6 py-3">Status</th>
                </>
              ) : (
                <>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Rejection Reason</th>
                  <th className="px-6 py-3">Submission Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm">
            {(activeTab === "live" || activeTab === "scheduled" || activeTab === "ended") ? (
              auctions
                .filter((auc) => {
                  const displayStatus = getAuctionDisplayStatus(auc);
                  if (activeTab === "live") return displayStatus === "Live" || displayStatus === "Extended";
                  if (activeTab === "scheduled") return displayStatus === "Scheduled";
                  return ["Unsold", "Awaiting Payment", "Sold", "Paid Out", "Cancelled", "Rejected"].includes(displayStatus);
                })
                .map((auction) => {
                  const displayStatus = getAuctionDisplayStatus(auction);
                  const uniqueBidders = new Set(auction.bids?.map((b: any) => b.user_id) || []).size;
                  const bidCount = auction.bids?.length || 0;
                  const reserveMet = auction.reserve_price 
                    ? (auction.current_bid >= auction.reserve_price ? "Met" : "Not Met")
                    : "No Reserve";
                  const bidderName = auction.highest_bidder?.display_name || auction.highest_bidder?.email?.split("@")[0] || "—";

                  return (
                    <tr key={auction.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{auction.title}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px] mt-0.5">{auction.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {auction.artifacts?.thumbnail_url ? (
                            <img
                              src={auction.artifacts.thumbnail_url}
                              alt={auction.artifacts.title}
                              className="h-10 w-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center text-xs flex-shrink-0">📦</div>
                          )}
                          <div>
                            <span className="font-medium text-gray-900 text-sm block">
                              {auction.artifacts?.title}
                            </span>
                            <span className="text-xs text-gray-400 capitalize block mt-0.5">
                              {auction.artifacts?.category?.replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 space-y-1">
                        <div><span className="font-semibold text-gray-700">Current Bid:</span> ${auction.current_bid?.toLocaleString()}</div>
                        <div><span className="font-semibold text-gray-700">Bidder:</span> {bidderName}</div>
                        <div><span className="font-semibold text-gray-700">Bids Count:</span> {bidCount}</div>
                        <div><span className="font-semibold text-gray-700">Unique Bidders:</span> {uniqueBidders}</div>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 font-medium ${
                          reserveMet === "Met" ? "bg-green-100 text-green-700" :
                          reserveMet === "Not Met" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {reserveMet}
                        </span>
                        {auction.reserve_price && (
                          <div className="text-[10px] text-gray-400 mt-1">Target: ${auction.reserve_price.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 space-y-1">
                        <div><span className="font-semibold text-gray-700">Start:</span> {new Date(auction.start_time).toLocaleString()}</div>
                        <div><span className="font-semibold text-gray-700">End:</span> {new Date(auction.end_time).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 space-y-1">
                        <div className="text-xs">
                          <TimeRemainingCell startTime={auction.start_time} endTime={auction.end_time} status={auction.status} />
                        </div>
                        <div>
                          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            displayStatus === "Live" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                            displayStatus === "Extended" ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse" :
                            displayStatus === "Scheduled" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                            displayStatus === "Awaiting Payment" ? "bg-purple-100 text-purple-800 border border-purple-200" :
                            displayStatus === "Sold" ? "bg-green-100 text-green-800 border border-green-200" :
                            displayStatus === "Paid Out" ? "bg-sky-100 text-sky-800 border border-sky-200" :
                            "bg-gray-100 text-gray-800 border border-gray-200"
                          }`}>
                            {displayStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setInfoAuction(auction);
                              setShowInfoModal(true);
                            }}
                            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                            title="View Info"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {false && (
                            <>
                              <button
                                onClick={() => handleEditClick(auction)}
                                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleCancelAuction(auction.id)}
                                className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors"
                                title="Cancel Auction"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
            ) : activeTab === "pending" ? (
              applications.filter(app => app.status === "pending").map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {app.artifacts?.thumbnail_url ? (
                        <img
                          src={app.artifacts.thumbnail_url}
                          alt={app.artifacts.title}
                          className="h-10 w-10 rounded-lg object-cover border border-gray-100"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center text-xs">📦</div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-900 text-sm block">
                          {app.artifacts?.title}
                        </span>
                        <span className="text-xs text-gray-400 capitalize block mt-0.5">
                          {app.artifacts?.category?.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {app.artifacts?.estimated_value
                      ? `$${app.artifacts.estimated_value.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>Submitted: {new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                      Waiting For Approval
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              applications.filter(app => app.status === "rejected").map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {app.artifacts?.thumbnail_url ? (
                        <img
                          src={app.artifacts.thumbnail_url}
                          alt={app.artifacts.title}
                          className="h-10 w-10 rounded-lg object-cover border border-gray-100"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center text-xs">📦</div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-900 text-sm block">
                          {app.artifacts?.title}
                        </span>
                        <span className="text-xs text-gray-400 capitalize block mt-0.5">
                          {app.artifacts?.category?.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-750 max-w-xs whitespace-pre-wrap break-words">
                    {app.rejection_reason || "No reason provided by board."}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>Submitted: {new Date(app.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded-full bg-red-100 text-red-700 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                      Rejected
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {app.artifact_id && (
                      <Link
                        href={`/seller/apply-for-auction?artifact_id=${app.artifact_id}`}
                        className="inline-flex items-center justify-center rounded-lg bg-pandora-charcoal px-3 py-1.5 text-xs font-semibold text-white hover:bg-pandora-charcoal/80 transition-colors shadow-sm whitespace-nowrap"
                      >
                        Resubmit Application
                      </Link>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Empty States */}
        {activeTab === "live" && auctions.filter(a => a.status === "live").length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No live auctions found.
          </div>
        )}
        {activeTab === "scheduled" && auctions.filter(a => a.status === "upcoming").length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No scheduled auctions found.
          </div>
        )}
        {activeTab === "ended" && auctions.filter(a => a.status === "ended" || a.status === "cancelled").length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No ended or cancelled auctions found.
          </div>
        )}
        {activeTab === "pending" && applications.filter(app => app.status === "pending").length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No applications waiting for curation approval.
          </div>
        )}
        {activeTab === "rejected" && applications.filter(app => app.status === "rejected").length === 0 && (
          <div className="p-12 text-center text-gray-500">
            No rejected applications found.
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900">
              Edit Auction
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Modify properties for your active or upcoming auction.
            </p>

            <form onSubmit={handleEditAuction} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Auction Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Special Bidding for Golden Cross"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe your auction details..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Reserve Price ($)
                  </label>
                  <input
                    type="number"
                    name="reserve_price"
                    value={formData.reserve_price}
                    onChange={handleInputChange}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Min Increment ($)
                  </label>
                  <input
                    type="number"
                    name="bid_increment"
                    value={formData.bid_increment}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-pandora-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-pandora-charcoal/80 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Info Modal */}
      {showInfoModal && infoAuction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900">
                Auction Product Details
              </h2>
              <button
                onClick={() => {
                  setShowInfoModal(false);
                  setInfoAuction(null);
                }}
                className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Media details */}
                <div className="space-y-4">
                  {infoAuction.artifacts?.videos?.[0] && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Showcase Video</h4>
                      <video
                        src={infoAuction.artifacts.videos[0]}
                        controls
                        className="w-full h-40 object-cover rounded-lg bg-black border border-gray-200"
                      />
                    </div>
                  )}
                  {infoAuction.artifacts?.thumbnail_url && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Thumbnail</h4>
                      <img
                        src={infoAuction.artifacts.thumbnail_url}
                        alt="Thumbnail"
                        className="w-full h-40 object-cover rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Title</h4>
                    <p className="text-sm font-semibold text-gray-900">{infoAuction.artifacts?.title || infoAuction.title}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Category</h4>
                    <p className="text-sm text-gray-900 capitalize">
                      {infoAuction.artifacts?.category ? infoAuction.artifacts.category.replace("_", " ") : "Other"}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Estimated Value</h4>
                    <p className="text-sm font-semibold text-pandora-charcoal">
                      ${(infoAuction.artifacts?.estimated_value || infoAuction.starting_bid).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Bidding Starts At</h4>
                    <p className="text-sm font-semibold text-gray-900">${infoAuction.starting_bid.toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Status</h4>
                    <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium capitalize mt-1">
                      {infoAuction.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1 border-t border-gray-100 pt-4">Description</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mt-2">
                  {infoAuction.artifacts?.description || infoAuction.description || "No description provided."}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowInfoModal(false);
                  setInfoAuction(null);
                }}
                className="rounded-lg bg-pandora-charcoal px-6 py-2 text-sm font-medium text-white hover:bg-pandora-charcoal/80 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
