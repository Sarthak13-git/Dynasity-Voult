"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import { use } from "react";
import { auctionItems } from "@/lib/auction-data";

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
      className="min-h-screen"
      style={{
        backgroundColor: "black",
        color: "white",
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {/* Header */}
      <header className="w-full flex items-center justify-center py-2" style={{ backgroundColor: "black" }}>
        <Image
          src="/logo.jpg"
          alt="Pandora's Box Logo"
          width={100}
          height={120}
          className="object-cover"
        />
      </header>

      <main
        className="mx-auto mt-10 p-4 rounded-lg"
        style={{
          maxWidth: "800px",
          background:
            "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(45,44,51,1) 100%)",
        }}
      >
        {/* Bidding Status */}
        <section
          className="mb-8 p-4 rounded-lg"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(45,44,51,1) 100%)",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2 className="text-2xl font-bold mb-4">Current Bidding Status</h2>
          <p>
            <strong>Current Highest Bid:</strong> ${currentHighestBid}
          </p>
          <p>
            <strong>Total Bids:</strong> {bidCount}
          </p>
          <p>
            <strong>Auction Ends In:</strong>{" "}
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </p>
        </section>

        {/* Place Bid */}
        <section
          className="mb-8 p-4 rounded-lg"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(45,44,51,1) 100%)",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2 className="text-2xl font-bold mb-4">Place Your Bid</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label htmlFor="bid-amount">Enter your bid amount:</label>
            <input
              type="number"
              id="bid-amount"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Enter bid in USD"
              required
              className="px-3 py-2 rounded text-black"
              style={{ backgroundColor: "white" }}
            />
            <button
              type="submit"
              className="px-4 py-2 rounded text-white border-none cursor-pointer"
              style={{ backgroundColor: "#007bff" }}
              onMouseOver={(e) =>
                (e.currentTarget.style.backgroundColor = "#0056b3")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.backgroundColor = "#007bff")
              }
            >
              Place Bid
            </button>
          </form>
          {feedback && (
            <p className="mt-2 text-red-400">{feedback}</p>
          )}
        </section>

        {/* Bid History */}
        <section
          className="mb-8 p-4 rounded-lg"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(45,44,51,1) 100%)",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          <h2 className="text-2xl font-bold mb-4">Bid History</h2>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  className="p-2 text-center"
                  style={{ border: "1px solid #ddd" }}
                >
                  User
                </th>
                <th
                  className="p-2 text-center"
                  style={{ border: "1px solid #ddd" }}
                >
                  Amount (In Thousands)
                </th>
                <th
                  className="p-2 text-center"
                  style={{ border: "1px solid #ddd" }}
                >
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {bidHistory.map((entry, idx) => (
                <tr key={idx}>
                  <td
                    className="p-2 text-center"
                    style={{ border: "1px solid #ddd" }}
                  >
                    {entry.user}
                  </td>
                  <td
                    className="p-2 text-center"
                    style={{ border: "1px solid #ddd" }}
                  >
                    ${entry.amount}
                  </td>
                  <td
                    className="p-2 text-center"
                    style={{ border: "1px solid #ddd" }}
                  >
                    {entry.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="text-center text-2xl font-bold mt-10 py-4"
        style={{
          backgroundColor: "black",
          color: "white",
          fontFamily: "'Segoe UI'",
        }}
      >
        <p id="winner-announcement" className="hidden">
          Winner: <span id="winner-name"></span>
        </p>
      </footer>
    </div>
  );
}
