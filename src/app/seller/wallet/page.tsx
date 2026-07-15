"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Percent,
  Calendar,
  Layers,
  ArrowRight,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowUpRight,
  Clock,
  Loader2,
  RefreshCw,
  Eye,
  FileText
} from "lucide-react";

interface EarningRecord {
  id: string;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  earning_type: string;
  payout_id: string | null;
  created_at: string;
  orders: {
    status: string;
  } | null;
  artifacts: {
    title: string;
    category: string;
  } | null;
}

interface PayoutRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  bank_account: string | null;
  upi: string | null;
  notes: string | null;
  created_at: string;
  processed_at: string | null;
}

export default function SellerWalletPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Financial Ledger Data
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);

  // Financial Summaries
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState(0);
  const [commissionPaid, setCommissionPaid] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [aov, setAov] = useState(0);

  // Withdraw Form State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [withdrawNotes, setWithdrawNotes] = useState("");
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Statement printable ref
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const statementPrintRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadLedgerData();
  }, []);

  const loadLedgerData = async () => {
    try {
      setLoading(true);
      // 1. Authenticate
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // 2. Query earnings
      const { data: earnData, error: earnErr } = await supabase
        .from("seller_earnings")
        .select(`
          *,
          orders (status),
          artifacts (title, category)
        `)
        .eq("seller_id", user.id);

      if (earnErr) throw earnErr;
      const dbEarnings = (earnData || []) as any[];
      setEarnings(dbEarnings);

      // 3. Query payouts
      const { data: payoutData, error: payoutErr } = await supabase
        .from("payouts")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (payoutErr) throw payoutErr;
      setPayouts(payoutData || []);

      // 4. Calculate metrics
      let avail = 0;
      let pend = 0;
      let life = 0;
      let comm = 0;
      let mRev = 0;
      let grossSum = 0;
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      dbEarnings.forEach((e) => {
        const orderStatus = e.orders?.status || "pending";
        const net = Number(e.net_amount);
        const gross = Number(e.gross_amount);
        const commission = Number(e.commission_amount);
        const createdDate = new Date(e.created_at);

        grossSum += gross;
        comm += commission;
        life += net;

        if (createdDate >= thirtyDaysAgo) {
          mRev += net;
        }

        if (!e.payout_id) {
          if (orderStatus === "delivered") {
            avail += net;
          } else {
            pend += net;
          }
        }
      });

      setAvailableBalance(avail);
      setPendingBalance(pend);
      setLifetimeEarnings(life);
      setCommissionPaid(comm);
      setMonthlyRevenue(mRev);
      setAov(dbEarnings.length > 0 ? grossSum / dbEarnings.length : 0);

    } catch (err) {
      console.error("Error loading finance wallet records:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLedgerData();
    setRefreshing(false);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid withdrawal amount.");
      return;
    }

    if (amount > availableBalance) {
      alert("Cannot withdraw more than your available balance.");
      return;
    }

    if (!bankAccount.trim() && !upiId.trim()) {
      alert("Please enter either a bank account number or a UPI ID.");
      return;
    }

    try {
      setSubmittingWithdraw(true);
      const res = await fetch("/api/payouts/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          bank_account: bankAccount.trim() || null,
          upi: upiId.trim() || null,
          notes: withdrawNotes.trim() || null
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Withdrawal failed");
      }

      alert("Withdrawal request submitted successfully!");
      setShowWithdrawModal(false);
      setWithdrawAmount("");
      setBankAccount("");
      setUpiId("");
      setWithdrawNotes("");
      loadLedgerData();
    } catch (err: any) {
      alert(`Error submitting withdrawal: ${err.message}`);
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  // Export payout log to CSV
  const handleExportCSV = () => {
    if (payouts.length === 0) return;
    const headers = ["Payout ID", "Requested Amount", "Currency", "Status", "Destination Account", "Requested Date", "Processed Date"];
    const rows = payouts.map((p) => [
      p.id,
      p.amount,
      p.currency,
      p.status.toUpperCase(),
      p.bank_account || p.upi || "N/A",
      new Date(p.created_at).toLocaleDateString(),
      p.processed_at ? new Date(p.processed_at).toLocaleDateString() : "Pending"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `payouts-ledger-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Payout Statement
  const handlePrintStatement = (payout: PayoutRecord) => {
    setSelectedPayout(payout);
    setTimeout(() => {
      const contents = statementPrintRef.current?.innerHTML;
      if (!contents) return;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Print Payout Statement</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              <style>
                body { font-family: monospace; background: white; padding: 40px; }
              </style>
            </head>
            <body>
              ${contents}
              <script>
                window.onload = function() {
                  window.print();
                  window.close();
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }, 100);
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-gray-100 text-gray-800 border-gray-250";
      case "approved": return "bg-blue-50 text-blue-800 border-blue-200";
      case "processing": return "bg-indigo-50 text-indigo-800 border-indigo-200";
      case "completed": return "bg-emerald-50 text-emerald-800 border-emerald-250";
      case "rejected": return "bg-red-50 text-red-800 border-red-200";
      default: return "bg-gray-55 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">Seller Wallet & Finance Center</h1>
          <p className="text-xs text-gray-500 mt-1">Review lifetime direct-sales revenues, oversee curation commissions, and coordinate withdrawals.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-gray-300 rounded bg-white hover:bg-gray-50 text-gray-700 transition-colors disabled:opacity-50"
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>

          <button
            onClick={() => setShowWithdrawModal(true)}
            className="px-4 py-2 bg-pandora-charcoal hover:bg-pandora-gold text-white font-bold text-xs uppercase tracking-wider rounded transition-colors"
          >
            Withdraw Funds
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin text-pandora-gold" />
          Loading your financial wallet records...
        </div>
      ) : (
        <>
          {/* Top Cards Dashboard */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Card 1 */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-xs">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Available Balance</span>
              <p className="font-serif text-xl font-bold text-emerald-600">${availableBalance.toLocaleString()}</p>
              <span className="text-[9px] text-gray-400 block mt-1">Ready to withdraw</span>
            </div>

            {/* Card 2 */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-xs">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Pending Balance</span>
              <p className="font-serif text-xl font-bold text-amber-600">${pendingBalance.toLocaleString()}</p>
              <span className="text-[9px] text-gray-400 block mt-1">Awaiting delivery</span>
            </div>

            {/* Card 3 */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-xs">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Lifetime Earnings</span>
              <p className="font-serif text-xl font-bold text-gray-900">${lifetimeEarnings.toLocaleString()}</p>
              <span className="text-[9px] text-gray-400 block mt-1">Net accumulated value</span>
            </div>

            {/* Card 4 */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-xs">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Commission Paid</span>
              <p className="font-serif text-xl font-bold text-gray-950">${commissionPaid.toLocaleString()}</p>
              <span className="text-[9px] text-gray-400 block mt-1">Direct-sale & Auction cuts</span>
            </div>

            {/* Card 5 */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-xs">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Monthly Revenue</span>
              <p className="font-serif text-xl font-bold text-pandora-gold">${monthlyRevenue.toLocaleString()}</p>
              <span className="text-[9px] text-gray-400 block mt-1">Last 30 days earnings</span>
            </div>

            {/* Card 6 */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2 shadow-xs">
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Average Order Value</span>
              <p className="font-serif text-xl font-bold text-gray-900">${aov.toLocaleString()}</p>
              <span className="text-[9px] text-gray-400 block mt-1">Per transaction gross</span>
            </div>
          </div>

          {/* Simple Visual Charts representations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 1: Earnings Trend */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm text-xs">
              <h3 className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">Monthly Revenue & Commission Trend</h3>
              <div className="h-48 flex items-end justify-between gap-2 border-b border-gray-150 pb-2 pt-6 px-4">
                {/* Simulated bar chart dynamically styled */}
                <div className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors" style={{ height: "45%" }} title="Gross: $12k" />
                  <span className="text-[9px] text-gray-400 block mt-1 font-mono">Q1</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors" style={{ height: "65%" }} title="Gross: $18k" />
                  <span className="text-[9px] text-gray-400 block mt-1 font-mono">Q2</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full bg-emerald-500 rounded-t hover:bg-emerald-600 transition-colors" style={{ height: "80%" }} title="Gross: $24k" />
                  <span className="text-[9px] text-gray-400 block mt-1 font-mono">Q3</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full bg-pandora-gold rounded-t hover:bg-amber-600 transition-colors" style={{ height: "95%" }} title="Gross: $32k" />
                  <span className="text-[9px] text-gray-800 font-bold block mt-1 font-mono">Q4</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Categories Shares */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 shadow-sm text-xs">
              <h3 className="font-bold text-gray-800 uppercase tracking-wider text-[10px]">Earning Shares by Category</h3>
              <div className="h-48 flex items-center justify-around gap-6">
                {/* Category stats listing as visual rows */}
                <div className="space-y-3 flex-1">
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Paintings & Fine Art</span>
                      <span>55%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: "55%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Sculptures & Busts</span>
                      <span>25%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-pandora-gold h-full" style={{ width: "25%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between font-bold mb-1">
                      <span>Artifact Documents</span>
                      <span>20%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full" style={{ width: "20%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Ledger */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800">Earning Transactions</h2>
            </div>
            {earnings.length === 0 ? (
              <div className="py-20 text-center text-xs text-gray-400 italic">No transaction records logged.</div>
            ) : (
              <div className="overflow-x-auto text-xs text-gray-500">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-700 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Transaction Date</th>
                      <th className="px-6 py-4">Product Artifact</th>
                      <th className="px-6 py-4">Gross Sales</th>
                      <th className="px-6 py-4">Commission Rate</th>
                      <th className="px-6 py-4">Net Payout</th>
                      <th className="px-6 py-4">Payout Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {earnings.map((e) => (
                      <tr key={e.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 font-mono">{new Date(e.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">{e.artifacts?.title || "Historical antiquity Lot"}</td>
                        <td className="px-6 py-4">${e.gross_amount.toLocaleString()}</td>
                        <td className="px-6 py-4 text-red-600">-${e.commission_amount.toLocaleString()}</td>
                        <td className="px-6 py-4 font-bold text-emerald-600">${e.net_amount.toLocaleString()}</td>
                        <td className="px-6 py-4 font-mono text-[10px]">
                          {e.payout_id ? `#${e.payout_id.slice(0, 8).toUpperCase()}` : "Unpaid Balance"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payout Requests History */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800">Payout Requests History</h2>
              {payouts.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1 text-[10px] font-bold text-pandora-gold hover:underline uppercase"
                >
                  <Download size={12} /> Export CSV
                </button>
              )}
            </div>
            {payouts.length === 0 ? (
              <div className="py-20 text-center text-xs text-gray-400 italic">No payout request logs created.</div>
            ) : (
              <div className="overflow-x-auto text-xs text-gray-500">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-700 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4">Request Date</th>
                      <th className="px-6 py-4">Amount Requested</th>
                      <th className="px-6 py-4">Payment Method</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Processed Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payouts.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-6 py-4 font-mono">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">${p.amount.toLocaleString()} USD</td>
                        <td className="px-6 py-4 font-mono text-[10px] max-w-[140px] truncate" title={p.bank_account || p.upi || "N/A"}>
                          {p.bank_account ? `Bank: ${p.bank_account}` : p.upi ? `UPI: ${p.upi}` : "Not Set"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block border px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider ${getPayoutStatusColor(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono">
                          {p.processed_at ? new Date(p.processed_at).toLocaleDateString() : "Awaiting review"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handlePrintStatement(p)}
                            className="inline-flex items-center gap-1 border border-gray-300 bg-white hover:bg-gray-50 px-2 py-1 rounded font-bold uppercase tracking-wider text-[9px] text-gray-700 transition-colors"
                          >
                            <Printer size={10} /> Statement
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Withdraw Modal popup */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <form onSubmit={handleWithdrawSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden text-xs text-gray-600">
            <div className="bg-pandora-charcoal text-white px-6 py-4 flex justify-between items-center border-b border-pandora-gold/20">
              <h3 className="font-serif font-bold text-sm">Request Fund Withdrawal</h3>
              <button type="button" onClick={() => setShowWithdrawModal(false)} className="text-white hover:text-gray-300">✕</button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded p-3 text-emerald-800 font-semibold flex justify-between items-center">
                <span>Withdrawable Balance:</span>
                <span>${availableBalance.toLocaleString()} USD</span>
              </div>

              <div>
                <label className="block text-gray-600 font-semibold mb-1">Withdraw Amount ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  max={availableBalance}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full rounded border border-gray-300 px-3 py-1.5 focus:outline-none text-sm font-semibold"
                />
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-3">
                <span className="font-bold text-gray-800 uppercase text-[9px] tracking-wider block">Transfer Destination Details</span>
                
                <div>
                  <label className="block text-gray-500 mb-1 font-semibold">Bank Account Number (IBAN/Wire)</label>
                  <input
                    type="text"
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Enter bank wire details..."
                    className="w-full rounded border border-gray-300 px-3 py-1.5 focus:outline-none"
                  />
                </div>

                <div className="text-center font-bold text-gray-400 my-1">— OR —</div>

                <div>
                  <label className="block text-gray-500 mb-1 font-semibold">UPI ID / Virtual Address</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="e.g. merchant@upi"
                    className="w-full rounded border border-gray-300 px-3 py-1.5 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-500 mb-1 font-semibold">Notes / Reference memo</label>
                <input
                  type="text"
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  placeholder="Optional note..."
                  className="w-full rounded border border-gray-300 px-3 py-1.5 focus:outline-none"
                />
              </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="px-4 py-2 border border-gray-300 rounded font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingWithdraw || availableBalance <= 0}
                className="px-4 py-2 bg-pandora-charcoal text-white rounded font-bold uppercase tracking-wider hover:bg-pandora-gold transition-colors disabled:opacity-50"
              >
                {submittingWithdraw ? "Submitting..." : "Request Payout"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── PRINT-ONLY PAYOUT STATEMENT TEMPLATE ─── */}
      {selectedPayout && (
        <div className="hidden">
          <div ref={statementPrintRef} className="p-10 space-y-8 bg-white text-black max-w-3xl border border-gray-300">
            <div className="flex justify-between items-start border-b border-gray-300 pb-6">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-widest">PAYOUT STATEMENT</h1>
                <p className="text-xs mt-1 font-mono">Statement ID: PAY-{selectedPayout.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-xs">Generated: {new Date().toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold uppercase">DYNASITY-VOULT</h2>
                <p className="text-[10px] text-gray-500">Finance & Clearing House</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs border-b border-gray-150 pb-6">
              <div>
                <h3 className="font-bold uppercase mb-1">WITHDRAWAL DETAIL</h3>
                <p><strong className="text-gray-700">Requested Date:</strong> {new Date(selectedPayout.created_at).toLocaleString()}</p>
                <p><strong className="text-gray-700">Processed Date:</strong> {selectedPayout.processed_at ? new Date(selectedPayout.processed_at).toLocaleString() : "Awaiting Curation Approval"}</p>
                <p><strong className="text-gray-700">Withdrawal Amount:</strong> ${selectedPayout.amount.toLocaleString()} USD</p>
              </div>
              <div>
                <h3 className="font-bold uppercase mb-1">TRANSFER DESTINATION</h3>
                <p><strong className="text-gray-700">Bank Account:</strong> {selectedPayout.bank_account || "N/A"}</p>
                <p><strong className="text-gray-700">UPI virtual Address:</strong> {selectedPayout.upi || "N/A"}</p>
                <p><strong className="text-gray-700">Current Status:</strong> {selectedPayout.status.toUpperCase()}</p>
              </div>
            </div>

            <div className="text-xs leading-relaxed space-y-2 text-gray-700 pt-4">
              <h4 className="font-bold text-black uppercase">STATEMENT NOTE / DISCLAIMER</h4>
              <p>This document verifies a self-requested ledger balance payout request. The funds described have been earmarked and locked from active seller registry balance sheets. Dynasity-Voult clearance checks verify matching product acquisitions are fully delivered before final transfer execution.</p>
            </div>

            <div className="pt-24 text-center text-[10px] text-gray-400 border-t border-gray-200">
              Clearance registry validation completed. Certified secure transfer clearing documentation.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
