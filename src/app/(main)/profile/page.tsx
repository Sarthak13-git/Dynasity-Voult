"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  ShoppingBag, 
  Settings, 
  LogOut, 
  Loader2, 
  Edit3, 
  Save, 
  X, 
  Building,
  DollarSign,
  KeyRound
} from "lucide-react";
import Link from "next/link";

function maskSensitiveValue(value: string | null | undefined): string {
  if (!value) return "";
  if (value.length <= 4) return "••••" + value;
  return "••••••••" + value.slice(-4);
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storeDescription, setStoreDescription] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);

        // 1. Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.push("/login");
          return;
        }

        // 2. Get profile details
        const { data: userProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileError || !userProfile) {
          setError(profileError?.message || "Failed to load user profile");
          return;
        }

        setProfile(userProfile);
        setDisplayName(userProfile.display_name || "");
        setPhone(userProfile.phone || "");
        setStoreName(userProfile.store_name || "");
        setStoreDescription(userProfile.store_description || "");
        setBankAccount(maskSensitiveValue(userProfile.bank_account));
      } catch (err: any) {
        console.error("Error loading profile details:", err);
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [supabase, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const resolvedBankAccount = bankAccount.startsWith("••••") ? profile.bank_account : bankAccount;

      // Prepare payload
      const payload: any = {
        display_name: displayName,
        phone: phone,
      };

      // If user is a seller, save store info
      const isSeller = profile.role === "seller" || profile.role === "admin";
      if (isSeller) {
        payload.store_name = storeName;
        payload.store_description = storeDescription;
        payload.bank_account = resolvedBankAccount;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(payload)
        .eq("id", profile.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update local state
      const updatedProfile = { ...profile, ...payload };
      setProfile(updatedProfile);
      setBankAccount(maskSensitiveValue(resolvedBankAccount));
      setIsEditing(false);
      setSuccess("Profile details updated successfully!");
      
      // Clear success notification after 3s
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      console.error("Error updating profile details:", err);
      setError(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error("Error signing out:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-pandora-ivory pt-24">
        <Loader2 className="h-8 w-8 animate-spin text-pandora-gold" />
        <p className="mt-4 text-pandora-gray font-serif tracking-widest text-sm">Loading Profile Details...</p>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center min-h-screen bg-pandora-ivory pt-24">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-serif font-semibold text-pandora-charcoal">Error Loading Profile</h2>
        <p className="text-sm text-pandora-gray mt-2">{error}</p>
        {error?.toLowerCase().includes("jwt") ? (
          <button 
            onClick={() => router.push("/login")}
            className="mt-6 px-6 py-2.5 bg-pandora-charcoal text-white hover:bg-pandora-gold transition-colors text-xs font-semibold uppercase tracking-widest"
          >
            Login Again
          </button>
        ) : (
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2.5 bg-pandora-charcoal text-white hover:bg-pandora-gold transition-colors text-xs font-semibold uppercase tracking-widest"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  const isSeller = profile.role === "seller" || profile.role === "admin";
  const userInitials = (displayName || profile.email || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-pandora-ivory pt-24 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
        
        {/* Hero Banner Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pandora-charcoal via-pandora-charcoal-light to-pandora-charcoal p-8 md:p-12 border border-pandora-gold/20 shadow-2xl">
          <div className="absolute right-0 top-0 h-48 w-48 bg-gradient-to-br from-pandora-gold/10 to-transparent blur-3xl rounded-full" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              {/* Initials Avatar */}
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-pandora-gold bg-pandora-charcoal-light text-pandora-gold font-serif text-3xl font-bold shadow-[0_0_20px_rgba(184,134,11,0.2)]">
                {userInitials}
              </div>
              
              <div className="space-y-2">
                <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-wide text-white">
                  {profile.display_name || "Buyer User"}
                </h1>
                <p className="text-sm text-pandora-gray-light">{profile.email}</p>
                <div className="text-[12px] text-pandora-gray-light/85 flex items-center justify-center md:justify-start gap-1">
                  <Calendar size={13} />
                  <span>
                    Member since {new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mt-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    profile.role === "admin" 
                      ? "bg-pandora-gold/25 text-pandora-gold-light border border-pandora-gold/30" 
                      : profile.role === "seller"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-gray-100 text-gray-700 border border-gray-200"
                  }`}>
                    <ShieldCheck size={10} />
                    {profile.role === "admin" ? "Admin" : profile.role === "seller" ? "Seller" : "Buyer"}
                  </span>
                  
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    profile.status === "active" || !profile.status
                      ? "bg-emerald-100/10 text-emerald-500 border border-emerald-500/20"
                      : "bg-rose-100/10 text-rose-500 border border-rose-500/20"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${profile.status === "active" || !profile.status ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                    {profile.status === "active" || !profile.status ? "Active" : "Suspended"}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Profile Button */}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 rounded-full border border-pandora-gold bg-transparent px-6 py-3 text-xs font-semibold uppercase tracking-wider text-pandora-gold-light transition-all hover:bg-pandora-gold hover:text-white cursor-pointer"
              >
                <Edit3 size={14} />
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Status Alerts */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-fade-in">
            <span>✅</span>
            {success}
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-fade-in">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Main Grid Content */}
        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="md:col-span-2 space-y-6">
            
            {/* Personal Details Card */}
            <div className="rounded-xl border border-pandora-cream bg-white p-6 shadow-sm">
              <h2 className="font-serif text-xl font-medium text-pandora-charcoal border-b border-pandora-cream pb-3 mb-5">
                Personal Information
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-pandora-gray">
                    Full Display Name
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-pandora-cream bg-white py-3 px-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none disabled:bg-gray-50/50 disabled:text-pandora-gray transition-colors"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-pandora-gray">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-pandora-cream bg-white py-3 px-4 text-sm text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none disabled:bg-gray-50/50 disabled:text-pandora-gray transition-colors"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-pandora-gray">
                    Email Address (Linked Account)
                  </label>
                  <div className="relative mt-1.5">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light" />
                    <input
                      type="email"
                      disabled
                      value={profile.email}
                      className="w-full rounded-lg border border-pandora-cream bg-gray-50/80 py-3 pl-11 pr-4 text-sm text-pandora-gray cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seller Hub Details Card */}
            {isSeller && (
              <div className="rounded-xl border border-pandora-cream bg-white p-6 shadow-sm">
                <h2 className="font-serif text-xl font-medium text-pandora-charcoal border-b border-pandora-cream pb-3 mb-5 flex items-center gap-2">
                  <Building size={18} className="text-pandora-gold" />
                  Seller Hub Credentials
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-pandora-gray">
                      Store Name
                    </label>
                    <input
                      type="text"
                      disabled={!isEditing}
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-pandora-cream bg-white py-3 px-4 text-sm text-pandora-charcoal focus:border-pandora-gold focus:outline-none disabled:bg-gray-50/50 disabled:text-pandora-gray transition-colors"
                      placeholder="e.g. Byzantine Legacy Gallery"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-pandora-gray">
                      Store Description
                    </label>
                    <textarea
                      disabled={!isEditing}
                      value={storeDescription}
                      onChange={(e) => setStoreDescription(e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full rounded-lg border border-pandora-cream bg-white py-3 px-4 text-sm text-pandora-charcoal focus:border-pandora-gold focus:outline-none disabled:bg-gray-50/50 disabled:text-pandora-gray transition-colors resize-none"
                      placeholder="Tell buyers about your specialized artifact inventory..."
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-pandora-gray">
                      Bank Account / Stripe Connected Account
                    </label>
                    <div className="relative mt-1.5">
                      <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light" />
                      <input
                        type={isEditing ? "password" : "text"}
                        disabled={!isEditing}
                        value={bankAccount}
                        onChange={(e) => setBankAccount(e.target.value)}
                        className="w-full rounded-lg border border-pandora-cream bg-white py-3 pl-11 pr-4 text-sm text-pandora-charcoal focus:border-pandora-gold focus:outline-none disabled:bg-gray-50/50 disabled:text-pandora-gray transition-colors"
                        placeholder="acct_..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-pandora-gray">
                      Tax Identification Number (Tax ID)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={maskSensitiveValue(profile.tax_id) || "Unspecified"}
                      className="mt-1.5 w-full rounded-lg border border-pandora-cream bg-gray-50/80 py-3 px-4 text-sm text-pandora-gray cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Save Buttons Panel */}
            {isEditing && (
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-pandora-charcoal px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-pandora-gold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Save Changes
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                    setSuccess(null);
                    // Reset fields
                    setDisplayName(profile.display_name || "");
                    setPhone(profile.phone || "");
                    setStoreName(profile.store_name || "");
                    setStoreDescription(profile.store_description || "");
                    setBankAccount(profile.bank_account || "");
                  }}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <X size={14} />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions / Navigation Sidebar Panel */}
          <div className="space-y-6">
            <div className="rounded-xl border border-pandora-cream bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-medium text-pandora-charcoal border-b border-pandora-cream pb-3">
                Quick Navigation
              </h3>
              
              <div className="flex flex-col gap-3">
                <Link
                  href="/buyer/orders"
                  className="flex items-center justify-between rounded-lg border border-pandora-cream bg-pandora-cream/5 p-4 transition-all hover:bg-pandora-cream/15 hover:border-pandora-gold/30 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pandora-cream/50 text-pandora-charcoal">
                      <ShoppingBag size={18} strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-pandora-charcoal">My Orders</p>
                      <p className="text-[11px] text-pandora-gray">Track your purchases</p>
                    </div>
                  </div>
                </Link>

                {isSeller && (
                  <Link
                    href="/seller"
                    className="flex items-center justify-between rounded-lg border border-pandora-cream bg-pandora-cream/5 p-4 transition-all hover:bg-pandora-cream/15 hover:border-pandora-gold/30 hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pandora-cream/50 text-pandora-charcoal">
                        <Building size={18} strokeWidth={1.5} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-pandora-charcoal">Seller Hub</p>
                        <p className="text-[11px] text-pandora-gray">Manage items & listings</p>
                      </div>
                    </div>
                  </Link>
                )}

                {profile.role === "admin" && (
                  <Link
                    href="/admin/analytics"
                    className="flex items-center justify-between rounded-lg border border-pandora-cream bg-pandora-cream/5 p-4 transition-all hover:bg-pandora-cream/15 hover:border-pandora-gold/30 hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pandora-cream/50 text-pandora-charcoal">
                        <Settings size={18} strokeWidth={1.5} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-pandora-charcoal">Admin Panel</p>
                        <p className="text-[11px] text-pandora-gray">Full portal overview</p>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Settings Link based on role */}
                {profile.role !== "admin" && isSeller ? (
                  <Link
                    href="/seller/settings"
                    className="flex items-center justify-between rounded-lg border border-pandora-cream bg-pandora-cream/5 p-4 transition-all hover:bg-pandora-cream/15 hover:border-pandora-gold/30 hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pandora-cream/50 text-pandora-charcoal">
                        <Settings size={18} strokeWidth={1.5} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-pandora-charcoal">Store Settings</p>
                        <p className="text-[11px] text-pandora-gray">Manage seller variables</p>
                      </div>
                    </div>
                  </Link>
                ) : null}

                <Link
                  href="/reset"
                  className="flex items-center justify-between rounded-lg border border-pandora-cream bg-pandora-cream/5 p-4 transition-all hover:bg-pandora-cream/15 hover:border-pandora-gold/30 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pandora-cream/50 text-pandora-charcoal">
                      <KeyRound size={18} strokeWidth={1.5} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-pandora-charcoal">Reset Password</p>
                      <p className="text-[11px] text-pandora-gray">Change account password</p>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="pt-4 border-t border-pandora-cream">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 py-3.5 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}
