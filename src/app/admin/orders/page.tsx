"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatHistoricalDate } from "@/lib/format-historical-date";

import {
  AlertCircle,
  CheckCircle,
  Eye,
  Edit,
  X,
  DollarSign,
  User,
  Clock,
  ArrowLeft,
  Mail,
  FileText,
  Truck,
  CreditCard,
  MapPin,
  Download,
  Search,
  RefreshCw,
  Loader2
} from "lucide-react";

interface Artifact {
  id: string;
  title: string;
  category: string;
  estimated_value: number;
  buy_now_price: number | null;
  currency: string;
  thumbnail_url: string | null;
  seller_id: string;
  creation_year?: number | null;
  calendar_era?: string | null;
  is_estimated?: boolean;
  historical_period?: string | null;
  seller?: {
    display_name: string;
    store_name: string;
    email: string;
  };
}


interface BuyerProfile {
  id: string;
  display_name: string | null;
  email: string;
}

interface Order {
  id: string;
  user_id: string;
  artifact_id: string;
  auction_id: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_intent_id: string | null;
  shipping_address: any | null;
  shipping_status: string;
  tracking_number: string | null;
  courier_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  artifacts: Artifact;
  profiles: BuyerProfile;
}

interface StatusHistory {
  id: string;
  status: string;
  remarks: string | null;
  created_at: string;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [sellerQuery, setSellerQuery] = useState("");
  const [buyerQuery, setBuyerQuery] = useState("");

  // Modal / Details states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);

  const [updatingOrder, setUpdatingOrder] = useState<Order | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Form states for update dialog
  const [formStatus, setFormStatus] = useState("");
  const [formCourier, setFormCourier] = useState("");
  const [formTrackingNumber, setFormTrackingNumber] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const showToastMsg = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Verify Admin role
  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/login?redirect=/admin/orders");
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
        loadOrders();
      } catch (err) {
        console.error("Admin verification error:", err);
        setIsAdmin(false);
        router.push("/");
      }
    }
    checkAdmin();
  }, [router, supabase]);

  // Fetch orders from database
  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/orders");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch orders.");
      }

      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message || "Failed to load orders.");
      showToastMsg("error", err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }

  // Load status history on order selection
  const handleOpenDetails = async (order: Order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
    setLoadingHistory(true);
    try {
      const { data: history, error: historyErr } = await supabase
        .from("order_status_history")
        .select("id, status, remarks, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (historyErr) throw historyErr;
      setStatusHistory(history || []);
    } catch (err) {
      console.error("Error loading order status timeline logs:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openUpdateModal = (order: Order) => {
    setUpdatingOrder(order);
    setFormStatus(order.status);
    setFormCourier(order.courier_name || "");
    setFormTrackingNumber(order.tracking_number || "");
    setFormNotes(order.notes || "");
    setShowUpdateModal(true);
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingOrder) return;

    setIsSubmittingAction(true);

    try {
      const response = await fetch(`/api/orders/${updatingOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: formStatus,
          courier_name: formCourier.trim() || null,
          tracking_number: formTrackingNumber.trim() || null,
          notes: formNotes.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update order status.");
      }

      showToastMsg("success", "Order status updated successfully!");
      setShowUpdateModal(false);
      setUpdatingOrder(null);
      loadOrders();
    } catch (err: any) {
      console.error(err);
      showToastMsg("error", err.message || "Failed to update order.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Exports filtered list to CSV format
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = ["Order ID", "Product", "Buyer Name", "Buyer Email", "Purchase Date", "Amount", "Status", "Courier", "Tracking Number"];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.artifacts?.title,
      o.profiles?.display_name,
      o.profiles?.email,
      new Date(o.created_at).toLocaleDateString(),
      o.amount,
      o.status.toUpperCase(),
      o.courier_name || "",
      o.tracking_number || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `admin-orders-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Search Logic
  const filteredOrders = orders.filter((order) => {
    // 1. Tab selection filter
    if (activeTab !== "all") {
      if (activeTab === "pending" && order.status !== "pending") return false;
      if (activeTab === "paid" && !["paid", "payment_received"].includes(order.status)) return false;
      if (activeTab === "packed" && order.status !== "packed") return false;
      if (activeTab === "shipped" && order.status !== "shipped") return false;
      if (activeTab === "delivered" && order.status !== "delivered") return false;
      if (activeTab === "cancelled" && order.status !== "cancelled") return false;
      if (activeTab === "refunded" && order.status !== "refunded") return false;
    }

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = order.id.toLowerCase().includes(q);
      const matchBuyer = order.profiles?.display_name?.toLowerCase().includes(q) || order.profiles?.email?.toLowerCase().includes(q);
      const matchProduct = order.artifacts?.title?.toLowerCase().includes(q);
      const matchTracking = order.tracking_number?.toLowerCase().includes(q);
      if (!matchId && !matchBuyer && !matchProduct && !matchTracking) return false;
    }

    // 3. Date bounds
    if (startDate && new Date(order.created_at) < new Date(startDate)) return false;
    if (endDate) {
      const endLimit = new Date(endDate);
      endLimit.setHours(23, 59, 59, 999);
      if (new Date(order.created_at) > endLimit) return false;
    }

    // 4. Amount Range
    if (minAmount && order.amount < parseFloat(minAmount)) return false;
    if (maxAmount && order.amount > parseFloat(maxAmount)) return false;

    // 5. Buyer & Seller Queries
    if (buyerQuery && !order.profiles?.display_name?.toLowerCase().includes(buyerQuery.toLowerCase())) return false;

    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-gray-150 border-gray-300 text-gray-800";
      case "paid":
      case "payment_received": return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "packed": return "bg-blue-50 border-blue-200 text-blue-700";
      case "shipped": return "bg-indigo-50 border-indigo-200 text-indigo-700";
      case "delivered": return "bg-emerald-100 border-emerald-300 text-emerald-950";
      case "cancelled": return "bg-red-50 border-red-200 text-red-700";
      case "refunded": return "bg-amber-50 border-amber-200 text-amber-700";
      default: return "bg-gray-50 border-gray-200 text-gray-600";
    }
  };

  if (isAdmin === null || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-pandora-charcoal"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Loading orders register...</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Admin Order Registry</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor all transactions, inspect courier timelines, and manually override status states.</p>
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
        {["all", "pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"].map((tab) => (
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
              placeholder="Order ID, product name, buyer email..."
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
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Min amount ($)</label>
            <input
              type="number"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="e.g. 1000"
              className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Max amount ($)</label>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Buyer Display Name</label>
          <input
            type="text"
            value={buyerQuery}
            onChange={(e) => setBuyerQuery(e.target.value)}
            placeholder="e.g. Sarthak"
            className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400 italic">No orders match selected search and filter queries.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-700 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Buyer details</th>
                  <th className="px-6 py-4">Acquired antiquity</th>
                  <th className="px-6 py-4">Amount value</th>
                  <th className="px-6 py-4">Fulfillment Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs text-gray-500">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="font-semibold text-gray-900 block">{order.profiles?.display_name || "Buyer Member"}</span>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{order.profiles?.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {order.artifacts?.thumbnail_url && (
                          <img
                            src={order.artifacts.thumbnail_url}
                            alt=""
                            className="h-8 w-8 rounded object-cover border border-gray-100 shrink-0"
                          />
                        )}
                        <div>
                          <span className="font-semibold text-gray-900 truncate max-w-[160px] block">{order.artifacts?.title}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {formatHistoricalDate(order.artifacts?.creation_year, order.artifacts?.calendar_era, order.artifacts?.is_estimated)}
                            {order.artifacts?.historical_period && ` • ${order.artifacts.historical_period}`}
                          </span>
                        </div>

                      </div>
                    </td>
                    <td className="px-6 py-4 font-serif font-bold text-gray-900">
                      ${order.amount.toLocaleString()} USD
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center border px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetails(order)}
                          className="inline-flex items-center gap-1 border border-gray-300 hover:border-gray-400 bg-white rounded px-2.5 py-1.5 font-bold uppercase tracking-wider text-[9px]"
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          onClick={() => openUpdateModal(order)}
                          className="inline-flex items-center gap-1 border border-pandora-gold hover:bg-amber-50 bg-white text-pandora-gold rounded px-2.5 py-1.5 font-bold uppercase tracking-wider text-[9px]"
                        >
                          <Edit size={12} /> Override
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details modal */}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden text-xs text-gray-600">
            <div className="bg-pandora-charcoal text-white px-6 py-4 flex justify-between items-center border-b border-pandora-gold/20">
              <h3 className="font-serif font-bold text-sm">Order Detail Audit: #{selectedOrder.id.slice(0, 8).toUpperCase()}</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-white hover:text-gray-300">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">Buyer Name</span>
                  <span className="font-semibold text-gray-900 block mt-0.5">{selectedOrder.profiles?.display_name || "Collector"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">Buyer Email</span>
                  <span className="font-semibold text-gray-900 block mt-0.5">{selectedOrder.profiles?.email}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">Shipping Address</span>
                <p className="whitespace-pre-line text-gray-800 bg-gray-50 border border-gray-150 p-2.5 rounded mt-1 font-mono">
                  {selectedOrder.shipping_address?.name && `${selectedOrder.shipping_address.name}\n`}
                  {selectedOrder.shipping_address?.line1 && `${selectedOrder.shipping_address.line1}\n`}
                  {selectedOrder.shipping_address?.line2 && `${selectedOrder.shipping_address.line2}\n`}
                  {selectedOrder.shipping_address?.city && `${selectedOrder.shipping_address.city}, `}
                  {selectedOrder.shipping_address?.state && `${selectedOrder.shipping_address.state} `}
                  {selectedOrder.shipping_address?.postal_code && `${selectedOrder.shipping_address.postal_code}\n`}
                  {selectedOrder.shipping_address?.country && selectedOrder.shipping_address.country}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">Courier</span>
                  <span className="font-semibold text-gray-900 block mt-0.5">{selectedOrder.courier_name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">Tracking Number</span>
                  <span className="font-mono font-bold text-gray-900 block mt-0.5">{selectedOrder.tracking_number || "N/A"}</span>
                </div>
              </div>

              {/* Status History Timeline */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <span className="text-gray-400 block font-bold uppercase tracking-wider text-[9px]">Status history log</span>
                {loadingHistory ? (
                  <p className="italic text-gray-400">Loading timeline...</p>
                ) : (
                  <div className="relative border-l border-gray-200 pl-4 ml-1 space-y-3">
                    {statusHistory.map((h, idx) => (
                      <div key={h.id || idx} className="relative">
                        <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-pandora-gold" />
                        <div>
                          <strong className="text-gray-900 uppercase tracking-wide">{h.status}</strong>
                          <span className="text-[9px] text-gray-400 ml-2">{new Date(h.created_at).toLocaleString()}</span>
                          <p className="text-gray-500 mt-0.5">{h.remarks || "Updated"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-pandora-charcoal text-white rounded font-bold uppercase tracking-wider"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update modal */}
      {showUpdateModal && updatingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleUpdateOrder} className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden text-xs text-gray-600">
            <div className="bg-pandora-charcoal text-white px-6 py-4 flex justify-between items-center border-b border-pandora-gold/20">
              <h3 className="font-serif font-bold text-sm">Override Order status: #{updatingOrder.id.slice(0, 8).toUpperCase()}</h3>
              <button type="button" onClick={() => setShowUpdateModal(false)} className="text-white hover:text-gray-300">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">Target Order Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 focus:outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="packed">Packed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Courier / Carrier Name</label>
                <input
                  type="text"
                  value={formCourier}
                  onChange={(e) => setFormCourier(e.target.value)}
                  placeholder="e.g. UPS Secure Express"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Tracking Number</label>
                <input
                  type="text"
                  value={formTrackingNumber}
                  onChange={(e) => setFormTrackingNumber(e.target.value)}
                  placeholder="e.g. 1Z9999999999999999"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Override Audit Remarks</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Reason for manual override status..."
                  className="w-full rounded border border-gray-300 px-3 py-1.5 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingAction}
                className="px-4 py-2 bg-pandora-charcoal text-white rounded font-bold uppercase tracking-wider hover:bg-pandora-gold transition-colors disabled:opacity-50"
              >
                {isSubmittingAction ? "Saving..." : "Save Override"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
