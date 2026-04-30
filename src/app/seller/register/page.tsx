"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function SellerRegistrationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    storeName: "",
    storeDescription: "",
    businessType: "individual",
    email: "",
    phone: "",
    bankAccountName: "",
    bankAccountNumber: "",
    taxId: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipCode: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Validate required fields
      if (
        !formData.storeName ||
        !formData.email ||
        !formData.phone ||
        !formData.bankAccountNumber ||
        !formData.taxId
      ) {
        throw new Error("Please fill in all required fields");
      }

      // Simulate API call to register seller
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Seller Registration Data:", formData);

      // Store seller info in localStorage (you can replace with API call)
      localStorage.setItem(
        "sellerInfo",
        JSON.stringify({ ...formData, registeredAt: new Date() })
      );

      setSuccess(true);

      // Redirect to seller dashboard after success
      setTimeout(() => {
        router.push("/seller");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="rounded-lg border border-green-200 bg-green-50 p-8 text-center max-w-md">
          <p className="text-lg font-semibold text-green-800 mb-2">
            ✓ Registration Successful!
          </p>
          <p className="text-sm text-green-700">
            Welcome to PANDORA Seller Hub. Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-pandora-charcoal hover:text-pandora-charcoal/80 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Register as PANDORA Seller
          </h1>
          <p className="text-gray-600">
            Join thousands of antique dealers selling on PANDORA. Complete your
            seller profile to get started.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Store Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Store Information
            </h2>

            <div className="space-y-6">
              {/* Store Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Store Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Vintage Heritage Antiques"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                />
              </div>

              {/* Store Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Store Description
                </label>
                <textarea
                  name="storeDescription"
                  value={formData.storeDescription}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder="Tell buyers about your store and specialties..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors resize-none"
                />
              </div>

              {/* Business Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Business Type
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                >
                  <option value="individual">Individual</option>
                  <option value="business">Business/Company</option>
                  <option value="museum">Museum/Institution</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Contact Information
            </h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="seller@example.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="+1 (555) 123-4567"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Payment Information
            </h2>

            <div className="space-y-6">
              {/* Bank Account Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Account Holder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="bankAccountName"
                  value={formData.bankAccountName}
                  onChange={handleInputChange}
                  required
                  placeholder="Name on bank account"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                />
              </div>

              {/* Bank Account Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Bank Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleInputChange}
                  required
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                />
              </div>

              {/* Tax ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tax ID / SSN <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="taxId"
                  value={formData.taxId}
                  onChange={handleInputChange}
                  required
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Address Information
            </h2>

            <div className="space-y-6">
              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                />
              </div>

              {/* City, State, Zip */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="New York"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="NY"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="10001"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleInputChange}
                  placeholder="United States"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400/30 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                required
                className="mt-1 rounded border-gray-300 text-pandora-charcoal"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  I agree to PANDORA Terms & Conditions
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  You accept our seller agreement and understand the policies
                  for selling on PANDORA
                </p>
              </div>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-pandora-charcoal px-6 py-3 font-semibold text-white hover:bg-pandora-charcoal/80 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Complete Registration"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
