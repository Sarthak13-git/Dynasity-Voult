"use client";

import { useState } from "react";
import { Save, AlertCircle } from "lucide-react";

export default function SellerSettingsPage() {
  const [formData, setFormData] = useState({
    storeName: "PANDORA Seller",
    email: "seller@pandora.com",
    phone: "+1 (555) 123-4567",
    description:
      "Premium antique dealer specializing in vintage timepieces and rare manuscripts.",
    bankAccount: "****-****-****-4242",
    taxId: "12-3456789",
  });

  const [saved, setSaved] = useState(false);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
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
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              />
              <p className="mt-2 text-xs text-gray-500">
                Buyers will contact you using this email
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
              <input
                type="text"
                name="bankAccount"
                value={formData.bankAccount}
                onChange={handleInputChange}
                disabled
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 bg-gray-50 cursor-not-allowed"
              />
              <p className="mt-2 text-xs text-gray-500">
                To change your bank account, visit
                <a href="#" className="text-pandora-charcoal hover:underline ml-1">
                  payment settings
                </a>
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
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
              />
              <p className="mt-2 text-xs text-gray-500">
                Required for tax reporting
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
                  Participate in PANDORA auctions
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Allow PANDORA to feature your products in auctions
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg bg-pandora-charcoal px-6 py-2 font-semibold text-white hover:bg-pandora-charcoal/80 transition-colors text-sm"
          >
            <Save className="h-5 w-5" />
            Save Changes
          </button>
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-900 hover:bg-gray-50 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
