"use client";

import { useEffect, useState } from "react";
import {
  Gavel,
  Users,
  DollarSign,
  Clock,
  UserCheck,
  ClipboardList,
  ShoppingBag,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/stats");
      const json = await res.json();
      if (res.ok && json.success) {
        setDashboardData(json);
      } else {
        setError(json.error || "Failed to load dashboard statistics.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to contact database statistics API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function verifyAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
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
      loadDashboardData();
    }
    verifyAdmin();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-pandora-charcoal mx-auto" />
          <p className="text-sm text-gray-500 font-medium">Loading database metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 flex items-start gap-3 text-red-800">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-sm">Failed to Load Dashboard</h3>
          <p className="text-xs text-red-700 mt-1">{error}</p>
          <button
            onClick={loadDashboardData}
            className="mt-3 rounded bg-red-800 text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-900 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    totalUsers: 0,
    totalSellers: 0,
    pendingRequests: 0,
    pendingApplications: 0,
    activeAuctions: 0,
    totalOrders: 0,
    revenue: 0,
  };

  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
    {
      label: "Total Sellers",
      value: stats.totalSellers.toLocaleString(),
      icon: Users,
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      label: "Pending Seller Requests",
      value: stats.pendingRequests.toLocaleString(),
      icon: UserCheck,
      color: stats.pendingRequests > 0 ? "text-amber-600 bg-amber-50 border-amber-100 animate-pulse" : "text-gray-600 bg-gray-50 border-gray-100",
      link: "/admin/seller-requests"
    },
    {
      label: "Pending Auction Applications",
      value: stats.pendingApplications.toLocaleString(),
      icon: ClipboardList,
      color: stats.pendingApplications > 0 ? "text-amber-600 bg-amber-50 border-amber-100 animate-pulse" : "text-gray-600 bg-gray-50 border-gray-100",
      link: "/admin/auction-applications"
    },
    {
      label: "Active Auctions",
      value: stats.activeAuctions.toLocaleString(),
      icon: Gavel,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      link: "/admin/auctions"
    },
    {
      label: "Total Orders",
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingBag,
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
      link: "/admin/orders"
    },
    {
      label: "Revenue",
      value: `$${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-green-600 bg-green-50 border-green-100",
    },
  ];

  const recentActivity = dashboardData?.recentActivity || [];
  const recentAuctions = dashboardData?.recentAuctions || [];

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Real-time database metrics of your digital heritage house
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className="text-gray-500" />
          Refresh Stats
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          const CardContent = (
            <div className={`rounded-xl border p-5 bg-white shadow-xs transition-all ${stat.link ? 'hover:shadow-md hover:border-gray-300 cursor-pointer' : ''}`}>
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${stat.color.split(' ')[0]} ${stat.color.split(' ')[1]} ${stat.color.split(' ')[2]}`}>
                  <Icon size={20} strokeWidth={1.5} />
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold text-gray-900">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{stat.label}</p>
            </div>
          );
          return stat.link ? (
            <Link key={idx} href={stat.link}>
              {CardContent}
            </Link>
          ) : (
            <div key={idx}>{CardContent}</div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Auctions */}
        <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Auctions
            </h2>
            <Link
              href="/admin/auctions"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto flex-1">
            {recentAuctions.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 font-serif italic">No recent auctions scheduled in database.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <th className="px-6 py-3">Item</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Bids</th>
                    <th className="px-6 py-3">Current/Start Bid</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAuctions.map((auction: any, idx: number) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
                    >
                      <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                        {auction.name}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            auction.status === "Live"
                              ? "bg-green-50 text-green-700"
                              : auction.status === "Upcoming"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {auction.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-sm text-gray-600">
                        {auction.bids}
                      </td>
                      <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                        {auction.highest}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-gray-50 px-6">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500 font-serif italic">No recent activity logged.</div>
            ) : (
              recentActivity.map((activity: any, idx: number) => (
                <div key={idx} className="py-3.5">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.action}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {activity.detail}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock size={10} />
                    {new Date(activity.time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({new Date(activity.time).toLocaleDateString()})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
