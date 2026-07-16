"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Edit2, Trash2, Eye, MoreVertical, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Product {
  id: string;
  title: string;
  description: string;
  estimated_value: number;
  currency: string;
  category: string;
  origin: string;
  era: string;
  thumbnail_url: string;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  sold: "bg-gray-100 text-gray-700",
  reserved: "bg-yellow-100 text-yellow-700",
};

const statusLabels: Record<string, string> = {
  available: "Available",
  sold: "Sold",
  reserved: "Reserved",
};

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
};

export default function MyProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [viewType, setViewType] = useState<"grid" | "list">("list");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from("artifacts")
            .select("*, auctions(id), auction_applications(id, status)")
            .eq("seller_id", user.id)
            .in("status", ["draft", "available", "reserved", "sold"])
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
        const message = err instanceof Error ? err.message : "Failed to load products";
        setError(message);
        console.error("Error fetching products:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await fetch(`/api/products?id=${id}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to delete product");
        }

        setProducts(products.filter((p) => p.id !== id));
        console.log("Product deleted from DB:", id);
      } catch (err) {
        console.error("Error deleting product:", err);
        alert("Failed to delete product: " + (err instanceof Error ? err.message : "Unknown error"));
      }
    }
  };

  const categories = [
    { value: "all", label: "All Products" },
    ...Object.entries(categoryLabels).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              My Products
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Manage your {products.length} listed products
            </p>
          </div>
          
          <Link
            href="/seller/add-product"
            className="md:hidden flex items-center gap-2 rounded-lg bg-pandora-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-pandora-charcoal/80 transition-colors"
          >
            <Plus size={18} strokeWidth={1.5} />
            <span>Add Product</span>
          </Link>
        </div>

        {/* Filter and View Controls */}
        <div className="flex items-center gap-4">
          <Link
            href="/seller/add-product"
            className="hidden md:flex items-center gap-2 rounded-lg bg-pandora-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-pandora-charcoal/80 transition-colors"
          >
            <Plus size={18} strokeWidth={1.5} />
            <span>Add Product</span>
          </Link>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List View */}
      {viewType === "list" && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.map((product) => (
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
                        <div className="h-10 w-10 rounded-lg bg-gray-100"></div>
                      )}
                      <span className="font-medium text-gray-900">
                        {product.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {categoryLabels[product.category]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">
                      {product.currency} {product.estimated_value.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Eye className="h-4 w-4" />
                      —
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusColors[product.status] || "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {statusLabels[product.status] || product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {product.created_at ? new Date(product.created_at).toLocaleDateString() : "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {["reserved", "sold"].includes(product.status) ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded">
                        Locked (Paid/Held)
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/seller/products/${product.id}/edit`}
                          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grid View */}
      {viewType === "grid" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-lg border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Product Image */}
              <div className="h-48 bg-gray-100 flex items-center justify-center text-5xl">
                {product.thumbnail_url ? (
                  <img
                    src={product.thumbnail_url}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>📦</span>
                )}
              </div>

              {/* Product Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                  {product.title}
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  {categoryLabels[product.category]}
                </p>

                {/* Price and Status */}
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold text-gray-900">
                    {product.currency} {product.estimated_value.toLocaleString()}
                  </p>
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${statusColors[product.status] || "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {statusLabels[product.status] || product.status}
                  </span>
                </div>

                {/* Views and Actions */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Eye className="h-3 w-3" />
                    <span>0 views</span>
                  </div>
                  {["reserved", "sold"].includes(product.status) ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                      Locked
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/seller/products/${product.id}/edit`}
                        className="rounded p-1 text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="rounded p-1 text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="mb-4 text-gray-600">No products found</p>
          <a
            href="/seller/add-product"
            className="inline-block rounded-lg bg-pandora-charcoal px-6 py-2 font-medium text-white hover:bg-pandora-charcoal/80 transition-colors text-sm"
          >
            Add Your First Product
          </a>
        </div>
      )}
    </div>
  );
}
