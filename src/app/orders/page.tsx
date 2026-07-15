"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Package,
  Calendar,
  DollarSign,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  ExternalLink,
  Download,
  Loader2,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import Link from "next/link";

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
  created_at: string;
  artifacts: {
    id: string;
    title: string;
    estimated_value: number;
    buy_now_price: number;
    currency: string;
    thumbnail_url: string;
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

export default function BuyerOrdersPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail panel state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [artifactDocs, setArtifactDocs] = useState<ArtifactDoc[]>([]);

  // Print ref
  const invoicePrintRef = useRef<HTMLDivElement>(null);

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

  const handleSelectOrder = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingDetails(true);
    try {
      // 1. Fetch status history
      const { data: history, error: historyErr } = await supabase
        .from("order_status_history")
        .select("id, status, remarks, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (historyErr) throw historyErr;
      setStatusHistory(history || []);

      // 2. Fetch documents
      const { data: docs, error: docsErr } = await supabase
        .from("artifact_documents")
        .select("id, title, document_type, file_url, is_verified, verification_id")
        .eq("artifact_id", order.artifact_id);

      if (docsErr) throw docsErr;
      setArtifactDocs(docs || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const triggerPrintInvoice = () => {
    const contents = invoicePrintRef.current?.innerHTML;
    if (!contents) return;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Invoice</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
              body { font-family: monospace; background: white; padding: 40px; }
            </style>
          </head>
          <body>
            ${contents}
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

  // Timeline node state representation
  const timelineStages = ["pending", "paid", "packed", "shipped", "delivered"];
  
  const getStageIndex = (status: string) => {
    const s = status.toLowerCase();
    if (s === "payment_received" || s === "paid") return 1;
    if (s === "packed") return 2;
    if (s === "shipped") return 3;
    if (s === "delivered") return 4;
    return 0; // pending or other
  };

  const currentStageIndex = selectedOrder ? getStageIndex(selectedOrder.status) : 0;

  return (
    <div className="min-h-screen bg-[#fafafa] py-12 px-6">
      <div className="mx-auto max-w-[1400px] space-y-8">
        
        {/* Header */}
        <div>
          <span className="text-[10px] font-bold text-pandora-gold uppercase tracking-[0.25em] block">Your Collection Portfolio</span>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mt-1">Acquisitions & Orders</h1>
          <p className="text-xs text-gray-500 mt-1">Track transit logs, download curation verification certificates, and view invoices.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Orders list (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">Order History</h2>
            
            {loading ? (
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-xs text-gray-500 flex justify-center items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-pandora-gold" />
                Loading your transactions...
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-xs text-gray-400 italic">
                You have not placed any orders yet.
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => handleSelectOrder(o)}
                    className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:border-pandora-gold shadow-sm flex gap-4 ${
                      selectedOrder?.id === o.id ? "border-pandora-gold ring-1 ring-pandora-gold/20" : "border-gray-200"
                    }`}
                  >
                    {o.artifacts?.thumbnail_url ? (
                      <div className="relative h-16 w-16 rounded overflow-hidden border border-gray-150 shrink-0 bg-gray-50">
                        <img src={o.artifacts.thumbnail_url} alt="" className="object-cover h-full w-full" />
                      </div>
                    ) : (
                      <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 shrink-0">📷</div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-mono text-[9px] font-bold text-gray-400 uppercase">#{o.id.slice(0, 8)}</span>
                        <span className={`inline-block px-2 py-0.2 rounded-full text-[8px] font-bold uppercase tracking-wide border ${
                          o.status === "delivered" 
                            ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                            : "bg-amber-50 text-amber-800 border-amber-100"
                        }`}>
                          {o.status}
                        </span>
                      </div>
                      <span className="font-serif font-bold text-gray-900 block truncate text-xs">{o.artifacts?.title}</span>
                      <p className="text-[10px] text-gray-500 font-semibold">${o.amount.toLocaleString()} USD</p>
                      <p className="text-[9px] text-gray-400">Purchased: {new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Selected Order Detail Workspace (7 cols) */}
          <div className="lg:col-span-7">
            {selectedOrder ? (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Panel Header */}
                <div className="bg-pandora-charcoal text-white px-6 py-5 flex justify-between items-center border-b border-pandora-gold/20">
                  <div>
                    <span className="text-[9px] font-bold text-pandora-gold uppercase tracking-wider block">Acquisition Record</span>
                    <h3 className="text-sm font-serif font-bold">Order ID: #{selectedOrder.id.toUpperCase()}</h3>
                  </div>
                  
                  <button
                    onClick={triggerPrintInvoice}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded font-bold uppercase tracking-wider text-[10px] transition-colors"
                  >
                    <Printer size={12} /> Print Invoice
                  </button>
                </div>

                {/* Details Content Container */}
                <div className="p-6 space-y-6 text-xs text-gray-600">
                  {loadingDetails ? (
                    <div className="py-12 flex justify-center items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-pandora-gold" />
                      Loading timeline tracking records...
                    </div>
                  ) : (
                    <>
                      {/* Shipping Address and Logistics columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-gray-100 pb-6">
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-800 mb-2">Delivery Destination</h4>
                          <p className="text-gray-600 whitespace-pre-line leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-150">
                            {selectedOrder.shipping_address?.name && `${selectedOrder.shipping_address.name}\n`}
                            {selectedOrder.shipping_address?.line1 && `${selectedOrder.shipping_address.line1}\n`}
                            {selectedOrder.shipping_address?.line2 && `${selectedOrder.shipping_address.line2}\n`}
                            {selectedOrder.shipping_address?.city && `${selectedOrder.shipping_address.city}, `}
                            {selectedOrder.shipping_address?.state && `${selectedOrder.shipping_address.state} `}
                            {selectedOrder.shipping_address?.postal_code && `${selectedOrder.shipping_address.postal_code}\n`}
                            {selectedOrder.shipping_address?.country && selectedOrder.shipping_address.country}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-800 mb-2">Logistics Logistics</h4>
                          {selectedOrder.tracking_number ? (
                            <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg space-y-2">
                              <p><strong className="text-indigo-900">Courier:</strong> {selectedOrder.courier_name || "Premium Carrier"}</p>
                              <p><strong className="text-indigo-900">Tracking Code:</strong> <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-150">{selectedOrder.tracking_number}</code></p>
                              <span className="text-[10px] text-indigo-700 block mt-1">✓ Shipment is handled via luxury climate-controlled security transit.</span>
                            </div>
                          ) : (
                            <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg text-gray-400 italic">
                              Awaiting shipping registration from the antiquarian seller partner.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Animated vertical timeline */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-800">Delivery Status Timeline</h4>
                        
                        <div className="relative border-l-2 border-gray-100 pl-6 ml-2 space-y-6 py-1">
                          {timelineStages.map((stage, idx) => {
                            const isCompleted = idx <= currentStageIndex;
                            const isCurrent = idx === currentStageIndex;

                            return (
                              <div key={stage} className="relative">
                                {/* Bullet indicator */}
                                <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white transition-all duration-500 ${
                                  isCompleted 
                                    ? "bg-pandora-gold scale-110 shadow-xs" 
                                    : "bg-gray-200"
                                }`} />

                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold uppercase tracking-wider ${
                                      isCurrent 
                                        ? "text-pandora-gold text-[13px]" 
                                        : isCompleted 
                                          ? "text-gray-800" 
                                          : "text-gray-400"
                                    }`}>
                                      {stage}
                                    </span>
                                    {isCurrent && (
                                      <span className="animate-pulse bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wide">
                                        Current Status
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Verification documents downloads */}
                      <div className="border-t border-gray-100 pt-6 space-y-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-pandora-gold">Certificate & Authenticity Documents</h4>
                        {artifactDocs.length === 0 ? (
                          <p className="text-gray-400 italic text-[11px]">No documents generated for this lot yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {artifactDocs.map((doc) => (
                              <div key={doc.id} className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex items-center justify-between gap-4">
                                <span className="font-semibold text-gray-800 truncate max-w-[150px]">{doc.title}</span>
                                <a
                                  href={`/api/documents/${doc.id}/download`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-pandora-gold hover:underline font-bold uppercase tracking-wider text-[10px] shrink-0"
                                >
                                  Download PDF
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl p-20 text-center text-xs text-gray-400 italic shadow-sm">
                Select an order from the list to display details, animated timeline tracking status, and invoice prints.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── PRINT-ONLY INVOICE DOM CONTEXT ─── */}
      {selectedOrder && (
        <div className="hidden">
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
                <p className="font-bold">{selectedOrder.shipping_address?.name}</p>
                <p>{selectedOrder.shipping_address?.line1}</p>
                {selectedOrder.shipping_address?.line2 && <p>{selectedOrder.shipping_address?.line2}</p>}
                <p>{selectedOrder.shipping_address?.city}, {selectedOrder.shipping_address?.state} {selectedOrder.shipping_address?.postal_code}</p>
                <p>{selectedOrder.shipping_address?.country}</p>
              </div>
              <div className="text-right">
                <h3 className="font-bold border-b border-gray-200 pb-1 mb-2">SUMMARY</h3>
                <p>Transaction ID: {selectedOrder.id}</p>
                <p>Status: {selectedOrder.status.toUpperCase()}</p>
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
                  <td colSpan={2} className="py-3 px-3 text-right">Total Paid:</td>
                  <td className="py-3 px-3 text-right text-base">${selectedOrder.amount.toLocaleString()} USD</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
