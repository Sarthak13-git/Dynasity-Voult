"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Plus, FileText, CheckCircle2, AlertCircle, Paperclip, Trash2 } from "lucide-react";
import { PREMIUM_AUCTION_THRESHOLD } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

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

interface OptionalDocument {
  id: string;
  title: string;
  file: File | null;
}

export default function AddProductPage() {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "painting",
    origin: "",
    era: "",
    creation_year: "",
    calendar_era: "CE",
    is_estimated: true,
    historical_period: "",
    provenance: "",
    estimated_value: "",
    currency: "USD",
  });


  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  
  // Mandatory documents
  const [coaFile, setCoaFile] = useState<File | null>(null);
  const [provenanceFile, setProvenanceFile] = useState<File | null>(null);
  const [govApprovalFile, setGovApprovalFile] = useState<File | null>(null);

  // Optional documents
  const [optionalDocs, setOptionalDocs] = useState<OptionalDocument[]>([]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdArtifactId, setCreatedArtifactId] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [pendingRedirectId, setPendingRedirectId] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
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
     Optional Document Management
     ──────────────────────────────────────────── */
  const addOptionalDocField = () => {
    setOptionalDocs((prev) => [
      ...prev,
      { id: Math.random().toString(), title: "", file: null },
    ]);
  };

  const removeOptionalDocField = (id: string) => {
    setOptionalDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const updateOptionalDocTitle = (id: string, title: string) => {
    setOptionalDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, title } : d))
    );
  };

  const updateOptionalDocFile = (id: string, file: File) => {
    if (!validatePdfFile(file)) return;
    setOptionalDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, file } : d))
    );
  };

  /* ────────────────────────────────────────────
     Form Submission Handler
     ──────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCreatedArtifactId(null);

    try {
      // 1. Basic Validations
      if (!formData.title || !formData.description || uploadedImages.length === 0) {
        throw new Error("Please fill in all required fields (Title, Description, and Images)");
      }

      if (!coaFile || !provenanceFile || !govApprovalFile) {
        throw new Error("Please upload all 3 required authenticity documents.");
      }

      // Check if any optional doc is added but incomplete
      const incompleteOpt = optionalDocs.some((d) => !d.title || !d.file);
      if (incompleteOpt) {
        throw new Error("Please complete all optional document titles and PDF files, or remove them.");
      }

      // 2. Create artifact data payload (Initially saved as DRAFT to protect workflow)
      const artifactPayload = {
        title: formData.title,
        description: formData.description,
        origin: formData.origin,
        era: formData.era,
        creation_year: formData.creation_year ? parseInt(formData.creation_year) : null,
        calendar_era: formData.calendar_era,
        is_estimated: formData.is_estimated,
        historical_period: formData.historical_period || null,
        provenance: formData.provenance,
        category: formData.category,
        images: uploadedImages,
        thumbnail_url: uploadedImages[0],
        estimated_value: parseFloat(formData.estimated_value) || 0,
        currency: formData.currency,
        status: "draft" as const, // Start as draft until documents are validated
        is_featured: false,
      };


      // 3. Save draft artifact to database
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(artifactPayload),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Failed to create product listing.");
      }

      const newArtifactId = resData.product.id;
      setCreatedArtifactId(newArtifactId);

      // 4. Upload mandatory documents sequentially
      await uploadDocRawFile(coaFile, "certificate_of_authenticity", "Certificate of Authenticity", newArtifactId);
      await uploadDocRawFile(provenanceFile, "provenance_record", "Provenance Record", newArtifactId);
      await uploadDocRawFile(govApprovalFile, "government_approval_certificate", "Government Approval Certificate", newArtifactId);

      // 5. Upload optional documents sequentially
      for (const optDoc of optionalDocs) {
        if (optDoc.file && optDoc.title) {
          await uploadDocRawFile(optDoc.file, "additional_document", optDoc.title, newArtifactId);
        }
      }

      // 6. Final Publish check: update artifact to target status (triggers validation in DB)
      const parsedValue = parseFloat(formData.estimated_value) || 0;
      const targetStatus = parsedValue >= PREMIUM_AUCTION_THRESHOLD ? "pending_auction_approval" : "available";
      
      const { error: updateStatusError } = await supabase
        .from("artifacts")
        .update({ status: targetStatus })
        .eq("id", newArtifactId);

      if (updateStatusError) {
        throw new Error("Required document validation failed inside database trigger. Reverting to draft.");
      }

      if (parsedValue >= PREMIUM_AUCTION_THRESHOLD) {
        setPendingRedirectId(newArtifactId);
        setShowPremiumModal(true);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          title: "",
          description: "",
          category: "painting",
          origin: "",
          era: "",
          creation_year: "",
          calendar_era: "CE",
          is_estimated: true,
          historical_period: "",
          provenance: "",
          estimated_value: "",
          currency: "USD",
        });

        setUploadedImages([]);
        setCoaFile(null);
        setProvenanceFile(null);
        setGovApprovalFile(null);
        setOptionalDocs([]);
        setCreatedArtifactId(null);
      }, 3000);

    } catch (err: any) {
      const message = err.message || "Failed to save product listing.";
      setError(message);
      console.error("❌ Submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueRedirect = () => {
    if (pendingRedirectId) {
      router.push(`/seller/apply-for-auction?artifact_id=${pendingRedirectId}`);
    }
  };

  const handleCancelRedirect = () => {
    setShowPremiumModal(false);
    setPendingRedirectId(null);
    setFormData({
      title: "",
      description: "",
      category: "painting",
      origin: "",
      era: "",
      creation_year: "",
      calendar_era: "CE",
      is_estimated: true,
      historical_period: "",
      provenance: "",
      estimated_value: "",
      currency: "USD",
    });

    setUploadedImages([]);
    setCoaFile(null);
    setProvenanceFile(null);
    setGovApprovalFile(null);
    setOptionalDocs([]);
    setCreatedArtifactId(null);
  };

  return (
    <div className="max-w-4xl pb-16">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Add New Product
        </h2>
        <p className="text-sm text-gray-600">
          List your antique collection on Dynasity-Voult. Fill in the details below to create a compelling product listing.
        </p>
      </div>

      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            ✓ Product published and all required authenticity documents uploaded successfully!
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
        {/* Basic Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Basic Information
          </h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="e.g., Vintage Rolex Submariner 1960"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
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
                  placeholder="e.g., Switzerland"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Era Label</label>
                <input
                  type="text"
                  name="era"
                  value={formData.era}
                  onChange={handleInputChange}
                  placeholder="e.g., Mid-20th Century"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Historical Period</label>
                <input
                  type="text"
                  name="historical_period"
                  value={formData.historical_period}
                  onChange={handleInputChange}
                  placeholder="e.g., Ancient Rome"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-4 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Estimated Creation Date</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Creation Year</label>
                  <input
                    type="number"
                    name="creation_year"
                    value={formData.creation_year}
                    onChange={handleInputChange}
                    placeholder="e.g., 120"
                    min="1"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Era Context</label>
                  <select
                    name="calendar_era"
                    value={formData.calendar_era}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                  >
                    <option value="CE">CE (Common Era) ⭐ Default</option>
                    <option value="AD">AD (Anno Domini)</option>
                    <option value="BCE">BCE (Before Common Era)</option>
                    <option value="BC">BC (Before Christ)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is_estimated"
                  name="is_estimated"
                  checked={formData.is_estimated}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 text-pandora-gold focus:ring-pandora-gold/30"
                />
                <label htmlFor="is_estimated" className="text-xs font-medium text-gray-700 select-none cursor-pointer">
                  This date is an estimate (displays as circa "c.")
                </label>
              </div>

              <p className="text-[11px] text-gray-400 leading-normal">
                Use BCE/BC for ancient artifacts before year 1, and CE/AD for later historical and modern objects.
              </p>
            </div>


            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={5}
                placeholder="Describe your item in detail..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30"
              />
            </div>
          </div>
        </div>

        {/* Pricing and Provenance text */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Value & History
          </h3>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Estimated Value ({formData.currency}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="estimated_value"
                  value={formData.estimated_value}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="0.00"
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
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Provenance History Statement</label>
              <textarea
                name="provenance"
                value={formData.provenance}
                onChange={handleInputChange}
                rows={3}
                placeholder="Describe the historical ownership trail of the antiquity..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Product Images <span className="text-red-500">*</span>
          </h3>

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
            <p className="mb-2 text-sm font-medium text-gray-900">Drag and drop your images here</p>
            <p className="mb-4 text-xs text-gray-500">or click the button below to select files</p>
            <label className="inline-block">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={(e) => {
                  (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                }}
                className="rounded-lg bg-pandora-charcoal px-6 py-2 text-sm font-medium text-white hover:bg-pandora-charcoal/80 transition-colors"
              >
                Select Images
              </button>
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
              Upload required and optional verification documents in PDF format (Max 20MB per file).
            </p>
          </div>

          {/* Required Documents Segment */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-pandora-gold">Required Documents (Mandatory)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* COA Card */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Certificate of Authenticity</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${coaFile ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {coaFile ? "✓ Uploaded" : "Missing"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Official certificate validating origin.</p>
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
                      {coaFile ? "Replace PDF" : "Upload PDF"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Provenance Card */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Provenance Record</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${provenanceFile ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {provenanceFile ? "✓ Uploaded" : "Missing"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Historical ownership registry document.</p>
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
                      {provenanceFile ? "Replace PDF" : "Upload PDF"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Gov Approval Card */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Government Approval</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${govApprovalFile ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {govApprovalFile ? "✓ Uploaded" : "Missing"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Export, registration, or heritage certificates.</p>
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
                      {govApprovalFile ? "Replace PDF" : "Upload PDF"}
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

            {optionalDocs.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No optional documents added. Click the button above to add additional documentation.</p>
            ) : (
              <div className="space-y-3">
                {optionalDocs.map((opt) => (
                  <div key={opt.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <input
                      type="text"
                      value={opt.title}
                      onChange={(e) => updateOptionalDocTitle(opt.id, e.target.value)}
                      placeholder="Document Title (e.g., Appraisal Report)"
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
                        className="text-red-500 hover:text-red-700 p-1 rounded"
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

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || uploadedImages.length === 0}
            className="flex-1 rounded-lg bg-pandora-charcoal px-6 py-2.5 font-semibold text-white hover:bg-pandora-charcoal/80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Publishing..." : "Publish Product"}
          </button>
        </div>
      </form>

      {showPremiumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-2xl p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4 border border-amber-200">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold font-serif text-gray-900 mb-2">Premium Artifact Detected</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              This artifact exceeds the premium auction threshold and requires approval before it can be listed publicly.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleContinueRedirect}
                className="w-full rounded-lg bg-pandora-charcoal py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-pandora-gold transition-colors"
              >
                Continue to Auction Application
              </button>
              <button
                type="button"
                onClick={handleCancelRedirect}
                className="w-full rounded-lg border border-gray-300 bg-white py-3 text-xs font-semibold uppercase tracking-wider text-[#1a1a1a] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
