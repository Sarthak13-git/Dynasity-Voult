"use client";

import { useState } from "react";
import { Edit2, Trash2, Eye, MoreVertical } from "lucide-react";

const mockProducts = [
  {
    id: 1,
    title: "Vintage Pocket Watch",
    category: "timepiece",
    price: 2500,
    currency: "USD",
    image: "🕰️",
    status: "available",
    views: 234,
    createdAt: "2024-02-15",
  },
  {
    id: 2,
    title: "Medieval Manuscript",
    category: "manuscript",
    price: 5800,
    currency: "USD",
    image: "📜",
    status: "available",
    views: 156,
    createdAt: "2024-02-10",
  },
  {
    id: 3,
    title: "Roman Gold Coin",
    category: "numismatic",
    price: 1200,
    currency: "USD",
    image: "🪙",
    status: "sold",
    views: 412,
    createdAt: "2024-02-01",
  },
  {
    id: 4,
    title: "Persian Carpet",
    category: "textile",
    price: 3400,
    currency: "USD",
    image: "🧵",
    status: "available",
    views: 189,
    createdAt: "2024-01-28",
  },
  {
    id: 5,
    title: "Art Deco Chandelier",
    category: "decorative_art",
    price: 4200,
    currency: "USD",
    image: "💡",
    status: "available",
    views: 267,
    createdAt: "2024-01-25",
  },
  {
    id: 6,
    title: "Antique Samurai Sword",
    category: "weapon",
    price: 6800,
    currency: "USD",
    image: "⚔️",
    status: "available",
    views: 512,
    createdAt: "2024-01-20",
  },
];

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  sold: "bg-gray-100 text-gray-700",
  on_auction: "bg-blue-100 text-blue-700",
  reserved: "bg-yellow-100 text-yellow-700",
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
  const [products, setProducts] = useState(mockProducts);
  const [viewType, setViewType] = useState<"grid" | "list">("list");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this product?")) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  const categories = [
    { value: "all", label: "All Products" },
    ...Object.entries(categoryLabels).map(([value, label]) => ({
      value,
      label,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            My Products
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your {products.length} listed products
          </p>
        </div>

        {/* Filter and View Controls */}
        <div className="flex items-center gap-4">
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg">
                        {product.image}
                      </div>
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
                      {product.currency} {product.price.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Eye className="h-4 w-4" />
                      {product.views}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${
                        statusColors[product.status]
                      }`}
                    >
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
                {product.image}
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
                    {product.currency} {product.price.toLocaleString()}
                  </p>
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-medium capitalize ${
                      statusColors[product.status]
                    }`}
                  >
                    {product.status}
                  </span>
                </div>

                {/* Views and Actions */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Eye className="h-3 w-3" />
                    <span>{product.views} views</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="rounded p-1 text-gray-600 hover:bg-gray-100 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="rounded p-1 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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
