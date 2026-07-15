"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DollarSign,
  TrendingUp,
  Wallet,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  Clock,
  Sparkles,
  ExternalLink
} from "lucide-react";

interface EarningRecord {
  id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  earning_type: "auction_win" | "direct_sale";
  created_at: string;
  payout_id: string | null;
  artifacts: { title: string } | null;
}

interface PayoutRecord {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  period_start: string;
  period_end: string;
  created_at: string;
  processed_at: string | null;
  notes: string | null;
}

export default function SellerEarningsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data States
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [auctionCommission, setAuctionCommission] = useState(10);
  const [directCommission, setDirectCommission] = useState(5);

  const triggerToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Authenticate user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push("/login?redirect=/seller/earnings");
          return;
        }

        // 2. Fetch seller's earnings and payouts (RLS filters to self automatically)
        const [
          { data: earnData, error: earnErr },
          { data: payData, error: payErr },
          { data: settingsData }
        ] = await Promise.all([
          supabase
            .from("seller_earnings")
            .select(`
              id,
              gross_amount,
              commission_amount,
              net_amount,
              earning_type,
              created_at,
              payout_id,
              artifacts:artifact_id (title)
            `)
            .order("created_at", { ascending: false }),
          supabase
            .from("payouts")
            .select("*")
            .order("created_at", { ascending: false }),
          supabase
            .from("platform_settings")
            .select("key, value")
        ]);

        if (earnErr) throw earnErr;
        if (payErr) throw payErr;

        setEarnings((earnData as any) || []);
        setPayouts((payData as any) || []);

        // Load commission settings
        if (settingsData) {
          settingsData.forEach((row) => {
            if (row.key === "auction_commission_rate") {
              try { setAuctionCommission(Number(JSON.parse(row.value))); } catch { setAuctionCommission(Number(row.value) || 10); }
            }
            if (row.key === "direct_sale_commission") {
              try { setDirectCommission(Number(JSON.parse(row.value))); } catch { setDirectCommission(Number(row.value) || 5); }
            }
          });
        }
      } catch (err: any) {
        console.error("❌ Error loading seller earnings:", err);
        setError(err.message || "Failed to load seller earnings details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router, supabase]);

  // Request payout handler
  const handleRequestPayout = async () => {
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/payouts", {
        method: "POST",
      });
      const json = await res.json();

      if (json.success) {
        triggerToast("success", json.message || "Your payout request has been submitted.");
        // Refresh page data
        window.location.reload();
      } else {
        triggerToast("error", json.error || "Failed to request payout.");
      }
    } catch (err: any) {
      triggerToast("error", err.message || "Payout request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculations
  const totalEarned = earnings.reduce((sum, e) => sum + Number(e.net_amount), 0);
  const availableToWithdraw = earnings
    .filter((e) => !e.payout_id)
    .reduce((sum, e) => sum + Number(e.net_amount), 0);

  const alreadyPaidOut = payouts
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center bg-[#0d0d0d] text-[#FDFBF7] rounded-2xl border border-neutral-900">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 text-[#D4AF37] animate-spin mx-auto" />
          <p className="text-sm font-medium tracking-wide text-gray-400">
            Synching house sales & balances ledger...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#0d0d0d] text-[#FDFBF7] rounded-2xl border border-red-900/50 space-y-4">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle size={28} />
          <h2 className="text-lg font-bold">Failed to load earnings ledger</h2>
        </div>
        <p className="text-sm text-gray-400">{error}</p>
        {error?.toLowerCase().includes("jwt") ? (
          <button
            onClick={() => router.push("/login?redirect=/seller/earnings")}
            className="px-5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg"
          >
            Login Again
          </button>
        ) : (
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-lg"
          >
            Retry Load
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 bg-[#0d0d0d] text-[#FDFBF7] p-8 rounded-2xl border border-neutral-900">
      {/* Toast Popup */}
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
            <span>Seller Hub Earnings</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-serif text-gradient-gold mt-1">
            My Earnings & Payout Ledger
          </h1>
          <p className="mt-1 text-xs text-neutral-400 font-medium">
            Monitor sales revenue, check platform commission rates, and request withdrawals to your bank account.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRequestPayout}
            disabled={isSubmitting || availableToWithdraw < 100}
            className="inline-flex items-center gap-2 rounded-lg bg-[#B8860B] hover:bg-[#D4AF37] disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-all shadow-md active:scale-95"
          >
            {isSubmitting ? "Requesting..." : "Request Payout"}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-neutral-900 bg-[#121212]/70 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a1a1a] border border-neutral-800 text-[#D4AF37]">
              <DollarSign size={18} />
            </div>
            <ArrowUpRight size={14} className="text-neutral-600" />
          </div>
          <p className="mt-4 text-2xl font-bold font-serif text-[#FDFBF7]">
            ${totalEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <h3 className="text-xs font-semibold text-neutral-200 mt-1">All-Time Net Income</h3>
          <p className="text-[10px] text-neutral-500 mt-0.5">Earnings after commission</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-amber-900/40 bg-[#121212]/70 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a1a1a] border border-neutral-800 text-amber-500">
              <Wallet size={18} />
            </div>
            <span className="text-[9px] uppercase tracking-wider bg-amber-950/20 border border-amber-900/30 text-amber-500 px-1.5 py-0.5 rounded font-bold">
              Min $100
            </span>
          </div>
          <p className="mt-4 text-2xl font-bold font-serif text-[#FDFBF7]">
            ${availableToWithdraw.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <h3 className="text-xs font-semibold text-neutral-200 mt-1">Available to Withdraw</h3>
          <p className="text-[10px] text-neutral-500 mt-0.5">Unpaid net earnings</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-neutral-900 bg-[#121212]/70 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a1a1a] border border-neutral-800 text-emerald-400">
              <CheckCircle size={18} />
            </div>
            <Clock size={14} className="text-neutral-600" />
          </div>
          <p className="mt-4 text-2xl font-bold font-serif text-[#FDFBF7]">
            ${alreadyPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <h3 className="text-xs font-semibold text-neutral-200 mt-1">Already Paid Out</h3>
          <p className="text-[10px] text-neutral-500 mt-0.5">Transferred to bank account</p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-neutral-900 bg-[#121212]/70 p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a1a1a] border border-neutral-800 text-purple-400">
              <TrendingUp size={18} />
            </div>
            <Sparkles size={14} className="text-neutral-600" />
          </div>
          <div className="mt-4 flex flex-col space-y-0.5">
            <span className="text-sm font-bold text-neutral-200 font-serif">Auctions: {auctionCommission}%</span>
            <span className="text-xs text-neutral-400">Direct Sales: {directCommission}%</span>
          </div>
          <h3 className="text-xs font-semibold text-neutral-200 mt-2">Platform commission</h3>
          <p className="text-[10px] text-neutral-500 mt-0.5">Collect rates on gross sales</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Earnings Table */}
        <div className="lg:col-span-3 rounded-xl border border-neutral-900 bg-[#121212]/40 p-5 shadow-xl backdrop-blur-md">
          <div className="border-b border-neutral-900 pb-3 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] font-serif">
              Ecosystem Revenue History
            </h3>
            <p className="text-[10px] text-neutral-500">Breakdown of gross and net proceeds from artifact sales</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-900 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  <th className="pb-2">Artifact Title</th>
                  <th className="pb-2">Sale Type</th>
                  <th className="pb-2">Gross</th>
                  <th className="pb-2">Net Income</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60">
                {earnings.map((earn) => (
                  <tr key={earn.id} className="text-xs hover:bg-[#161616]/30 transition-colors">
                    <td className="py-3 pr-2 truncate max-w-[160px] font-semibold text-gray-200">
                      {earn.artifacts?.title || "Heritage item"}
                    </td>
                    <td className="py-3">
                      <span className="capitalize text-neutral-400">
                        {earn.earning_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-neutral-300 font-mono">
                      ${Number(earn.gross_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-emerald-400 font-bold font-mono">
                      ${Number(earn.net_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right">
                      {earn.payout_id ? (
                        <span className="inline-flex rounded-full bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-950/20 border border-amber-900/30 text-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                          Withdrawable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {earnings.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-xs text-neutral-500">
                      No earning records captured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout History Table */}
        <div className="lg:col-span-2 rounded-xl border border-neutral-900 bg-[#121212]/40 p-5 shadow-xl backdrop-blur-md">
          <div className="border-b border-neutral-900 pb-3 mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#D4AF37] font-serif">
              Withdrawal & Payout History
            </h3>
            <p className="text-[10px] text-neutral-500">Track bank account transfers status and Stripe details</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-900 text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                  <th className="pb-2">Requested</th>
                  <th className="pb-2">Amount</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60 text-xs">
                {payouts.map((pay) => (
                  <tr key={pay.id} className="hover:bg-[#161616]/30 transition-colors">
                    <td className="py-3 text-neutral-400">
                      {new Date(pay.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 font-semibold text-neutral-200 font-mono">
                      ${Number(pay.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                          pay.status === "completed"
                            ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400"
                            : pay.status === "pending"
                            ? "bg-amber-950/20 border-amber-900/30 text-amber-500"
                            : pay.status === "processing"
                            ? "bg-blue-950/20 border-blue-900/30 text-blue-400"
                            : "bg-rose-950/20 border-rose-900/30 text-rose-400"
                        }`}
                        title={pay.notes || undefined}
                      >
                        {pay.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {payouts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-xs text-neutral-500">
                      No withdrawal requests captured yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
