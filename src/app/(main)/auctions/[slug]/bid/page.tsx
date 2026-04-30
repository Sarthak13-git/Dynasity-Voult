"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import { use } from "react";
import { auctionItems } from "@/lib/auction-data";
import { Clock, Trophy, ArrowLeft, History } from "lucide-react";

const botNames = ["Kurt Hansen", "Albert Wesker", "Joseph Stalin"];
const botMaxBid = 40000;
const minIncrement = 200;
const userName = "Saburo Arasaka";

interface BidEntry {
  user: string;
  amount: number;
  time: string;
}

export default function BiddingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const item = auctionItems.find((i) => i.slug === slug);
  const router = useRouter();

  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [bidCount, setBidCount] = useState(0);
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(20);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [winner, setWinner] = useState<BidEntry | null>(null);

  const bidEndTimeRef = useRef(Date.now() + 20000);
  const highestBidRef = useRef(0);
  const bidHistoryRef = useRef<BidEntry[]>([]);

  const endAuction = useCallback(() => {
    setAuctionEnded(true);
    const history = bidHistoryRef.current;
    if (history.length > 0) {
      setWinner(history[0]);
    } else {
      setWinner({ user: "No Winner", amount: 0, time: "N/A" });
    }
  }, []);

  const placeBid = useCallback(
    (user: string, amount: number) => {
      highestBidRef.current = amount;
      setCurrentHighestBid(amount);
      setBidCount((prev) => prev + 1);

      const entry: BidEntry = {
        user,
        amount,
        time: new Date().toLocaleTimeString(),
      };

      bidHistoryRef.current = [entry, ...bidHistoryRef.current];
      setBidHistory((prev) => [entry, ...prev]);

      bidEndTimeRef.current = Date.now() + 20000;
    },
    []
  );

  // Timer
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = bidEndTimeRef.current - Date.now();
      if (remaining <= 0) {
        endAuction();
        clearInterval(interval);
        return;
      }
      setTimeLeft(Math.ceil(remaining / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [endAuction]);

  // Bot bidding
  useEffect(() => {
    const interval = setInterval(
      () => {
        const timeRemaining = bidEndTimeRef.current - Date.now();
        if (
          timeRemaining > 4000 &&
          Math.random() > 0.5 &&
          highestBidRef.current < botMaxBid
        ) {
          const nextBid =
            highestBidRef.current +
            minIncrement +
            Math.floor(Math.random() * 500);
          const botName = botNames[Math.floor(Math.random() * botNames.length)];
          if (nextBid <= botMaxBid) {
            placeBid(botName, nextBid);
          }
        }
      },
      Math.random() * 7000 + 3000
    );
    return () => clearInterval(interval);
  }, [placeBid]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(bidAmount);

    if (amount <= currentHighestBid) {
      setFeedback("Bid must be higher than the current highest bid!");
      return;
    }

    if (confirm(`Are you sure you want to place a bid of $${amount}?`)) {
      placeBid(userName, amount);
      setFeedback("");
      setBidAmount("");
    }
  };

  if (!item) {
    notFound();
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Winner screen
  if (auctionEnded && winner) {
    return (
      <div className="min-h-screen bg-pandora-charcoal flex items-center justify-center text-white px-6">
        <div className="relative text-center p-12 max-w-lg w-full border border-pandora-gold/30 bg-pandora-charcoal-light/30 backdrop-blur-sm flex flex-col items-center">
          <Trophy size={48} className="text-pandora-gold-light mb-6" strokeWidth={1} />
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-pandora-gold-light mb-4">
            Auction Concluded
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium mb-8">
            The Winner Is
          </h1>
          
          <div className="w-full border-t border-b border-white/10 py-6 mb-8">
            <p className="font-serif text-3xl font-medium text-white mb-2">
              {winner.user}
            </p>
            <p className="text-[13px] uppercase tracking-[0.2em] text-white/60 mb-4">
              Winning Bid
            </p>
            <p className="font-serif text-4xl font-medium text-pandora-gold-light">
              ${winner.amount.toLocaleString()}
            </p>
          </div>
          
          <button
            onClick={() => router.push("/auctions")}
            className="group inline-flex items-center gap-3 border border-pandora-gold px-8 py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-pandora-gold transition-all hover:bg-pandora-gold hover:text-white"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
            Return to Auctions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pandora-charcoal text-white selection:bg-pandora-gold selection:text-white pb-24">
      {/* Header */}
      <header className="w-full flex items-center justify-between px-6 py-8 border-b border-white/10">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 hover:text-pandora-gold transition-colors"
        >
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          Back
        </button>
        <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-pandora-gold-light">
          Live Auction
        </p>
        <div className="w-20" /> {/* Spacer for centering */}
      </header>

      <main className="mx-auto max-w-[1200px] px-6 lg:px-12 mt-16">
        {/* Item Header */}
        <div className="text-center mb-16">
          <h1 className="font-serif text-4xl md:text-6xl font-medium text-white mb-4">
            {item.title}
          </h1>
          <p className="text-[13px] uppercase tracking-[0.2em] text-white/50">
            Premium Archive
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Bidding Form & Status */}
          <div className="lg:col-span-7 space-y-12">
            
            {/* Status Panel */}
            <div className="border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <Clock size={18} className="text-pandora-gold-light" />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-pandora-gold-light">
                  Bidding Status
                </h2>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    Current Highest Bid
                  </p>
                  <p className="font-serif text-4xl font-medium text-pandora-gold-light">
                    ${currentHighestBid.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    Time Remaining
                  </p>
                  <p className="font-serif text-4xl font-medium text-white flex items-baseline gap-2">
                    {String(minutes).padStart(2, "0")}<span className="text-xl text-white/50">:</span>{String(seconds).padStart(2, "0")}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 mb-2">
                    Total Bids
                  </p>
                  <p className="font-serif text-2xl font-medium text-white">
                    {bidCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Place Bid Panel */}
            <div className="border border-pandora-gold/20 bg-pandora-gold/5 p-8 backdrop-blur-sm">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-pandora-gold-light mb-8">
                Place Your Bid
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div>
                  <label htmlFor="bid-amount" className="block text-[11px] uppercase tracking-[0.2em] text-white/60 mb-3">
                    Enter bid amount (In K USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-serif text-xl">$</span>
                    <input
                      type="number"
                      id="bid-amount"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={`${currentHighestBid + minIncrement}`}
                      required
                      className="w-full bg-transparent border-b border-white/20 px-10 py-4 text-2xl font-serif text-white focus:outline-none focus:border-pandora-gold-light transition-colors placeholder:text-white/20"
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="group relative w-full overflow-hidden border border-pandora-gold px-8 py-5 text-[12px] font-semibold uppercase tracking-[0.15em] text-pandora-gold transition-all hover:bg-pandora-gold hover:text-white mt-4"
                >
                  <span className="relative z-10">Submit Bid</span>
                </button>
              </form>
              {feedback && (
                <p className="mt-4 text-[13px] text-red-400 font-medium tracking-wide">
                  {feedback}
                </p>
              )}
            </div>
          </div>

          {/* Right Column: Bid History */}
          <div className="lg:col-span-5">
            <div className="border border-white/10 bg-black/20 p-8 h-full min-h-[500px]">
              <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-6">
                <History size={18} className="text-white/60" />
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
                  Bid History
                </h2>
              </div>
              
              <div className="space-y-6 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                {bidHistory.length === 0 ? (
                  <p className="text-[13px] text-white/40 italic font-serif">
                    No bids placed yet. Be the first to bid.
                  </p>
                ) : (
                  bidHistory.map((entry, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between pb-4 border-b ${idx === 0 ? 'border-pandora-gold/30' : 'border-white/5'}`}
                    >
                      <div>
                        <p className={`font-serif text-lg ${idx === 0 ? 'text-pandora-gold-light' : 'text-white'}`}>
                          {entry.user}
                        </p>
                        <p className="text-[11px] uppercase tracking-[0.1em] text-white/40 mt-1">
                          {entry.time}
                        </p>
                      </div>
                      <p className={`font-serif text-xl ${idx === 0 ? 'text-pandora-gold-light font-medium' : 'text-white/70'}`}>
                        ${entry.amount.toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center text-2xl font-bold mt-10 py-4 hidden">
        <p id="winner-announcement">
          Winner: <span id="winner-name"></span>
        </p>
      </footer>
    </div>
  );
}
