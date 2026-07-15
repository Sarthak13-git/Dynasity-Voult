"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle, Upload, Check, ChevronRight, ChevronLeft, Trash2, Clock, ShieldCheck } from "lucide-react";
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

interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export default function ApplyForAuctionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    category: "painting",
    estimated_value: "",
    starting_bid: "",
    reserve_price: "",
    description: "",
    origin: "",
    era: "",
    short_headline: "",
    provenance: "",
    ownership_history: "",
    condition_report: "",
    historical_period: "",
    start_date: "",
    start_time: "",
    duration: "7",
    cover_message: "",
  });

  // Media files (base64 string URLs)
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [leftImage, setLeftImage] = useState<string | null>(null);
  const [rightImage, setRightImage] = useState<string | null>(null);
  
  // Optional media
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryNames, setGalleryNames] = useState<string[]>([]);
  
  // Hero Video / 3D Model
  const [heroMediaType, setHeroMediaType] = useState<"video" | "model_3d">("video");
  const [heroFileBase64, setHeroFileBase64] = useState<string | null>(null);
  const [heroFileName, setHeroFileName] = useState<string>("");

  // SHA-256 Hash tracking for duplicates
  const [fileHashes, setFileHashes] = useState<Record<string, string>>({});

  // 1. Handle auth verification
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login?redirect=/seller/apply-for-auction");
      }
      setMounted(true);
    }
    checkAuth();
  }, [router, supabase]);

  // 2. Restore draft from localStorage on mount
  useEffect(() => {
    if (mounted) {
      const saved = localStorage.getItem("dynasity_auction_draft");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormData((prev) => ({ ...prev, ...parsed }));
          setDraftRestored(true);
        } catch (e) {
          console.error("Error parsing saved draft:", e);
        }
      }
    }
  }, [mounted]);

  // 3. Save draft on changes (excluding files/base64 to avoid quota exceptions)
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("dynasity_auction_draft", JSON.stringify(formData));
    }
  }, [formData, mounted]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      
      // Auto-compute starting bid default (estimated_value * 0.8)
      if (name === "estimated_value") {
        const val = parseFloat(value);
        if (!isNaN(val) && val > 0) {
          updated.starting_bid = String(Math.round(val * 0.8));
        } else {
          updated.starting_bid = "";
        }
      }
      return updated;
    });
  };

  const handleClearDraft = () => {
    localStorage.removeItem("dynasity_auction_draft");
    setFormData({
      title: "",
      category: "painting",
      estimated_value: "",
      starting_bid: "",
      reserve_price: "",
      description: "",
      origin: "",
      era: "",
      short_headline: "",
      provenance: "",
      ownership_history: "",
      condition_report: "",
      historical_period: "",
      start_date: "",
      start_time: "",
      duration: "7",
      cover_message: "",
    });
    setFrontImage(null);
    setBackImage(null);
    setLeftImage(null);
    setRightImage(null);
    setHeroImage(null);
    setGalleryImages([]);
    setGalleryNames([]);
    setHeroFileBase64(null);
    setHeroFileName("");
    setFileHashes({});
    setDraftRestored(false);
  };

  // SHA-256 Hashing helper
  const computeSHA256 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  // MIME and size checking helper
  const validateFile = (file: File, type: "image" | "video" | "model_3d"): FileValidationResult => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    
    if (type === "image") {
      const allowedMime = ["image/jpeg", "image/png", "image/webp"];
      const allowedExt = ["jpg", "jpeg", "png", "webp"];
      if (!allowedMime.includes(file.type) && !allowedExt.includes(ext || "")) {
        return { valid: false, error: `Invalid format: "${file.name}". Only JPG, PNG, and WEBP formats are accepted.` };
      }
      if (file.size > 10 * 1024 * 1024) {
        return { valid: false, error: `File size limit exceeded: "${file.name}" is larger than 10MB.` };
      }
    } else if (type === "video") {
      const allowedMime = ["video/mp4", "video/quicktime"];
      const allowedExt = ["mp4", "mov"];
      if (!allowedMime.includes(file.type) && !allowedExt.includes(ext || "")) {
        return { valid: false, error: `Invalid format: "${file.name}". Only MP4 and MOV videos are accepted.` };
      }
      if (file.size > 100 * 1024 * 1024) {
        return { valid: false, error: `File size limit exceeded: Video "${file.name}" is larger than 100MB.` };
      }
    } else if (type === "model_3d") {
      const allowedExt = ["glb", "gltf"];
      if (!allowedExt.includes(ext || "")) {
        return { valid: false, error: `Invalid format: "${file.name}". Only GLB and GLTF 3D models are accepted.` };
      }
      if (file.size > 100 * 1024 * 1024) {
        return { valid: false, error: `File size limit exceeded: 3D Model "${file.name}" is larger than 100MB.` };
      }
    }
    
    return { valid: true };
  };

  // Handle single file uploads
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "video" | "model_3d",
    setter: (val: string | null) => void,
    fieldKey: string,
    nameSetter?: (val: string) => void
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const validation = validateFile(file, type);
      if (!validation.valid) {
        setError(validation.error || "File validation failed.");
        return;
      }
      
      setError(null);
      setUploadStatus(`Hashing ${file.name}...`);
      
      const hash = await computeSHA256(file);
      
      // Duplicate prevention check
      const isDuplicate = Object.entries(fileHashes).some(([key, val]) => key !== fieldKey && val === hash);
      if (isDuplicate) {
        setError(`Duplicate file detected: "${file.name}" has already been uploaded for another view/asset.`);
        setUploadStatus(null);
        return;
      }
      
      setUploadStatus(`Processing ${file.name}...`);
      if (nameSetter) nameSetter(file.name);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
        setFileHashes((prev) => ({ ...prev, [fieldKey]: hash }));
        setUploadStatus(null);
      };
      reader.onerror = () => {
        setError(`Failed to read file ${file.name}.`);
        setUploadStatus(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle multiple gallery uploads
  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setError(null);
      
      const newImages: string[] = [];
      const newNames: string[] = [];
      const newHashes: Record<string, string> = {};
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        const validation = validateFile(file, "image");
        if (!validation.valid) {
          setError(validation.error || "Invalid file selection.");
          return;
        }
        
        setUploadStatus(`Hashing gallery item ${i + 1}/${files.length}...`);
        const hash = await computeSHA256(file);
        
        const isDuplicate = Object.entries(fileHashes).some(([_, val]) => val === hash) || 
                            Object.values(newHashes).includes(hash);
        if (isDuplicate) {
          setError(`Duplicate file detected: "${file.name}" has already been uploaded.`);
          setUploadStatus(null);
          return;
        }
        
        setUploadStatus(`Reading gallery item ${i + 1}/${files.length}...`);
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Read failed"));
          reader.readAsDataURL(file);
        });
        
        newImages.push(base64);
        newNames.push(file.name);
        newHashes[`gallery_${galleryImages.length + i}`] = hash;
      }
      
      setGalleryImages((prev) => [...prev, ...newImages]);
      setGalleryNames((prev) => [...prev, ...newNames]);
      setFileHashes((prev) => ({ ...prev, ...newHashes }));
      setUploadStatus(null);
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
    setGalleryNames((prev) => prev.filter((_, i) => i !== index));
    setFileHashes((prev) => {
      const updated = { ...prev };
      delete updated[`gallery_${index}`];
      return updated;
    });
  };

  // Validation logic per step
  const canGoNext = () => {
    if (currentStep === 1) {
      const value = parseFloat(formData.estimated_value);
      return (
        formData.title.trim() !== "" &&
        formData.category !== "" &&
        formData.description.trim() !== "" &&
        formData.era.trim() !== "" &&
        formData.origin.trim() !== "" &&
        !isNaN(value) && value > 0
      );
    }
    if (currentStep === 2) {
      return (
        formData.short_headline.trim() !== "" &&
        formData.provenance.trim() !== "" &&
        formData.ownership_history.trim() !== "" &&
        formData.condition_report.trim() !== "" &&
        formData.historical_period.trim() !== ""
      );
    }
    if (currentStep === 3) {
      // Must have front, back, left, right images
      return (
        frontImage !== null &&
        backImage !== null &&
        leftImage !== null &&
        rightImage !== null
      );
    }
    if (currentStep === 4) {
      const startBidVal = parseFloat(formData.starting_bid);
      const durationVal = parseInt(formData.duration);
      const reservePriceVal = formData.reserve_price ? parseFloat(formData.reserve_price) : undefined;
      
      const startTimeStamp = new Date(`${formData.start_date}T${formData.start_time}`).getTime();
      const nowTime = Date.now();
      
      const isValidStartBid = !isNaN(startBidVal) && startBidVal > 0;
      const isValidReserve = reservePriceVal === undefined || (!isNaN(reservePriceVal) && reservePriceVal >= startBidVal);
      const isValidDuration = !isNaN(durationVal) && durationVal > 0;
      const isFutureTime = !isNaN(startTimeStamp) && startTimeStamp > nowTime;
      
      return (
        formData.start_date !== "" &&
        formData.start_time !== "" &&
        isValidStartBid &&
        isValidReserve &&
        isValidDuration &&
        isFutureTime
      );
    }
    return false;
  };

  const handleNext = () => {
    if (canGoNext()) {
      setError(null);
      setCurrentStep((prev) => prev + 1);
    } else {
      // Provide dynamic validation warning feedback
      if (currentStep === 1) {
        const val = parseFloat(formData.estimated_value);
        if (isNaN(val) || val <= 0) {
          setError("Estimated Value must be a positive number greater than 0.");
        } else {
          setError("Please complete all required fields on Step 1 before proceeding.");
        }
      } else if (currentStep === 4) {
        const startBidVal = parseFloat(formData.starting_bid);
        const reservePriceVal = formData.reserve_price ? parseFloat(formData.reserve_price) : undefined;
        const startTimeStamp = new Date(`${formData.start_date}T${formData.start_time}`).getTime();
        
        if (isNaN(startBidVal) || startBidVal <= 0) {
          setError("Requested Starting Bid must be greater than 0.");
        } else if (reservePriceVal !== undefined && reservePriceVal < startBidVal) {
          setError("Requested Reserve Price must be greater than or equal to the Starting Bid.");
        } else if (isNaN(startTimeStamp) || startTimeStamp <= Date.now()) {
          setError("Start Date and Time must be in the future.");
        } else {
          setError("Please check your input values on Step 4.");
        }
      } else {
        setError("Please fill out all required fields on this step before proceeding.");
      }
    }
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canGoNext()) {
      setError("Please ensure all wizard steps are complete and pass all validation constraints.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        is_wizard: true,
        title: formData.title,
        category: formData.category,
        estimated_value: parseFloat(formData.estimated_value),
        starting_bid: parseFloat(formData.starting_bid),
        reserve_price: formData.reserve_price ? parseFloat(formData.reserve_price) : undefined,
        description: formData.description,
        origin: formData.origin,
        era: formData.era,
        short_headline: formData.short_headline,
        provenance: formData.provenance,
        ownership_history: formData.ownership_history,
        condition_report: formData.condition_report,
        historical_period: formData.historical_period,
        
        // Mandatory files
        front_image: frontImage,
        back_image: backImage,
        left_image: leftImage,
        right_image: rightImage,
        
        // Optional files
        hero_image: heroImage || undefined,
        gallery_images: galleryImages.length > 0 ? galleryImages : undefined,
        hero_video: heroMediaType === "video" ? heroFileBase64 : undefined,
        model_3d: heroMediaType === "model_3d" ? heroFileBase64 : undefined,
        
        start_date: formData.start_date,
        start_time: formData.start_time,
        duration: parseInt(formData.duration),
        cover_message: formData.cover_message || undefined,
        file_hashes: fileHashes
      };

      const response = await fetch("/api/auction-applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit curation application");
      }

      setSuccess("Your premium auction application has been submitted successfully!");
      localStorage.removeItem("dynasity_auction_draft"); // Clear draft on successful submit
      
      setTimeout(() => {
        router.push("/seller/auctions");
      }, 2500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = (currentStep / 4) * 100;

  if (!mounted) return null;

  return (
    <div className="max-w-4xl pb-16">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Submit Auction Curation Application
          </h2>
          <p className="text-sm text-gray-600">
            Apply to list your premium assets in our luxury live auction showcases.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClearDraft}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 bg-white transition-colors"
          >
            <Trash2 size={16} />
            <span>Reset Wizard</span>
          </button>
          <Link
            href="/seller/auctions"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white transition-colors animate-pulse-once"
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Progress Bar & Indicators */}
      <div className="mb-8 bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4 flex-wrap gap-4">
          {[
            { step: 1, label: "1. Core Information" },
            { step: 2, label: "2. Provenance & History" },
            { step: 3, label: "3. Media Vault" },
            { step: 4, label: "4. Auction Settings" },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] border transition-colors ${
                  currentStep === s.step
                    ? "bg-pandora-charcoal text-white border-pandora-charcoal"
                    : currentStep > s.step
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-gray-50 text-gray-400 border-gray-200"
                }`}
              >
                {currentStep > s.step ? <Check size={12} /> : s.step}
              </span>
              <span className={currentStep === s.step ? "text-gray-900 font-bold" : ""}>{s.label}</span>
            </div>
          ))}
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-pandora-charcoal h-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {draftRestored && (
        <div className="mb-6 rounded-lg border border-pandora-gold/30 bg-pandora-cream/40 p-4 flex gap-3 items-center justify-between">
          <div className="flex gap-3 items-center">
            <Clock className="h-5 w-5 text-pandora-gold flex-shrink-0" />
            <p className="text-sm font-medium text-pandora-charcoal">Draft restored from your last session.</p>
          </div>
          <button
            onClick={() => setDraftRestored(false)}
            className="text-xs font-bold text-pandora-charcoal border-b border-pandora-charcoal/30 pb-0.5 hover:text-pandora-gold hover:border-pandora-gold transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 flex gap-3 items-center">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3 items-center">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-850 leading-relaxed">{error}</p>
        </div>
      )}

      {uploadStatus && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 flex gap-3 items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p className="text-sm font-medium text-blue-800">{uploadStatus}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* ==========================================
            STEP 1: CORE INFORMATION
            ========================================== */}
        {currentStep === 1 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div className="border-b pb-4 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Step 1: Core Details</h3>
              <p className="text-xs text-gray-500 mt-1">Specify basic artifact features and core identity properties.</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Artifact Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="e.g. 17th Century Imperial Gold Crown"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Estimated Value (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="estimated_value"
                  value={formData.estimated_value}
                  onChange={handleInputChange}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 1500000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Origin Country / Discovery Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="origin"
                  value={formData.origin}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Rome, Italy"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Era / Historical Context <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="era"
                  value={formData.era}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Byzantine Era"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Detailed Curation Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={5}
                placeholder="Give a complete detailed overview of the physical properties, historical context, and discovery records..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 2: PROVENANCE
            ========================================== */}
        {currentStep === 2 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div className="border-b pb-4 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Step 2: Provenance & Ownership History</h3>
              <p className="text-xs text-gray-500 mt-1">Provide chronological context, headlines, and official condition statements.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Short Headline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="short_headline"
                  value={formData.short_headline}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Masterwork of Byzantine Horology"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Historical Period <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="historical_period"
                  value={formData.historical_period}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Late Middle Ages (circa 1350-1420)"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Origin / Basic Provenance Narrative <span className="text-red-500">*</span>
              </label>
              <textarea
                name="provenance"
                value={formData.provenance}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Declare where the object was found, initial records, and archaeological status..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Ownership Chronology / Custody History <span className="text-red-500">*</span>
              </label>
              <textarea
                name="ownership_history"
                value={formData.ownership_history}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="List the full genealogy of ownership, acquisitions, museum loans, and current legal custody..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Physical Condition Report <span className="text-red-500">*</span>
              </label>
              <textarea
                name="condition_report"
                value={formData.condition_report}
                onChange={handleInputChange}
                required
                rows={4}
                placeholder="Declare structural condition, aging, scratches, restorations, missing components, or preservation work..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none resize-none"
              />
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 3: MEDIA VAULT
            ========================================== */}
        {currentStep === 3 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div className="border-b pb-4 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Step 3: Curation Assets Vault</h3>
              <p className="text-xs text-gray-500 mt-1">Upload verified files. Hashing duplicate prevention checks run dynamically on all entries.</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-xs text-amber-800 flex gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Mandatory Views (All 4 Images Required)</span>
                You must upload distinct files representing the Front, Back, Left, and Right profiles of the artifact. Duplicate files will be blocked.
              </div>
            </div>

            {/* 4 Mandatory Images */}
            <div className="space-y-4">
              <span className="font-bold text-sm text-gray-700 block">1. Mandatory Angle Profiles (Max 10MB each)</span>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Front View *", state: frontImage, setter: setFrontImage, key: "front_image" },
                  { label: "Back View *", state: backImage, setter: setBackImage, key: "back_image" },
                  { label: "Left View *", state: leftImage, setter: setLeftImage, key: "left_image" },
                  { label: "Right View *", state: rightImage, setter: setRightImage, key: "right_image" },
                ].map((img, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50 text-center flex flex-col justify-between h-40">
                    <span className="text-xs font-semibold text-gray-650 mb-2 block">{img.label}</span>
                    
                    {img.state ? (
                      <div className="relative h-20 w-full mb-2">
                        <img src={img.state} className="h-full w-full object-cover rounded border" alt={img.label} />
                        <button
                          type="button"
                          onClick={() => {
                            img.setter(null);
                            setFileHashes((prev) => {
                              const updated = { ...prev };
                              delete updated[img.key];
                              return updated;
                            });
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 text-[8px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-full mb-2 border border-dashed border-gray-300 bg-white flex items-center justify-center text-xs text-gray-400">
                        No image
                      </div>
                    )}

                    <label className="inline-block mt-auto">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => handleFileChange(e, "image", img.setter, img.key)}
                        className="hidden"
                      />
                      <span className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 rounded px-2.5 py-1 text-[10px] font-semibold border border-gray-300 transition-colors">
                        Upload
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Media (Hero image + Gallery) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-6">
              {/* Hero Image */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-sm text-gray-700 block">2. Optional Hero Cover Image</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">High-quality branding cover image displayed on banners.</span>
                </div>
                
                {heroImage ? (
                  <div className="relative h-32 w-full my-4">
                    <img src={heroImage} className="h-full w-full object-cover rounded border" alt="Hero Cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setHeroImage(null);
                        setFileHashes((prev) => {
                          const updated = { ...prev };
                          delete updated["hero_image"];
                          return updated;
                        });
                      }}
                      className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-1 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="h-32 w-full my-4 border border-dashed border-gray-300 bg-white flex items-center justify-center text-xs text-gray-400">
                    Optional Hero Image
                  </div>
                )}

                <label className="block w-full">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => handleFileChange(e, "image", setHeroImage, "hero_image")}
                    className="hidden"
                  />
                  <span className="cursor-pointer bg-white hover:bg-gray-55 border text-gray-800 rounded py-2 text-center text-xs font-semibold block transition-colors">
                    Upload Hero Image
                  </span>
                </label>
              </div>

              {/* Gallery Images (Multiple) */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex flex-col justify-between">
                <div>
                  <span className="font-bold text-sm text-gray-700 block">3. Optional Gallery Files</span>
                  <span className="text-[10px] text-gray-500 block mt-0.5">Additional detail photos to add to the sliding catalog gallery.</span>
                </div>

                <div className="my-4 space-y-2 max-h-36 overflow-y-auto">
                  {galleryImages.length > 0 ? (
                    galleryImages.map((img, index) => (
                      <div key={index} className="flex items-center justify-between border bg-white p-1.5 rounded text-xs gap-3">
                        <div className="flex items-center gap-2 truncate">
                          <img src={img} className="h-6 w-6 object-cover rounded" alt="Gallery thumbnail" />
                          <span className="truncate font-medium text-gray-700">{galleryNames[index] || `Image ${index + 1}`}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(index)}
                          className="text-red-500 hover:text-red-700 px-1 font-bold text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="h-32 border border-dashed border-gray-300 bg-white flex items-center justify-center text-xs text-gray-400">
                      No gallery files
                    </div>
                  )}
                </div>

                <label className="block w-full">
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleGalleryChange}
                    className="hidden"
                  />
                  <span className="cursor-pointer bg-white hover:bg-gray-55 border text-gray-800 rounded py-2 text-center text-xs font-semibold block transition-colors">
                    Add Gallery Files
                  </span>
                </label>
              </div>
            </div>

            {/* Optional Rich Assets (Video / 3D Model) */}
            <div className="space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between border-b pb-2 mb-2 flex-wrap gap-2">
                <div>
                  <span className="font-bold text-sm text-gray-700 block">4. Optional Hero Asset (Video/3D Model - Max 100MB)</span>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">Embed showcase animation video or high-fidelity GLB model.</span>
                </div>
                
                <div className="flex gap-3 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="mediaType"
                      checked={heroMediaType === "video"}
                      onChange={() => {
                        setHeroMediaType("video");
                        setHeroFileBase64(null);
                        setHeroFileName("");
                        setFileHashes(prev => {
                          const updated = { ...prev };
                          delete updated["hero_asset"];
                          return updated;
                        });
                      }}
                    />
                    <span>MP4 Video</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="mediaType"
                      checked={heroMediaType === "model_3d"}
                      onChange={() => {
                        setHeroMediaType("model_3d");
                        setHeroFileBase64(null);
                        setHeroFileName("");
                        setFileHashes(prev => {
                          const updated = { ...prev };
                          delete updated["hero_asset"];
                          return updated;
                        });
                      }}
                    />
                    <span>3D Model (GLB)</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg bg-white relative">
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-xs text-gray-500 mb-3">
                  {heroFileName ? `Selected: ${heroFileName}` : `Choose an optional ${heroMediaType === "video" ? "video file (.mp4, .mov)" : "3D model (.glb, .gltf)"}`}
                </span>
                
                {heroFileBase64 && (
                  <button
                    type="button"
                    onClick={() => {
                      setHeroFileBase64(null);
                      setHeroFileName("");
                      setFileHashes((prev) => {
                        const updated = { ...prev };
                        delete updated["hero_asset"];
                        return updated;
                      });
                    }}
                    className="absolute top-2 right-2 text-xs font-bold text-red-500 border border-red-100 hover:bg-red-50 px-2.5 py-1 rounded"
                  >
                    Clear File
                  </button>
                )}

                <label className="inline-block">
                  <input
                    type="file"
                    accept={heroMediaType === "video" ? "video/mp4,video/quicktime" : ".glb,.gltf"}
                    onChange={(e) => handleFileChange(e, heroMediaType, setHeroFileBase64, "hero_asset", setHeroFileName)}
                    className="hidden"
                  />
                  <span className="cursor-pointer bg-pandora-charcoal hover:bg-pandora-charcoal/80 text-white rounded px-4 py-1.5 text-xs font-semibold transition-colors">
                    Select File
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            STEP 4: AUCTION SETTINGS
            ========================================== */}
        {currentStep === 4 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6 shadow-sm">
            <div className="border-b pb-4 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Step 4: Timing & Auction proposal settings</h3>
              <p className="text-xs text-gray-500 mt-1">Specify proposal starting parameters, duration, and reserve locks.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Requested Starting Bid (USD) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="starting_bid"
                  value={formData.starting_bid}
                  onChange={handleInputChange}
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 800000"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">Default set to 80% of Estimated Value ($Gold-locked).</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Requested Reserve Price (USD)
                </label>
                <input
                  type="number"
                  name="reserve_price"
                  value={formData.reserve_price}
                  onChange={handleInputChange}
                  placeholder="Optional (Lock price)"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">If specified, reserve price must be greater than or equal to starting bid.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Duration (Days) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  required
                  min="1"
                  max="30"
                  placeholder="e.g. 7"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Proposal Cover Message <span className="text-gray-500">(Optional)</span>
              </label>
              <textarea
                name="cover_message"
                value={formData.cover_message}
                onChange={handleInputChange}
                rows={4}
                placeholder="Explain details of rarity, appraisal status, or notes to the curation board..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-400 focus:outline-none resize-none"
              />
            </div>
            
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-xs text-gray-600 flex gap-2">
              <ShieldCheck className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5 text-gray-800">Security Curation Assurance</span>
                By submitting this proposal, you certify the artifact description, ownership history, and condition parameters are authentic. The curation board will review the submitted details.
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation */}
        <div className="flex gap-4">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-semibold text-gray-900 bg-white hover:bg-gray-50 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}
          
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext()}
              className="flex-1 rounded-lg bg-pandora-charcoal py-3 text-sm font-semibold text-white hover:bg-pandora-charcoal/80 transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Next Step</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !canGoNext()}
              className="flex-1 rounded-lg bg-pandora-charcoal py-3 text-sm font-semibold text-white hover:bg-pandora-charcoal/80 transition-colors shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? "Submitting Proposal..." : "Submit Proposal"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
