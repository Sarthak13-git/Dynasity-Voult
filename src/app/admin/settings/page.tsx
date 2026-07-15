"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Sparkles,
  DollarSign,
  Gavel,
  Building,
  Bell,
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ShieldAlert
} from "lucide-react";

export default function AdminSettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Settings states
  // Section 1: Commission & Fees
  const [auctionCommissionRate, setAuctionCommissionRate] = useState("10");
  const [directSaleCommission, setDirectSaleCommission] = useState("5");
  const [platformTransactionFee, setPlatformTransactionFee] = useState("2.99");

  // Section 2: Auction Rules
  const [minBidIncrement, setMinBidIncrement] = useState("100");
  const [reservePriceRequirement, setReservePriceRequirement] = useState("80");
  const [auctionDurationDays, setAuctionDurationDays] = useState("7");

  // Section 3: Business Information
  const [platformName, setPlatformName] = useState("Dynasity-Voult");
  const [contactEmail, setContactEmail] = useState("support@dynasityvoult.com");
  const [supportPhone, setSupportPhone] = useState("+1 (555) 0199");
  const [websiteUrl, setWebsiteUrl] = useState("https://dynasityvoult.com");
  const [taxId, setTaxId] = useState("TX-99882211-A");

  // Section 4: Notifications
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(false);
  const [slackIntegrationEnabled, setSlackIntegrationEnabled] = useState(false);

  // Section metadata (for display of last updated details)
  const [metadata, setMetadata] = useState<Record<string, { updated_at: string; updated_by: string | null }>>({});

  // Loading states for each section save button
  const [savingSec1, setSavingSec1] = useState(false);
  const [savingSec2, setSavingSec2] = useState(false);
  const [savingSec3, setSavingSec3] = useState(false);
  const [savingSec4, setSavingSec4] = useState(false);

  // Inline section validation errors
  const [sec1Errors, setSec1Errors] = useState<string[]>([]);
  const [sec2Errors, setSec2Errors] = useState<string[]>([]);
  const [sec3Errors, setSec3Errors] = useState<string[]>([]);

  // Show toast notification helper
  const triggerToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Verify User Admin role & Load settings from DB
  useEffect(() => {
    async function checkAdminAndLoad() {
      try {
        setLoading(true);
        setError(null);

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/login?redirect=/admin/settings");
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

        const response = await fetch("/api/settings");
        const json = await response.json();

        if (json.success && json.settings) {
          const s = json.settings;
          setMetadata(json.metadata || {});

          // Map db values to state
          if (s.auction_commission_rate !== undefined) setAuctionCommissionRate(s.auction_commission_rate.toString());
          if (s.direct_sale_commission !== undefined) setDirectSaleCommission(s.direct_sale_commission.toString());
          if (s.platform_transaction_fee !== undefined) setPlatformTransactionFee(s.platform_transaction_fee.toString());

          if (s.min_bid_increment !== undefined) setMinBidIncrement(s.min_bid_increment.toString());
          if (s.reserve_price_requirement !== undefined) setReservePriceRequirement(s.reserve_price_requirement.toString());
          if (s.auction_duration_days !== undefined) setAuctionDurationDays(s.auction_duration_days.toString());

          if (s.platform_name !== undefined) setPlatformName(s.platform_name);
          if (s.contact_email !== undefined) setContactEmail(s.contact_email);
          if (s.support_phone !== undefined) setSupportPhone(s.support_phone);
          if (s.website_url !== undefined) setWebsiteUrl(s.website_url);
          if (s.tax_id !== undefined) setTaxId(s.tax_id);

          if (s.email_notifications_enabled !== undefined) setEmailNotificationsEnabled(s.email_notifications_enabled);
          if (s.sms_notifications_enabled !== undefined) setSmsNotificationsEnabled(s.sms_notifications_enabled);
          if (s.slack_integration_enabled !== undefined) setSlackIntegrationEnabled(s.slack_integration_enabled);
        } else {
          setError(json.error || "Failed to load platform settings.");
        }
      } catch (err: any) {
        console.error("❌ Error loading admin settings page:", err);
        setError(err.message || "An unexpected error occurred while loading parameters.");
      } finally {
        setLoading(false);
      }
    }
    checkAdminAndLoad();
  }, [router, supabase]);

  // Section 1 Save Handler
  const handleSaveSec1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSec1Errors([]);

    const errors: string[] = [];
    const rate1 = Number(auctionCommissionRate);
    const rate2 = Number(directSaleCommission);
    const fee = Number(platformTransactionFee);

    if (isNaN(rate1) || rate1 < 0 || rate1 > 100) {
      errors.push("Auction Commission Rate must be a valid number between 0% and 100%.");
    }
    if (isNaN(rate2) || rate2 < 0 || rate2 > 100) {
      errors.push("Direct Sale Commission must be a valid number between 0% and 100%.");
    }
    if (isNaN(fee) || fee < 0 || fee > 999) {
      errors.push("Platform Transaction Fee must be a valid positive number between $0 and $999.");
    }

    if (errors.length > 0) {
      setSec1Errors(errors);
      triggerToast("error", "Please fix form validation errors.");
      return;
    }

    try {
      setSavingSec1(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            auction_commission_rate: rate1,
            direct_sale_commission: rate2,
            platform_transaction_fee: fee,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        triggerToast("success", "Commission & Fees settings updated successfully.");
        // Refresh metadata for modified keys
        setMetadata((prev) => ({
          ...prev,
          auction_commission_rate: { updated_at: new Date().toISOString(), updated_by: "Me" },
        }));
      } else {
        triggerToast("error", json.error || "Failed to save settings.");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to submit settings updates.");
    } finally {
      setSavingSec1(false);
    }
  };

  // Section 2 Save Handler
  const handleSaveSec2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSec2Errors([]);

    const errors: string[] = [];
    const increment = Number(minBidIncrement);
    const reserveReq = Number(reservePriceRequirement);
    const duration = Number(auctionDurationDays);

    if (isNaN(increment) || increment < 0) {
      errors.push("Minimum Bid Increment must be a positive number.");
    }
    if (isNaN(reserveReq) || reserveReq < 0 || reserveReq > 100) {
      errors.push("Reserve Price Requirement must be a percentage between 0% and 100%.");
    }
    if (isNaN(duration) || duration <= 0) {
      errors.push("Default Auction Duration must be a positive number greater than 0.");
    }

    if (errors.length > 0) {
      setSec2Errors(errors);
      triggerToast("error", "Please fix form validation errors.");
      return;
    }

    try {
      setSavingSec2(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            min_bid_increment: increment,
            reserve_price_requirement: reserveReq,
            auction_duration_days: duration,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        triggerToast("success", "Auction Rules configured successfully.");
        setMetadata((prev) => ({
          ...prev,
          min_bid_increment: { updated_at: new Date().toISOString(), updated_by: "Me" },
        }));
      } else {
        triggerToast("error", json.error || "Failed to save settings.");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to submit settings updates.");
    } finally {
      setSavingSec2(false);
    }
  };

  // Section 3 Save Handler
  const handleSaveSec3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSec3Errors([]);

    const errors: string[] = [];
    if (!platformName.trim()) errors.push("Platform Name cannot be blank.");
    if (!contactEmail.trim() || !contactEmail.includes("@")) errors.push("Please provide a valid support email address.");
    if (!websiteUrl.trim()) errors.push("Website URL is required.");

    if (errors.length > 0) {
      setSec3Errors(errors);
      triggerToast("error", "Please fix form validation errors.");
      return;
    }

    try {
      setSavingSec3(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            platform_name: platformName,
            contact_email: contactEmail,
            support_phone: supportPhone,
            website_url: websiteUrl,
            tax_id: taxId,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        triggerToast("success", "Business details updated successfully.");
        setMetadata((prev) => ({
          ...prev,
          platform_name: { updated_at: new Date().toISOString(), updated_by: "Me" },
        }));
      } else {
        triggerToast("error", json.error || "Failed to save settings.");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to submit settings updates.");
    } finally {
      setSavingSec3(false);
    }
  };

  // Section 4 Save Handler
  const handleSaveSec4 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSec4(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            email_notifications_enabled: emailNotificationsEnabled,
            sms_notifications_enabled: smsNotificationsEnabled,
            slack_integration_enabled: slackIntegrationEnabled,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        triggerToast("success", "Notification policies updated successfully.");
        setMetadata((prev) => ({
          ...prev,
          email_notifications_enabled: { updated_at: new Date().toISOString(), updated_by: "Me" },
        }));
      } else {
        triggerToast("error", json.error || "Failed to save settings.");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Failed to submit settings updates.");
    } finally {
      setSavingSec4(false);
    }
  };

  // Format timestamp helper
  const getFormattedDate = (key: string) => {
    const time = metadata[key]?.updated_at;
    if (!time) return "Never updated";
    return new Date(time).toLocaleString();
  };

  if (isAdmin === null || loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-[#0d0d0d] text-[#FDFBF7] rounded-2xl border border-neutral-900">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 text-[#D4AF37] animate-spin mx-auto" />
          <p className="text-sm font-medium tracking-wide text-gray-400">
            Fetching platform configuration parameters...
          </p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return null;
  }

  if (error) {
    return (
      <div className="p-8 bg-[#0d0d0d] text-[#FDFBF7] rounded-2xl border border-red-900/50 space-y-4">
        <div className="flex items-center gap-3 text-red-500">
          <ShieldAlert size={28} />
          <h2 className="text-lg font-bold">Failed to Load Configuration</h2>
        </div>
        <p className="text-sm text-gray-400">{error}</p>
        {error?.toLowerCase().includes("jwt") ? (
          <button
            onClick={() => router.push("/login?redirect=/admin/settings")}
            className="px-5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg"
          >
            Login Again
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg"
          >
            Reload
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#0d0d0d] text-[#FDFBF7] p-8 rounded-2xl border border-neutral-900">
      {/* Toast Alert */}
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
            <span>Platform Controls & Settings</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-serif text-gradient-gold mt-1">
            System Parameters Configuration
          </h1>
          <p className="mt-1 text-xs text-neutral-400 font-medium">
            Manage house fees, auction rules, business information registries, and notifications policies.
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

      {/* Form sections list */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* SECTION 1: Commission & Fees */}
        <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <form onSubmit={handleSaveSec1} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-neutral-900 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-950/20 border border-amber-900/30 text-amber-500">
                <DollarSign size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] font-serif">Commission & Fees</h2>
                <p className="text-[10px] text-neutral-500">Last change: {getFormattedDate("auction_commission_rate")}</p>
              </div>
            </div>

            {sec1Errors.length > 0 && (
              <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 space-y-1">
                {sec1Errors.map((err, i) => (
                  <p key={i} className="text-[10px] text-red-400 flex items-center gap-1">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Auction Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={auctionCommissionRate}
                  onChange={(e) => setAuctionCommissionRate(e.target.value)}
                  className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs"
                />
                <p className="text-[9px] text-neutral-500 mt-1">Example: Collect 10% of winning bids</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Direct Sale Commission (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={directSaleCommission}
                  onChange={(e) => setDirectSaleCommission(e.target.value)}
                  className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs"
                />
                <p className="text-[9px] text-neutral-500 mt-1">Example: Collect 5% of direct sales</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Platform Fee per Transaction ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="999"
                  value={platformTransactionFee}
                  onChange={(e) => setPlatformTransactionFee(e.target.value)}
                  className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-900/60 flex justify-end">
              <button
                type="submit"
                disabled={savingSec1}
                className="px-5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] disabled:bg-[#333] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                {savingSec1 ? "Saving..." : "Save Commission settings"}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 2: Auction Rules */}
        <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <form onSubmit={handleSaveSec2} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-neutral-900 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-950/20 border border-amber-900/30 text-amber-500">
                <Gavel size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] font-serif">Auction Rules</h2>
                <p className="text-[10px] text-neutral-500">Last change: {getFormattedDate("min_bid_increment")}</p>
              </div>
            </div>

            {sec2Errors.length > 0 && (
              <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 space-y-1">
                {sec2Errors.map((err, i) => (
                  <p key={i} className="text-[10px] text-red-400 flex items-center gap-1">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Minimum Bid Increment ($)
                </label>
                <input
                  type="number"
                  min="1"
                  value={minBidIncrement}
                  onChange={(e) => setMinBidIncrement(e.target.value)}
                  className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs"
                />
                <p className="text-[9px] text-neutral-500 mt-1">Minimum increment enforced in live premium auctions</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Reserve Price Requirement (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={reservePriceRequirement}
                  onChange={(e) => setReservePriceRequirement(e.target.value)}
                  className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs"
                />
                <p className="text-[9px] text-neutral-500 mt-1">Seller reserve must be at least X% of estimated value</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Auction Duration (days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={auctionDurationDays}
                  onChange={(e) => setAuctionDurationDays(e.target.value)}
                  className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs"
                />
                <p className="text-[9px] text-neutral-500 mt-1">Default number of days auctions run</p>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-900/60 flex justify-end">
              <button
                type="submit"
                disabled={savingSec2}
                className="px-5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] disabled:bg-[#333] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                {savingSec2 ? "Saving..." : "Save Auction Rules"}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 3: Business Information */}
        <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <form onSubmit={handleSaveSec3} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-neutral-900 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-950/20 border border-amber-900/30 text-amber-500">
                <Building size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] font-serif">Business Information</h2>
                <p className="text-[10px] text-neutral-500">Last change: {getFormattedDate("platform_name")}</p>
              </div>
            </div>

            {sec3Errors.length > 0 && (
              <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-3 space-y-1">
                {sec3Errors.map((err, i) => (
                  <p key={i} className="text-[10px] text-red-400 flex items-center gap-1">
                    • {err}
                  </p>
                ))}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Platform Name
                  </label>
                  <input
                    type="text"
                    value={platformName}
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Tax ID / Registration
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Contact Support Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Support Phone
                  </label>
                  <input
                    type="text"
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">
                    Website domain URL
                  </label>
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full bg-[#161616] border border-neutral-900 focus:border-[#D4AF37] focus:outline-none text-[#FDFBF7] rounded-lg px-3 py-2 text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-900/60 flex justify-end">
              <button
                type="submit"
                disabled={savingSec3}
                className="px-5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] disabled:bg-[#333] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                {savingSec3 ? "Saving..." : "Save Business info"}
              </button>
            </div>
          </form>
        </div>

        {/* SECTION 4: Notifications Policy */}
        <div className="rounded-xl border border-neutral-900 bg-[#121212]/40 p-6 shadow-xl backdrop-blur-md flex flex-col justify-between">
          <form onSubmit={handleSaveSec4} className="space-y-4">
            <div className="flex items-center gap-3 border-b border-neutral-900 pb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-950/20 border border-amber-900/30 text-amber-500">
                <Bell size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] font-serif">Notifications Policy</h2>
                <p className="text-[10px] text-neutral-500">Last change: {getFormattedDate("email_notifications_enabled")}</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between p-2.5 bg-[#161616]/40 rounded-lg border border-neutral-900">
                <div>
                  <label className="block text-xs font-bold text-neutral-200">Email Notifications</label>
                  <span className="text-[9px] text-neutral-500">Outbound bidding, win, and invoice alerts</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotificationsEnabled}
                    onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 peer-checked:after:bg-[#D4AF37] after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-950/40 peer-checked:border peer-checked:border-amber-800/60"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#161616]/40 rounded-lg border border-neutral-900 opacity-60">
                <div>
                  <label className="block text-xs font-bold text-neutral-400">SMS Notifications <span className="text-[9px] font-semibold text-[#D4AF37] uppercase tracking-wider ml-1">Future</span></label>
                  <span className="text-[9px] text-neutral-500">Direct mobile text message bidding alerts</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={smsNotificationsEnabled}
                    onChange={(e) => setSmsNotificationsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 peer-checked:after:bg-[#D4AF37] after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-950/40 peer-checked:border peer-checked:border-amber-800/60"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-[#161616]/40 rounded-lg border border-neutral-900 opacity-60">
                <div>
                  <label className="block text-xs font-bold text-neutral-400">Slack Integration <span className="text-[9px] font-semibold text-[#D4AF37] uppercase tracking-wider ml-1">Future</span></label>
                  <span className="text-[9px] text-neutral-500">Sync audit trails directly to Slack channels</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={slackIntegrationEnabled}
                    onChange={(e) => setSlackIntegrationEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 peer-checked:after:bg-[#D4AF37] after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-950/40 peer-checked:border peer-checked:border-amber-800/60"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-900/60 flex justify-end">
              <button
                type="submit"
                disabled={savingSec4}
                className="px-5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] disabled:bg-[#333] text-white text-xs font-semibold uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                {savingSec4 ? "Saving..." : "Save Policies"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
