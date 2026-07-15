"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  Check,
  Ban,
  X,
  Calendar,
  Mail,
  FileText,
  RefreshCw,
  UserCheck,
  Shield,
  Loader2,
  Phone,
  Building,
  Home,
  Globe,
  MapPin
} from "lucide-react";

interface SellerRequest {
  id: string;
  user_id: string;
  legal_name: string;
  store_name: string;
  phone: string;
  email: string;
  country: string;
  address: string;
  city: string;
  postal_code: string;
  government_id_url: string;
  address_proof_url: string;
  selfie_verification_url: string;
  tax_id: string;
  bank_account: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  admin_comments: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminSellerRequestsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<SellerRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  // Selection & Modal
  const [selectedRequest, setSelectedRequest] = useState<SellerRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionComments, setActionComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Signed URL states for previews
  const [signedGovIdUrl, setSignedGovIdUrl] = useState<string | null>(null);
  const [signedAddressProofUrl, setSignedAddressProofUrl] = useState<string | null>(null);
  const [signedSelfieUrl, setSignedSelfieUrl] = useState<string | null>(null);
  const [loadingSignedUrls, setLoadingSignedUrls] = useState(false);

  const showToastMsg = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const checkAdminSession = async () => {
      try {
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
          setIsAdmin(false);
          router.push("/");
          return;
        }

        setIsAdmin(true);
        loadRequests();
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/login");
      }
    };

    checkAdminSession();
  }, [router, supabase]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/seller-requests");
      const data = await res.json();
      if (res.ok && data.success) {
        setRequests(data.requests || []);
      } else {
        showToastMsg("error", data.error || "Failed to load requests.");
      }
    } catch (err: any) {
      console.error("Failed loading verification requests:", err);
      showToastMsg("error", err.message || "Failed loading verification requests.");
    } finally {
      setLoading(false);
    }
  };

  // Generate signed storage URLs for review
  const getSignedUrl = async (fullUrl: string): Promise<string> => {
    try {
      const urlParts = fullUrl.split("artifact-documents/");
      if (urlParts.length < 2) return fullUrl;
      const storagePath = urlParts[urlParts.length - 1];
      const { data, error } = await supabase.storage
        .from("artifact-documents")
        .createSignedUrl(storagePath, 3600); // 1 hour
      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error("Failed creating signed URL:", err);
      return fullUrl;
    }
  };

  const handleOpenDetails = async (req: SellerRequest) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
    setActionComments(req.admin_comments || "");
    setRejectionReason(req.rejection_reason || "");
    setShowRejectInput(false);

    // Fetch signed URLs for documents preview
    setLoadingSignedUrls(true);
    try {
      const [govUrl, addrUrl, selfieUrl] = await Promise.all([
        getSignedUrl(req.government_id_url),
        getSignedUrl(req.address_proof_url),
        getSignedUrl(req.selfie_verification_url)
      ]);
      setSignedGovIdUrl(govUrl);
      setSignedAddressProofUrl(addrUrl);
      setSignedSelfieUrl(selfieUrl);
    } catch (err) {
      console.error("Error generating signed urls:", err);
    } finally {
      setLoadingSignedUrls(false);
    }
  };

  const handleReviewAction = async (status: "approved" | "rejected") => {
    if (!selectedRequest) return;
    if (status === "rejected" && !rejectionReason.trim()) {
      showToastMsg("error", "Please specify a rejection reason.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/seller-requests/${selectedRequest.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          rejection_reason: status === "rejected" ? rejectionReason : null,
          admin_comments: actionComments,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToastMsg("success", `Application successfully ${status}!`);
        setShowDetailModal(false);
        loadRequests();
      } else {
        showToastMsg("error", data.error || "Failed to update status.");
      }
    } catch (err: any) {
      console.error("Error review update:", err);
      showToastMsg("error", err.message || "Error processing status change.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((req) => {
    if (activeTab === "all") return true;
    return req.status === activeTab;
  });

  if (isAdmin === null || loading && requests.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pandora-charcoal" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg p-4 shadow-xl border flex items-center gap-3 transition-all duration-300 ${
          toast.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <p className="text-xs font-semibold">{toast.message}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Seller Verification Requests</h2>
          <p className="mt-1 text-sm text-gray-600">Review business registration credentials and documents uploaded by buyer users.</p>
        </div>
        <button
          onClick={loadRequests}
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === tab
                ? "border-pandora-charcoal text-pandora-charcoal font-bold"
                : "border-transparent text-gray-500 hover:text-pandora-charcoal"
            }`}
          >
            {tab} ({requests.filter(r => tab === "all" || r.status === tab).length})
          </button>
        ))}
      </div>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-base font-semibold text-gray-900 mb-1">No Applications Found</h3>
          <p className="text-sm text-gray-600">No seller registration requests matching the filters exist.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden shadow-xs">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                <th className="px-6 py-3.5">Store Info</th>
                <th className="px-6 py-3.5">Legal Name</th>
                <th className="px-6 py-3.5">Contact</th>
                <th className="px-6 py-3.5">Submitted</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{req.store_name}</div>
                    <div className="text-xs text-gray-500 font-medium">{req.country}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-950 font-medium">{req.legal_name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-700">
                      <Mail size={12} className="text-gray-400" />
                      <span>{req.email}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-700 mt-1">
                      <Phone size={12} className="text-gray-400" />
                      <span>{req.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {new Date(req.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      req.status === "approved"
                        ? "bg-green-50 text-green-700"
                        : req.status === "rejected"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700 animate-pulse"
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleOpenDetails(req)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Eye size={13} />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl bg-white border border-gray-200 shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-pandora-gold" />
                <h3 className="text-lg font-bold font-serif text-gray-900">Review Seller Registration</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-900 bg-gray-50 p-1.5 rounded-full transition-colors"
                disabled={isSubmitting}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile info */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">Business Identity</h4>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Official Legal Name</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedRequest.legal_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Store Name</span>
                    <span className="text-sm font-semibold text-gray-900">{selectedRequest.store_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Tax ID / Business Registration</span>
                    <span className="text-xs font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100 text-gray-700 font-semibold">{selectedRequest.tax_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-semibold uppercase">Bank Account Number</span>
                    <span className="text-xs font-mono bg-gray-50 px-2 py-0.5 rounded border border-gray-100 text-gray-700 font-semibold">{selectedRequest.bank_account}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">Contact & Location</h4>
                  <div className="flex items-start gap-2.5">
                    <Mail size={14} className="text-gray-400 mt-1" />
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold uppercase">Email</span>
                      <span className="text-xs font-medium text-gray-900">{selectedRequest.email}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Phone size={14} className="text-gray-400 mt-1" />
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold uppercase">Phone</span>
                      <span className="text-xs font-medium text-gray-900">{selectedRequest.phone}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-gray-400 mt-1" />
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold uppercase">Location Address</span>
                      <span className="text-xs font-medium text-gray-900 leading-relaxed block">
                        {selectedRequest.address}, {selectedRequest.city}, {selectedRequest.postal_code}
                      </span>
                      <span className="text-xs text-gray-500 font-semibold">{selectedRequest.country}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Uploaded Documents */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">Verification Documents</h4>
                {loadingSignedUrls ? (
                  <div className="flex py-6 justify-center items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-gray-500" />
                    <span className="text-xs text-gray-500 font-semibold">Generating document links...</span>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Gov ID */}
                    <a
                      href={signedGovIdUrl || selectedRequest.government_id_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
                    >
                      <FileText size={18} className="text-pandora-gold" />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-gray-800 block truncate">Government ID</span>
                        <span className="text-[9px] text-gray-400 font-semibold uppercase">View ID Scan</span>
                      </div>
                    </a>

                    {/* Address Proof */}
                    <a
                      href={signedAddressProofUrl || selectedRequest.address_proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
                    >
                      <Building size={18} className="text-pandora-gold" />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-gray-800 block truncate">Address Proof</span>
                        <span className="text-[9px] text-gray-400 font-semibold uppercase">View Utility Proof</span>
                      </div>
                    </a>

                    {/* Selfie */}
                    <a
                      href={signedSelfieUrl || selectedRequest.selfie_verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
                    >
                      <UserCheck size={18} className="text-pandora-gold" />
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold text-gray-800 block truncate">Selfie Portrait</span>
                        <span className="text-[9px] text-gray-400 font-semibold uppercase">View Selfie Image</span>
                      </div>
                    </a>
                  </div>
                )}
              </div>

              {/* Admin comments & Rejection reasons */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b pb-1">Review Notes</h4>
                
                <div>
                  <label htmlFor="comments" className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                    Admin Review Comments (Private)
                  </label>
                  <textarea
                    id="comments"
                    rows={2}
                    value={actionComments}
                    onChange={(e) => setActionComments(e.target.value)}
                    placeholder="Enter private review notes or checklist logs..."
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-xs text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none transition-colors resize-none"
                  />
                </div>

                {showRejectInput && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <label htmlFor="rejection" className="text-[10px] font-bold uppercase tracking-wider text-red-800 block mb-2">
                      Official Rejection Reason (Visible to user)
                    </label>
                    <textarea
                      id="rejection"
                      rows={2}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Utility bill date is older than 3 months, or Selfie photo is blurry."
                      className="w-full rounded-lg border border-red-200 bg-white py-2 px-3 text-xs text-gray-900 placeholder:text-red-400 focus:border-red-400 focus:outline-none transition-colors resize-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex flex-col sm:flex-row gap-3 justify-end">
              {selectedRequest.status === "pending" ? (
                <>
                  {!showRejectInput ? (
                    <>
                      <button
                        onClick={() => setShowRejectInput(true)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-white px-5 py-2 text-xs font-bold text-red-700 hover:bg-red-50 transition-colors uppercase tracking-wider"
                        disabled={isSubmitting}
                      >
                        <Ban size={14} />
                        Reject Application
                      </button>
                      <button
                        onClick={() => handleReviewAction("approved")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white px-5 py-2 text-xs font-bold transition-colors uppercase tracking-wider"
                        disabled={isSubmitting}
                      >
                        <Check size={14} />
                        Approve Seller
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowRejectInput(false)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors uppercase tracking-wider"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReviewAction("rejected")}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-700 hover:bg-red-800 text-white px-5 py-2 text-xs font-bold transition-colors uppercase tracking-wider"
                        disabled={isSubmitting}
                      >
                        Confirm Rejection
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-500 font-semibold py-1">
                  Application has already been {selectedRequest.status}.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
