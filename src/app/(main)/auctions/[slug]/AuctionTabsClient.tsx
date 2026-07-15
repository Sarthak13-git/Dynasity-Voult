"use client";

import { useState } from "react";
import { FileText, Clock, History, FileCheck } from "lucide-react";

interface Bid {
  id: string;
  amount: number;
  created_at: string;
  profiles: { display_name: string | null; email: string } | null;
}

interface Doc {
  id: string;
  name: string;
  document_type: string;
  file_url: string;
}

export default function AuctionTabsClient({
  description,
  provenance,
  conditionReport,
  bids,
  documents,
}: {
  description: string;
  provenance: string;
  conditionReport: string;
  bids: Bid[];
  documents: Doc[];
}) {
  const [activeTab, setActiveTab] = useState<"description" | "provenance" | "condition" | "bids" | "documents">(
    "description"
  );

  return (
    <div className="w-full max-w-[1200px] mx-auto px-6 py-12">
      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4 mb-8">
        {[
          { key: "description", label: "Description" },
          { key: "provenance", label: "History & Provenance" },
          { key: "condition", label: "Condition Report" },
          { key: "bids", label: `Bid History (${bids.length})` },
          { key: "documents", label: `Documentation (${documents.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-6 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all border-b-2 ${
              activeTab === tab.key
                ? "border-pandora-gold-light text-pandora-gold-light"
                : "border-transparent text-white/50 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[250px] bg-white/5 border border-white/10 rounded-xl p-8 backdrop-blur-sm">
        {activeTab === "description" && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-medium text-white mb-4">Product Overview</h3>
            <p className="text-[15px] leading-relaxed text-white/70 whitespace-pre-wrap">{description || "No description provided."}</p>
          </div>
        )}

        {activeTab === "provenance" && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-medium text-white mb-4">Provenance & Ownership History</h3>
            <p className="text-[15px] leading-relaxed text-white/70 whitespace-pre-wrap">{provenance || "No ownership records recorded."}</p>
          </div>
        )}

        {activeTab === "condition" && (
          <div className="space-y-4">
            <h3 className="font-serif text-2xl font-medium text-white mb-4">Physical Condition & Preservation Report</h3>
            <p className="text-[15px] leading-relaxed text-white/70 whitespace-pre-wrap">{conditionReport || "No physical alterations or restorations declared."}</p>
          </div>
        )}

        {activeTab === "bids" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-pandora-gold-light" />
              <h3 className="font-serif text-2xl font-medium text-white">Full Bidding Logs</h3>
            </div>

            {bids.length === 0 ? (
              <p className="text-[14px] text-white/40 italic font-serif">No bids have been entered on this lot.</p>
            ) : (
              <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {bids.map((bid, idx) => {
                  const bidderName = bid.profiles?.display_name || bid.profiles?.email?.split("@")[0] || "Anonymous";
                  return (
                    <div key={bid.id} className="flex justify-between py-4 items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-[11px] font-bold text-white/20">#{bids.length - idx}</span>
                        <div>
                          <p className={`font-serif text-base ${idx === 0 ? "text-pandora-gold-light font-medium" : "text-white"}`}>
                            {bidderName}
                          </p>
                          <span className="text-[10px] text-white/40 block mt-1">
                            {new Date(bid.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <span className={`font-serif text-lg ${idx === 0 ? "text-pandora-gold-light font-semibold" : "text-white/70"}`}>
                        ${bid.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <FileCheck size={18} className="text-pandora-gold-light" />
              <h3 className="font-serif text-2xl font-medium text-white">Verified Documentation</h3>
            </div>

            {documents.length === 0 ? (
              <p className="text-[14px] text-white/40 italic font-serif">No certificates or reports uploaded for this lot.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-4 p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-all group"
                  >
                    <FileText size={24} className="text-[#B8860B] group-hover:scale-105 transition-transform" />
                    <div>
                      <p className="font-semibold text-sm text-white group-hover:text-pandora-gold-light transition-colors">
                        {doc.name || "Supporting Certificate"}
                      </p>
                      <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded uppercase tracking-wider inline-block mt-2 font-medium">
                        {doc.document_type}
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
