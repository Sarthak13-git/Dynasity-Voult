"use client";

import { useEffect, useState } from "react";
import { Save, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SellerSettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showBankAccount, setShowBankAccount] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [formData, setFormData] = useState({
    storeName: "",
    email: "",
    phone: "",
    description: "",
    bankAccount: "",
    taxId: "",
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("You must be logged in to view settings.");
          setLoading(false);
          return;
        }
        setUserId(session.user.id);

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("store_name, email, phone, store_description, bank_account, tax_id")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (profile) {
          setFormData({
            storeName: profile.store_name || "",
            email: profile.email || session.user.email || "",
            phone: profile.phone || "",
            description: profile.store_description || "",
            bankAccount: profile.bank_account || "",
            taxId: profile.tax_id || "",
          });
        }
      } catch (err: any) {
        console.error("Error fetching seller profile:", err);
        setError(err.message || "Failed to load seller settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [supabase]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsConfirmOpen(false);
    if (!userId) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          store_name: formData.storeName.trim(),
          store_description: formData.description.trim(),
          phone: formData.phone.trim(),
          bank_account: formData.bankAccount.trim(),
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error("Error updating seller profile:", err);
      setError(err.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-pandora-charcoal" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Store Settings
        </h2>
        <p className="text-sm text-gray-600">
          Manage your seller profile and business information
        </p>
      </div>

      {/* Success Message */}
      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-800">
            ✓ Settings saved successfully!
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleFormSubmit} className="space-y-8">
        {/* Store Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Store Information
          </h3>

          <div className="space-y-6">
            {/* Store Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Store Name
              </label>
              <input
                type="text"
                name="storeName"
                value={formData.storeName}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Store Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors resize-none"
              />
              <p className="mt-2 text-xs text-gray-500">
                This appears on your seller profile page
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Contact Information
          </h3>

          <div className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 bg-gray-50 cursor-not-allowed"
              />
              <p className="mt-2 text-xs text-gray-500">
                Email is synced with your login account.
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Payment Information
          </h3>

          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              Your payment information is securely stored. We never share it with
              buyers.
            </p>
          </div>

          <div className="space-y-6">
            {/* Bank Account */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Bank Account
              </label>
              <div className="relative">
                <input
                  type={showBankAccount ? "text" : "password"}
                  name="bankAccount"
                  value={formData.bankAccount}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-gray-300 pl-4 pr-12 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowBankAccount(!showBankAccount)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showBankAccount ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                You can edit your bank account above. Click the eye icon to show or hide the value.
              </p>
            </div>

            {/* Tax ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Tax ID
              </label>
              <input
                type="text"
                name="taxId"
                value={formData.taxId}
                disabled
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 bg-gray-50 cursor-not-allowed"
              />
              <p className="mt-2 text-xs text-gray-500">
                Tax ID is locked and cannot be changed.
              </p>
            </div>
          </div>
        </div>

        {/* Seller Policies */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Seller Policies
          </h3>

          <div className="space-y-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 rounded border-gray-300 text-pandora-charcoal"
              />
              <div>
                <p className="font-medium text-gray-900">
                  Accept buyer inquiries
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Allow buyers to send you questions about your products
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 rounded border-gray-300 text-pandora-charcoal"
              />
              <div>
                <p className="font-medium text-gray-900">
                  Accept return requests
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Allow buyers to request returns within 30 days
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 rounded border-gray-300 text-pandora-charcoal"
              />
              <div>
                <p className="font-medium text-gray-900">
                  Participate in Dynasity-Voult auctions
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Allow Dynasity-Voult to feature your products in auctions
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-pandora-charcoal px-6 py-2 font-semibold text-white hover:bg-pandora-charcoal/80 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-900 hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Save Store Settings?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to apply these changes to your store profile? This information will be updated across the platform.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="rounded-lg bg-pandora-charcoal px-4 py-2 text-sm font-medium text-white hover:bg-pandora-charcoal/90 transition-colors"
              >
                Yes, Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
