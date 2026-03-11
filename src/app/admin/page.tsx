"use client";

import {
  Gavel,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";

// Mock data for the dashboard
const stats = [
  {
    label: "Total Auction Items",
    value: "47",
    change: "+3",
    trend: "up" as const,
    icon: Gavel,
  },
  {
    label: "Registered Users",
    value: "1,284",
    change: "+12%",
    trend: "up" as const,
    icon: Users,
  },
  {
    label: "Total Revenue",
    value: "$2.4M",
    change: "+8.2%",
    trend: "up" as const,
    icon: DollarSign,
  },
  {
    label: "Active Bids",
    value: "89",
    change: "-5",
    trend: "down" as const,
    icon: TrendingUp,
  },
];

const recentActivity = [
  {
    action: "New bid placed",
    detail: 'Bugatti "La Voiture Noire" — $15.2M by Kurt Hansen',
    time: "2 min ago",
  },
  {
    action: "Auction created",
    detail: "Imperator Aurum 1885 — Starting at $3.5M",
    time: "15 min ago",
  },
  {
    action: "User registered",
    detail: "johndoe@example.com",
    time: "1 hour ago",
  },
  {
    action: "Auction ended",
    detail: "Royal Enfield KX — Won by Albert Wesker for $3.1M",
    time: "3 hours ago",
  },
  {
    action: "New bid placed",
    detail: "PP Sky Moon Tourbillon — $12.8M by Joseph Stalin",
    time: "5 hours ago",
  },
  {
    action: "Item updated",
    detail: "Amoria Ring — Description modified",
    time: "8 hours ago",
  },
];

const recentAuctions = [
  {
    name: 'Bugatti "La Voiture Noire"',
    status: "Live",
    bids: 24,
    highest: "$15.2M",
  },
  {
    name: "PP Sky Moon Tourbillon",
    status: "Live",
    bids: 18,
    highest: "$12.8M",
  },
  {
    name: "Amoria Ring",
    status: "Upcoming",
    bids: 0,
    highest: "—",
  },
  {
    name: "Royal Enfield KX",
    status: "Ended",
    bids: 31,
    highest: "$3.1M",
  },
  {
    name: "Lotus Reverie",
    status: "Live",
    bids: 9,
    highest: "$5.4M",
  },
];

export default function AdminDashboard() {
  return (
    <div>
      {/* Page Title */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your auction platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                <stat.icon size={20} className="text-gray-600" strokeWidth={1.5} />
              </div>
              <span
                className={`flex items-center gap-1 text-xs font-medium ${
                  stat.trend === "up" ? "text-emerald-600" : "text-red-500"
                }`}
              >
                {stat.trend === "up" ? (
                  <ArrowUpRight size={14} />
                ) : (
                  <ArrowDownRight size={14} />
                )}
                {stat.change}
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold text-gray-900">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Auctions */}
        <div className="lg:col-span-3 rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Auctions
            </h2>
            <a
              href="/admin/auctions"
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View All
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <th className="px-6 py-3">Item</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Bids</th>
                  <th className="px-6 py-3">Highest</th>
                </tr>
              </thead>
              <tbody>
                {recentAuctions.map((auction, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                      {auction.name}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          auction.status === "Live"
                            ? "bg-emerald-50 text-emerald-700"
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
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Recent Activity
            </h2>
          </div>
          <div className="divide-y divide-gray-50 px-6">
            {recentActivity.map((activity, idx) => (
              <div key={idx} className="py-3.5">
                <p className="text-sm font-medium text-gray-900">
                  {activity.action}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {activity.detail}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
                  <Clock size={10} />
                  {activity.time}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
