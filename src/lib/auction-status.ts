export type AuctionDisplayStatus =
  | "Pending Approval"
  | "Scheduled"
  | "Live"
  | "Extended"
  | "Unsold"
  | "Awaiting Payment"
  | "Sold"
  | "Paid Out"
  | "Cancelled"
  | "Rejected";

/**
 * Computes the exact auction workflow status from raw database rows.
 * Implements strict separation of concerns, ensuring that payments, settlement,
 * and bidding states are derived dynamically from live database tables.
 */
export function getAuctionDisplayStatus(
  auction: {
    status: string;
    start_time: string;
    end_time: string;
    winner_id?: string | null;
    highest_bidder_id?: string | null;
    last_bid_at?: string | null;
    orders?: any;
    [key: string]: any;
  },
  serverNowOffset: number = 0
): AuctionDisplayStatus {
  if (!auction) return "Unsold";

  // Check application status
  if (auction.status === "pending") return "Pending Approval";
  if (auction.status === "rejected") return "Rejected";
  if (auction.status === "cancelled") return "Cancelled";
  if (auction.status === "upcoming") return "Scheduled";

  const serverNow = Date.now() + serverNowOffset;
  const startTime = new Date(auction.start_time).getTime();
  const endTime = new Date(auction.end_time).getTime();

  // If upcoming or live based on database but time checks say otherwise
  if (auction.status === "live") {
    if (serverNow < startTime) {
      return "Scheduled";
    }
    if (serverNow > endTime) {
      // Transition window: auction has physically ended but cron/RPC settle has not completed yet
      return auction.winner_id || auction.highest_bidder_id ? "Awaiting Payment" : "Unsold";
    }

    // Soft-close check: if within last 60 seconds of ending
    const timeLeft = endTime - serverNow;
    if (timeLeft > 0 && timeLeft < 60000) {
      return "Extended";
    }

    return "Live";
  }

  if (auction.status === "ended") {
    const hasWinner = !!auction.winner_id;
    if (!hasWinner) {
      return "Unsold";
    }

    // Extract order (Supabase returns joined tables as an array or a single object)
    const order = Array.isArray(auction.orders)
      ? auction.orders[0]
      : auction.orders;

    if (!order) {
      return "Awaiting Payment";
    }

    if (order.status === "pending") {
      return "Awaiting Payment";
    }

    const paidStatuses = [
      "payment_received",
      "processing",
      "packed",
      "shipped",
      "delivered",
    ];

    if (paidStatuses.includes(order.status)) {
      // Check payout status through seller earnings link
      const earnings = Array.isArray(order.seller_earnings)
        ? order.seller_earnings[0]
        : order.seller_earnings;

      const payout = Array.isArray(earnings?.payouts)
        ? earnings.payouts[0]
        : earnings?.payouts;

      if (payout && payout.status === "completed") {
        return "Paid Out";
      }

      return "Sold";
    }

    return "Awaiting Payment";
  }

  return "Unsold";
}
