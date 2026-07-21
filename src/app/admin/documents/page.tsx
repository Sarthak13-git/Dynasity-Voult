"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatHistoricalDate } from "@/lib/format-historical-date";

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
  ShieldCheck,
  Download,
  Loader2,
  Lock
} from "lucide-react";

interface DocumentRecord {
  id: string;
  artifact_id: string;
  document_type: string;
  title: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  is_verified: boolean;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  verification_id: string | null;
  verified_at: string | null;
  created_at: string;
  artifacts: {
    title: string;
    thumbnail_url: string;
    seller_id: string;
    creation_year?: number | null;
    calendar_era?: string | null;
    is_estimated?: boolean;
    historical_period?: string | null;
    seller: {
      display_name: string;
      store_name: string;
      email: string;
    };
  };

}

export default function AdminDocumentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "verified" | "rejected">("pending");

  // Selection & Modal drawer
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Signed URL for drawer preview
  const [signedPreviewUrl, setSignedPreviewUrl] = useState<string | null>(null);
  const [loadingPreviewUrl, setLoadingPreviewUrl] = useState(false);

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
        loadDocuments();
      } catch (err) {
        console.error(err);
        router.push("/");
      }
    };

    checkAdminSession();
  }, [router, supabase]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/documents");
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to load documents.");
      setDocuments(resData.documents || []);
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to load documents catalog.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch signed URL for preview
  const fetchPreviewUrl = async (doc: DocumentRecord) => {
    try {
      setLoadingPreviewUrl(true);
      setSignedPreviewUrl(null);
      
      const res = await fetch(`/api/documents/${doc.id}/download`);
      if (res.redirected) {
        setSignedPreviewUrl(res.url);
      } else {
        // Fallback or read as json
        const data = await res.json();
        if (data.success && data.signedUrl) {
          setSignedPreviewUrl(data.signedUrl);
        } else {
          // If error or blocked, link to redirect url
          setSignedPreviewUrl(`/api/documents/${doc.id}/download`);
        }
      }
    } catch (err) {
      console.error("Failed to resolve preview URL:", err);
      setSignedPreviewUrl(`/api/documents/${doc.id}/download`);
    } finally {
      setLoadingPreviewUrl(false);
    }
  };

  const handleOpenDrawer = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setShowDrawer(true);
    setShowRejectInput(false);
    setRejectionReason("");
    fetchPreviewUrl(doc);
  };

  const handleVerify = async (docId: string) => {
    if (!confirm("Are you sure you want to verify and approve this authenticity document?")) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: docId,
          action: "verify",
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to approve document.");

      showToastMsg("success", "Document verified and active successfully.");
      setShowDrawer(false);
      loadDocuments();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to verify document.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (docId: string) => {
    if (!rejectionReason.trim()) {
      showToastMsg("error", "Please provide a rejection reason.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/documents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: docId,
          action: "reject",
          rejection_reason: rejectionReason,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to reject document.");

      showToastMsg("success", "Document rejected and notification sent.");
      setShowDrawer(false);
      loadDocuments();
    } catch (err: any) {
      showToastMsg("error", err.message || "Failed to reject document.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status computation helper
  const getDocStatus = (doc: DocumentRecord): "pending" | "verified" | "rejected" => {
    if (doc.is_verified) return "verified";
    if (doc.rejection_reason) return "rejected";
    return "pending";
  };

  // Filter documents by tab
  const filteredDocs = documents.filter((doc) => {
    const status = getDocStatus(doc);
    if (activeTab === "all") return true;
    return status === activeTab;
  });

  const getDocTypeLabel = (type: string, customTitle: string) => {
    const labels: Record<string, string> = {
      provenance_record: "Provenance Record",
      certificate_of_authenticity: "Certificate of Authenticity",
      government_approval_certificate: "Government Approval Certificate",
      additional_document: customTitle || "Supporting Document",
    };
    return labels[type] || customTitle || "Authenticity File";
  };

  const formatBytes = (bytes: number | null, decimals = 2) => {
    if (!bytes) return "Unknown size";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  if (isAdmin === null || loading && documents.length === 0) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pandora-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg border animate-fade-in ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-gray-900 tracking-wide">
            Antiquity Verification Center
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Review uploaded Certificate of Authenticity (COA), Provenance Records, and Government Approvals.
          </p>
        </div>
        <button
          onClick={loadDocuments}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(["pending", "verified", "rejected", "all"] as const).map((tab) => {
          const count = documents.filter((d) => {
            const status = getDocStatus(d);
            return tab === "all" ? true : status === tab;
          }).length;

          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all -mb-px ${
                activeTab === tab
                  ? "border-pandora-gold text-pandora-gold"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {/* Main Catalog View */}
      {filteredDocs.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-16 text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wide">No documents found</h3>
          <p className="text-xs text-gray-400 mt-1">There are no records matching the selected verification state.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-gray-500">
              <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-700 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Product details</th>
                  <th className="px-6 py-4">Seller Partner</th>
                  <th className="px-6 py-4">Verification document</th>
                  <th className="px-6 py-4">Upload Date</th>
                  <th className="px-6 py-4">Verification Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDocs.map((doc) => {
                  const status = getDocStatus(doc);
                  const sellerInfo = doc.artifacts?.seller;
                  const sellerName = sellerInfo?.store_name || sellerInfo?.display_name || "Antiquarian Partner";
                  
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => handleOpenDrawer(doc)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          {doc.artifacts?.thumbnail_url ? (
                            <img
                              src={doc.artifacts.thumbnail_url}
                              alt={doc.artifacts.title}
                              className="h-10 w-10 rounded object-cover border border-gray-100"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                              📷
                            </div>
                          )}
                          <div>
                            <span className="font-bold block truncate max-w-[180px]">{doc.artifacts?.title || "Artifact Product"}</span>
                            <span className="text-[10px] text-gray-400 block mt-0.5 uppercase tracking-wide">ID: {doc.artifact_id.slice(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-semibold text-gray-900 block">{sellerName}</span>
                          <span className="text-[10px] text-gray-400 block mt-0.5">{sellerInfo?.email || "No Email"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-semibold text-gray-900 block truncate max-w-[180px]">{doc.title}</span>
                          <span className="text-[10px] text-pandora-gold block mt-0.5">{getDocTypeLabel(doc.document_type, doc.title)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(doc.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {status === "verified" && (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider text-[9px]">
                              Verified
                            </span>
                            {doc.verification_id && (
                              <span className="block font-mono text-[9px] font-bold text-gray-700">
                                {doc.verification_id}
                              </span>
                            )}
                          </div>
                        )}
                        {status === "rejected" && (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider text-[9px]" title={doc.rejection_reason || ""}>
                            Rejected
                          </span>
                        )}
                        {status === "pending" && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider text-[9px]">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDrawer(doc)}
                          className="inline-flex items-center gap-1 text-pandora-gold hover:text-pandora-gold-light font-bold text-xs uppercase tracking-wide"
                        >
                          <Eye size={14} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Slide-out Drawer */}
      {showDrawer && selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl animate-slide-in">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-lg font-serif font-bold text-gray-900">Document Verification Review</h3>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Verification ID: {selectedDoc.id}</p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Product and Seller Card */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex items-start gap-4">
                {selectedDoc.artifacts?.thumbnail_url && (
                  <img
                    src={selectedDoc.artifacts.thumbnail_url}
                    alt={selectedDoc.artifacts.title}
                    className="h-16 w-16 rounded object-cover border border-gray-200 bg-white shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="font-bold text-gray-900 text-sm block truncate">{selectedDoc.artifacts?.title}</span>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <p><strong className="text-gray-700">Seller Store:</strong> {selectedDoc.artifacts?.seller?.store_name || "Antiquarian Partner"}</p>
                    <p><strong className="text-gray-700">Seller Email:</strong> {selectedDoc.artifacts?.seller?.email}</p>
                    <p><strong className="text-gray-700">Estimated Creation:</strong> {formatHistoricalDate(selectedDoc.artifacts?.creation_year, selectedDoc.artifacts?.calendar_era, selectedDoc.artifacts?.is_estimated)}</p>
                    {selectedDoc.artifacts?.historical_period && (
                      <p><strong className="text-gray-700">Period:</strong> {selectedDoc.artifacts.historical_period}</p>
                    )}
                  </div>

                </div>
              </div>

              {/* Document Metadata grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border border-gray-100 rounded p-3">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Document Title</span>
                  <span className="font-bold text-gray-900 mt-1 block truncate" title={selectedDoc.title}>{selectedDoc.title}</span>
                </div>
                <div className="border border-gray-100 rounded p-3">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Document Type</span>
                  <span className="font-bold text-pandora-gold mt-1 block">{getDocTypeLabel(selectedDoc.document_type, selectedDoc.title)}</span>
                </div>
                <div className="border border-gray-100 rounded p-3">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Upload Date</span>
                  <span className="font-bold text-gray-900 mt-1 block">
                    {new Date(selectedDoc.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="border border-gray-100 rounded p-3">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider block">File size / Format</span>
                  <span className="font-bold text-gray-900 mt-1 block">
                    {formatBytes(selectedDoc.file_size)} ({selectedDoc.mime_type || "PDF"})
                  </span>
                </div>
                {selectedDoc.is_verified && selectedDoc.verification_id && (
                  <div className="border border-emerald-100 bg-emerald-50/50 rounded p-3 col-span-2">
                    <span className="text-[10px] text-emerald-700 uppercase tracking-wider block font-bold">Verification ID</span>
                    <span className="font-mono font-bold text-emerald-800 mt-1 block text-sm">{selectedDoc.verification_id}</span>
                  </div>
                )}
              </div>

              {/* PDF Preview Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">PDF Document Preview</h4>
                  <a
                    href={`/api/documents/${selectedDoc.id}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-pandora-gold font-bold uppercase tracking-wide hover:underline"
                  >
                    <Download size={14} /> Download File
                  </a>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-[360px] flex flex-col justify-center items-center relative">
                  {loadingPreviewUrl ? (
                    <div className="text-center space-y-2">
                      <Loader2 className="h-6 w-6 animate-spin text-pandora-gold mx-auto" />
                      <span className="text-xs text-gray-400">Loading secure preview...</span>
                    </div>
                  ) : signedPreviewUrl ? (
                    <iframe
                      src={`${signedPreviewUrl}#toolbar=0`}
                      className="w-full h-full border-0"
                      title="PDF Doc Preview"
                    />
                  ) : (
                    <div className="text-center p-6">
                      <FileText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Preview token expired or invalid.</p>
                      <button
                        onClick={() => fetchPreviewUrl(selectedDoc)}
                        className="text-xs text-pandora-gold font-semibold underline mt-2"
                      >
                        Reload preview URL
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stored Rejection Reason */}
              {selectedDoc.rejection_reason && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50 text-xs">
                  <span className="font-bold text-red-800 uppercase tracking-wider block">Previously Rejected Reason</span>
                  <p className="text-red-700 mt-1 italic leading-relaxed">{selectedDoc.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="border-t border-gray-200 px-6 py-5 bg-gray-50 space-y-4">
              {showRejectInput ? (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-700">Rejection Reason (Sent to seller)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide specific notes why the document cannot be verified..."
                    rows={3}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-red-500 focus:outline-none"
                    required
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="rounded border border-gray-300 bg-white hover:bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(selectedDoc.id)}
                      disabled={isSubmitting || !rejectionReason.trim()}
                      className="rounded bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {isSubmitting ? "Rejecting..." : "Submit Rejection"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectInput(true)}
                    disabled={isSubmitting}
                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg border border-red-200 bg-white hover:bg-red-50 py-3 text-xs font-bold uppercase tracking-wider text-red-600 transition-colors"
                  >
                    <Ban size={14} /> Reject
                  </button>
                  <button
                    onClick={() => handleVerify(selectedDoc.id)}
                    disabled={isSubmitting || selectedDoc.is_verified}
                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg bg-pandora-charcoal hover:bg-pandora-gold py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors disabled:opacity-50 disabled:bg-gray-300"
                  >
                    <Check size={14} /> Verify
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
