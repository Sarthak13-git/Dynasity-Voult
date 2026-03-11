"use client";

import { Save } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your platform settings
        </p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">General</h2>
          <p className="mt-1 text-sm text-gray-500">
            Basic platform configuration
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Platform Name
              </label>
              <input
                type="text"
                defaultValue="PANDORA"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Contact Email
              </label>
              <input
                type="email"
                defaultValue="contact@pandora.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Default Currency
              </label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                <option>USD ($)</option>
                <option>EUR (€)</option>
                <option>GBP (£)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Timezone
              </label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                <option>IST (UTC+5:30)</option>
                <option>EST (UTC-5)</option>
                <option>CET (UTC+1)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Auction Settings */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            Auction Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Default auction configuration
          </p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Default Auction Duration
              </label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                <option>24 hours</option>
                <option>48 hours</option>
                <option>7 days</option>
                <option>14 days</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Minimum Bid Increment
              </label>
              <input
                type="text"
                defaultValue="$200"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Buyer&apos;s Premium (%)
              </label>
              <input
                type="text"
                defaultValue="15"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Auto-extend on Last-Minute Bid
              </label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                <option>Yes — extend by 20 seconds</option>
                <option>No</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">
            Notifications
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Email and notification preferences
          </p>
          <div className="mt-6 space-y-4">
            {[
              "Send email on new bid",
              "Send email when auction ends",
              "Notify admin on new user registration",
              "Weekly analytics report",
            ].map((label) => (
              <label
                key={label}
                className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3"
              >
                <span className="text-sm text-gray-700">{label}</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 accent-pandora-charcoal"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button className="flex items-center gap-2 rounded-lg bg-pandora-charcoal px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700">
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
