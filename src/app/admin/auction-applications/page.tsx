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
  Sparkles,
  Calendar,
  DollarSign,
  User,
  Clock,
  ArrowLeft,
  Mail,
  FileText,
  RefreshCw
} from "lucide-react";

interface Artifact {
  id: string;
  title: string;
  category: string;
  estimated_value: number;
  currency: string;
  thumbnail_url: string | null;
  description: string;
  origin: string;
  era: string;
}

interface SellerProfile {
  id: string;
  display_name: string | null;
  email: string;
}

interface AuctionApplication {
  id: string;
  artifact_id: string;
  seller_id: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  admin_comments: string | null;
  created_at: string;
  updated_at: string;
  artifacts: Artifact;
  profiles: SellerProfile;
}

export default function AdminAuctionApplicationsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [applications, setApplications] = useState<AuctionApplication[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modal states
  const [selectedApp, setSelectedApp] = useState<AuctionApplication | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [approvingApp, setApprovingApp] = useState<AuctionApplication | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveComments, setApproveComments] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Auction details state inside Approve Modal
  const [auctionTitle, setAuctionTitle] = useState("");
  const [auctionDescription, setAuctionDescription] = useState("");
  const [auctionStartTime, setAuctionStartTime] = useState("");
  const [auctionEndTime, setAuctionEndTime] = useState("");
  const [auctionStartingBid, setAuctionStartingBid] = useState("");
  const [auctionReservePrice, setAuctionReservePrice] = useState("");
  const [auctionBidIncrement, setAuctionBidIncrement] = useState("10000");

  const [rejectingApp, setRejectingApp] = useState<AuctionApplication | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Documents and Checklist states
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [detailModalTab, setDetailModalTab] = useState<"overview" | "documents">("overview");
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({
    provenance: false,
    authenticity: false,
    originality: false,
    condition: false,
  });

  useEffect(() => {
    if (selectedApp && showDetailModal) {
      setDetailModalTab("overview");
      fetchArtifactDocuments(selectedApp.artifact_id);
    }
  }, [selectedApp, showDetailModal]);

  async function fetchArtifactDocuments(artifactId: string) {
    try {
      setLoadingDocs(true);
      const response = await fetch(`/api/artifacts/${artifactId}/documents`);
      const data = await response.json();
      if (response.ok) {
        setDocuments(data.documents || []);
      } else {
        console.error("Failed to load documents:", data.error);
        setDocuments([]);
      }
    } catch (err) {
      console.error("Error loading documents:", err);
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }

  const handlePreview = async (doc: any) => {
    try {
      const urlParts = doc.file_url.split("artifact-documents/");
      const storagePath = urlParts[urlParts.length - 1];

      const { data, error } = await supabase.storage
        .from("artifact-documents")
        .createSignedUrl(storagePath, 3600); // 1 hour expiration

      if (error) throw error;
      setPreviewDoc(doc);
      setPreviewUrl(data.signedUrl);
    } catch (err) {
      console.error("Failed to generate signed URL:", err);
      setPreviewDoc(doc);
      setPreviewUrl(doc.file_url);
    }
  };

  const showToastMsg = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const getLocalDateTimeString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // 1. Verify User is Admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/login?redirect=/admin/auction-applications");
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
        loadApplications();
      } catch (err) {
        console.error("Admin verification error:", err);
        setIsAdmin(false);
        router.push("/");
      }
    }
    checkAdmin();
  }, [router, supabase]);

  // 2. Fetch Applications
  async function loadApplications() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/auction-applications");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch applications.");
      }

      setApplications(data.applications || []);
    } catch (err: any) {
      setError(err.message || "Failed to load applications.");
      showToastMsg("error", err.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }

  // Helper to pre-populate and open the approval modal
  const openApproveModal = (app: AuctionApplication) => {
    setApprovingApp(app);
    setApproveComments("");
    setChecklist({
      provenance: false,
      authenticity: false,
      originality: false,
      condition: false,
    });

    // Default auction values based on the artifact details
    setAuctionTitle(app.artifacts ? `Premium Auction: ${app.artifacts.title}` : "Premium Auction");
    setAuctionDescription(
      app.artifacts
        ? `Exclusive auction for ${app.artifacts.title}. Origin: ${app.artifacts.origin || "Unknown"}, Era: ${app.artifacts.era || "Unknown"}.`
        : "Exclusive auction for premium asset."
    );

    // Default start time to 1 hour from now, end time to 7 days from now
    const now = new Date();
    const start = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

    setAuctionStartTime(getLocalDateTimeString(start));
    setAuctionEndTime(getLocalDateTimeString(end));

    setAuctionStartingBid(app.artifacts ? app.artifacts.estimated_value.toString() : "0");
    setAuctionReservePrice(app.artifacts ? app.artifacts.estimated_value.toString() : "0");
    setAuctionBidIncrement("10000"); // Standard $10K increment for premium assets

    setShowApproveModal(true);
  };

  // 3. Approve Action
  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingApp) return;

    if (!auctionTitle || !auctionStartTime || !auctionEndTime || !auctionStartingBid) {
      showToastMsg("error", "Please fill in all required auction parameters.");
      return;
    }

    setIsSubmittingAction(true);

    try {
      // Build admin comments from checklist & optional comments text
      const checkedList = [];
      if (checklist.provenance) checkedList.push("Provenance verified");
      if (checklist.authenticity) checkedList.push("Authenticity certificate reviewed");
      if (checklist.originality) checkedList.push("Documents are original");
      if (checklist.condition) checkedList.push("Item condition matches description");

      const checklistString = checkedList.length > 0
        ? `[Review Checklist: ${checkedList.join(", ")}]\n`
        : "";

      const finalComments = checklistString + (approveComments || `Approved for auction. Initial Starting bid: $${parseFloat(auctionStartingBid).toLocaleString()}`);

      // Step A: PATCH application to approved
      const patchResponse = await fetch(`/api/auction-applications/${approvingApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          admin_comments: finalComments,
        }),
      });

      const patchData = await patchResponse.json();
      if (!patchResponse.ok) {
        throw new Error(patchData.error || "Failed to approve application status.");
      }

      // Step B: POST /api/auctions to immediately create the auction
      const auctionResponse = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artifact_id: approvingApp.artifact_id,
          title: auctionTitle,
          description: auctionDescription,
          start_time: new Date(auctionStartTime).toISOString(),
          end_time: new Date(auctionEndTime).toISOString(),
          starting_bid: parseFloat(auctionStartingBid),
          reserve_price: auctionReservePrice ? parseFloat(auctionReservePrice) : null,
          bid_increment: parseFloat(auctionBidIncrement),
        }),
      });

      const auctionData = await auctionResponse.json();
      if (!auctionResponse.ok) {
        throw new Error(
          auctionData.error || "Application approved, but failed to create the live auction listing."
        );
      }

      showToastMsg("success", "Application approved & auction listing created successfully!");
      setShowApproveModal(false);
      setApprovingApp(null);
      loadApplications();
    } catch (err: any) {
      console.error(err);
      showToastMsg("error", err.message || "Failed to complete approval process.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Helper to open the rejection modal
  const openRejectModal = (app: AuctionApplication) => {
    setRejectingApp(app);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  // 4. Reject Action
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingApp) return;

    if (!rejectionReason.trim()) {
      showToastMsg("error", "A rejection reason is required.");
      return;
    }

    setIsSubmittingAction(true);

    try {
      const response = await fetch(`/api/auction-applications/${rejectingApp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejection_reason: rejectionReason,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reject application.");
      }

      showToastMsg("success", "Auction application has been rejected.");
      setShowRejectModal(false);
      setRejectingApp(null);
      loadApplications();
    } catch (err: any) {
      console.error(err);
      showToastMsg("error", err.message || "Failed to reject application.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Filter list based on selected tab
  const filteredApps = applications.filter((app) => {
    if (activeTab === "all") return true;
    return app.status === activeTab;
  });

  if (isAdmin === null || loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-pandora-charcoal"></div>
          <p className="mt-4 text-sm text-gray-500 font-medium">Loading applications curation board...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-xl border p-4 shadow-xl transition-all duration-300 ${toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
            }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          )}
          <p className="text-sm font-semibold">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auction Applications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and curate elite digital assets submitted by sellers for live auction approval.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-200 bg-white rounded-lg p-1.5 shadow-sm max-w-md">
        {(["pending", "approved", "rejected", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md py-2 text-xs font-semibold uppercase tracking-wider transition-colors capitalize ${activeTab === tab
                ? "bg-pandora-charcoal text-white"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
          >
            {tab === "all" ? "All Submissions" : tab}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Error loading data</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Applications Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-6 py-4">Seller Details</th>
                <th className="px-6 py-4">Artifact</th>
                <th className="px-6 py-4">Estimated Value</th>
                <th className="px-6 py-4">Submission Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900 text-sm">
                      {app.profiles?.display_name || "Unknown Seller"}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Mail size={12} />
                      <span>{app.profiles?.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {app.artifacts?.thumbnail_url ? (
                        <img
                          src={app.artifacts.thumbnail_url}
                          alt={app.artifacts.title || "Artifact"}
                          className="h-10 w-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-xs flex-shrink-0">
                          📦
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-900 text-sm block">
                          {app.artifacts?.title || "Artifact Missing"}
                        </span>
                        <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full inline-block mt-0.5 capitalize font-medium">
                          {!app.artifacts
                            ? "Artifact Missing"
                            : (app.artifacts.category
                              ? app.artifacts.category.replace("_", " ")
                              : "Unknown Category")}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-serif text-sm font-bold text-pandora-charcoal">
                      {app.artifacts
                        ? `${app.artifacts.currency} ${app.artifacts.estimated_value.toLocaleString()}`
                        : "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    <span className="font-medium">
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">
                      {new Date(app.created_at).toLocaleTimeString()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${app.status === "approved"
                          ? "bg-green-50 border-green-200 text-green-700"
                          : app.status === "rejected"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-yellow-50 border-yellow-200 text-yellow-700"
                        }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${app.status === "approved"
                            ? "bg-green-500"
                            : app.status === "rejected"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                          }`}
                      />
                      <span className="capitalize">{app.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setShowDetailModal(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                        title="View Details"
                      >
                        <Eye size={14} />
                        <span>Details</span>
                      </button>

                      {app.status === "pending" && (
                        <>
                          <button
                            onClick={() => openApproveModal(app)}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-600 hover:bg-green-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
                            title="Approve & Schedule Auction"
                          >
                            <Check size={14} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => openRejectModal(app)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-1.5 text-xs font-semibold text-white transition-colors shadow-sm"
                            title="Reject Request"
                          >
                            <Ban size={14} />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredApps.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-gray-900">No Applications Found</p>
              <p className="text-xs text-gray-500 mt-1">
                There are no applications matching the status filter: <span className="capitalize font-bold">"{activeTab}"</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DETAILS VIEW MODAL */}
      {showDetailModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-lg font-bold text-gray-900">Application Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-gray-200 mb-6 mt-3">
              <button
                type="button"
                onClick={() => setDetailModalTab("overview")}
                className={`py-2 px-4 border-b-2 text-xs font-semibold uppercase tracking-wider transition-colors ${detailModalTab === "overview"
                    ? "border-pandora-charcoal text-pandora-charcoal font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setDetailModalTab("documents")}
                className={`py-2 px-4 border-b-2 text-xs font-semibold uppercase tracking-wider transition-colors ${detailModalTab === "documents"
                    ? "border-pandora-charcoal text-pandora-charcoal font-bold"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                  }`}
              >
                📄 Documents ({documents.length})
              </button>
            </div>

            {detailModalTab === "overview" ? (
              <div className="space-y-6">
                {/* Image & Main Info */}
                <div className="flex flex-col sm:flex-row gap-6 pb-6 border-b border-gray-100">
                  {selectedApp.artifacts?.thumbnail_url ? (
                    <img
                      src={selectedApp.artifacts.thumbnail_url}
                      alt={selectedApp.artifacts.title || "Artifact"}
                      className="h-44 w-full sm:w-44 rounded-xl object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="h-44 w-full sm:w-44 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-4xl">
                      📦
                    </div>
                  )}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 capitalize border border-amber-200">
                        {!selectedApp.artifacts
                          ? "Artifact Missing"
                          : (selectedApp.artifacts.category
                            ? selectedApp.artifacts.category.replace("_", " ")
                            : "Unknown Category")}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold uppercase tracking-wider">
                        <Sparkles size={12} />
                        Premium Tier
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedApp.artifacts?.title || "Artifact Missing"}</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        <span className="font-semibold text-gray-800">Origin:</span>{" "}
                        {selectedApp.artifacts?.origin || "Unknown"}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800">Era:</span> {selectedApp.artifacts?.era || "Unknown"}
                      </div>
                      <div className="font-serif text-lg font-bold text-pandora-charcoal mt-2">
                        Estimated Value: {selectedApp.artifacts
                          ? `${selectedApp.artifacts.currency} ${selectedApp.artifacts.estimated_value.toLocaleString()}`
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Descriptions & Message */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Artifact Description
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 p-3 rounded-lg min-h-[100px]">
                      {selectedApp.artifacts?.description || "No description provided."}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Seller Application Proposal
                    </h4>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-100 p-3 rounded-lg min-h-[100px] italic">
                      {selectedApp.admin_comments || "No notes submitted by the seller."}
                    </p>
                  </div>
                </div>

                {/* Status details */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Application Status
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${selectedApp.status === "approved"
                          ? "bg-green-50 border-green-200 text-green-700"
                          : selectedApp.status === "rejected"
                            ? "bg-red-50 border-red-200 text-red-700"
                            : "bg-yellow-50 border-yellow-200 text-yellow-700"
                        }`}
                    >
                      <span className="capitalize">{selectedApp.status}</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                    <div>
                      <span className="font-semibold text-gray-800">Submitted On:</span>{" "}
                      {new Date(selectedApp.created_at).toLocaleString()}
                    </div>
                    <div>
                      <span className="font-semibold text-gray-800">Last Updated:</span>{" "}
                      {new Date(selectedApp.updated_at).toLocaleString()}
                    </div>
                  </div>

                  {selectedApp.status === "rejected" && selectedApp.rejection_reason && (
                    <div className="pt-2 border-t border-gray-200 text-xs mt-2 text-red-800">
                      <p className="font-bold">Rejection Reason:</p>
                      <p className="mt-1 bg-red-100/50 p-2.5 rounded border border-red-200 font-medium italic">
                        "{selectedApp.rejection_reason}"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* DOCUMENTS TAB */
              <div className="space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Supporting Documentation
                </h3>

                {loadingDocs ? (
                  <div className="text-center py-12">
                    <RefreshCw className="h-6 w-6 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Loading documents from storage...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
                    <FileText className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm font-semibold text-gray-900">No Documents Uploaded</p>
                    <p className="text-xs text-gray-500 mt-1">The seller did not submit any documentation for this application.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                    {documents.map((doc) => {
                      const typeMap: Record<string, string> = {
                        provenance: "Provenance Records",
                        certificate: "Certificate of Authenticity",
                        authentication: "Authentication Report",
                        other: "Other Documents"
                      };
                      const typeLabel = typeMap[doc.document_type] || doc.document_type;
                      const sizeFormatted = Number(doc.file_size / 1024).toFixed(1) + " KB";
                      return (
                        <div key={doc.id} className="p-4 flex items-center justify-between gap-4 bg-white">
                          <div className="flex items-start gap-3 min-w-0">
                            <FileText className="h-5 w-5 text-[#B8860B] flex-shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 truncate">
                                {doc.file_name}
                              </p>
                              <div className="flex flex-wrap gap-2 items-center mt-1 text-[10px] text-gray-500">
                                <span className="capitalize bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 font-semibold tracking-wider text-[9px] uppercase">
                                  {typeLabel}
                                </span>
                                <span>{sizeFormatted}</span>
                                <span>•</span>
                                <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePreview(doc)}
                              className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-700 rounded transition-colors"
                            >
                              Preview
                            </button>
                            <a
                              href={doc.file_url}
                              download={doc.file_name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-[11px] font-semibold uppercase tracking-wider text-gray-700 rounded transition-colors"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-900 bg-white hover:bg-gray-50 transition-colors text-sm shadow-sm"
              >
                Close Details
              </button>
              {selectedApp.status === "pending" && (
                <>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openApproveModal(selectedApp);
                    }}
                    className="rounded-lg bg-green-600 hover:bg-green-700 px-4 py-2 font-semibold text-white transition-colors text-sm shadow-sm"
                  >
                    Approve Request
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openRejectModal(selectedApp);
                    }}
                    className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 font-semibold text-white transition-colors text-sm shadow-sm"
                  >
                    Reject Request
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVAL DIALOG & LIVE AUCTION CREATION */}
      {showApproveModal && approvingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Approve & Launch Auction</h2>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
                disabled={isSubmittingAction}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 bg-blue-50 border border-blue-100 p-3 rounded-lg leading-relaxed">
              Confirming this application will change its status to <span className="font-semibold text-blue-800">Approved</span>.
              It will immediately trigger a <span className="font-semibold text-blue-800">POST /api/auctions</span> request to publish a live bidding room for the seller's artifact.
            </p>

            <form onSubmit={handleApprove} className="space-y-4">
              {/* Checklist Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Document Review Checklist
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checklist.provenance}
                      onChange={(e) => setChecklist(prev => ({ ...prev, provenance: e.target.checked }))}
                      disabled={isSubmittingAction}
                      className="rounded text-green-600 focus:ring-green-500 h-4 w-4 border-gray-300"
                    />
                    Provenance verified
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checklist.authenticity}
                      onChange={(e) => setChecklist(prev => ({ ...prev, authenticity: e.target.checked }))}
                      disabled={isSubmittingAction}
                      className="rounded text-green-600 focus:ring-green-500 h-4 w-4 border-gray-300"
                    />
                    Authenticity certificate reviewed
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checklist.originality}
                      onChange={(e) => setChecklist(prev => ({ ...prev, originality: e.target.checked }))}
                      disabled={isSubmittingAction}
                      className="rounded text-green-600 focus:ring-green-500 h-4 w-4 border-gray-300"
                    />
                    Documents are original
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checklist.condition}
                      onChange={(e) => setChecklist(prev => ({ ...prev, condition: e.target.checked }))}
                      disabled={isSubmittingAction}
                      className="rounded text-green-600 focus:ring-green-500 h-4 w-4 border-gray-300"
                    />
                    Item condition matches description
                  </label>
                </div>
              </div>

              {/* Optional Admin Comments */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Admin Comments / Approval Notes <span className="text-gray-400">(Optional)</span>
                </label>
                <textarea
                  value={approveComments}
                  onChange={(e) => setApproveComments(e.target.value)}
                  rows={2}
                  disabled={isSubmittingAction}
                  placeholder="e.g. Approved. Value verified and artifact authenticated."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none resize-none disabled:opacity-50"
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                  <Calendar size={14} />
                  Live Auction Configuration
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Auction Room Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={auctionTitle}
                      onChange={(e) => setAuctionTitle(e.target.value)}
                      required
                      disabled={isSubmittingAction}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-600">
                      Description
                    </label>
                    <textarea
                      value={auctionDescription}
                      onChange={(e) => setAuctionDescription(e.target.value)}
                      rows={2}
                      disabled={isSubmittingAction}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none resize-none disabled:opacity-50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={auctionStartTime}
                        onChange={(e) => setAuctionStartTime(e.target.value)}
                        required
                        disabled={isSubmittingAction}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        End Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={auctionEndTime}
                        onChange={(e) => setAuctionEndTime(e.target.value)}
                        required
                        disabled={isSubmittingAction}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Starting Bid ($) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={auctionStartingBid}
                        onChange={(e) => setAuctionStartingBid(e.target.value)}
                        required
                        min="1"
                        disabled={isSubmittingAction}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Reserve Price ($)
                      </label>
                      <input
                        type="number"
                        value={auctionReservePrice}
                        onChange={(e) => setAuctionReservePrice(e.target.value)}
                        placeholder="Optional"
                        disabled={isSubmittingAction}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-gray-600">
                        Min Increment ($)
                      </label>
                      <input
                        type="number"
                        value={auctionBidIncrement}
                        onChange={(e) => setAuctionBidIncrement(e.target.value)}
                        required
                        min="1"
                        disabled={isSubmittingAction}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-6">
                <button
                  type="button"
                  onClick={() => setShowApproveModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                  disabled={isSubmittingAction}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="rounded-lg bg-green-600 hover:bg-green-700 px-6 py-2 text-sm font-semibold text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSubmittingAction ? "Processing..." : "Confirm & Launch Auction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION REASON DIALOG */}
      {showRejectModal && rejectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
              <h2 className="text-lg font-bold text-gray-900">Reject Application</h2>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
                disabled={isSubmittingAction}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-4 bg-red-50 border border-red-100 p-3 rounded-lg leading-relaxed">
              Confirming this application will change its status to <span className="font-semibold text-red-800">Rejected</span>.
              The seller will see the rejection status along with your explanation and comments.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  required
                  disabled={isSubmittingAction}
                  placeholder="Explain why this artifact is not approved (e.g. Value below limit, unverified origin documents, etc.)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none resize-none disabled:opacity-50 font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 shadow-sm"
                  disabled={isSubmittingAction}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction || !rejectionReason.trim()}
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-6 py-2 text-sm font-semibold text-white transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSubmittingAction ? "Processing..." : "Confirm Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl max-h-[90vh] flex flex-col border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">Document Preview</h2>
                <p className="text-xs text-gray-500 truncate max-w-md mt-0.5">{previewDoc.file_name}</p>
              </div>
              <button
                onClick={() => {
                  setPreviewDoc(null);
                  setPreviewUrl(null);
                }}
                className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50 rounded-lg p-2 flex items-center justify-center border border-gray-200 min-h-[50vh]">
              {previewDoc.file_name.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-[60vh] rounded-md border-0"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt={previewDoc.file_name}
                  className="max-h-[60vh] max-w-full object-contain rounded-md"
                />
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200 mt-4">
              <span className="text-xs text-gray-500 font-mono">
                Size: {Number(previewDoc.file_size / 1024).toFixed(1)} KB
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewDoc(null);
                    setPreviewUrl(null);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <a
                  href={previewUrl}
                  download={previewDoc.file_name}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pandora-charcoal text-white hover:bg-pandora-charcoal/80 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                >
                  Download File
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
