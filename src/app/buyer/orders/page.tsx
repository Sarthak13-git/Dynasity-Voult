"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { 
  ShoppingBag, 
  Calendar, 
  Tag, 
  Truck, 
  ArrowRight, 
  Eye, 
  X, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MapPin, 
  Package, 
  ChevronRight,
  ShieldCheck,
  RefreshCw,
  Search
} from "lucide-react";

const categoryMap: Record<string, string> = {
  antiquity: "Antiquities",
  sculpture: "Sculptures",
  manuscript: "Manuscripts",
  arms_and_armor: "Arms & Armor",
  decorative_art: "Decorative Arts",
  textile: "Textiles",
  objets_d_art: "Objets d'Art"
};

export default function BuyerOrdersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [wonAuctions, setWonAuctions] = useState<any[]>([]);
  const [checkoutLoadingId, setCheckoutLoadingId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "paid" | "shipped" | "delivered" | "all">("pending");
  const [user, setUser] = useState<any>(null);

  // Fetch session and orders on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.replace("/login?redirect=/buyer/orders");
          return;
        }
        setUser(session.user);

        // Fetch user profiles & orders
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            artifacts:artifact_id (
              id,
              title,
              description,
              images,
              thumbnail_url,
              estimated_value,
              buy_now_price,
              currency,
              category
            )
          `)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setOrders(data || []);

        // Fetch won auctions where status = 'ended'
        const { data: wonAuctionsData, error: wonError } = await supabase
          .from("auctions")
          .select(`
            *,
            artifacts:artifact_id (
              id,
              title,
              description,
              images,
              thumbnail_url,
              estimated_value,
              buy_now_price,
              currency,
              category,
              slug
            )
          `)
          .eq("winner_id", session.user.id)
          .eq("status", "ended");

        if (wonError) throw wonError;
        setWonAuctions(wonAuctionsData || []);
      } catch (err) {
        console.error("❌ Error loading orders:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase, router]);

  const unpaidWonAuctions = wonAuctions.filter((auc) => {
    return !orders.some((o) => o.auction_id === auc.id && ["payment_received", "processing", "packed", "shipped", "delivered"].includes(o.status));
  });

  const handleCheckout = async (artifactId: string, auctionId: string) => {
    setCheckoutLoadingId(auctionId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artifact_id: artifactId, auction_id: auctionId }),
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
      setCheckoutLoadingId(null);
    }
  };

  // Tab Filtering logic
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return order.status === "pending";
    if (activeTab === "paid") return ["payment_received", "processing", "packed"].includes(order.status);
    if (activeTab === "shipped") return order.status === "shipped";
    if (activeTab === "delivered") return order.status === "delivered";
    return true;
  });

  // Timeline helper
  const getTimelineStages = (order: any) => {
    if (!order) return [];
    const status = order.status;
    const isCreated = true;
    const isPaid = ["payment_received", "processing", "packed", "shipped", "delivered"].includes(status);
    const isShipped = ["shipped", "delivered"].includes(status);
    const isDelivered = status === "delivered";

    const formattedDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    return [
      { label: "Order Created", date: formattedDate(order.created_at), completed: isCreated },
      { label: "Payment Approved", date: isPaid ? formattedDate(order.updated_at) : null, completed: isPaid },
      { label: "Dispatched & Transporting", date: isShipped ? formattedDate(order.updated_at) : null, completed: isShipped },
      { label: "Delivered", date: isDelivered ? formattedDate(order.updated_at) : null, completed: isDelivered },
    ];
  };

  // Extract address lines from shipping_address JSONB
  const getAddressLines = (sa: any) => {
    if (!sa) return [];
    const lines: string[] = [];
    const details = sa.address || sa;
    
    if (details.line1) lines.push(details.line1);
    if (details.line2) lines.push(details.line2);
    const cityStateZip = [details.city, details.state, details.postal_code].filter(Boolean).join(", ");
    if (cityStateZip) lines.push(cityStateZip);
    if (details.country) lines.push(details.country);
    return lines;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] flex items-center justify-center pt-24">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 text-[#B8860B] animate-spin mb-4" />
          <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
            Accessing Vault Archives...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] pt-32 pb-24 px-4 sm:px-6 lg:px-8 selection:bg-[#B8860B] selection:text-white">
      <div className="max-w-6xl mx-auto">
        
        {/* Dashboard Title */}
        <div className="mb-12 text-center md:text-left">
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight mb-2">
            My Collection Acquisitions
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest">
            Buyer Dashboard & Private Ledger
          </p>
        </div>

        {/* Action Required: Unpaid Won Lots */}
        {unpaidWonAuctions.length > 0 && (
          <div className="mb-12 bg-amber-50/60 border border-amber-200/80 rounded-lg p-6 shadow-sm">
            <h2 className="font-serif text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Action Required: Unpaid Won Lots
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {unpaidWonAuctions.map((auc) => {
                const art = auc.artifacts;
                const price = Number(auc.current_bid || auc.starting_bid);
                return (
                  <div key={auc.id} className="bg-white border border-amber-200/50 rounded-lg p-4 flex items-center gap-4 justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      {art?.thumbnail_url && (
                        <div className="relative h-12 w-12 rounded overflow-hidden border border-gray-100 shrink-0">
                          <Image src={art.thumbnail_url} alt={art.title} fill className="object-cover" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{art?.title || "Artifact"}</h3>
                        <p className="text-xs text-amber-800 font-medium mt-0.5">
                          Won: ${price.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCheckout(art.id, auc.id)}
                      disabled={checkoutLoadingId === auc.id}
                      className="px-4 py-2 bg-[#B8860B] hover:bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                    >
                      {checkoutLoadingId === auc.id ? "Loading..." : "Checkout Now"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters and Search Bar Container */}
        <div className="bg-white border border-[#E8E2D9] rounded-lg shadow-sm p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {(["pending", "paid", "shipped", "delivered", "all"] as const).map((tab) => {
              const labelMap: Record<string, string> = {
                pending: "Pending",
                paid: "Paid",
                shipped: "Shipped",
                delivered: "Delivered",
                all: "All Orders"
              };
              
              const count = orders.filter((o) => {
                if (tab === "all") return true;
                if (tab === "pending") return o.status === "pending";
                if (tab === "paid") return ["payment_received", "processing", "packed"].includes(o.status);
                if (tab === "shipped") return o.status === "shipped";
                if (tab === "delivered") return o.status === "delivered";
                return true;
              }).length;

              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-all duration-300 border ${
                    isActive
                      ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-sm"
                      : "bg-[#FAF8F5] text-gray-500 border-[#E8E2D9] hover:bg-gray-100 hover:text-[#1A1A1A]"
                  }`}
                >
                  {labelMap[tab]} ({count})
                </button>
              );
            })}
          </div>

          <div className="text-xs text-gray-400 font-medium">
            Account: <span className="font-mono text-gray-700">{user?.email}</span>
          </div>
        </div>

        {/* Order Listings Grid */}
        {filteredOrders.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-[#E8E2D9] rounded-lg shadow-sm p-16 text-center max-w-xl mx-auto">
            <div className="h-16 w-16 bg-[#FAF8F5] border border-[#E8E2D9] rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="h-8 w-8 text-gray-400" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-2xl font-medium mb-3">No acquisitions found</h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              No orders found in the "{activeTab}" filter directory. Expand your private collection by visiting our active auctions or marketplace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/buy"
                className="inline-flex items-center justify-center px-6 py-3 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors uppercase tracking-wider text-xs font-semibold rounded-md text-[#1A1A1A]"
              >
                Browse Marketplace
              </Link>
              <Link
                href="/auctions"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#1A1A1A] text-white hover:bg-[#B8860B] transition-colors uppercase tracking-wider text-xs font-semibold rounded-md"
              >
                View Live Auctions
              </Link>
            </div>
          </div>
        ) : (
          /* Orders Table/Cards */
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const art = order.artifacts;
              const img = art?.thumbnail_url || (art?.images && art.images[0]) || "/buy/item-1.jpg";
              const formattedPrice = Number(order.amount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              });
              
              const date = new Date(order.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric"
              });

              return (
                <div 
                  key={order.id} 
                  className="bg-white border border-[#E8E2D9] hover:border-gray-400 transition-all duration-300 rounded-lg shadow-sm p-6 flex flex-col lg:flex-row items-stretch justify-between gap-6"
                >
                  {/* Left: Product Media & Details */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="relative h-24 w-24 bg-[#FAF8F5] border border-[#E8E2D9] rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={img}
                        alt={art?.title || "Artifact"}
                        fill
                        className="object-cover"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[11px] font-mono text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                          ID: {order.id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{date}</span>
                      </div>
                      
                      <h2 className="font-serif text-lg font-semibold leading-snug hover:text-[#B8860B] transition-colors">
                        {art?.title || "Curated Artifact"}
                      </h2>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5 text-[#B8860B]" />
                          Price Paid: <strong className="text-gray-800">${formattedPrice} {order.currency}</strong>
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          <Truck className="h-3.5 w-3.5 text-gray-400" />
                          Delivery: {order.shipping_status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Badges & Details Action */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-between border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                    <div className="flex flex-col items-start lg:items-end gap-1.5">
                      <span className="text-[10px] uppercase text-gray-400 tracking-wider">Payment Status</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        ["payment_received", "processing", "packed"].includes(order.status) ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        order.status === "shipped" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                        order.status === "delivered" ? "bg-purple-50 text-purple-700 border border-purple-100" :
                        order.status === "pending" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        order.status === "refunded" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                        "bg-red-50 text-red-700 border border-red-100"
                      }`}>
                        {order.status === "payment_received" ? "Paid" :
                         order.status === "processing" ? "Processing" :
                         order.status === "packed" ? "Packed" :
                         order.status === "shipped" ? "Shipped" :
                         order.status === "delivered" ? "Delivered" :
                         order.status === "pending" ? "Pending" :
                         order.status === "refunded" ? "Refunded" :
                         "Cancelled"}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all text-xs font-semibold uppercase tracking-wider rounded-md bg-transparent"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Acquisition Details Modal Overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FDFBF7] border border-[#E8E2D9] rounded-lg shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="border-b border-[#E8E2D9] p-6 flex items-center justify-between bg-white">
              <div>
                <h2 className="font-serif text-2xl font-medium">Acquisition Details</h2>
                <p className="text-xs text-gray-500 font-mono mt-1 select-all">Order ID: {selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors border border-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              
              {/* Product and General Info */}
              <div className="flex gap-4 items-start border-b border-[#E8E2D9] pb-6">
                <div className="relative h-20 w-20 bg-[#FAF8F5] border border-[#E8E2D9] rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={selectedOrder.artifacts?.thumbnail_url || (selectedOrder.artifacts?.images && selectedOrder.artifacts.images[0]) || "/buy/item-1.jpg"}
                    alt={selectedOrder.artifacts?.title || "Artifact"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[#B8860B]">
                    {categoryMap[selectedOrder.artifacts?.category] || selectedOrder.artifacts?.category}
                  </span>
                  <h3 className="font-serif text-lg font-semibold leading-tight">
                    {selectedOrder.artifacts?.title}
                  </h3>
                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {selectedOrder.artifacts?.description}
                  </p>
                </div>
              </div>

              {/* Grid: Financial & Logistics details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-[#E8E2D9] pb-6">
                <div className="space-y-4">
                  <h4 className="font-serif text-base font-semibold text-gray-800 flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-[#B8860B]" />
                    Transaction Info
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Acquisition Price</span>
                      <span className="font-medium text-gray-800">${Number(selectedOrder.amount).toLocaleString()} {selectedOrder.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Hammer Premium</span>
                      <span className="text-emerald-600 font-medium">No fee</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-gray-100 pt-2 text-sm">
                      <span>Acquisition Total</span>
                      <span className="text-[#B8860B]">${Number(selectedOrder.amount).toLocaleString()} {selectedOrder.currency}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-serif text-base font-semibold text-gray-800 flex items-center gap-1.5">
                    <Truck className="h-4 w-4 text-[#B8860B]" />
                    Logistic Info
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shipping Status</span>
                      <span className="font-medium text-gray-800 capitalize">{selectedOrder.shipping_status.replace("_", " ")}</span>
                    </div>
                    {selectedOrder.tracking_number ? (
                      <div className="flex justify-between items-center bg-gray-50 border border-gray-100 p-2 rounded w-full mt-2">
                        <span className="text-gray-500 font-medium">Tracking Code:</span>
                        <span className="font-mono font-bold text-gray-800 select-all">{selectedOrder.tracking_number}</span>
                      </div>
                    ) : (
                      <p className="text-gray-400 italic mt-1 leading-normal">
                        Concierge white-glove transport is preparing. Tracking information will populate when dispatched.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="border-b border-[#E8E2D9] pb-6 space-y-3">
                <h4 className="font-serif text-base font-semibold text-gray-800 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#B8860B]" />
                  Transit Destination
                </h4>
                {selectedOrder.shipping_address ? (
                  <div className="bg-[#FAF8F5] border border-[#E8E2D9] p-4 rounded text-xs space-y-1">
                    {selectedOrder.shipping_address.name && (
                      <p className="font-bold text-gray-800 mb-1">{selectedOrder.shipping_address.name}</p>
                    )}
                    {getAddressLines(selectedOrder.shipping_address).map((line, idx) => (
                      <p key={idx} className="text-gray-600">{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">
                    No shipping address provided. A service coordinator will contact you to complete transfer arrangements.
                  </p>
                )}
              </div>

              {/* Order Timeline */}
              <div className="space-y-4">
                <h4 className="font-serif text-base font-semibold text-gray-800 flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-[#B8860B]" />
                  Acquisition Timeline
                </h4>
                
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 pt-2">
                  {/* Stepper Linking bar */}
                  <div className="hidden md:block absolute left-4 right-4 top-4 h-0.5 bg-gray-200 z-0" />
                  
                  {getTimelineStages(selectedOrder).map((stage, idx) => (
                    <div key={idx} className="relative z-10 flex md:flex-col items-center gap-4 md:gap-2 text-left md:text-center flex-1">
                      <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        stage.completed 
                          ? "bg-emerald-50 border-emerald-500 text-emerald-600" 
                          : "bg-white border-gray-300 text-gray-400"
                      }`}>
                        {stage.completed ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <div className="h-2 w-2 bg-gray-300 rounded-full" />
                        )}
                      </div>
                      
                      <div>
                        <p className={`text-xs font-semibold leading-tight ${stage.completed ? "text-gray-950 font-bold" : "text-gray-400"}`}>
                          {stage.label}
                        </p>
                        {stage.date && (
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {stage.date}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#E8E2D9] p-6 bg-white flex justify-end gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 bg-[#1A1A1A] text-white hover:bg-[#B8860B] transition-colors text-xs font-semibold uppercase tracking-wider rounded-md"
              >
                Close Ledger
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
