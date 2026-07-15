"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  X,
  ArrowLeft,
  Calendar,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Download,
  Search,
  Printer,
  Loader2
} from "lucide-react";

interface PayoutSummary {
  seller_id: string;
  seller_name: string;
  seller_email: string;
  total_gross: number;
  total_commission: number;
  total_net: number;
  available_to_withdraw: number;
}

interface PayoutRow {
  id: string;
  seller_id: string;
  amount: number;
  currency: string;
  status: string;
  bank_account: string | null;
  upi: string | null;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
  profiles: { display_name: string | null; email: string } | null;
}

export default function AdminPayoutsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Data states
  const [summaries, setSummaries] = useState<PayoutSummary[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sellerQuery, setSellerQuery] = useState("");

  // Modals Visibility
  const [selectedPayout, setSelectedPayout] = useState<PayoutRow | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Form states for payout actions
  const [notesInput, setNotesInput] = useState("");

  const triggerToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Verify Admin role
  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/login?redirect=/admin/payouts");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (!profile || profile.role !== "admin") {
          setIsAdmin(false);
          router.push("/");
          return;
        }

        setIsAdmin(true);
      } catch (err) {
        console.error("Admin verification error:", err);
        setIsAdmin(false);
        router.push("/");
      }
    }
    checkAdmin();
  }, [router, supabase]);

  // Fetch Payout details on load
  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/payouts");
      const json = await res.json();

      if (json.success) {
        setSummaries(json.summaries || []);
        setPayouts(json.payouts || []);
      } else {
        setError(json.error || "Failed to load platform payouts.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to query payout logs.");
    } finally {
      setLoading(false);
    }
  }

  // Process single payout action override
  const handlePayoutAction = async (payoutId: string, action: string) => {
    try {
      setIsProcessingAction(true);
      const res = await fetch(`/api/payouts/${payoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notes: notesInput.trim() || null
        })
      });
      const json = await res.json();

      if (json.success) {
        triggerToast("success", `Payout status updated to ${action.toUpperCase()} successfully.`);
        setSelectedPayout(null);
        setNotesInput("");
        loadData();
      } else {
        triggerToast("error", json.error || "Failed to update payout.");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Payout execution failed.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Export filtered payouts to CSV
  const handleExportCSV = () => {
    if (filteredPayouts.length === 0) return;
    const headers = ["Payout ID", "Seller Name", "Seller Email", "Requested Amount", "Currency", "Status", "Bank/UPI", "Requested Date", "Processed Date"];
    const rows = filteredPayouts.map((p) => [
      p.id,
      p.profiles?.display_name || "Unknown Seller",
      p.profiles?.email || "",
      p.amount,
      p.currency,
      p.status.toUpperCase(),
      p.bank_account || p.upi || "N/A",
      new Date(p.created_at).toLocaleDateString(),
      p.processed_at ? new Date(p.processed_at).toLocaleDateString() : "Pending"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `admin-payouts-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters logic
  const filteredPayouts = payouts.filter((p) => {
    // 1. Tab Status
    if (activeTab !== "all") {
      if (p.status.toLowerCase() !== activeTab.toLowerCase()) return false;
    }

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = p.id.toLowerCase().includes(q);
      const matchSeller = p.profiles?.display_name?.toLowerCase().includes(q) || p.profiles?.email?.toLowerCase().includes(q);
      const matchStatus = p.status.toLowerCase().includes(q);
      const matchMethod = (p.bank_account || "").includes(q) || (p.upi || "").includes(q);
      if (!matchId && !matchSeller && !matchStatus && !matchMethod) return false;
    }

    // 3. Date bounds
    if (startDate && new Date(p.created_at) < new Date(startDate)) return false;
    if (endDate) {
      const endLimit = new Date(endDate);
      endLimit.setHours(23, 59, 59, 999);
      if (new Date(p.created_at) > endLimit) return false;
    }

    // 4. Amount ranges
    if (minAmount && p.amount < parseFloat(minAmount)) return false;
    if (maxAmount && p.amount > parseFloat(maxAmount)) return false;

    // 5. Seller query
    if (sellerQuery && !p.profiles?.display_name?.toLowerCase().includes(sellerQuery.toLowerCase())) return false;

    return true;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-gray-100 text-gray-800 border-gray-250";
      case "approved": return "bg-blue-50 text-blue-800 border-blue-200";
      case "processing": return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "completed": return "bg-emerald-50 text-emerald-800 border-emerald-250";
      case "rejected": return "bg-red-50 text-red-800 border-red-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  if (isAdmin === null || loading && payouts.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pandora-gold mx-auto" />
          <p className="mt-4 text-sm text-gray-500 font-medium">Loading platform payouts logs...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) return null;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-xl border p-4 shadow-xl transition-all duration-300 ${
          toast.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
          <p className="text-sm font-semibold">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Payout Clearances</h1>
          <p className="mt-1 text-sm text-gray-500">Manage seller custom withdrawal requests, log wire references, and approve settlements.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-pandora-charcoal text-white text-xs font-bold uppercase tracking-wider rounded hover:bg-pandora-gold transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex flex-wrap gap-1 bg-white p-2 rounded-t-lg shadow-xs">
        {["all", "pending", "approved", "processing", "completed", "rejected"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab ? "bg-pandora-charcoal text-white" : "text-gray-500 hover:text-pandora-charcoal hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white p-4 border border-gray-200 rounded-b-lg shadow-sm text-xs">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Keywords</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Payout ID, Bank / UPI reference..."
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Min Value ($)</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="e.g. 500"
              className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Max Value ($)</label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="e.g. 10000"
              className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Seller Store Name</label>
          <input
            type="text"
            value={sellerQuery}
            onChange={(e) => setSellerQuery(e.target.value)}
            placeholder="e.g. Hermitage Gallery"
            className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden text-xs">
        {filteredPayouts.length === 0 ? (
          <div className="py-20 text-center text-gray-400 italic">No payout requests match chosen keywords and bounds filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-700 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Request ID</th>
                  <th className="px-6 py-4">Seller Partner</th>
                  <th className="px-6 py-4">Requested Value</th>
                  <th className="px-6 py-4">Payout Method</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submission Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-500">
                {filteredPayouts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      #{p.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold text-gray-900 block">{p.profiles?.display_name || "Antiquarian Partner"}</span>
                        <span className="text-[10px] text-gray-400 block mt-0.5">{p.profiles?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-serif font-bold text-gray-900">
                      ${p.amount.toLocaleString()} USD
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px]">
                      {p.bank_account ? `Bank: ${p.bank_account}` : p.upi ? `UPI: ${p.upi}` : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block border px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${getStatusBadgeColor(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedPayout(p)}
                        className="inline-flex items-center gap-1 border border-pandora-gold hover:bg-amber-50 text-pandora-gold rounded px-3 py-1.5 font-bold uppercase tracking-wider text-[9px]"
                      >
                        Override Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Override Dialog Modal */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden text-xs text-gray-600">
            <div className="bg-pandora-charcoal text-white px-6 py-4 flex justify-between items-center border-b border-pandora-gold/20">
              <h3 className="font-serif font-bold text-sm">Override Payout Status</h3>
              <button type="button" onClick={() => setSelectedPayout(null)} className="text-white hover:text-gray-300">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">Requested Amount</span>
                  <span className="font-bold text-gray-900 block mt-0.5">${selectedPayout.amount.toLocaleString()} USD</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">Current Status</span>
                  <span className="font-bold text-pandora-gold block mt-0.5 uppercase">{selectedPayout.status}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">Payout Method details</span>
                <span className="font-mono text-gray-800 bg-gray-50 border border-gray-150 p-2 block rounded mt-1 font-semibold">
                  {selectedPayout.bank_account ? `Bank Wire: ${selectedPayout.bank_account}` : selectedPayout.upi ? `UPI ID: ${selectedPayout.upi}` : "Not Set"}
                </span>
              </div>

              {selectedPayout.notes && (
                <div>
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">Seller notes</span>
                  <p className="italic bg-gray-50 border border-gray-150 p-2 mt-1 rounded text-[11px] text-gray-500">{selectedPayout.notes}</p>
                </div>
              )}

              <div>
                <label className="block text-gray-500 font-semibold mb-1">Curation / rejection Reason Remarks</label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Enter remarks or rejection reasons..."
                  className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none"
                />
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex flex-wrap gap-2 justify-end border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedPayout(null)}
                className="px-4 py-2 border border-gray-300 rounded font-bold uppercase tracking-wider mr-auto"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handlePayoutAction(selectedPayout.id, "approve")}
                disabled={isProcessingAction}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold uppercase tracking-wider"
              >
                Approve
              </button>

              <button
                type="button"
                onClick={() => handlePayoutAction(selectedPayout.id, "mark_processing")}
                disabled={isProcessingAction}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold uppercase tracking-wider"
              >
                Processing
              </button>

              <button
                type="button"
                onClick={() => handlePayoutAction(selectedPayout.id, "mark_completed")}
                disabled={isProcessingAction}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold uppercase tracking-wider"
              >
                Complete
              </button>

              <button
                type="button"
                onClick={() => handlePayoutAction(selectedPayout.id, "reject")}
                disabled={isProcessingAction}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
