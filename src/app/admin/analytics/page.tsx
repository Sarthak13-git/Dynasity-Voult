"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  DollarSign,
  Users,
  Gavel,
  Clock,
  ShoppingBag,
  AlertCircle,
  TrendingUp,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  User,
  Package
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

interface KPIState {
  totalRevenue: number;
  totalUsers: number;
  totalAuctions: number;
  activeAuctions: number;
  totalOrders: number;
  pendingOrders: number;
}

interface AnalyticsData {
  kpis: KPIState;
  charts: {
    revenueByMonth: { name: string; revenue: number }[];
    auctionSuccessRate: { name: string; value: number }[];
    ordersByStatus: { status: string; count: number }[];
    userGrowth: { week: string; users: number }[];
  };
  tables: {
    topExpensiveItems: any[];
    recentOrders: any[];
    topBidders: any[];
  };
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Admin Verification & Fetching
  useEffect(() => {
    async function checkAdminAndFetch() {
      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/login?redirect=/admin/analytics");
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

        const response = await fetch("/api/analytics");
        const json = await response.json();

        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || "Failed to load analytics dashboard data.");
        }
      } catch (err: any) {
        console.error("❌ Error loading analytics:", err);
        setError(err.message || "An unexpected error occurred while loading data.");
      } finally {
        setLoading(false);
      }
    }
    checkAdminAndFetch();
  }, [router, supabase]);

  if (isAdmin === null || loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-[#0d0d0d] text-[#FDFBF7] rounded-2xl border border-neutral-900">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 text-[#D4AF37] animate-spin mx-auto" />
          <p className="text-sm font-medium tracking-wide text-gray-400">
            Gathering curation metrics & platform analytics...
          </p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  if (error) {
    return (
      <div className="p-8 bg-[#0d0d0d] text-[#FDFBF7] rounded-2xl border border-red-900/50 space-y-4">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle size={28} />
          <h2 className="text-lg font-bold">Failed to Load Dashboard</h2>
        </div>
        <p className="text-sm text-gray-400">{error}</p>
        {error?.toLowerCase().includes("jwt") ? (
          <button
            onClick={() => router.push("/login?redirect=/admin/analytics")}
            className="px-5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg"
          >
            Login Again
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg"
          >
            Retry Load
          </button>
        )}
      </div>
    );
  }

  const kpis = data?.kpis;

  const kpiCards = [
    {
      label: "Total Revenue",
      value: kpis ? `$${kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00",
      description: "Sum of payment_received orders",
      icon: DollarSign,
      color: "from-amber-500/20 to-yellow-600/10",
      borderColor: "border-amber-500/30",
      iconColor: "text-amber-500",
    },
    {
      label: "Total Registered Users",
      value: kpis ? kpis.totalUsers.toLocaleString() : "0",
      description: "Total profiles registered",
      icon: Users,
      color: "from-blue-500/20 to-teal-600/10",
      borderColor: "border-blue-500/30",
      iconColor: "text-blue-400",
    },
    {
      label: "Total Auctions Listed",
      value: kpis ? kpis.totalAuctions.toLocaleString() : "0",
      description: "Historical auction count",
      icon: Gavel,
      color: "from-purple-500/20 to-pink-600/10",
      borderColor: "border-purple-500/30",
      iconColor: "text-purple-400",
    },
    {
      label: "Active Auctions",
      value: kpis ? kpis.activeAuctions.toLocaleString() : "0",
      description: "Currently live bidding rooms",
      icon: Clock,
      color: "from-emerald-500/20 to-green-600/10",
      borderColor: "border-emerald-500/30",
      iconColor: "text-emerald-400",
    },
    {
      label: "Total Orders placed",
      value: kpis ? kpis.totalOrders.toLocaleString() : "0",
      description: "Buy Now & Auction orders",
      icon: ShoppingBag,
      color: "from-sky-500/20 to-indigo-600/10",
      borderColor: "border-sky-500/30",
      iconColor: "text-sky-400",
    },
    {
      label: "Pending Orders",
      value: kpis ? kpis.pendingOrders.toLocaleString() : "0",
      description: "Awaiting payment order counts",
      icon: AlertCircle,
      color: "from-rose-500/20 to-red-600/10",
      borderColor: "border-rose-500/30",
      iconColor: "text-rose-400",
    },
  ];

  return (
    <div className="space-y-8 bg-[#0d0d0d] text-[#FDFBF7] p-8 rounded-2xl border border-neutral-900">
      {/* Top Banner Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-900 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37] uppercase tracking-widest">
            <Sparkles size={14} />
            <span>Digital Heritage House Analytics</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-serif text-gradient-gold mt-1">
            Platform Analytics Board
          </h1>
          <p className="mt-1 text-xs text-neutral-400 font-medium">
            Monitor house revenues, auctions success, bidder engagement, and transaction flows.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-[#161616] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-neutral-800 transition-colors shadow-md"
        >
          <ArrowLeft size={14} />
          <span>Admin Panel</span>
        </Link>
      </div>

      {/* 6 KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card, idx) => (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-xl border bg-[#121212]/70 p-6 shadow-xl backdrop-blur-md transition-all hover:scale-[1.01] ${card.borderColor}`}
          >
            {/* Background decoration glow */}
            <div className={`absolute -right-8 -bottom-8 h-28 w-28 rounded-full bg-gradient-to-tr blur-3xl opacity-20 ${card.color}`} />
            
            <div className="flex items-center justify-between">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-[#1a1a1a] border border-neutral-800 ${card.iconColor}`}>
                <card.icon size={22} strokeWidth={1.5} />
              </div>
              <TrendingUp size={16} className="text-neutral-600" />
            </div>
            
            <p className="mt-5 text-3xl font-bold font-serif text-[#FDFBF7]">
              {card.value}
            </p>
            <h3 className="text-sm font-semibold tracking-wide text-neutral-200 mt-1">{card.label}</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5">{card.description}</p>
          </div>
        ))}
      </div>

      {/* 4 Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Month (LineChart) */}
        <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-6 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] mb-4 font-serif">
            Monthly House Revenue
          </h3>
          <div className="w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.charts.revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="name" stroke="#666" fontSize={10} />
                  <YAxis stroke="#666" fontSize={10} tickFormatter={(val) => `$${val.toLocaleString()}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#161616", borderColor: "#D4AF37", color: "#FDFBF7" }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#D4AF37" strokeWidth={3} activeDot={{ r: 6 }} dot={{ stroke: "#B8860B", strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] bg-neutral-900/40 rounded flex items-center justify-center text-xs text-neutral-500">Loading Chart...</div>
            )}
          </div>
        </div>

        {/* Auction Success Rate (PieChart) */}
        <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-6 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] mb-4 font-serif">
            Auction Success Rates
          </h3>
          <div className="w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data?.charts.auctionSuccessRate}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    <Cell fill="#D4AF37" stroke="#121212" strokeWidth={2} />
                    <Cell fill="#333333" stroke="#121212" strokeWidth={2} />
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#161616", borderColor: "#D4AF37", color: "#FDFBF7" }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value) => <span className="text-xs text-neutral-300 ml-1.5">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] bg-neutral-900/40 rounded flex items-center justify-center text-xs text-neutral-500">Loading Chart...</div>
            )}
          </div>
        </div>

        {/* Orders by Status (BarChart) */}
        <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-6 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] mb-4 font-serif">
            Volume by Order Status
          </h3>
          <div className="w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.charts.ordersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="status" stroke="#666" fontSize={10} />
                  <YAxis stroke="#666" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#161616", borderColor: "#D4AF37", color: "#FDFBF7" }}
                  />
                  <Bar dataKey="count" fill="#D4AF37" radius={[4, 4, 0, 0]}>
                    {data?.charts.ordersByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#D4AF37" : "#B8860B"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] bg-neutral-900/40 rounded flex items-center justify-center text-xs text-neutral-500">Loading Chart...</div>
            )}
          </div>
        </div>

        {/* User Growth (LineChart) */}
        <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-6 shadow-xl backdrop-blur-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] mb-4 font-serif">
            Weekly User Signups
          </h3>
          <div className="w-full">
            {mounted ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.charts.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="week" stroke="#666" fontSize={9} />
                  <YAxis stroke="#666" fontSize={10} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#161616", borderColor: "#D4AF37", color: "#FDFBF7" }}
                    formatter={(value: any) => [value, "Registrations"]}
                  />
                  <Line type="monotone" dataKey="users" stroke="#D4AF37" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ stroke: "#D4AF37", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] bg-neutral-900/40 rounded flex items-center justify-center text-xs text-neutral-500">Loading Chart...</div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Data Tables */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: Top 5 Expensive Items */}
        <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-5 shadow-xl backdrop-blur-md flex flex-col h-full">
          <div className="border-b border-neutral-900 pb-3 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] font-serif">
              Premium Valuations
            </h3>
            <p className="text-[10px] text-neutral-500">Top 5 items by estimated value</p>
          </div>
          <div className="flex-1 space-y-3">
            {data?.tables.topExpensiveItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-[#161616]/40 hover:bg-[#1c1c1c]/60 border border-neutral-900 p-2.5 rounded-lg transition-colors"
              >
                {item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="h-10 w-10 object-cover rounded-md border border-neutral-800 flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-[#222] border border-neutral-800 flex items-center justify-center text-xs flex-shrink-0">
                    📦
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-200 truncate">{item.title}</p>
                  <p className="text-[9px] text-[#D4AF37] uppercase tracking-wider font-semibold capitalize">
                    {item.category.replace("_", " ")}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 font-serif text-xs font-bold text-[#FDFBF7]">
                  {item.currency} {Number(item.estimated_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            ))}
            {data?.tables.topExpensiveItems.length === 0 && (
              <div className="text-center py-12 text-xs text-neutral-500">No items available.</div>
            )}
          </div>
        </div>

        {/* Column 2: Recent Orders */}
        <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-5 shadow-xl backdrop-blur-md lg:col-span-2 flex flex-col h-full">
          <div className="border-b border-neutral-900 pb-3 mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] font-serif">
                Recent Orders
              </h3>
              <p className="text-[10px] text-neutral-500">Last 10 platform orders placed</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-[10px] text-[#D4AF37] hover:underline uppercase tracking-wider font-semibold"
            >
              All Orders
            </Link>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-900 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  <th className="pb-2">Buyer</th>
                  <th className="pb-2">Artifact</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60">
                {data?.tables.recentOrders.map((order) => {
                  const buyer = order.profiles?.display_name || order.profiles?.email || "Unknown";
                  return (
                    <tr key={order.id} className="text-xs group hover:bg-[#161616]/30 transition-colors">
                      <td className="py-2.5 pr-2 truncate max-w-[120px]">
                        <span className="font-semibold text-gray-200">{buyer}</span>
                      </td>
                      <td className="py-2.5 pr-2 truncate max-w-[150px]">
                        <span className="text-neutral-400 group-hover:text-gray-200">{order.artifacts?.title || "Deleted Artifact"}</span>
                      </td>
                      <td className="py-2.5 font-semibold text-neutral-200">
                        {order.currency} {Number(order.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                            order.status === "payment_received"
                              ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-400"
                              : order.status === "pending"
                              ? "bg-yellow-950/40 border-yellow-900/50 text-yellow-400"
                              : "bg-neutral-900 border-neutral-800 text-neutral-400"
                          }`}
                        >
                          {order.status === "payment_received" ? "Paid" : order.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {data?.tables.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-xs text-neutral-500">
                      No orders placed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Top Bidders Table */}
      <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-5 shadow-xl backdrop-blur-md">
        <div className="border-b border-neutral-900 pb-3 mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] font-serif">
            Top House Bidders
          </h3>
          <p className="text-[10px] text-neutral-500">Most active bidding profiles on the platform</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-900 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                <th className="pb-2">Bidder</th>
                <th className="pb-2">Email address</th>
                <th className="pb-2 text-right">Bids Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900/60">
              {data?.tables.topBidders.map((bidder, index) => (
                <tr key={index} className="text-xs hover:bg-[#161616]/30 transition-colors">
                  <td className="py-3 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] font-bold text-[#D4AF37]">
                      {index + 1}
                    </div>
                    <span className="font-semibold text-gray-200">{bidder.display_name}</span>
                  </td>
                  <td className="py-3 text-neutral-400">{bidder.email}</td>
                  <td className="py-3 text-right font-bold text-[#D4AF37] font-serif pr-2">{bidder.count} bids</td>
                </tr>
              ))}
              {data?.tables.topBidders.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-xs text-neutral-500">
                    No bidding activity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
