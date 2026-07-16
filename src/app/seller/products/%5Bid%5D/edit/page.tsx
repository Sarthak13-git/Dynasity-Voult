"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Upload, X, ArrowLeft, Plus, FileText, CheckCircle2, AlertCircle, Paperclip, Trash2, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PREMIUM_AUCTION_THRESHOLD } from "@/lib/constants";

const CATEGORIES = [
  { value: "painting", label: "Painting" },
  { value: "sculpture", label: "Sculpture" },
  { value: "manuscript", label: "Manuscript" },
  { value: "jewelry", label: "Jewelry" },
  { value: "antiquity", label: "Antiquity" },
  { value: "decorative_art", label: "Decorative Art" },
  { value: "timepiece", label: "Timepiece" },
  { value: "textile", label: "Textile" },
  { value: "weapon", label: "Weapon" },
  { value: "numismatic", label: "Numismatic" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "archived", label: "Archived" },
  { value: "on_auction", label: "On Auction" },
  { value: "sold", label: "Sold" },
  { value: "on_exhibition", label: "On Exhibition" },
  { value: "reserved", label: "Reserved" },
  { value: "draft", label: "Draft" },
];

interface OptionalDocument {
  id: string;
  title: string;
  file: File | null;
}

interface DbDocument {
  id: string;
  document_type: string;
  title: string;
  file_url: string;
  file_size: number;
  is_verified: boolean;
  rejection_reason?: string | null;
  created_at: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "painting",
    origin: "",
    era: "",
    year_estimate: "",
    provenance: "",
    estimated_value: "",
    currency: "USD",
    status: "available",
  });

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Db-loaded documents
  const [dbCoa, setDbCoa] = useState<DbDocument | null>(null);
  const [dbProvenance, setDbProvenance] = useState<DbDocument | null>(null);
  const [dbGovApproval, setDbGovApproval] = useState<DbDocument | null>(null);
  const [dbOptionals, setDbOptionals] = useState<DbDocument[]>([]);

  // Replacement files state
  const [coaFile, setCoaFile] = useState<File | null>(null);
  const [provenanceFile, setProvenanceFile] = useState<File | null>(null);
  const [govApprovalFile, setGovApprovalFile] = useState<File | null>(null);

  // Newly added optional documents list
  const [optionalDocs, setOptionalDocs] = useState<OptionalDocument[]>([]);

  const [userId, setUserId] = useState<string | null>(null);

  interface ProvenanceEvent {
    id?: string;
    event_date: string;
    title: string;
    location: string;
    description: string;
    document_id: string;
  }
  const [provenanceEvents, setProvenanceEvents] = useState<ProvenanceEvent[]>([]);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError(null);

        // 1. Authenticate user
        const { data: { user }, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !user) {
          router.push("/seller-hub");
          return;
        }

        // 2. Fetch artifact from database
        const { data: artifact, error: fetchError } = await supabase
          .from("artifacts")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!artifact) {
          setError("Product not found");
          setLoading(false);
          return;
        }

        // 3. Verify ownership
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const isOwner = artifact.seller_id === user.id;
        const isAdmin = profile?.role === "admin";

        if (!isOwner && !isAdmin) {
          setAuthError("Forbidden: You do not have permission to edit this product.");
          setLoading(false);
          return;
        }

        if (["reserved", "sold"].includes(artifact.status)) {
          setAuthError(`This product is currently locked (${artifact.status}) because it has been reserved or sold. Active purchases cannot be modified.`);
          setLoading(false);
          return;
        }

        // 4. Fetch artifact documents
        const { data: dbDocs, error: docsError } = await supabase
          .from("artifact_documents")
          .select("*")
          .eq("artifact_id", id);

        if (docsError) throw docsError;

        const docs = dbDocs || [];
        setDbCoa(docs.find((d) => d.document_type === "certificate_of_authenticity") || null);
        setDbProvenance(docs.find((d) => d.document_type === "provenance_record") || null);
        setDbGovApproval(docs.find((d) => d.document_type === "government_approval_certificate") || null);
        setDbOptionals(docs.filter((d) => d.document_type === "additional_document"));

        // Fetch existing provenance events ordered by sort_order
        const { data: dbProvEvents, error: provError } = await supabase
          .from("artifact_provenance")
          .select("*")
          .eq("artifact_id", id)
          .order("sort_order", { ascending: true });

        if (provError) throw provError;
        setProvenanceEvents(dbProvEvents || []);
        setUserId(user.id);

        // 5. Populate form data
        setFormData({
          title: artifact.title || "",
          description: artifact.description || "",
          category: artifact.category || "painting",
          origin: artifact.origin || "",
          era: artifact.era || "",
          year_estimate: artifact.year_estimate || "",
          provenance: artifact.provenance || "",
          estimated_value: artifact.estimated_value?.toString() || "",
          currency: artifact.currency || "USD",
          status: artifact.status || "available",
        });
        setUploadedImages(artifact.images || []);
      } catch (err) {
        console.error("Error loading product:", err);
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadProduct();
    }
  }, [id, router, supabase]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /* ────────────────────────────────────────────
     Image Upload Handling
     ──────────────────────────────────────────── */
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedImages((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* ────────────────────────────────────────────
     File Validation Helper
     ──────────────────────────────────────────── */
  const validatePdfFile = (file: File): boolean => {
    if (file.type !== "application/pdf") {
      alert("Invalid format: Only PDF files (.pdf) are accepted.");
      return false;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("File exceeds maximum allowed size of 20MB.");
      return false;
    }
    return true;
  };

  /* ────────────────────────────────────────────
     Document Upload API Helper
     ──────────────────────────────────────────── */
  const uploadDocRawFile = async (file: File, type: string, title: string, artifactId: string) => {
    const formDataPayload = new FormData();
    formDataPayload.append("file", file);
    formDataPayload.append("document_type", type);
    formDataPayload.append("title", title);

    const response = await fetch(`/api/artifacts/${artifactId}/documents`, {
      method: "POST",
      body: formDataPayload,
    });

    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || `Failed to upload ${title}`);
    }
    return resData;
  };

  /* ────────────────────────────────────────────
     Document Deletion API Helper
     ──────────────────────────────────────────── */
  const deleteDbDocument = async (documentId: string) => {
    const response = await fetch(`/api/artifacts/${id}/documents?document_id=${documentId}`, {
      method: "DELETE",
    });

    const resData = await response.json();
    if (!response.ok) {
      throw new Error(resData.error || "Failed to delete document from database.");
    }
    return resData;
  };

  const handleOptionalDocDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this optional document?")) return;
    try {
      await deleteDbDocument(docId);
      setDbOptionals((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.message || "Failed to delete optional document.");
    }
  };

  /* ────────────────────────────────────────────
     Optional Document Field Management
     ──────────────────────────────────────────── */
  const addOptionalDocField = () => {
    setOptionalDocs((prev) => [
      ...prev,
      { id: Math.random().toString(), title: "", file: null },
    ]);
  };

  const removeOptionalDocField = (fieldId: string) => {
    setOptionalDocs((prev) => prev.filter((d) => d.id !== fieldId));
  };

  const updateOptionalDocTitle = (fieldId: string, title: string) => {
    setOptionalDocs((prev) =>
      prev.map((d) => (d.id === fieldId ? { ...d, title } : d))
    );
  };

  const updateOptionalDocFile = (fieldId: string, file: File) => {
    if (!validatePdfFile(file)) return;
    setOptionalDocs((prev) =>
      prev.map((d) => (d.id === fieldId ? { ...d, file } : d))
    );
  };

  /* ────────────────────────────────────────────
     Save Changes Submission Handler
     ──────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Basic Form Validations
      if (!formData.title || !formData.description || uploadedImages.length === 0) {
        throw new Error("Please fill in all required fields (Title, Description, and Images)");
      }

      // Assert that we have either an existing DB document or a new replacement file for required docs
      if (!dbCoa && !coaFile) {
        throw new Error("Please upload a Certificate of Authenticity.");
      }
      if (!dbProvenance && !provenanceFile) {
        throw new Error("Please upload a Provenance Record.");
      }
      if (!dbGovApproval && !govApprovalFile) {
        throw new Error("Please upload a Government Approval Certificate.");
      }

      // Check for incomplete optional documents list
      const incompleteOpt = optionalDocs.some((d) => !d.title || !d.file);
      if (incompleteOpt) {
        throw new Error("Please complete all optional document titles and PDF files, or remove them.");
      }

      // 2. Update basic fields in artifacts table
      const artifactPayload = {
        title: formData.title,
        description: formData.description,
        origin: formData.origin,
        era: formData.era,
        year_estimate: formData.year_estimate || null,
        provenance: formData.provenance,
        category: formData.category,
        images: uploadedImages,
        thumbnail_url: uploadedImages[0],
        estimated_value: parseFloat(formData.estimated_value) || 0,
        currency: formData.currency,
        status: "draft" as const, // Put into draft first, then let the validations re-evaluate
      };

      const response = await fetch(`/api/products`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...artifactPayload }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to update product details.");
      }

      // 3. Handle replacement of required files sequentially
      if (coaFile) {
        if (dbCoa) await deleteDbDocument(dbCoa.id);
        await uploadDocRawFile(coaFile, "certificate_of_authenticity", "Certificate of Authenticity", id);
      }
      if (provenanceFile) {
        if (dbProvenance) await deleteDbDocument(dbProvenance.id);
        await uploadDocRawFile(provenanceFile, "provenance_record", "Provenance Record", id);
      }
      if (govApprovalFile) {
        if (dbGovApproval) await deleteDbDocument(dbGovApproval.id);
        await uploadDocRawFile(govApprovalFile, "government_approval_certificate", "Government Approval Certificate", id);
      }

      // 4. Upload newly added optional documents sequentially
      for (const optDoc of optionalDocs) {
        if (optDoc.file && optDoc.title) {
          await uploadDocRawFile(optDoc.file, "additional_document", optDoc.title, id);
        }
      }

      // 5. Final publish re-evaluation status check
      const parsedValue = parseFloat(formData.estimated_value) || 0;
      const targetStatus = parsedValue >= PREMIUM_AUCTION_THRESHOLD ? "pending_auction_approval" : "available";


      
      const { error: updateStatusError } = await supabase
        .from("artifacts")
        .update({ status: targetStatus })
        .eq("id", id);

      if (updateStatusError) {
        throw new Error("Required document validation failed inside database. Product was demoted to draft.");
      }

      // Save Artifact Provenance Events (atomic delete-and-insert workflow)
      const { error: delProvError } = await supabase
        .from("artifact_provenance")
        .delete()
        .eq("artifact_id", id);
      
      if (delProvError) throw delProvError;

      if (provenanceEvents.length > 0) {
        const insertPayload = provenanceEvents.map((evt, idx) => ({
          artifact_id: id,
          event_date: evt.event_date || null,
          title: evt.title,
          description: evt.description || null,
          location: evt.location || null,
          document_id: evt.document_id || null,
          sort_order: idx,
          created_by: userId,
        }));

        const { error: insProvError } = await supabase
          .from("artifact_provenance")
          .insert(insertPayload);
        
        if (insProvError) throw insProvError;
      }

      setSuccess(true);
      setOptionalDocs([]);

      // Reload product documents
      const { data: refreshedDocs } = await supabase
        .from("artifact_documents")
        .select("*")
        .eq("artifact_id", id);

      const docs = refreshedDocs || [];
      setDbCoa(docs.find((d) => d.document_type === "certificate_of_authenticity") || null);
      setDbProvenance(docs.find((d) => d.document_type === "provenance_record") || null);
      setDbGovApproval(docs.find((d) => d.document_type === "government_approval_certificate") || null);
      setDbOptionals(docs.filter((d) => d.document_type === "additional_document"));
      
      setCoaFile(null);
      setProvenanceFile(null);
      setGovApprovalFile(null);

      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err: any) {
      const message = err.message || "Failed to update product details.";
      setError(message);
      console.error("❌ Submission error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const addProvenanceEvent = () => {
    setProvenanceEvents((prev) => [
      ...prev,
      {
        event_date: "",
        title: "",
        location: "",
        description: "",
        document_id: "",
      },
    ]);
  };

  const removeProvenanceEvent = (index: number) => {
    setProvenanceEvents((prev) => prev.filter((_, i) => i !== index));
  };

  const updateProvenanceEvent = (index: number, field: string, value: string) => {
    setProvenanceEvents((prev) =>
      prev.map((evt, i) => (i === index ? { ...evt, [field]: value } : evt))
    );
  };

  const moveProvenanceEvent = (index: number, direction: "up" | "down") => {
    setProvenanceEvents((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < next.length) {
        const temp = next[index];
        next[index] = next[targetIndex];
        next[targetIndex] = temp;
      }
      return next;
    });
  };

  const renderVerificationBadge = (doc: DbDocument | null, pendingFile: File | null) => {
    if (pendingFile) {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase tracking-wider">
          Pending Save
        </span>
      );
    }
    if (!doc) {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-800 uppercase tracking-wider">
          Missing
        </span>
      );
    }
    if (doc.is_verified) {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase tracking-wider">
          Verified
        </span>
      );
    }
    if (doc.rejection_reason) {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 uppercase tracking-wider" title={`Rejection reason: ${doc.rejection_reason}`}>
          Rejected
        </span>
      );
    }
    return (
      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 uppercase tracking-wider">
        Pending
      </span>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-200 rounded animate-pulse w-1/4"></div>
        <div className="h-40 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-60 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center max-w-xl mx-auto">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Access Denied</h3>
        <p className="text-sm text-gray-600 mb-4">{authError}</p>
        <button
          onClick={() => router.push("/seller/products")}
          className="rounded bg-pandora-charcoal px-6 py-2 text-xs font-semibold uppercase tracking-wider text-white hover:bg-pandora-gold transition-colors"
        >
          Back to Products
        </button>
      </div>
    );
  }

  const allUploadedDocs = [
    ...(dbCoa ? [dbCoa] : []),
    ...(dbProvenance ? [dbProvenance] : []),
    ...(dbGovApproval ? [dbGovApproval] : []),
    ...dbOptionals,
  ];

  return (
    <div className="max-w-4xl pb-16">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.push("/seller/products")}
          className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Edit Product</h2>
          <p className="text-xs text-gray-500 mt-1">Update your listed antiquities details and authentication records.</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            ✓ Product details and documentation logs saved successfully!
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            ✗ {error}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Product Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Category <span className="text-red-500">*</span></label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Origin</label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Era</label>
                <input
                  type="text"
                  name="era"
                  value={formData.era}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Estimated Year</label>
                <input
                  type="number"
                  name="year_estimate"
                  value={formData.year_estimate}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Description <span className="text-red-500">*</span></label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={5}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Value and Provenance */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Value & History</h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Asking Price <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  name="estimated_value"
                  value={formData.estimated_value}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Currency</label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Listing Status <span className="text-red-500">*</span></label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none capitalize"
                >
                  {STATUS_OPTIONS.map((statusOpt) => (
                    <option key={statusOpt.value} value={statusOpt.value}>
                      {statusOpt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Provenance History Statement</label>
              <textarea
                name="provenance"
                value={formData.provenance}
                onChange={handleInputChange}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Product Images <span className="text-red-500">*</span></h3>
          
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              dragActive ? "border-gray-400 bg-gray-50" : "border-gray-300 hover:border-gray-400/50"
            }`}
          >
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-sm font-medium text-gray-900">Drag and drop images here</p>
            <label className="inline-block">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              <span className="inline-block rounded-lg bg-pandora-charcoal px-6 py-2 text-sm font-medium text-white hover:bg-pandora-charcoal/80 transition-colors cursor-pointer">
                Select Images
              </span>
            </label>
          </div>

          {uploadedImages.length > 0 && (
            <div className="mt-6">
              <p className="mb-4 text-sm font-medium text-gray-900">Uploaded Images ({uploadedImages.length})</p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {uploadedImages.map((image, idx) => (
                  <div key={idx} className="group relative">
                    <img src={image} alt={`Product ${idx + 1}`} className="h-32 w-full rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Artifact Documentation (NEW STRICT WORKFLOW SECTION) */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Artifact Documentation</h3>
            <p className="text-xs text-gray-500 mt-1">
              Verify curation integrity by uploading official documentation in PDF formats (Max 20MB each).
            </p>
          </div>

          {/* Required Documents Segment */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-pandora-gold">Required Documents (Mandatory)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* COA Card */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-800">Certificate of Authenticity</span>
                    {renderVerificationBadge(dbCoa, coaFile)}
                  </div>
                  {dbCoa && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <a href={dbCoa.file_url} target="_blank" rel="noreferrer" className="text-[10px] text-pandora-gold hover:underline flex items-center gap-1">
                          <Download size={10} /> View Document
                        </a>
                      </div>
                      <span className="text-[9px] text-gray-400 block">Uploaded: {formatDate(dbCoa.created_at)}</span>
                      {dbCoa.rejection_reason && (
                        <p className="text-[9px] text-red-600 bg-red-50 p-1.5 rounded mt-1 border border-red-100 font-medium">
                          Rejection: {dbCoa.rejection_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  {coaFile && <p className="text-[10px] text-gray-600 truncate mb-2">{coaFile.name}</p>}
                  <label className="block w-full">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => e.target.files?.[0] && validatePdfFile(e.target.files[0]) && setCoaFile(e.target.files[0])}
                      className="hidden"
                    />
                    <span className="block w-full text-center rounded border border-gray-300 bg-white hover:bg-gray-50 py-1.5 text-xs font-semibold text-gray-700 cursor-pointer transition-colors">
                      {dbCoa ? "Replace PDF" : "Upload PDF"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Provenance Card */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-800">Provenance Record</span>
                    {renderVerificationBadge(dbProvenance, provenanceFile)}
                  </div>
                  {dbProvenance && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <a href={dbProvenance.file_url} target="_blank" rel="noreferrer" className="text-[10px] text-pandora-gold hover:underline flex items-center gap-1">
                          <Download size={10} /> View Document
                        </a>
                      </div>
                      <span className="text-[9px] text-gray-400 block">Uploaded: {formatDate(dbProvenance.created_at)}</span>
                      {dbProvenance.rejection_reason && (
                        <p className="text-[9px] text-red-600 bg-red-50 p-1.5 rounded mt-1 border border-red-100 font-medium">
                          Rejection: {dbProvenance.rejection_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  {provenanceFile && <p className="text-[10px] text-gray-600 truncate mb-2">{provenanceFile.name}</p>}
                  <label className="block w-full">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => e.target.files?.[0] && validatePdfFile(e.target.files[0]) && setProvenanceFile(e.target.files[0])}
                      className="hidden"
                    />
                    <span className="block w-full text-center rounded border border-gray-300 bg-white hover:bg-gray-50 py-1.5 text-xs font-semibold text-gray-700 cursor-pointer transition-colors">
                      {dbProvenance ? "Replace PDF" : "Upload PDF"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Gov Approval Card */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-gray-800">Government Approval</span>
                    {renderVerificationBadge(dbGovApproval, govApprovalFile)}
                  </div>
                  {dbGovApproval && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <a href={dbGovApproval.file_url} target="_blank" rel="noreferrer" className="text-[10px] text-pandora-gold hover:underline flex items-center gap-1">
                          <Download size={10} /> View Document
                        </a>
                      </div>
                      <span className="text-[9px] text-gray-400 block">Uploaded: {formatDate(dbGovApproval.created_at)}</span>
                      {dbGovApproval.rejection_reason && (
                        <p className="text-[9px] text-red-600 bg-red-50 p-1.5 rounded mt-1 border border-red-100 font-medium">
                          Rejection: {dbGovApproval.rejection_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  {govApprovalFile && <p className="text-[10px] text-gray-600 truncate mb-2">{govApprovalFile.name}</p>}
                  <label className="block w-full">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => e.target.files?.[0] && validatePdfFile(e.target.files[0]) && setGovApprovalFile(e.target.files[0])}
                      className="hidden"
                    />
                    <span className="block w-full text-center rounded border border-gray-300 bg-white hover:bg-gray-50 py-1.5 text-xs font-semibold text-gray-700 cursor-pointer transition-colors">
                      {dbGovApproval ? "Replace PDF" : "Upload PDF"}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Documents Segment */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">Optional Documents</h4>
              <button
                type="button"
                onClick={addOptionalDocField}
                className="flex items-center gap-1 text-xs font-bold text-pandora-gold hover:text-pandora-gold-light"
              >
                <Plus size={14} /> Add Another Document
              </button>
            </div>

            {/* Display Saved Optional Docs */}
            {dbOptionals.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Saved Additional Documents ({dbOptionals.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dbOptionals.map((doc) => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800 truncate max-w-[140px]">{doc.title}</span>
                          {renderVerificationBadge(doc, null)}
                        </div>
                        <div className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-2 text-[10px]">
                            <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-pandora-gold hover:underline flex items-center gap-1">
                              <Download size={10} /> View
                            </a>
                            <span className="text-[9px] text-gray-400">Date: {formatDate(doc.created_at)}</span>
                          </div>
                          {doc.rejection_reason && (
                            <p className="text-[9px] text-red-600 bg-red-50 p-1.5 rounded border border-red-100 font-medium">
                              Rejection: {doc.rejection_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOptionalDocDelete(doc.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fields to Add New Optional Docs */}
            {optionalDocs.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">New Documents pending save ({optionalDocs.length})</p>
                {optionalDocs.map((opt) => (
                  <div key={opt.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <input
                      type="text"
                      value={opt.title}
                      onChange={(e) => updateOptionalDocTitle(opt.id, e.target.value)}
                      placeholder="Document Title (e.g., Valuation certificate)"
                      required
                      className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-xs text-pandora-charcoal placeholder-gray-400 focus:outline-none bg-white"
                    />
                    
                    <div className="flex items-center gap-2">
                      <label className="shrink-0">
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => e.target.files?.[0] && updateOptionalDocFile(opt.id, e.target.files[0])}
                          className="hidden"
                        />
                        <span className="inline-block rounded border border-gray-300 bg-white hover:bg-gray-50 px-4 py-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                          {opt.file ? "Replace PDF" : "Choose PDF"}
                        </span>
                      </label>

                      {opt.file && (
                        <span className="text-[10px] text-gray-500 max-w-[120px] truncate" title={opt.file.name}>
                          {opt.file.name}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => removeOptionalDocField(opt.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Artifact Provenance Timeline Segment */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Artifact Provenance Timeline</h3>
              <p className="text-xs text-gray-500 mt-1">
                Build a digital history log detailing findings, exhibitions, ownership transfers, or publications.
              </p>
            </div>
            <button
              type="button"
              onClick={addProvenanceEvent}
              className="flex items-center gap-1.5 text-xs font-bold text-pandora-gold hover:text-pandora-gold-light rounded border border-pandora-gold/20 px-3 py-1.5 bg-amber-50/30 hover:bg-amber-50 transition-colors"
            >
              <Plus size={14} /> Add Event
            </button>
          </div>

          {provenanceEvents.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No provenance events added yet. Click &quot;Add Event&quot; to build the historical timeline.</p>
          ) : (
            <div className="space-y-4">
              {provenanceEvents.map((evt, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col gap-4 relative">
                  {/* Card header controls */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-gray-700">Event #{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moveProvenanceEvent(idx, "up")}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-pandora-gold disabled:opacity-30 p-1 text-xs font-bold"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => moveProvenanceEvent(idx, "down")}
                        disabled={idx === provenanceEvents.length - 1}
                        className="text-gray-400 hover:text-pandora-gold disabled:opacity-30 p-1 text-xs font-bold"
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => removeProvenanceEvent(idx)}
                        className="text-red-500 hover:text-red-700 p-1"
                        title="Delete Event"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Input fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Event Date</label>
                      <input
                        type="date"
                        value={evt.event_date || ""}
                        onChange={(e) => updateProvenanceEvent(idx, "event_date", e.target.value)}
                        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Event Title *</label>
                      <input
                        type="text"
                        value={evt.title}
                        onChange={(e) => updateProvenanceEvent(idx, "title", e.target.value)}
                        placeholder="e.g. Discovered in Alexandria"
                        required
                        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Location</label>
                      <input
                        type="text"
                        value={evt.location || ""}
                        onChange={(e) => updateProvenanceEvent(idx, "location", e.target.value)}
                        placeholder="e.g. Egypt"
                        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Description / Notes</label>
                      <textarea
                        value={evt.description || ""}
                        onChange={(e) => updateProvenanceEvent(idx, "description", e.target.value)}
                        placeholder="Brief summary details of the historical event..."
                        rows={2}
                        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-semibold mb-1">Link Supporting Document (Optional)</label>
                      <select
                        value={evt.document_id || ""}
                        onChange={(e) => updateProvenanceEvent(idx, "document_id", e.target.value)}
                        className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 focus:outline-none"
                      >
                        <option value="">-- No Linked Document --</option>
                        {allUploadedDocs.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            {doc.title} ({doc.document_type === "additional_document" ? "Supporting" : "Required"})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting || uploadedImages.length === 0}
            className="flex-1 rounded-lg bg-pandora-charcoal px-6 py-2.5 font-semibold text-white hover:bg-pandora-charcoal/80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            {submitting ? "Saving Changes..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/seller/products")}
            className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-900 hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
