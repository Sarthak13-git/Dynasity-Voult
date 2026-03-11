"use client";

import { useState } from "react";
import { Search, MoreVertical, Eye, Ban, Shield } from "lucide-react";

// Mock users data
const usersData = [
  {
    id: 1,
    name: "Kurt Hansen",
    email: "kurt.hansen@mail.com",
    role: "Bidder",
    status: "Active",
    totalBids: 42,
    joined: "2025-01-15",
    avatar: "KH",
  },
  {
    id: 2,
    name: "Albert Wesker",
    email: "a.wesker@umbrella.com",
    role: "Bidder",
    status: "Active",
    totalBids: 28,
    joined: "2025-02-03",
    avatar: "AW",
  },
  {
    id: 3,
    name: "Joseph Stalin",
    email: "j.stalin@mail.ru",
    role: "Bidder",
    status: "Suspended",
    totalBids: 15,
    joined: "2025-01-20",
    avatar: "JS",
  },
  {
    id: 4,
    name: "Saburo Arasaka",
    email: "saburo@arasaka.corp",
    role: "VIP",
    status: "Active",
    totalBids: 67,
    joined: "2024-12-01",
    avatar: "SA",
  },
  {
    id: 5,
    name: "Aryan Mehta",
    email: "aryan@pandorasbox.com",
    role: "Admin",
    status: "Active",
    totalBids: 0,
    joined: "2024-11-01",
    avatar: "AM",
  },
  {
    id: 6,
    name: "Elena Rodriguez",
    email: "elena.r@collectors.co",
    role: "Bidder",
    status: "Active",
    totalBids: 33,
    joined: "2025-02-10",
    avatar: "ER",
  },
  {
    id: 7,
    name: "Lars Svensson",
    email: "lars@antiquities.se",
    role: "VIP",
    status: "Active",
    totalBids: 51,
    joined: "2024-12-18",
    avatar: "LS",
  },
  {
    id: 8,
    name: "Victoria Chen",
    email: "v.chen@sothebys.hk",
    role: "Bidder",
    status: "Active",
    totalBids: 19,
    joined: "2025-03-01",
    avatar: "VC",
  },
];

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

  const filteredUsers = usersData.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage registered users and their access
        </p>
      </div>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">
            {usersData.length}
          </p>
          <p className="text-xs text-gray-500">Total Users</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">
            {usersData.filter((u) => u.status === "Active").length}
          </p>
          <p className="text-xs text-gray-500">Active</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-amber-600">
            {usersData.filter((u) => u.role === "VIP").length}
          </p>
          <p className="text-xs text-gray-500">VIP Members</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-red-500">
            {usersData.filter((u) => u.status === "Suspended").length}
          </p>
          <p className="text-xs text-gray-500">Suspended</p>
        </div>
      </div>

      {/* Search */}
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
            placeholder="Search users by name or email..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-blue-500 focus:outline-none">
          <option>All Roles</option>
          <option>Admin</option>
          <option>VIP</option>
          <option>Bidder</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <th className="px-6 py-3.5">User</th>
              <th className="px-6 py-3.5">Role</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Total Bids</th>
              <th className="px-6 py-3.5">Joined</th>
              <th className="px-6 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                      {user.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      user.role === "Admin"
                        ? "bg-purple-50 text-purple-700"
                        : user.role === "VIP"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm ${
                      user.status === "Active"
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        user.status === "Active"
                          ? "bg-emerald-500"
                          : "bg-red-500"
                      }`}
                    />
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.totalBids}
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {user.joined}
                </td>
                <td className="px-6 py-4">
                  <div className="relative">
                    <button
                      onClick={() =>
                        setActiveMenu(
                          activeMenu === user.id ? null : user.id
                        )
                      }
                      className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {activeMenu === user.id && (
                      <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Eye size={14} />
                          View Profile
                        </button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Shield size={14} />
                          Change Role
                        </button>
                        <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                          <Ban size={14} />
                          {user.status === "Active" ? "Suspend" : "Activate"}
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
    </div>
  );
}
