"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Eye,
  Ban,
  Shield,
  X,
  ArrowLeft,
  Mail,
  Calendar,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Gavel,
  Clock,
  RefreshCw,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  role: "admin" | "seller" | "buyer";
  status: "active" | "suspended";
  created_at: string;
  last_login: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface UserDetailStats {
  bids: number;
  orders: number;
  artifacts: number;
  auctions: number;
}

interface UserDetail extends UserProfile {
  stats: UserDetailStats;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Users Listing States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [tab, setTab] = useState<"all" | "admins" | "sellers" | "buyers" | "suspended">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"created_at" | "last_login">("created_at");
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals Visibility & Parameters
  // Details Modal
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<UserProfile | null>(null);
  const [detailUser, setDetailUser] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Suspend Modal
  const [userForSuspend, setUserForSuspend] = useState<UserProfile | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  // Resume Modal
  const [userForResume, setUserForResume] = useState<UserProfile | null>(null);

  // Change Role Modal
  const [userForRoleChange, setUserForRoleChange] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<"buyer" | "seller" | "admin">("seller");

  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Trigger notification toast
  const triggerToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Verify User Admin role
  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/login?redirect=/admin/users");
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
      } catch (err) {
        console.error("Admin verification error:", err);
        setIsAdmin(false);
        router.push("/");
      }
    }
    checkAdmin();
  }, [router, supabase]);

  // 2. Fetch Users on parameter change
  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, tab, search, sortBy, page]);

  async function loadUsers() {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        tab,
        search,
        sort: sortBy,
        page: page.toString(),
        limit: "10",
      });

      const res = await fetch(`/api/users?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setUsers(json.users || []);
        if (json.pagination) {
          setTotalPages(json.pagination.pages || 1);
          setTotalCount(json.pagination.total || 0);
        }
      } else {
        setError(json.error || "Failed to load registered users.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while loading parameters.");
    } finally {
      setLoading(false);
    }
  }

  // 3. Load User detailed statistics
  useEffect(() => {
    if (selectedUserForDetail) {
      loadUserDetails(selectedUserForDetail.id);
    } else {
      setDetailUser(null);
    }
  }, [selectedUserForDetail]);

  async function loadUserDetails(userId: string) {
    try {
      setLoadingDetail(true);
      const res = await fetch(`/api/users/${userId}`);
      const json = await res.json();
      if (json.success) {
        setDetailUser(json.user);
      } else {
        triggerToast("error", json.error || "Failed to retrieve user statistics.");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "An error occurred fetching metrics.");
    } finally {
      setLoadingDetail(false);
    }
  }

  // 4. Suspend Action Submit
  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForSuspend || !suspendReason.trim()) return;

    try {
      setIsSubmittingAction(true);
      const res = await fetch(`/api/users/${userForSuspend.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "suspended",
          reason: suspendReason,
        }),
      });

      const json = await res.json();
      if (json.success) {
        triggerToast("success", `User "${userForSuspend.display_name || userForSuspend.email}" has been suspended.`);
        setUserForSuspend(null);
        setSuspendReason("");
        loadUsers();
      } else {
        triggerToast("error", json.error || "Failed to suspend account.");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Action failed.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 5. Resume Action Submit
  const handleResumeSubmit = async () => {
    if (!userForResume) return;

    try {
      setIsSubmittingAction(true);
      const res = await fetch(`/api/users/${userForResume.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "active",
        }),
      });

      const json = await res.json();
      if (json.success) {
        triggerToast("success", `User account reactivated successfully.`);
        setUserForResume(null);
        loadUsers();
      } else {
        triggerToast("error", json.error || "Failed to resume account status.");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Action failed.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // 6. Change Role Action Submit
  const handleRoleChangeSubmit = async () => {
    if (!userForRoleChange) return;

    try {
      setIsSubmittingAction(true);
      const res = await fetch(`/api/users/${userForRoleChange.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
        }),
      });

      const json = await res.json();
      if (json.success) {
        triggerToast("success", `Role updated to "${selectedRole}" successfully.`);
        setUserForRoleChange(null);
        loadUsers();
      } else {
        triggerToast("error", json.error || "Failed to modify role parameters.");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Action failed.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Truncate UUID
  const getShortId = (id: string) => {
    return id.substring(0, 8) + "...";
  };

  // Quick stats computed helper
  const totalAdminsCount = users.filter(u => u.role === "admin").length;
  const totalSuspendedCount = users.filter(u => u.status === "suspended").length;

  if (isAdmin === null || loading && users.length === 0) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-[#0d0d0d] text-[#FDFBF7] rounded-2xl border border-neutral-900">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 text-[#D4AF37] animate-spin mx-auto" />
          <p className="text-sm font-medium tracking-wide text-gray-400">
            Synching registered user accounts & roles...
          </p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  return (
    <div className="space-y-8 bg-[#0d0d0d] text-[#FDFBF7] p-8 rounded-2xl border border-neutral-900">
      {/* Toast popup */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-xl border p-4 shadow-2xl transition-all duration-300 ${
            toast.type === "success"
              ? "border-green-800 bg-green-950/90 text-green-200"
              : "border-red-800 bg-red-950/90 text-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
          )}
          <p className="text-xs font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-900 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D4AF37] uppercase tracking-widest">
            <Sparkles size={14} />
            <span>Platform Identity Directory</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-serif text-gradient-gold mt-1">
            User Management & Safety Controls
          </h1>
          <p className="mt-1 text-xs text-neutral-400 font-medium">
            Monitor registered bidders, assign executive roles, and suspend spam/fraud profiles.
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

      {/* Filter Tabs & Search row */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-[#121212]/50 p-4 rounded-xl border border-neutral-900">
        <div className="flex flex-wrap border-b border-neutral-800 lg:border-0 pb-2 lg:pb-0 gap-1.5">
          {([
            { id: "all", label: "All Users" },
            { id: "admins", label: "Admins" },
            { id: "sellers", label: "Sellers" },
            { id: "buyers", label: "Buyers" },
            { id: "suspended", label: "Suspended" }
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors ${
                tab === t.id
                  ? "bg-[#B8860B] text-white"
                  : "text-neutral-400 hover:text-[#FDFBF7] hover:bg-[#1c1c1c]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..."
              className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg pl-9 pr-4 py-2 text-xs font-medium"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#161616] border border-neutral-900 text-neutral-300 rounded-lg px-3 py-2 text-xs focus:border-[#D4AF37] focus:outline-none font-semibold"
          >
            <option value="created_at">Joined Date</option>
            <option value="last_login">Last Active</option>
          </select>
        </div>
      </div>

      {/* Main Table view */}
      <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 shadow-xl overflow-hidden backdrop-blur-md">
        {loading ? (
          <div className="text-center py-20">
            <RefreshCw className="h-8 w-8 text-[#D4AF37] animate-spin mx-auto mb-3" />
            <p className="text-xs text-neutral-400">Syncing profiles database...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-900 text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-[#161616]/20">
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Joined</th>
                  <th className="px-6 py-4">Last Active</th>
                  <th className="px-6 py-4 text-right">Control Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#161616]/30 transition-colors text-xs">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-950 border border-neutral-800 text-[10px] font-bold text-[#D4AF37]">
                          {(u.display_name || u.email).substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-200">
                            {u.display_name || "Anonymous User"}
                          </p>
                          <p className="text-[10px] text-neutral-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[10px] text-neutral-400">
                      {getShortId(u.id)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider border ${
                          u.role === "admin"
                            ? "bg-purple-950/40 border-purple-900/50 text-purple-400"
                            : u.role === "seller"
                            ? "bg-amber-950/40 border-amber-900/50 text-amber-400"
                            : "bg-neutral-900 border-neutral-800 text-neutral-400"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 font-semibold text-[11px] ${
                          u.status === "active" ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            u.status === "active" ? "bg-emerald-400" : "bg-rose-500"
                          }`}
                        />
                        <span className="capitalize">{u.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-neutral-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 text-neutral-400">
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedUserForDetail(u)}
                          className="px-2.5 py-1.5 border border-neutral-800 bg-[#161616] hover:bg-neutral-800 text-[10px] font-semibold uppercase tracking-wider text-gray-300 rounded transition-colors"
                          title="View detailed stats"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRole(u.role);
                            setUserForRoleChange(u);
                          }}
                          className="px-2.5 py-1.5 border border-neutral-800 bg-[#161616] hover:bg-neutral-800 text-[10px] font-semibold uppercase tracking-wider text-gray-300 rounded transition-colors"
                          title="Change user privileges"
                        >
                          Role
                        </button>
                        {u.status === "active" ? (
                          <button
                            onClick={() => {
                              setSuspendReason("");
                              setUserForSuspend(u);
                            }}
                            className="px-2.5 py-1.5 border border-rose-900/50 bg-rose-950/20 hover:bg-rose-900/40 text-[10px] font-semibold uppercase tracking-wider text-rose-400 rounded transition-colors"
                            title="Suspend user account"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => setUserForResume(u)}
                            className="px-2.5 py-1.5 border border-emerald-900/50 bg-emerald-950/20 hover:bg-emerald-900/40 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 rounded transition-colors"
                            title="Reactivate account"
                          >
                            Resume
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-xs text-neutral-500">
                      No user accounts found matching your selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Row */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-900 p-4 bg-[#161616]/10">
            <span className="text-xs text-neutral-500">
              Showing page <span className="font-semibold text-neutral-300">{page}</span> of{" "}
              <span className="font-semibold text-neutral-300">{totalPages}</span> (Total users: {totalCount})
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="p-1.5 rounded border border-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 rounded border border-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW DETAILS MODAL */}
      {selectedUserForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#121212] border border-neutral-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-5">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-[#D4AF37]" />
                <h2 className="text-base font-bold font-serif text-gray-200">Account Curation Details</h2>
              </div>
              <button
                onClick={() => setSelectedUserForDetail(null)}
                className="text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 p-1.5 rounded-full transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {loadingDetail ? (
              <div className="text-center py-12">
                <RefreshCw className="h-6 w-6 text-[#D4AF37] animate-spin mx-auto mb-2" />
                <p className="text-xs text-neutral-400">Loading user metrics...</p>
              </div>
            ) : detailUser ? (
              <div className="space-y-6">
                {/* Main avatar & display info */}
                <div className="flex items-center gap-4 bg-[#161616]/40 p-4 rounded-xl border border-neutral-900/60">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-950 border-2 border-[#D4AF37] text-base font-bold text-[#D4AF37]">
                    {(detailUser.display_name || detailUser.email).substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#FDFBF7]">
                      {detailUser.display_name || "Anonymous Collector"}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{detailUser.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] uppercase tracking-wider bg-amber-950/20 border border-amber-900/30 text-amber-500 px-1.5 py-0.5 rounded font-bold">
                        {detailUser.role}
                      </span>
                      <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold border ${
                        detailUser.status === "active"
                          ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"
                          : "bg-rose-950/20 border-rose-900/30 text-rose-400"
                      }`}>
                        {detailUser.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info blocks */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Phone size={12} className="text-[#D4AF37]" />
                      <span>Phone: <span className="text-gray-200 font-semibold">{detailUser.phone || "Not set"}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Mail size={12} className="text-[#D4AF37]" />
                      <span>Verified: <span className="text-emerald-400 font-bold">Verified</span></span>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Calendar size={12} className="text-[#D4AF37]" />
                      <span>Joined: <span className="text-gray-200 font-semibold">{new Date(detailUser.created_at).toLocaleDateString()}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Clock size={12} className="text-[#D4AF37]" />
                      <span>Active: <span className="text-gray-200 font-semibold">{detailUser.last_login ? new Date(detailUser.last_login).toLocaleDateString() : "Never active"}</span></span>
                    </div>
                  </div>
                </div>

                {/* Activity Stats count */}
                <div className="border-t border-neutral-900 pt-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-3">
                    Ecosystem Activity Statistics
                  </h4>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-[#161616]/30 border border-neutral-900 p-2.5 rounded-lg">
                      <div className="text-lg font-bold text-gray-200 font-serif">{detailUser.stats.bids}</div>
                      <div className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">Bids Placed</div>
                    </div>
                    <div className="bg-[#161616]/30 border border-neutral-900 p-2.5 rounded-lg">
                      <div className="text-lg font-bold text-gray-200 font-serif">{detailUser.stats.orders}</div>
                      <div className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">Orders</div>
                    </div>
                    <div className="bg-[#161616]/30 border border-neutral-900 p-2.5 rounded-lg">
                      <div className="text-lg font-bold text-gray-200 font-serif">{detailUser.stats.artifacts}</div>
                      <div className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">Listings</div>
                    </div>
                    <div className="bg-[#161616]/30 border border-neutral-900 p-2.5 rounded-lg">
                      <div className="text-lg font-bold text-gray-200 font-serif">{detailUser.stats.auctions}</div>
                      <div className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">Auctions</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-neutral-500">Failed to gather user information.</div>
            )}

            <div className="flex justify-end gap-3 pt-5 border-t border-neutral-900 mt-6">
              <button
                type="button"
                onClick={() => setSelectedUserForDetail(null)}
                className="rounded-lg border border-neutral-800 bg-[#161616] px-5 py-2 text-xs font-semibold text-gray-300 hover:bg-neutral-800 transition-colors uppercase tracking-wider"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND MODAL */}
      {userForSuspend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-[#121212] border border-neutral-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Ban size={18} className="text-rose-500" />
                <h2 className="text-base font-bold font-serif text-gray-200">Suspend User Account</h2>
              </div>
              <button
                onClick={() => { setUserForSuspend(null); setSuspendReason(""); }}
                className="text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 p-1.5 rounded-full transition-colors"
                disabled={isSubmittingAction}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Confirming suspension will set user status to <span className="font-semibold text-rose-400">Suspended</span>.
              They will be locked out from bidding, listing, and performing transactions. An email notification will be dispatched.
            </p>

            <form onSubmit={handleSuspendSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Suspension Explanation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={4}
                  required
                  disabled={isSubmittingAction}
                  placeholder="Explain details of policy violations, spam triggers, or billing inconsistencies..."
                  className="w-full rounded-lg bg-[#161616] border border-neutral-900 px-3 py-2 text-xs text-gray-200 focus:border-[#D4AF37] focus:outline-none resize-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-900/60 mt-4">
                <button
                  type="button"
                  onClick={() => { setUserForSuspend(null); setSuspendReason(""); }}
                  className="rounded-lg border border-neutral-800 bg-[#161616] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-neutral-800 disabled:opacity-50 tracking-wider uppercase"
                  disabled={isSubmittingAction}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction || !suspendReason.trim()}
                  className="rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-neutral-800 disabled:text-neutral-500 px-5 py-2 text-xs font-semibold text-white transition-colors tracking-wider uppercase"
                >
                  {isSubmittingAction ? "Processing..." : "Confirm Suspension"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESUME MODAL */}
      {userForResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#121212] border border-neutral-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-500" />
                <h2 className="text-base font-bold font-serif text-gray-200">Reactivate Account</h2>
              </div>
              <button
                onClick={() => setUserForResume(null)}
                className="text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 p-1.5 rounded-full transition-colors"
                disabled={isSubmittingAction}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-5 leading-relaxed">
              Are you sure you want to lift the suspension for user **{userForResume.display_name || userForResume.email}**?
              They will instantly be allowed to bid, list products, and log in. An email will notify them of reactivation.
            </p>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-900/60">
              <button
                type="button"
                onClick={() => setUserForResume(null)}
                className="rounded-lg border border-neutral-800 bg-[#161616] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-neutral-800 disabled:opacity-50 tracking-wider uppercase"
                disabled={isSubmittingAction}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResumeSubmit}
                disabled={isSubmittingAction}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-800 disabled:text-neutral-500 px-5 py-2 text-xs font-semibold text-white transition-colors tracking-wider uppercase"
              >
                {isSubmittingAction ? "Processing..." : "Resume Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CHANGE ROLE MODAL */}
      {userForRoleChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#121212] border border-neutral-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-purple-400" />
                <h2 className="text-base font-bold font-serif text-gray-200">Modify Role Privileges</h2>
              </div>
              <button
                onClick={() => setUserForRoleChange(null)}
                className="text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 p-1.5 rounded-full transition-colors"
                disabled={isSubmittingAction}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Change permissions for user **{userForRoleChange.display_name || userForRoleChange.email}**. Assigning administrative status grants full dashboard permissions.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Select Ecosystem Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as any)}
                  disabled={isSubmittingAction}
                  className="w-full bg-[#161616] border border-neutral-900 text-neutral-300 rounded-lg px-3 py-2 text-xs focus:border-[#D4AF37] focus:outline-none font-semibold"
                >
                  <option value="buyer">Buyer (Standard)</option>
                  <option value="seller">Seller (Standard Sell)</option>
                  <option value="admin">Admin (Full Control)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-900/60 mt-4">
                <button
                  type="button"
                  onClick={() => setUserForRoleChange(null)}
                  className="rounded-lg border border-neutral-800 bg-[#161616] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-neutral-800 disabled:opacity-50 tracking-wider uppercase"
                  disabled={isSubmittingAction}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRoleChangeSubmit}
                  disabled={isSubmittingAction}
                  className="rounded-lg bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-800 disabled:text-neutral-500 px-5 py-2 text-xs font-semibold text-white transition-colors tracking-wider uppercase"
                >
                  {isSubmittingAction ? "Processing..." : "Confirm Role Change"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
