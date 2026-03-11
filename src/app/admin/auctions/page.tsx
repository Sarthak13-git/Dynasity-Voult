"use client";

import { useState } from "react";
import Image from "next/image";
import { auctionItems } from "@/lib/auction-data";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";

// Extend auction data with admin-specific fields
const auctionListData = auctionItems.map((item, idx) => ({
  ...item,
  status: idx < 3 ? "Live" : idx < 5 ? "Upcoming" : "Ended",
  bids: Math.floor(Math.random() * 40) + 5,
  highestBid: item.startingBid,
  createdAt: "2025-03-0" + (idx + 1),
}));

export default function AdminAuctionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredItems = auctionListData.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Auction Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your auction items and listings
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-pandora-charcoal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          <Plus size={16} />
          Add New Item
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search auction items..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none">
          <option>All Status</option>
          <option>Live</option>
          <option>Upcoming</option>
          <option>Ended</option>
        </select>
      </div>

      {/* Items Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <th className="px-6 py-3.5">Item</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Starting Bid</th>
              <th className="px-6 py-3.5">Bids</th>
              <th className="px-6 py-3.5">Created</th>
              <th className="px-6 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr
                key={item.slug}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-400">{item.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      item.status === "Live"
                        ? "bg-emerald-50 text-emerald-700"
                        : item.status === "Upcoming"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {item.startingBid}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {item.bids}
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {item.createdAt}
                </td>
                <td className="px-6 py-4">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenu(
                          activeMenu === item.slug ? null : item.slug
                        )
                      }
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenu === item.slug && (
                      <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Eye size={14} />
                          View
                        </button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Edit size={14} />
                          Edit
                        </button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add New Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">
              Add New Auction Item
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Fill in the details for the new auction listing
            </p>

            <form className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Item Title
                </label>
                <input
                  type="text"
                  placeholder='e.g. Bugatti "La Voiture Noire"'
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe the item..."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Starting Bid
                  </label>
                  <input
                    type="text"
                    placeholder="$0.00"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </label>
                  <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                    <option>Upcoming</option>
                    <option>Live</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Image URL
                </label>
                <input
                  type="text"
                  placeholder="/auctions/image.jpg"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg bg-pandora-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
                >
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
