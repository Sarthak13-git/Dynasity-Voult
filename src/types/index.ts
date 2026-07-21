/* ─── Core Domain Types for Dynasity-Voult ─── */

// Artifact categories
export type ArtifactCategory =
  | "painting"
  | "sculpture"
  | "manuscript"
  | "jewelry"
  | "antiquity"
  | "decorative_art"
  | "timepiece"
  | "textile"
  | "weapon"
  | "numismatic"
  | "other";

// Artifact status
export type ArtifactStatus =
  | "draft"
  | "archived"
  | "available"
  | "on_auction"
  | "sold"
  | "on_exhibition"
  | "reserved";

// Auction status
export type AuctionStatus =
  | "upcoming"
  | "live"
  | "ended"
  | "cancelled";

// User roles
export type UserRole = "admin" | "seller" | "buyer";

// ─── Artifact ───

export interface Artifact {
  id: string;
  title: string;
  description: string;
  origin: string;
  era: string;
  year_estimate: string | null; // Deprecated
  creation_year: number | null;
  calendar_era: "BCE" | "BC" | "CE" | "AD" | null;
  is_estimated: boolean;
  historical_period: string | null;
  provenance: string;
  category: ArtifactCategory;
  images: string[];
  thumbnail_url: string | null;
  estimated_value: number;
  currency: string;
  status: ArtifactStatus;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}


// ─── Auction ───

export interface Auction {
  id: string;
  artifact_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  starting_bid: number;
  current_bid: number | null;
  reserve_price: number | null;
  bid_increment: number;
  status: AuctionStatus;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  artifact?: Artifact;
  bids?: Bid[];
}

// ─── Bid ───

export interface Bid {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  // Relations
  user?: UserProfile;
}

// ─── Exhibition ───

export interface Exhibition {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  venue: string;
  cover_image: string | null;
  is_hybrid: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  artifacts?: Artifact[];
}

// ─── UserProfile ───

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ─── Venue / Booking ───

export interface Venue {
  id: string;
  name: string;
  location: string;
  capacity: number;
  description: string | null;
  images: string[];
  price_per_day: number;
  is_available: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  venue_id: string;
  user_id: string;
  event_date: string;
  event_type: string;
  status: "pending" | "confirmed" | "cancelled";
  notes: string | null;
  created_at: string;
  // Relations
  venue?: Venue;
  user?: UserProfile;
}
