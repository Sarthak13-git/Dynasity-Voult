"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getBaseUrl } from "@/lib/get-base-url";
import { motion } from "motion/react";
import { 
  Store, 
  FileText, 
  Phone, 
  Building, 
  User, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Upload,
  Globe,
  MapPin,
  Home,
  ShieldAlert,
  Loader2,
  FileCheck
} from "lucide-react";

function maskSensitiveValue(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 4) return "••••" + value;
  return "••••••••" + value.slice(-4);
}

interface VerificationRequest {
  id: string;
  status: "pending" | "approved" | "rejected";
  legal_name: string;
  store_name: string;
  rejection_reason?: string;
  created_at: string;
}

export default function SellerOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auth states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSeller, setIsSeller] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Existing request status
  const [pendingRequest, setPendingRequest] = useState<VerificationRequest | null>(null);

  // File Inputs
  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Original raw values for submitted check
  const [originalBank, setOriginalBank] = useState("");
  const [originalTaxId, setOriginalTaxId] = useState("");

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    legalName: "",
    storeName: "",
    storeDescription: "",
    phone: "",
    country: "United States",
    address: "",
    city: "",
    postalCode: "",
    bankAccount: "",
    taxId: "",
    agreementAccepted: false,
    banAcknowledged: false,
  });

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);
      setUserId(session.user.id);

      // Fetch user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, store_name, store_description, phone, bank_account, tax_id")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        // If already registered as seller/admin
        if ((profile.role === "seller" || profile.role === "admin") && profile.store_name) {
          setIsSeller(true);
          router.push("/seller/products");
          return;
        }

        const rawBank = profile.bank_account || session.user.user_metadata?.temp_bank_account || "";
        const rawTax = profile.tax_id || session.user.user_metadata?.temp_tax_id || "";
        setOriginalBank(rawBank);
        setOriginalTaxId(rawTax);

        // Prepopulate fields from profile or temp user metadata
        setFormData((prev) => ({
          ...prev,
          name: session.user.user_metadata?.full_name || "",
          email: session.user.email || "",
          storeName: profile.store_name || session.user.user_metadata?.temp_store_name || "",
          storeDescription: profile.store_description || "",
          phone: profile.phone || session.user.user_metadata?.temp_phone || "",
          bankAccount: maskSensitiveValue(rawBank),
          taxId: maskSensitiveValue(rawTax),
        }));

        // Check for existing verification requests
        const { data: requests } = await supabase
          .from("seller_verification_requests")
          .select("id, status, legal_name, store_name, rejection_reason, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (requests && requests.length > 0) {
          setPendingRequest(requests[0] as VerificationRequest);
        }
      }

      setLoading(false);
    };

    loadSession();
  }, [router, supabase]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "govid" | "address" | "selfie") => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (type === "govid") setGovIdFile(file);
      else if (type === "address") setAddressProofFile(file);
      else if (type === "selfie") setSelfieFile(file);
    }
  };

  const uploadFileToStorage = async (file: File, type: string, currentUserId: string): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${type}_${Date.now()}.${fileExt}`;
    const filePath = `${currentUserId}/${fileName}`;

    const { data, error: uploadError } = await supabase.storage
      .from("artifact-documents")
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/artifact-documents/${filePath}`;
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      let activeUserId = userId;

      // Case A: Unauthenticated Signup
      if (!isAuthenticated) {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              // Save temp fields so they can pre-populate after email confirmation
              temp_store_name: formData.storeName,
              temp_phone: formData.phone,
              temp_tax_id: formData.taxId,
              temp_bank_account: formData.bankAccount,
            },
            emailRedirectTo: `${getBaseUrl()}/callback?next=${encodeURIComponent("/seller-hub/onboarding")}`,
          },
        });

        if (signupError) {
          if (
            signupError.message.toLowerCase().includes("already registered") ||
            signupError.message.toLowerCase().includes("already exists") ||
            signupError.status === 422 ||
            (signupError as any).code === "user_already_exists"
          ) {
            throw new Error("An account with this email already exists.");
          }
          throw signupError;
        }

        if (data.session) {
          activeUserId = data.user?.id || null;
        } else {
          // Verification required
          setSuccessMsg(
            "Account created successfully! A verification email has been sent. Please confirm your email to complete onboarding."
          );
          setSubmitting(false);
          return;
        }
      }

      if (!activeUserId) {
        throw new Error("No active user ID found for onboarding.");
      }

      // Ensure files are provided
      if (!govIdFile || !addressProofFile || !selfieFile) {
        throw new Error("All three verification documents (Government ID, Address Proof, Selfie) are required.");
      }

      // Check checkboxes
      if (!formData.agreementAccepted || !formData.banAcknowledged) {
        throw new Error("You must accept the seller agreement and acknowledge the ban policies.");
      }

      // 1. Upload documents to storage
      const govIdUrl = await uploadFileToStorage(govIdFile, "government_id", activeUserId);
      const addressProofUrl = await uploadFileToStorage(addressProofFile, "address_proof", activeUserId);
      const selfieUrl = await uploadFileToStorage(selfieFile, "selfie_verification", activeUserId);

      // Resolve bank/tax info
      const resolvedBank = formData.bankAccount.startsWith("••••") ? originalBank : formData.bankAccount;
      const resolvedTax = formData.taxId.startsWith("••••") ? originalTaxId : formData.taxId;

      // 2. Submit verification request POST API
      const response = await fetch("/api/seller-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          legal_name: formData.legalName,
          store_name: formData.storeName,
          phone: formData.phone,
          email: formData.email || (await supabase.auth.getUser()).data.user?.email,
          country: formData.country,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          government_id_url: govIdUrl,
          address_proof_url: addressProofUrl,
          selfie_verification_url: selfieUrl,
          tax_id: resolvedTax,
          bank_account: resolvedBank,
          seller_agreement_accepted: formData.agreementAccepted,
          permanent_ban_acknowledgement: formData.banAcknowledged,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to submit verification request.");
      }

      setSuccessMsg("Your application has been submitted successfully! The curation committee will review your documents and business credentials shortly.");
      setPendingRequest(data.data);
    } catch (err: any) {
      console.error("Error submitting verification request:", err);
      setError(err.message || "Failed to submit verification request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pandora-charcoal" />
      </div>
    );
  }

  // Render review or success status if request exists and is pending/rejected
  if (pendingRequest && pendingRequest.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-pandora-cream bg-white p-8 text-center shadow-sm"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <h2 className="mt-6 font-serif text-2xl font-bold text-pandora-charcoal">
            Verification Pending Review
          </h2>
          <p className="mt-3 text-sm text-pandora-gray leading-relaxed max-w-md mx-auto">
            Thank you for applying! Your verification request for **{pendingRequest.store_name}** (Legal name: {pendingRequest.legal_name}) is currently being reviewed by the curation committee. 
          </p>
          <div className="mt-8 rounded-lg bg-gray-50 border border-gray-100 p-4 text-left max-w-md mx-auto">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Application Details</h4>
            <div className="mt-2 text-xs text-gray-700 space-y-1">
              <p><span className="font-semibold">Status:</span> Under Review</p>
              <p><span className="font-semibold">Submitted:</span> {new Date(pendingRequest.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pandora-gold hover:underline"
            >
              <span>Return to Homepage</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="rounded-xl border border-pandora-cream bg-white p-8 shadow-sm"
      >
        <div className="text-center">
          <h2 className="font-serif text-3xl font-bold text-pandora-charcoal">
            Become a Seller
          </h2>
          <p className="mt-2 text-sm text-pandora-gray">
            Please fill in your business credentials and upload verification documents.
          </p>
        </div>

        {pendingRequest && pendingRequest.status === "rejected" && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
            <ShieldAlert className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-800">Previous Application Rejected</h4>
              <p className="mt-1 text-xs text-red-700 leading-relaxed">
                <span className="font-semibold">Reason:</span> {pendingRequest.rejection_reason || "Documents could not be verified."}
              </p>
              <p className="mt-2 text-xs text-red-800 font-semibold">
                Please review the errors, upload valid documents, and re-apply below.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-xs text-red-800 leading-relaxed">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-xs text-green-800 leading-relaxed">{successMsg}</p>
            </div>
          )}

          {/* Account Section */}
          <div className="space-y-4">
            <h3 className="font-serif text-lg font-bold text-pandora-charcoal border-b border-pandora-cream pb-2">
              Account Credentials
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  Full Name
                </label>
                <div className="relative mt-2">
                  <User
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Jane Austen"
                    required
                    disabled={isAuthenticated}
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  Email Address
                </label>
                <div className="relative mt-2">
                  <Mail
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="seller@example.com"
                    required
                    disabled={isAuthenticated}
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {!isAuthenticated && (
              <div>
                <label
                  htmlFor="password"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2">
                  <Lock
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Minimum 8 characters"
                    required={!isAuthenticated}
                    minLength={8}
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Business & Store Section */}
          <div className="space-y-4 pt-4">
            <h3 className="font-serif text-lg font-bold text-pandora-charcoal border-b border-pandora-cream pb-2">
              Business & Store Identity
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="legalName"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  Official Legal Name <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2">
                  <User
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="legalName"
                    name="legalName"
                    type="text"
                    value={formData.legalName}
                    onChange={handleInputChange}
                    placeholder="Legal name / registered business owner"
                    required
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="storeName"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  Store Name <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2">
                  <Store
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="storeName"
                    name="storeName"
                    type="text"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    placeholder="e.g., Heritage Antique Gallery"
                    required
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="storeDescription"
                className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
              >
                Store Description
              </label>
              <div className="mt-2">
                <textarea
                  id="storeDescription"
                  name="storeDescription"
                  value={formData.storeDescription}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Describe your collections and specialties..."
                  className="w-full rounded-lg border border-pandora-cream bg-white py-3 px-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4 pt-4">
            <h3 className="font-serif text-lg font-bold text-pandora-charcoal border-b border-pandora-cream pb-2">
              Physical Location
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="country"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  Country <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2">
                  <Globe
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="country"
                    name="country"
                    type="text"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="e.g., United States"
                    required
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  City <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2">
                  <MapPin
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="city"
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g., Boston"
                    required
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label
                  htmlFor="address"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  Street Address <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2">
                  <Home
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="e.g., 100 Beacon St, Apt 4"
                    required
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="postalCode"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  Postal Code <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2">
                  <input
                    id="postalCode"
                    name="postalCode"
                    type="text"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    placeholder="e.g., 02116"
                    required
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 px-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Verification & Payout Details */}
          <div className="space-y-4 pt-4">
            <h3 className="font-serif text-lg font-bold text-pandora-charcoal border-b border-pandora-cream pb-2">
              Verification & Financials
            </h3>

            <div>
              <label
                htmlFor="phone"
                className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
              >
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-2">
                <Phone
                  size={16}
                  strokeWidth={1.5}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  required
                  className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="bankAccount"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  Bank Account Number <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2">
                  <Building
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="bankAccount"
                    name="bankAccount"
                    type="password"
                    value={formData.bankAccount}
                    onChange={handleInputChange}
                    placeholder="••••••••••••"
                    required
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="taxId"
                  className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray"
                >
                  Tax ID / SSN / Business ID <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-2">
                  <FileText
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="taxId"
                    name="taxId"
                    type="password"
                    value={formData.taxId}
                    onChange={handleInputChange}
                    placeholder="••••••••••••"
                    required
                    className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Verification Files Upload */}
          <div className="space-y-4 pt-4">
            <h3 className="font-serif text-lg font-bold text-pandora-charcoal border-b border-pandora-cream pb-2">
              Verification Documents
            </h3>

            <div className="grid gap-6 sm:grid-cols-3">
              {/* Government ID */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray block">
                  Government ID Scan <span className="text-red-500">*</span>
                </label>
                <div className="relative border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-center cursor-pointer min-h-[120px] flex flex-col justify-center items-center">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, "govid")}
                    required
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {govIdFile ? (
                    <>
                      <FileCheck className="h-6 w-6 text-green-600" />
                      <span className="mt-2 text-[10px] text-gray-700 font-medium truncate max-w-full px-2">
                        {govIdFile.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="mt-2 text-[10px] text-gray-500 font-medium">Upload File</span>
                      <span className="text-[8px] text-gray-400">PDF/Image</span>
                    </>
                  )}
                </div>
              </div>

              {/* Address Proof */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray block">
                  Address Verification <span className="text-red-500">*</span>
                </label>
                <div className="relative border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-center cursor-pointer min-h-[120px] flex flex-col justify-center items-center">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, "address")}
                    required
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {addressProofFile ? (
                    <>
                      <FileCheck className="h-6 w-6 text-green-600" />
                      <span className="mt-2 text-[10px] text-gray-700 font-medium truncate max-w-full px-2">
                        {addressProofFile.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="mt-2 text-[10px] text-gray-500 font-medium">Upload File</span>
                      <span className="text-[8px] text-gray-400">Utility Bill/Statement</span>
                    </>
                  )}
                </div>
              </div>

              {/* Verification Selfie */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-pandora-gray block">
                  Verification Selfie <span className="text-red-500">*</span>
                </label>
                <div className="relative border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-center cursor-pointer min-h-[120px] flex flex-col justify-center items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, "selfie")}
                    required
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  {selfieFile ? (
                    <>
                      <FileCheck className="h-6 w-6 text-green-600" />
                      <span className="mt-2 text-[10px] text-gray-700 font-medium truncate max-w-full px-2">
                        {selfieFile.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="mt-2 text-[10px] text-gray-500 font-medium">Upload Image</span>
                      <span className="text-[8px] text-gray-400">Selfie Portrait</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Legal Acknowledgement Checkboxes */}
          <div className="space-y-4 pt-4 border-t border-pandora-cream">
            <div className="flex items-start gap-3">
              <input
                id="agreementAccepted"
                name="agreementAccepted"
                type="checkbox"
                checked={formData.agreementAccepted}
                onChange={handleInputChange}
                required
                className="mt-1 h-4 w-4 rounded border-gray-300 text-pandora-gold focus:ring-pandora-gold"
              />
              <label htmlFor="agreementAccepted" className="text-xs text-pandora-gray leading-relaxed">
                I accept the terms of the <Link href="/terms" className="text-pandora-charcoal font-semibold underline">Seller Agreement</Link> and agree to platform commissions. <span className="text-red-500">*</span>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <input
                id="banAcknowledged"
                name="banAcknowledged"
                type="checkbox"
                checked={formData.banAcknowledged}
                onChange={handleInputChange}
                required
                className="mt-1 h-4 w-4 rounded border-gray-300 text-pandora-gold focus:ring-pandora-gold"
              />
              <label htmlFor="banAcknowledged" className="text-xs text-pandora-gray leading-relaxed flex items-center gap-1.5 font-medium text-amber-800">
                <span>I acknowledge that submitting fraudulent documents or misleading provenance details will result in a permanent ban.</span> <span className="text-red-500">*</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-pandora-charcoal py-4 text-xs font-semibold uppercase tracking-wider text-white hover:bg-pandora-gold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin text-white" />}
            {submitting ? "Uploading Documents..." : "Submit Verification Application"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
