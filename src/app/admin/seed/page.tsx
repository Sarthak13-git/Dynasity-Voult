"use client";

import { useState } from "react";

export default function SeedPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/seed/artifacts", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to seed database");
      }

      setResult(data);
      console.log("✅ Database seeded successfully:", data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("❌ Seed error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            🌱 Database Seed Manager
          </h1>

          <p className="text-slate-300 mb-6">
            Click the button below to add all sample products (artifacts) to your Supabase database. 
            This will insert artifacts from your <code className="bg-slate-900 px-2 py-1 rounded">buy-data.ts</code> file.
          </p>

          <div className="bg-slate-900 p-4 rounded mb-6 border border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">📋 What will be added:</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>✓ All artifacts from buyItems (10 items)</li>
              <li>✓ Full descriptions and metadata</li>
              <li>✓ Images and pricing information</li>
              <li>✓ Category classification</li>
            </ul>
          </div>

          <button
            onClick={handleSeed}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-4 rounded-lg mb-6 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? "🔄 Seeding..." : "🚀 Add Products to Database"}
          </button>

          {result && (
            <div className="bg-green-900/20 border border-green-700 rounded p-4 mb-4">
              <h3 className="text-green-400 font-semibold mb-2">✅ Success!</h3>
              <p className="text-green-300 text-sm mb-2">{result.message}</p>
              <details className="text-xs text-green-300 cursor-pointer">
                <summary>View Details ({result.count} items)</summary>
                <pre className="mt-2 bg-slate-900 p-2 rounded overflow-auto max-h-48">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded p-4 mb-4">
              <h3 className="text-red-400 font-semibold mb-2">❌ Error</h3>
              <p className="text-red-300 text-sm">{error}</p>
              <p className="text-red-300/70 text-xs mt-2">
                Make sure:
                <ul className="list-disc list-inside mt-1">
                  <li>Your .env.local has correct Supabase credentials</li>
                  <li>Your Supabase schema is applied</li>
                  <li>You have proper permissions</li>
                </ul>
              </p>
            </div>
          )}

          <div className="bg-slate-900/50 border border-slate-700 rounded p-4 text-sm text-slate-400">
            <h4 className="font-semibold text-slate-300 mb-2">ℹ️ Info:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Check <code className="bg-slate-800 px-1 rounded">.env.local</code> for Supabase connection</li>
              <li>• Products will be marked as "available"</li>
              <li>• You can manage products in the database later</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
