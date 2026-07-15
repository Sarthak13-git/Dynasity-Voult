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
  ExternalLink,
  ShieldCheck,
  X
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
  stripe_transfer_id: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
  processed_at: string | null;
  notes: string | null;
}

export default function SellerPaymentsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // 1. Authenticate session user
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace("/login?redirect=/seller/payments");
          return;
        }

        // 2. Query earnings and payouts concurrently (RLS keeps this secure to user)
        const [earnRes, payRes] = await Promise.all([
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
            .order("created_at", { ascending: false })
        ]);

        if (earnRes.error) throw earnRes.error;
        if (payRes.error) throw payRes.error;

        const mappedEarnings: EarningRecord[] = (earnRes.data || []).map((e: any) => {
          const art = Array.isArray(e.artifacts) ? e.artifacts[0] : e.artifacts;
          return {
            id: e.id,
            gross_amount: Number(e.gross_amount),
            commission_amount: Number(e.commission_amount),
            net_amount: Number(e.net_amount),
            earning_type: e.earning_type,
            created_at: e.created_at,
            payout_id: e.payout_id,
            artifacts: art ? { title: String(art.title) } : null
          };
        });
        setEarnings(mappedEarnings);

        // Format and set payouts records safely
        const mappedPayouts: PayoutRecord[] = (payRes.data || []).map((p: any) => ({
          id: p.id,
          amount: Number(p.amount),
          currency: String(p.currency),
          status: p.status,
          stripe_transfer_id: p.stripe_transfer_id || null,
          period_start: p.period_start,
          period_end: p.period_end,
          created_at: p.created_at,
          processed_at: p.processed_at,
          notes: p.notes
        }));
        setPayouts(mappedPayouts);
      } catch (err: any) {
        console.error("❌ Error querying seller settlement ledger:", err);
        setError(err.message || "Failed to query settlement records.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase, router]);

  // Aggregate Calculations
  const totalGross = earnings.reduce((acc, curr) => acc + Number(curr.gross_amount), 0);
  const totalFees = earnings.reduce((acc, curr) => acc + Number(curr.commission_amount), 0);
  const totalNet = earnings.reduce((acc, curr) => acc + Number(curr.net_amount), 0);

  // Withdrawable Balance: net amount of earnings that have not been assigned to a payout record yet
  const withdrawableBalance = earnings
    .filter((e) => !e.payout_id)
    .reduce((acc, curr) => acc + Number(curr.net_amount), 0);

  // Payout statuses checks
  const paidAmount = payouts
    .filter((p) => p.status === "completed")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const processingAmount = payouts
    .filter((p) => p.status === "processing")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const pendingPayoutAmount = payouts
    .filter((p) => p.status === "pending")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const failedPayoutAmount = payouts
    .filter((p) => p.status === "failed")
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const formatPrice = (val: number) => {
    return val.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "processing":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-100";
      default:
        return "bg-rose-50 text-rose-700 border-rose-100";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] flex items-center justify-center pt-24">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 text-[#B8860B] animate-spin mx-auto" />
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Introspecting Settlement Ledger...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1A1A1A] pt-32 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">

        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-[#E8E2D9] pb-8 mb-12 gap-4">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight mb-2">
              Settlements & Payments
            </h1>
            <p className="text-sm text-gray-500 uppercase tracking-widest">
              Seller Custody Accounts & Payout Ledger
            </p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="flex items-center gap-1.5 px-4 py-2 border border-[#E8E2D9] bg-white text-xs font-semibold uppercase tracking-wider hover:bg-gray-50 transition-colors rounded-md shadow-sm"
          >
            <RefreshCw size={14} />
            Refresh Accounts
          </button>
        </div>

        {error && (
          <div className="mb-8 border border-rose-200 bg-rose-50 text-rose-800 text-sm px-4 py-3 rounded-lg flex items-center gap-3 font-medium">
            <AlertCircle size={18} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Overview Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {/* Card 1: Withdrawable Balance */}
          <div className="bg-white border border-[#E8E2D9] p-6 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Withdrawable Balance</span>
              <Wallet className="h-5 w-5 text-[#B8860B]" />
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-[#B8860B]">{formatPrice(withdrawableBalance)}</p>
              <p className="text-[10px] text-gray-500 mt-1">Net earnings awaiting admin payout request batch</p>
            </div>
          </div>

          {/* Card 2: Net Earnings */}
          <div className="bg-white border border-[#E8E2D9] p-6 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Net Earnings</span>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-gray-900">{formatPrice(totalNet)}</p>
              <p className="text-[10px] text-gray-500 mt-1">Platform commission fee: {formatPrice(totalFees)}</p>
            </div>
          </div>

          {/* Card 3: Processing Settlements */}
          <div className="bg-white border border-[#E8E2D9] p-6 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Processing Settlements</span>
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-gray-900">{formatPrice(processingAmount)}</p>
              <p className="text-[10px] text-gray-500 mt-1">Pending: {formatPrice(pendingPayoutAmount)}</p>
            </div>
          </div>

          {/* Card 4: Paid Payouts */}
          <div className="bg-white border border-[#E8E2D9] p-6 rounded-lg shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Paid Out</span>
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-3xl font-serif font-bold text-emerald-700">{formatPrice(paidAmount)}</p>
              <p className="text-[10px] text-rose-500 mt-1">Failed Payouts: {formatPrice(failedPayoutAmount)}</p>
            </div>
          </div>
        </div>

        {/* Dynamic Ledger Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT: Withdrawal History */}
          <div className="lg:col-span-2 bg-white border border-[#E8E2D9] p-6 rounded-lg shadow-sm">
            <div className="border-b border-[#E8E2D9] pb-4 mb-6">
              <h2 className="font-serif text-xl font-medium text-gray-900">Withdrawal History</h2>
              <p className="text-xs text-gray-400 mt-1">Complete statement of payouts processed and Stripe transfers</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <th className="pb-3">Transfer Period</th>
                    <th className="pb-3">Payout Amount</th>
                    <th className="pb-3">Requested On</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 font-medium text-gray-800">
                        {new Date(p.period_start).toLocaleDateString()} &mdash; {new Date(p.period_end).toLocaleDateString()}
                      </td>
                      <td className="py-4 font-serif font-bold text-gray-900">
                        {formatPrice(Number(p.amount))}
                      </td>
                      <td className="py-4 text-gray-500">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getStatusBadge(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => setSelectedPayout(p)}
                          className="px-2.5 py-1.5 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors text-[10px] font-bold uppercase tracking-wider rounded"
                        >
                          View Log
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-sm text-gray-400 italic">
                        No historical payouts recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: Upcoming Settlements & Earnings ledger */}
          <div className="space-y-6">
            
            {/* Upcoming Settlements Banner */}
            <div className="bg-[#FAF8F5] border border-[#E8E2D9] p-6 rounded-lg shadow-sm">
              <h3 className="font-serif text-lg font-medium text-gray-900 mb-2">Upcoming Settlements</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Payout calculations are generated dynamically based on active order balances. Pending balances will move to processed status once approved by the curation administrator.
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200">
                  <span className="text-gray-500">Pending Approvals</span>
                  <span className="font-bold text-gray-900">{formatPrice(pendingPayoutAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-gray-200">
                  <span className="text-gray-500">Processing Queue</span>
                  <span className="font-bold text-blue-700">{formatPrice(processingAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold pt-1">
                  <span className="text-gray-800">Total Settlement Balance</span>
                  <span className="text-[#B8860B]">{formatPrice(pendingPayoutAmount + processingAmount)}</span>
                </div>
              </div>
            </div>

            {/* Platform Commission details */}
            <div className="bg-white border border-[#E8E2D9] p-6 rounded-lg shadow-sm">
              <h3 className="font-serif text-lg font-medium text-gray-900 mb-2">Platform Commision Rates</h3>
              <p className="text-xs text-gray-500 leading-relaxed mb-4">
                Platform fees are deducted automatically upon successful buyer credit transactions.
              </p>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Live Auction Hammer Commision:</span>
                  <span className="font-bold text-gray-800">10%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Direct Buy Marketplace Commision:</span>
                  <span className="font-bold text-gray-800">5%</span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Payout Details Modal Overlay */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#FDFBF7] border border-[#E8E2D9] rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="border-b border-[#E8E2D9] p-6 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#B8860B]" />
                <h2 className="font-serif text-lg font-medium text-gray-900">Payout Audit Log</h2>
              </div>
              <button 
                onClick={() => setSelectedPayout(null)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors border border-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-gray-700">
              <div className="bg-[#FAF8F5] border border-[#E8E2D9] p-4 rounded space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Payout ID:</span>
                  <span className="font-mono text-gray-800 select-all">{selectedPayout.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount Paid:</span>
                  <span className="font-serif font-bold text-gray-900">{formatPrice(Number(selectedPayout.amount))}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2.5 font-medium">
                  <span className="text-gray-500">Stripe Transfer ID:</span>
                  <span className="font-mono text-gray-800 select-all">{selectedPayout.stripe_transfer_id || "Manual Settlement"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Period Start:</span>
                  <span>{new Date(selectedPayout.period_start).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Period End:</span>
                  <span>{new Date(selectedPayout.period_end).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Created At:</span>
                  <span>{new Date(selectedPayout.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Processed At:</span>
                  <span>{selectedPayout.processed_at ? new Date(selectedPayout.processed_at).toLocaleString() : "Awaiting confirmation"}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-500">Transfer Status:</span>
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${getStatusBadge(selectedPayout.status)}`}>
                    {selectedPayout.status}
                  </span>
                </div>
              </div>

              {selectedPayout.notes && (
                <div className="bg-white border border-gray-200 rounded p-3 mt-4 space-y-1">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Settlement Notes</p>
                  <p className="text-[10px] text-gray-600 leading-normal italic whitespace-pre-wrap">{selectedPayout.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-[#E8E2D9] p-6 bg-white flex justify-end">
              <button
                onClick={() => setSelectedPayout(null)}
                className="px-5 py-2 bg-[#1A1A1A] text-white hover:bg-[#B8860B] transition-colors text-xs font-semibold uppercase tracking-wider rounded"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
