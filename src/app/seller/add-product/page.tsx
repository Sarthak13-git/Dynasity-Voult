"use client";

import { useState } from "react";
import { Upload, X, Plus } from "lucide-react";
import { addArtifact } from "@/lib/supabase/db";

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

export default function AddProductPage() {
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
  });

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.title || !formData.description || uploadedImages.length === 0) {
        throw new Error("Please fill in all required fields");
      }

      // Create artifact data object
      const artifactData = {
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
        status: "available" as const,
        is_featured: false,
      };

      // Save to database
      const result = await addArtifact(artifactData);
      
      console.log("✅ Product saved to database:", result);

      setSuccess(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          title: "",
          description: "",
          category: "painting",
          origin: "",
          era: "",
          year_estimate: "",
          provenance: "",
          estimated_value: "",
          currency: "USD",
        });
        setUploadedImages([]);
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save product";
      setError(message);
      console.error("❌ Error saving product:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Add New Product
        </h2>
        <p className="text-sm text-gray-600">
          List your antique collection on PANDORA. Fill in the details below to create a compelling product listing.
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            ✓ Product added successfully to the database!
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            ✗ {error}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Basic Information
          </h3>

          <div className="space-y-6">
            {/* Product Name */}
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

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Product Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={6}
                placeholder="Describe your product in detail. Include its history, condition, unique features, and any notable characteristics..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors resize-none"
              />
              <p className="mt-2 text-xs text-gray-500">
                Minimum 50 characters recommended
              </p>
            </div>
          </div>
        </div>

        {/* Historical & Origin Details */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Historical & Origin Details
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Origin */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Origin/Country
              </label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleInputChange}
                placeholder="e.g., Switzerland, Italy, Egypt"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              />
            </div>

            {/* Era */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Era/Period
              </label>
              <input
                type="text"
                name="era"
                value={formData.era}
                onChange={handleInputChange}
                placeholder="e.g., Victorian Era, Renaissance, Ming Dynasty"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              />
            </div>

            {/* Year Estimate */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Estimated Year
              </label>
              <input
                type="text"
                name="year_estimate"
                value={formData.year_estimate}
                onChange={handleInputChange}
                placeholder="e.g., 1960 or 1950-1960"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              />
            </div>

            {/* Provenance */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Provenance/History
              </label>
              <input
                type="text"
                name="provenance"
                value={formData.provenance}
                onChange={handleInputChange}
                placeholder="e.g., Certified authentic, Museum exhibition history"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Pricing Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Pricing Information
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Asking Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="estimated_value"
                  value={formData.estimated_value}
                  onChange={handleInputChange}
                  required
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                />
              </div>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Product Images <span className="text-red-500">*</span>
          </h3>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
              dragActive
                ? "border-gray-400 bg-gray-50"
                : "border-gray-300 hover:border-gray-400/50"
            }`}
          >
            <Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="mb-2 text-sm font-medium text-gray-900">
              Drag and drop your images here
            </p>
            <p className="mb-4 text-xs text-gray-500">
              or click the button below to select files
            </p>
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
            <p className="mt-4 text-xs text-gray-500">
              Supported formats: JPG, PNG, GIF, WebP. Max 5MB each.
            </p>
          </div>

          {/* Image Preview */}
          {uploadedImages.length > 0 && (
            <div className="mt-6">
              <p className="mb-4 text-sm font-medium text-gray-900">
                Uploaded Images ({uploadedImages.length})
              </p>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {uploadedImages.map((image, idx) => (
                  <div key={idx} className="group relative">
                    <img
                      src={image}
                      alt={`Product ${idx + 1}`}
                      className="h-32 w-full rounded-lg object-cover"
                    />
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

          {uploadedImages.length === 0 && (
            <p className="mt-4 text-sm text-gray-500">
              No images uploaded yet. Add at least one high-quality image of your product.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || uploadedImages.length === 0}
            className="flex-1 rounded-lg bg-pandora-charcoal px-6 py-2 font-semibold text-white hover:bg-pandora-charcoal/80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
          >
            {loading ? "Publishing..." : "Publish Product"}
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-900 hover:bg-gray-50 transition-colors text-sm"
          >
            Save as Draft
          </button>
        </div>
      </form>
    </div>
  );
}
