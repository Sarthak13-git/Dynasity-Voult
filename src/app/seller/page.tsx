"use client";

import { useState, useEffect } from "react";
import {
  Package,
  CheckCircle,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calculateSellerKPIs, SellerArtifact } from "@/lib/aggregators";

const categoryLabels: Record<string, string> = {
  painting: "Painting",
  sculpture: "Sculpture",
  manuscript: "Manuscript",
  jewelry: "Jewelry",
  antiquity: "Antiquity",
  decorative_art: "Decorative Art",
  timepiece: "Timepiece",
  textile: "Textile",
  weapon: "Weapon",
  numismatic: "Numismatic",
  other: "Other",
  arms_and_armor: "Arms & Armor",
  objets_d_art: "Objets d'Art"
};

export default function SellerDashboard() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<SellerArtifact[]>([]);

  useEffect(() => {
    setMounted(true);
    async function fetchData() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("artifacts")
            .select("*, auctions(id), auction_applications(id, status)")
            .eq("seller_id", user.id)
            .in("status", ["available", "reserved", "sold", "pending_auction_approval", "on_auction"])
            .order("created_at", { ascending: false });
          if (error) throw error;
          
          const directSalesOnly = (data || []).filter((p: any) => {
            const hasAuction = p.auctions && p.auctions.length > 0;
            const hasActiveApp = p.auction_applications && p.auction_applications.some(
              (app: any) => ["pending", "approved", "under_review"].includes(app.status)
            );
            return !hasAuction && !hasActiveApp;
          });
          setProducts(directSalesOnly);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Error fetching products for dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pandora-charcoal"></div>
          <p className="mt-4 text-gray-500">Loading Dashboard Data...</p>
        </div>
      </div>
    );
  }

  // Calculate dynamic statistics and trends via lib aggregators helper
  const kpis = calculateSellerKPIs(products);

  const stats = [
    {
      label: "Total Products Listed",
      value: kpis.totalListed.toString(),
      change: kpis.listedChangeText,
      trend: kpis.listedTrend,
      icon: Package,
    },
    {
      label: "Completed Sales",
      value: kpis.completedSales.toString(),
      change: kpis.soldChangeText,
      trend: kpis.soldTrend,
      icon: CheckCircle,
    },
    {
      label: "Total Sales",
      value: `$${kpis.totalSalesVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: kpis.salesChangeText,
      trend: kpis.salesTrend,
      icon: ShoppingCart,
    },
    {
      label: "Avg. Price",
      value: `$${Math.round(kpis.avgPrice).toLocaleString()}`,
      change: kpis.avgPriceChangeText,
      trend: kpis.avgPriceTrend,
      icon: TrendingUp,
    },
  ];

  const recentProducts = products.slice(0, 4);

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
          const TrendIcon = stat.trend === "up" 
            ? ArrowUpRight 
            : stat.trend === "down" 
              ? ArrowDownRight 
              : Minus;
          
          const trendColor = stat.trend === "up"
            ? "text-green-600"
            : stat.trend === "down"
              ? "text-red-600"
              : "text-gray-400";

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
                <TrendIcon className={`h-4 w-4 ${trendColor}`} />
                <span className={`text-sm font-medium ${trendColor}`}>
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

        {products.length === 0 ? (
          <div className="text-center py-16 px-6 bg-white rounded-lg border border-gray-200">
            <span className="text-4xl mb-4 inline-block">📦</span>
            <h4 className="text-base font-semibold text-gray-900">No Products Listed</h4>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
              You haven't listed any artifacts for sale yet. Add your first heritage item to start tracking views, sales, and curation statuses.
            </p>
          </div>
        ) : (
          <>
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
                          {product.thumbnail_url ? (
                            <img
                              src={product.thumbnail_url}
                              alt={product.title}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg">
                              📦
                            </div>
                          )}
                          <span className="font-medium text-gray-900">
                            {product.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 capitalize">
                          {categoryLabels[product.category] || product.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          {product.currency} {product.estimated_value?.toLocaleString() || "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${product.status === "available"
                              ? "bg-green-100 text-green-700"
                              : product.status === "pending_auction_approval"
                                ? "bg-amber-100 text-amber-800"
                                : product.status === "on_auction"
                                  ? "bg-blue-100 text-blue-700"
                                  : product.status === "sold"
                                    ? "bg-gray-100 text-gray-700"
                                    : "bg-gray-100 text-gray-700"
                            }`}
                        >
                          {product.status === "pending_auction_approval"
                            ? "Waiting For Approval"
                            : product.status === "on_auction"
                              ? "On Auction"
                              : product.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">
                          {product.created_at ? new Date(product.created_at).toLocaleDateString() : "—"}
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
          </>
        )}
      </div>
    </div>
  );
}
