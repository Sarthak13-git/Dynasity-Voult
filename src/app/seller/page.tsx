"use client";

import { useState, useEffect } from "react";
import {
  Package,
  Eye,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

// Mock data for demonstration
const stats = [
  {
    label: "Total Products Listed",
    value: "12",
    change: "+2",
    trend: "up" as const,
    icon: Package,
  },
  {
    label: "Total Views",
    value: "1,245",
    change: "+18%",
    trend: "up" as const,
    icon: Eye,
  },
  {
    label: "Total Sales",
    value: "$45,200",
    change: "+5.2%",
    trend: "up" as const,
    icon: ShoppingCart,
  },
  {
    label: "Avg. Price",
    value: "$3,767",
    change: "+12%",
    trend: "up" as const,
    icon: TrendingUp,
  },
];

const recentProducts = [
  {
    id: 1,
    name: "Vintage Pocket Watch",
    category: "timepiece",
    price: "$2,500",
    image: "🕰️",
    status: "Available",
    views: 234,
    date: "2 days ago",
  },
  {
    id: 2,
    name: "Medieval Manuscript",
    category: "manuscript",
    price: "$5,800",
    image: "📜",
    status: "Available",
    views: 156,
    date: "5 days ago",
  },
  {
    id: 3,
    name: "Roman Gold Coin",
    category: "numismatic",
    price: "$1,200",
    image: "🪙",
    status: "Sold",
    views: 412,
    date: "1 week ago",
  },
  {
    id: 4,
    name: "Persian Carpet",
    category: "textile",
    price: "$3,400",
    image: "🧵",
    status: "Available",
    views: 189,
    date: "10 days ago",
  },
];

export default function SellerDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Dashboard
        </h2>
        <p className="text-sm text-gray-500">
          Manage your antique collection and track your sales performance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === "up" ? ArrowUpRight : ArrowDownRight;
          return (
            <div
              key={idx}
              className="rounded-lg border border-gray-200 bg-white p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-100 p-3">
                  <Icon className="h-6 w-6 text-gray-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <TrendIcon
                  className={`h-4 w-4 ${
                    stat.trend === "up"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    stat.trend === "up"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Products Section */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Products
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Views
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Listed
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentProducts.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg">
                        {product.image}
                      </div>
                      <span className="font-medium text-gray-900">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 capitalize">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      {product.price}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {product.views}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                        product.status === "Available"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {product.date}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <a
            href="/seller/products"
            className="text-sm font-medium text-pandora-charcoal hover:text-pandora-charcoal/80 transition-colors"
          >
            View All Products →
          </a>
        </div>
      </div>
    </div>
  );
}
