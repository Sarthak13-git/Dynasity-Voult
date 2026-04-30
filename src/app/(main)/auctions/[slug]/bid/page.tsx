"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, Shield } from "lucide-react";
import { auctionItems } from "@/lib/auction-data";

const botNames = ["Kurt Hansen", "Albert Wesker", "Joseph Stalin"];
const botMaxBid = 50000;
const minIncrement = 500;
const userName = "You";

type BidEntry = {
  user: string;
  amount: number;
  time: string;
};

export default function BidPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [artifact, setArtifact] = useState<any>(null);

  useEffect(() => {
    params.then((p) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const found = auctionItems.find((i: any) => i.slug === p.slug);
      setArtifact(found);
    });
  }, [params]);

  const [currentHighestBid, setCurrentHighestBid] = useState(0);
  const [bidCount, setBidCount] = useState(0);
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [feedback, setFeedback] = useState("");
  const [timeLeft, setTimeLeft] = useState(20);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [winner, setWinner] = useState<BidEntry | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/purity
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

  if (artifact === null) {
    return <div>Loading...</div>;
  }

  if (artifact === undefined) {
    notFound();
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Winner screen
  if (auctionEnded && winner) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "black", color: "white" }}
      >
        <div
          className="text-center p-8 rounded-2xl max-w-lg w-[90%]"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(45,44,51,1) 100%)",
          }}
        >
          <h1 className="text-4xl font-bold mb-4">Auction Winner!</h1>
          <p className="text-xl mb-2">Congratulations to:</p>
          <p className="text-2xl font-bold" style={{ color: "#63dff0" }}>
            {winner.user}
          </p>
          <p className="text-xl mt-4">
            Winning Bid:{" "}
            <span style={{ color: "#63dff0", fontWeight: "bold" }}>
              ${winner.amount}K
            </span>
          </p>
          <p className="mt-2">Time of Winning Bid: {winner.time}</p>
          <button
            onClick={() => router.push("/auctions")}
            className="mt-6 px-6 py-3 rounded-lg cursor-pointer text-white border-none"
            style={{
              background:
                "linear-gradient(to right, #2C5364, #203A43, #0F2027)",
              fontFamily: "'Segoe UI'",
              fontSize: "1rem",
            }}
          >
            Return
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col bg-pandora-white font-sans text-pandora-charcoal"
      style={{ fontFamily: "'Segoe UI', sans-serif" }}
    >
      {/* Bid Navbar */}
      <header className="fixed z-50 flex w-full items-center justify-between bg-white/80 px-6 py-4 backdrop-blur-md md:px-12">
        <Link
          href={`/auctions/${artifact.slug}`}
          className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-pandora-gold"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Details
        </Link>
        <span className="font-serif text-xl tracking-widest text-black">
          PANDORA
        </span>
        <div className="w-24 border border-pandora-cream p-1 text-center">
          <span className="block text-[10px] uppercase tracking-widest text-pandora-gray">
            Lot No.
          </span>
          <span className="font-mono text-sm font-bold">
            {String(artifact.slug || "001").substring(0, 3).toUpperCase()}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col pt-20 lg:flex-row">
        {/* Left: Artifact Preview (Sticky on Desktop) */}
        <div className="w-full border-r border-pandora-cream bg-pandora-cream/10 lg:sticky lg:top-0 lg:h-screen lg:w-[45%]">
          <div className="flex h-full flex-col p-6 md:p-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative aspect-square w-full rounded-sm bg-white p-4 shadow-sm"
            >
              <Image
                src={artifact.image || (artifact.images && artifact.images[0]) || "/pandora.png"}
                alt={artifact.title}
                fill
                className="object-contain p-4"
                priority
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 flex-1"
            >
              <h1 className="font-serif text-3xl font-bold leading-tight md:text-4xl text-black">
                {artifact.title}
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-pandora-gray">
                {artifact.description}
              </p>
              
              <div className="mt-8 flex items-start gap-4 border-t border-pandora-cream pt-6">
                <Shield className="h-6 w-6 shrink-0 text-pandora-gold" />
                <div>
                  <h4 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-pandora-charcoal">
                    Authentication Verified
                  </h4>
                  <p className="mt-1 text-[13px] text-pandora-gray">
                    This artifact has been authenticated by PANDORA experts. Bids
                    are legally binding.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right: Bidding Interface */}
        <div className="flex w-full flex-col lg:w-[55%]">
          {/* Status Header */}
          <div className="sticky top-16 z-10 flex items-center justify-between border-b border-pandora-cream bg-pandora-ivory/80 px-6 py-4 backdrop-blur-md md:px-12">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-pandora-gray">
                Current Bid
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-serif text-2xl text-pandora-charcoal">
                  ${currentHighestBid.toLocaleString()}
                </span>
                <span className="text-sm text-pandora-gray">
                  ({bidCount} bids)
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-pandora-gray">
                Time Remaining
              </p>
              <div className="mt-1 font-mono text-xl text-pandora-charcoal">
                {String(minutes).padStart(2, "0")}:
                {String(seconds).padStart(2, "0")}
              </div>
            </div>
          </div>

          {/* Bidding Form */}
          <div className="border-t border-pandora-cream bg-white p-6 md:p-12">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label htmlFor="bid-amount" className="text-sm text-pandora-gray">
                Enter your bid amount:
              </label>
              <div className="flex gap-4">
                <input
                  type="number"
                  id="bid-amount"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder="Enter bid in USD"
                  required
                  className="w-full border border-pandora-cream bg-pandora-ivory px-4 py-3 text-pandora-charcoal focus:border-pandora-gold focus:outline-none"
                />
                <button
                  type="submit"
                  className="shrink-0 bg-pandora-charcoal px-8 py-3 text-[13px] font-semibold uppercase tracking-widest text-white transition-colors hover:bg-black"
                >
                  Place Bid
                </button>
              </div>
            </form>
            {feedback && (
              <p className="mt-3 text-sm text-red-500">{feedback}</p>
            )}
          </div>
          
          {/* Bid History */}
          <div className="flex-1 overflow-y-auto bg-pandora-cream/20 p-6 md:p-12">
            <h2 className="mb-6 font-serif text-2xl text-pandora-charcoal">
              Bid History
            </h2>
            <div className="flex flex-col gap-4">
              {bidHistory.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded bg-white p-4 shadow-sm"
                >
                  <div>
                    <span className="font-semibold text-pandora-charcoal">
                      {entry.user}
                    </span>
                    <span className="ml-2 text-xs text-pandora-gray">
                      {entry.time}
                    </span>
                  </div>
                  <span className="font-mono text-lg font-medium text-pandora-charcoal">
                    ${entry.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              {bidHistory.length === 0 && (
                <p className="text-pandora-gray text-sm py-4 text-center">
                  No bids placed yet. Be the first to bid!
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
