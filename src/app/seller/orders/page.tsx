"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Filter,
  Download,
  Printer,
  ChevronRight,
  Package,
  Calendar,
  DollarSign,
  Truck,
  CheckCircle,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
  Shield,
  Loader2,
  RefreshCw
} from "lucide-react";

interface Order {
  id: string;
  user_id: string;
  artifact_id: string;
  amount: number;
  currency: string;
  status: string;
  tracking_number: string | null;
  courier_name: string | null;
  shipping_address: any;
  notes: string | null;
  created_at: string;
  artifacts: {
    id: string;
    title: string;
    estimated_value: number;
    buy_now_price: number;
    currency: string;
    thumbnail_url: string;
  };
  profiles: {
    id: string;
    display_name: string;
    email: string;
  };
}

interface StatusHistory {
  id: string;
  status: string;
  remarks: string | null;
  created_at: string;
}

interface ArtifactDoc {
  id: string;
  title: string;
  document_type: string;
  file_url: string;
  is_verified: boolean;
  verification_id: string | null;
}

export default function SellerOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tabs / Filters / Search State
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [buyerFilter, setBuyerFilter] = useState("");

  // Drawer details state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [artifactDocs, setArtifactDocs] = useState<ArtifactDoc[]>([]);

  // Update states inside Drawer
  const [newTracking, setNewTracking] = useState("");
  const [newCourier, setNewCourier] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Print refs
  const invoicePrintRef = useRef<HTMLDivElement>(null);
  const packingSlipPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load orders");
      }
      setOrders(data.orders || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  // Fetch status history and documents when opening drawer
  const handleOpenDetails = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingDetails(true);
    setNewTracking(order.tracking_number || "");
    setNewCourier(order.courier_name || "");
    setUpdateNotes("");
    
    try {
      // 1. Fetch Status History
      const { data: history, error: historyErr } = await supabase
        .from("order_status_history")
        .select("id, status, remarks, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (historyErr) throw historyErr;
      setStatusHistory(history || []);

      // 2. Fetch Artifact Documents
      const { data: docs, error: docsErr } = await supabase
        .from("artifact_documents")
        .select("id, title, document_type, file_url, is_verified, verification_id")
        .eq("artifact_id", order.artifact_id);

      if (docsErr) throw docsErr;
      setArtifactDocs(docs || []);

    } catch (err: any) {
      console.error("Error loading order details metadata:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Perform status update
  const handleUpdateStatus = async (status: string) => {
    if (!selectedOrder) return;
    try {
      setUpdatingStatus(true);
      
      const payload: any = { status };
      if (status === "shipped") {
        if (!newCourier.trim() || !newTracking.trim()) {
          alert("Courier name and tracking number are required to mark as Shipped.");
          setUpdatingStatus(false);
          return;
        }
        payload.courier_name = newCourier.trim();
        payload.tracking_number = newTracking.trim();
      }

      if (updateNotes.trim()) {
        payload.notes = updateNotes.trim();
      }

      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update status");
      }

      // Update current order item locally
      const updatedItem = {
        ...selectedOrder,
        status,
        courier_name: payload.courier_name || selectedOrder.courier_name,
        tracking_number: payload.tracking_number || selectedOrder.tracking_number,
        notes: payload.notes || selectedOrder.notes
      };
      
      setSelectedOrder(updatedItem);
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updatedItem : o)));
      
      // Refresh order history logs
      const { data: updatedHistory } = await supabase
        .from("order_status_history")
        .select("id, status, remarks, created_at")
        .eq("order_id", selectedOrder.id)
        .order("created_at", { ascending: true });

      setStatusHistory(updatedHistory || []);
      setUpdateNotes("");
      alert(`Order marked as ${status} successfully!`);
    } catch (err: any) {
      alert(`Error updating order status: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Save Courier & Tracking only
  const handleSaveLogistics = async () => {
    if (!selectedOrder) return;
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courier_name: newCourier.trim() || null,
          tracking_number: newTracking.trim() || null
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const updatedItem = {
        ...selectedOrder,
        courier_name: newCourier.trim() || null,
        tracking_number: newTracking.trim() || null
      };

      setSelectedOrder(updatedItem);
      setOrders((prev) => prev.map((o) => (o.id === selectedOrder.id ? updatedItem : o)));
      alert("Logistics metadata updated successfully.");
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Trigger browser print
  const handlePrint = (type: "invoice" | "packingslip") => {
    const printContents = type === "invoice" 
      ? invoicePrintRef.current?.innerHTML 
      : packingSlipPrintRef.current?.innerHTML;

    if (!printContents) return;

    const originalContents = document.body.innerHTML;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print ${type === "invoice" ? "Invoice" : "Packing Slip"}</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              body { font-family: monospace; background: white; padding: 40px; }
            </style>
          </head>
          <body>
            ${printContents}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Exports filtered list to CSV format
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = ["Order ID", "Product", "Buyer Name", "Buyer Email", "Purchase Date", "Amount", "Payment Status", "Order Status", "Courier", "Tracking Number"];
    const rows = filteredOrders.map((o) => [
      o.id,
      o.artifacts?.title,
      o.profiles?.display_name,
      o.profiles?.email,
      new Date(o.created_at).toLocaleDateString(),
      o.amount,
      o.status === "paid" || o.status === "payment_received" ? "Paid" : o.status.toUpperCase(),
      o.status.toUpperCase(),
      o.courier_name || "",
      o.tracking_number || ""
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filters logic
  const filteredOrders = orders.filter((o) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchBuyer = o.profiles?.display_name?.toLowerCase().includes(q) || o.profiles?.email?.toLowerCase().includes(q);
      const matchTracking = o.tracking_number?.toLowerCase().includes(q);
      const matchProduct = o.artifacts?.title?.toLowerCase().includes(q);
      if (!matchId && !matchBuyer && !matchTracking && !matchProduct) return false;
    }

    // 2. Tabs status mapping
    if (activeTab !== "all") {
      if (activeTab === "pending" && o.status !== "pending") return false;
      if (activeTab === "paid" && !["paid", "payment_received"].includes(o.status)) return false;
      if (activeTab === "packed" && o.status !== "packed") return false;
      if (activeTab === "shipped" && o.status !== "shipped") return false;
      if (activeTab === "delivered" && o.status !== "delivered") return false;
      if (activeTab === "cancelled" && o.status !== "cancelled") return false;
      if (activeTab === "refunded" && o.status !== "refunded") return false;
    }

    // 3. Amount boundaries
    if (minAmount && o.amount < parseFloat(minAmount)) return false;
    if (maxAmount && o.amount > parseFloat(maxAmount)) return false;

    // 4. Date ranges
    if (startDate && new Date(o.created_at) < new Date(startDate)) return false;
    if (endDate) {
      const endLimit = new Date(endDate);
      endLimit.setHours(23, 59, 59, 999);
      if (new Date(o.created_at) > endLimit) return false;
    }

    // 5. Buyer filter
    if (buyerFilter && !o.profiles?.display_name?.toLowerCase().includes(buyerFilter.toLowerCase())) return false;

    return true;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-gray-100 text-gray-800 border-gray-200";
      case "paid":
      case "payment_received": return "bg-emerald-50 text-emerald-800 border-emerald-100";
      case "packed": return "bg-blue-50 text-blue-800 border-blue-100";
      case "shipped": return "bg-indigo-50 text-indigo-800 border-indigo-100";
      case "delivered": return "bg-emerald-100 text-emerald-950 border-emerald-200";
      case "cancelled": return "bg-red-50 text-red-800 border-red-100";
      case "refunded": return "bg-amber-50 text-amber-800 border-amber-100";
      default: return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Enterprise Order Management</h1>
          <p className="text-xs text-gray-500 mt-1">Manage purchase lifecycle, generate status history logs, and coordinate premium logistics.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50"
            title="Refresh Orders"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-pandora-charcoal hover:bg-pandora-gold text-white font-bold text-xs uppercase tracking-wider rounded transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 flex flex-wrap gap-1 bg-white p-2 rounded-t-lg shadow-xs">
        {["all", "pending", "paid", "packed", "shipped", "delivered", "cancelled", "refunded"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === tab
                ? "bg-pandora-charcoal text-white"
                : "text-gray-500 hover:text-pandora-charcoal hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters Dashboard Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white p-4 border border-gray-200 rounded-b-lg shadow-sm text-xs">
        {/* Search */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Database</label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ID, Buyer, Product, Tracking..."
              className="w-full border border-gray-300 rounded pl-8 pr-3 py-1.5 focus:outline-none"
            />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Date Filter */}
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

        {/* Amount Range */}
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
              placeholder="e.g. 50000"
              className="w-full border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
            />
          </div>
        </div>

        {/* Buyer filter */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Filter by Buyer Name</label>
          <input
            type="text"
            value={buyerFilter}
            onChange={(e) => setBuyerFilter(e.target.value)}
            placeholder="e.g. Sarthak"
            className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none"
          />
        </div>
      </div>

      {/* Orders Table list */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-pandora-gold" />
            Loading catalog orders database records...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400 italic">No orders found matching the filter parameters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-gray-500">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-700 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Product Detail</th>
                  <th className="px-6 py-4">Buyer Collector</th>
                  <th className="px-6 py-4">Purchase Date</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Order Status</th>
                  <th className="px-6 py-4">Tracking info</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((o) => {
                  const displayDate = new Date(o.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  });

                  return (
                    <tr
                      key={o.id}
                      onClick={() => handleOpenDetails(o)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-gray-900">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          {o.artifacts?.thumbnail_url ? (
                            <img
                              src={o.artifacts.thumbnail_url}
                              alt=""
                              className="h-10 w-10 rounded object-cover border border-gray-100 shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-100 rounded flex items-center justify-center text-gray-400 shrink-0">📷</div>
                          )}
                          <span className="truncate max-w-[140px] block font-bold">{o.artifacts?.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-semibold text-gray-900 block">{o.profiles?.display_name || "Collector"}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">{o.profiles?.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{displayDate}</td>
                      <td className="px-6 py-4 font-serif font-bold text-gray-900">
                        ${o.amount.toLocaleString()} USD
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block border px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeColor(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {o.tracking_number ? (
                          <div>
                            <span className="font-mono text-[10px] text-gray-800 block">{o.tracking_number}</span>
                            <span className="text-[9px] text-gray-400 block">{o.courier_name || "Premium Transport"}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-pandora-gold hover:text-pandora-gold-light font-bold text-xs uppercase tracking-wider flex items-center gap-0.5 ml-auto">
                          Details <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Sliding Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Overlay */}
            <div
              className="absolute inset-0 bg-black/40 transition-opacity"
              onClick={() => setSelectedOrder(null)}
            />

            <div className="pointer-events-none absolute inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-gray-100">
                
                {/* Header */}
                <div className="bg-pandora-charcoal text-white px-6 py-5 flex items-center justify-between border-b border-pandora-gold/20">
                  <div>
                    <span className="text-[9px] font-bold text-pandora-gold uppercase tracking-wider block">Enterprise Curation Ledger</span>
                    <h2 className="text-lg font-serif font-bold tracking-wide">Order Detail: #{selectedOrder.id.slice(0, 8).toUpperCase()}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="rounded-full hover:bg-white/10 p-1.5 text-white/80 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Details Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-600">
                  {loadingDetails ? (
                    <div className="py-20 flex justify-center items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-pandora-gold" />
                      Loading history log and document files...
                    </div>
                  ) : (
                    <>
                      {/* Grid Sections: Buyer and Artifact */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Buyer Collector Info */}
                        <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-pandora-gold">Buyer & Shipping Information</h4>
                          <div className="space-y-1.5">
                            <p><strong className="text-gray-800">Collector:</strong> {selectedOrder.profiles?.display_name || "Premium Member"}</p>
                            <p><strong className="text-gray-800">Email:</strong> {selectedOrder.profiles?.email}</p>
                            
                            <div className="border-t border-gray-200/50 pt-2 mt-2">
                              <span className="font-bold text-gray-700 block mb-1">Shipping Address:</span>
                              <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                                {selectedOrder.shipping_address?.name && `${selectedOrder.shipping_address.name}\n`}
                                {selectedOrder.shipping_address?.line1 && `${selectedOrder.shipping_address.line1}\n`}
                                {selectedOrder.shipping_address?.line2 && `${selectedOrder.shipping_address.line2}\n`}
                                {selectedOrder.shipping_address?.city && `${selectedOrder.shipping_address.city}, `}
                                {selectedOrder.shipping_address?.state && `${selectedOrder.shipping_address.state} `}
                                {selectedOrder.shipping_address?.postal_code && `${selectedOrder.shipping_address.postal_code}\n`}
                                {selectedOrder.shipping_address?.country && selectedOrder.shipping_address.country}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Artifact Specification Info */}
                        <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 space-y-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-pandora-gold">Acquired Antiquity Specification</h4>
                          <div className="flex gap-3">
                            {selectedOrder.artifacts?.thumbnail_url && (
                              <img
                                src={selectedOrder.artifacts.thumbnail_url}
                                alt=""
                                className="h-16 w-16 rounded object-cover border border-gray-200"
                              />
                            )}
                            <div className="space-y-1">
                              <span className="font-bold text-gray-900 text-sm block">{selectedOrder.artifacts?.title}</span>
                              <p className="text-gray-500">Lot Ref: {selectedOrder.artifact_id}</p>
                              <p className="font-serif font-bold text-pandora-gold">${selectedOrder.amount.toLocaleString()} USD</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Logistics tracking config console */}
                      <div className="border border-gray-200 rounded-lg p-5 bg-white space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-800">Logistics & Tracking Configuration</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-gray-500 mb-1 font-semibold">Courier / Carrier</label>
                            <input
                              type="text"
                              value={newCourier}
                              onChange={(e) => setNewCourier(e.target.value)}
                              placeholder="e.g. FedEx Priority Security"
                              className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-500 mb-1 font-semibold">Tracking Code / Number</label>
                            <input
                              type="text"
                              value={newTracking}
                              onChange={(e) => setNewTracking(e.target.value)}
                              placeholder="e.g. EX-98124981"
                              className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-500 mb-1 font-semibold">Curation Notes / Update remarks</label>
                          <input
                            type="text"
                            value={updateNotes}
                            onChange={(e) => setUpdateNotes(e.target.value)}
                            placeholder="Optional notes to save into history log..."
                            className="w-full border border-gray-300 rounded px-3 py-1.5 focus:outline-none"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={handleSaveLogistics}
                            disabled={updatingStatus}
                            className="px-4 py-2 border border-pandora-gold text-pandora-gold font-bold uppercase tracking-wider hover:bg-amber-50 rounded transition-colors"
                          >
                            Save Logistics Details
                          </button>
                        </div>
                      </div>

                      {/* Order status dispatch actions */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-700">Dispatch Actions</h4>
                        <div className="flex flex-wrap gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus("packed")}
                            disabled={updatingStatus}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold uppercase tracking-wider"
                          >
                            Mark Packed
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus("shipped")}
                            disabled={updatingStatus}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold uppercase tracking-wider"
                          >
                            Mark Shipped
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus("delivered")}
                            disabled={updatingStatus}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold uppercase tracking-wider"
                          >
                            Mark Delivered
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus("cancelled")}
                            disabled={updatingStatus}
                            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold uppercase tracking-wider"
                          >
                            Cancel Order
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus("refunded")}
                            disabled={updatingStatus}
                            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold uppercase tracking-wider"
                          >
                            Refund Order
                          </button>
                        </div>
                      </div>

                      {/* Verification Documents listing */}
                      <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/30 space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-pandora-gold">Verification Certificate Files</h4>
                        {artifactDocs.length === 0 ? (
                          <p className="text-gray-400 italic text-[11px]">No verification documents found for this artifact.</p>
                        ) : (
                          <div className="space-y-2">
                            {artifactDocs.map((doc) => (
                              <div key={doc.id} className="flex items-center justify-between p-2.5 bg-white border border-gray-150 rounded text-[11px]">
                                <span className="font-semibold text-gray-800">{doc.title}</span>
                                <div className="flex items-center gap-3">
                                  {doc.is_verified && (
                                    <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded font-bold border border-emerald-100">
                                      ID: {doc.verification_id || "VERIFIED"}
                                    </span>
                                  )}
                                  <a
                                    href={`/api/documents/${doc.id}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-pandora-gold hover:underline flex items-center gap-0.5"
                                  >
                                    Download <ExternalLink size={10} />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Order Timeline History Logs */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-800">State Transition Timeline</h4>
                        <div className="relative border-l border-gray-200 pl-6 ml-2 space-y-4 py-1">
                          {statusHistory.map((h, i) => (
                            <div key={h.id || i} className="relative">
                              <span className="absolute -left-[29px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-pandora-gold" />
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 uppercase tracking-wide">{h.status}</span>
                                  <span className="text-[9px] text-gray-400">
                                    {new Date(h.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-gray-500">{h.remarks || "No comments entered."}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Print PDF document actions */}
                      <div className="border-t border-gray-100 pt-6 flex gap-4">
                        <button
                          type="button"
                          onClick={() => handlePrint("invoice")}
                          className="flex-1 py-3 border border-gray-300 text-gray-800 hover:bg-gray-50 rounded font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Printer size={14} /> Print Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrint("packingslip")}
                          className="flex-1 py-3 border border-gray-300 text-gray-800 hover:bg-gray-50 rounded font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Package size={14} /> Print Packing Slip
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── PRINT-ONLY SECURE DOM CONTEXTS ─── */}
      {selectedOrder && (
        <div className="hidden">
          {/* Invoice Print Document */}
          <div ref={invoicePrintRef} className="p-10 space-y-8 bg-white text-black max-w-3xl border border-gray-300">
            <div className="flex justify-between items-start border-b border-gray-300 pb-6">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-widest">INVOICE</h1>
                <p className="text-xs mt-1">Invoice ID: INV-{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs">Date: {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold uppercase">DYNASITY-VOULT</h2>
                <p className="text-[10px] text-gray-500">Curation Registry Registry Hub</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <h3 className="font-bold border-b border-gray-200 pb-1 mb-2">BILL TO (BUYER)</h3>
                <p className="font-bold">{selectedOrder.profiles?.display_name || "Collector Member"}</p>
                <p>{selectedOrder.profiles?.email}</p>
              </div>
              <div>
                <h3 className="font-bold border-b border-gray-200 pb-1 mb-2">SHIPPING ADDRESS</h3>
                <p className="whitespace-pre-line leading-relaxed text-gray-700">
                  {selectedOrder.shipping_address?.name && `${selectedOrder.shipping_address.name}\n`}
                  {selectedOrder.shipping_address?.line1 && `${selectedOrder.shipping_address.line1}\n`}
                  {selectedOrder.shipping_address?.line2 && `${selectedOrder.shipping_address.line2}\n`}
                  {selectedOrder.shipping_address?.city && `${selectedOrder.shipping_address.city}, `}
                  {selectedOrder.shipping_address?.state && `${selectedOrder.shipping_address.state} `}
                  {selectedOrder.shipping_address?.postal_code && `${selectedOrder.shipping_address.postal_code}\n`}
                  {selectedOrder.shipping_address?.country && selectedOrder.shipping_address.country}
                </p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse mt-8">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50 font-bold">
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3 text-right">Quantity</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-3 font-semibold">{selectedOrder.artifacts?.title}</td>
                  <td className="py-3 px-3 text-right">1</td>
                  <td className="py-3 px-3 text-right">${selectedOrder.amount.toLocaleString()} USD</td>
                </tr>
                <tr className="font-bold border-t border-gray-300">
                  <td colSpan={2} className="py-3 px-3 text-right">Total:</td>
                  <td className="py-3 px-3 text-right text-base">${selectedOrder.amount.toLocaleString()} USD</td>
                </tr>
              </tbody>
            </table>

            <div className="pt-20 text-center text-[10px] text-gray-400 border-t border-gray-200">
              Thank you for acquiring through Dynasity-Voult. This invoice constitutes a certified transaction record of historical lot ownership registry.
            </div>
          </div>

          {/* Packing Slip Print Document */}
          <div ref={packingSlipPrintRef} className="p-10 space-y-8 bg-white text-black max-w-3xl border border-gray-300">
            <div className="flex justify-between items-start border-b border-gray-300 pb-6">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-widest">PACKING SLIP</h1>
                <p className="text-xs mt-1">Slip Ref: PKG-{selectedOrder.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs">Date: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold uppercase">DYNASITY-VOULT</h2>
                <p className="text-[10px] text-gray-500">Security Shipping Logistics</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <h3 className="font-bold border-b border-gray-200 pb-1 mb-2">DELIVER TO</h3>
                <p className="font-bold">{selectedOrder.shipping_address?.name || selectedOrder.profiles?.display_name}</p>
                <p className="whitespace-pre-line leading-relaxed text-gray-700">
                  {selectedOrder.shipping_address?.line1 && `${selectedOrder.shipping_address.line1}\n`}
                  {selectedOrder.shipping_address?.line2 && `${selectedOrder.shipping_address.line2}\n`}
                  {selectedOrder.shipping_address?.city && `${selectedOrder.shipping_address.city}, `}
                  {selectedOrder.shipping_address?.state && `${selectedOrder.shipping_address.state} `}
                  {selectedOrder.shipping_address?.postal_code && `${selectedOrder.shipping_address.postal_code}\n`}
                  {selectedOrder.shipping_address?.country && selectedOrder.shipping_address.country}
                </p>
              </div>
              <div>
                <h3 className="font-bold border-b border-gray-200 pb-1 mb-2">LOGISTICS META</h3>
                <p><strong className="text-gray-800">Order Ref:</strong> #{selectedOrder.id}</p>
                <p><strong className="text-gray-800">Courier:</strong> {selectedOrder.courier_name || "Premium Transport Service"}</p>
                <p><strong className="text-gray-800">Tracking Code:</strong> {selectedOrder.tracking_number || "Awaiting scan"}</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse mt-8">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50 font-bold">
                  <th className="py-2 px-3">Item Title</th>
                  <th className="py-2 px-3 text-right">Quantity</th>
                  <th className="py-2 px-3">Condition Verify</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-3 px-3 font-semibold">{selectedOrder.artifacts?.title}</td>
                  <td className="py-3 px-3 text-right">1</td>
                  <td className="py-3 px-3 italic">[ ] Checked Curation Integrity Certificate</td>
                </tr>
              </tbody>
            </table>

            <div className="pt-20 text-center text-[10px] text-gray-400 border-t border-gray-200">
              Dynasity-Voult Security Seal: Do not accept delivery if secure transport package seal is broken. Check condition report documentation.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
