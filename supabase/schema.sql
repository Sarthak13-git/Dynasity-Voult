-- ═══════════════════════════════════════════════════════
-- Dynasity-Voult — Database Schema
-- Digital Heritage House & Premium Auction Ecosystem
-- ═══════════════════════════════════════════════════════

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── User Profiles ───

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'bidder', 'guest')),
  phone TEXT,
  store_name TEXT,
  store_description TEXT,
  bank_account TEXT,
  tax_id TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile, or admins can update any profile
CREATE POLICY "Users can update their own profile or admins can update any"
  ON public.profiles FOR UPDATE
  USING (
    auth.uid() = id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Artifacts ───

CREATE TABLE public.artifacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  origin TEXT NOT NULL DEFAULT '',
  era TEXT NOT NULL DEFAULT '',
  year_estimate TEXT,
  provenance TEXT NOT NULL DEFAULT '',
  slug TEXT UNIQUE,
  story TEXT,
  videos TEXT[] DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'other' CHECK (
    category IN (
      'painting', 'sculpture', 'manuscript', 'jewelry',
      'antiquity', 'decorative_art', 'timepiece', 'textile',
      'weapon', 'numismatic', 'other', 'arms_and_armor', 'objets_d_art'
    )
  ),
  images TEXT[] DEFAULT '{}',
  thumbnail_url TEXT,
  estimated_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  buy_now_price NUMERIC(15, 2),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'archived' CHECK (
    status IN ('archived', 'available', 'on_auction', 'sold', 'on_exhibition', 'reserved')
  ),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  seller_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Artifacts are viewable by everyone"
  ON public.artifacts FOR SELECT
  USING (true);

-- Sellers can insert their own artifacts
CREATE POLICY "Sellers can insert their own artifacts"
  ON public.artifacts FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id 
    AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('bidder', 'admin')
    )
  );

-- Sellers can update their own artifacts, admins can update any
CREATE POLICY "Sellers can update their own artifacts"
  ON public.artifacts FOR UPDATE
  USING (
    auth.uid() = seller_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Sellers can delete their own artifacts, admins can delete any
CREATE POLICY "Sellers can delete their own artifacts"
  ON public.artifacts FOR DELETE
  USING (
    auth.uid() = seller_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Auctions ───

CREATE TABLE public.auctions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  starting_bid NUMERIC(15, 2) NOT NULL,
  current_bid NUMERIC(15, 2),
  reserve_price NUMERIC(15, 2),
  bid_increment NUMERIC(15, 2) NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (
    status IN ('upcoming', 'live', 'ended', 'cancelled')
  ),
  winner_id UUID REFERENCES public.profiles(id),
  highest_bidder_id UUID REFERENCES public.profiles(id),
  last_bid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auctions are viewable by everyone"
  ON public.auctions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage auctions"
  ON public.auctions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── Bids ───

CREATE TABLE public.bids (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bids are viewable by everyone"
  ON public.bids FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can place bids"
  ON public.bids FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Exhibitions ───

CREATE TABLE public.exhibitions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  venue TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  is_hybrid BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exhibitions are viewable by everyone"
  ON public.exhibitions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage exhibitions"
  ON public.exhibitions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Exhibition ↔ Artifact junction table
CREATE TABLE public.exhibition_artifacts (
  exhibition_id UUID NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  PRIMARY KEY (exhibition_id, artifact_id)
);

ALTER TABLE public.exhibition_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Exhibition artifacts are viewable by everyone"
  ON public.exhibition_artifacts FOR SELECT
  USING (true);

-- ─── Venues ───

CREATE TABLE public.venues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  price_per_day NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Venues are viewable by everyone"
  ON public.venues FOR SELECT
  USING (true);

-- ─── Bookings ───

CREATE TABLE public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'cancelled')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Triggers ───

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Validate bid and update current_bid in a secure, transaction-safe manner
CREATE OR REPLACE FUNCTION public.validate_and_process_bid()
RETURNS TRIGGER AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
  v_min_bid NUMERIC(15, 2);
  v_seller_id UUID;
BEGIN
  -- 0. IDENTITY VERIFICATION: Enforce that the inserting user matches the active session.
  -- This provides defense-in-depth security even if RLS is modified or bypassed.
  IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You cannot place a bid on behalf of another user account.';
  END IF;

  -- 1. Obtain exclusive row-level lock on the corresponding auction row to prevent race conditions.
  -- This blocks concurrent insert transactions on the same auction, serializing validations.
  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = NEW.auction_id
  FOR UPDATE;

  -- 2. Verify the auction exists
  IF v_auction.id IS NULL THEN
    RAISE EXCEPTION 'Auction with ID % does not exist.', NEW.auction_id;
  END IF;

  -- 3. Verify the auction is live
  IF v_auction.status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'Bidding is only allowed on live auctions. Current status: %', v_auction.status;
  END IF;

  -- 4. Verify auction timing window (start and end times)
  IF now() < v_auction.start_time THEN
    RAISE EXCEPTION 'Bidding has not started yet for this auction.';
  END IF;
  
  IF now() > v_auction.end_time THEN
    RAISE EXCEPTION 'This auction has already ended.';
  END IF;

  -- 5. Prevent artifact owner/seller from bidding on their own item
  SELECT seller_id INTO v_seller_id
  FROM public.artifacts
  WHERE id = v_auction.artifact_id;
  
  IF NEW.user_id = v_seller_id THEN
    RAISE EXCEPTION 'Sellers are not permitted to bid on their own artifacts.';
  END IF;

  -- 6. Calculate the minimum required bid amount
  IF v_auction.current_bid IS NULL THEN
    v_min_bid := v_auction.starting_bid;
  ELSE
    v_min_bid := v_auction.current_bid + v_auction.bid_increment;
  END IF;

  -- 7. Validate that the submitted bid amount is sufficient
  IF NEW.amount < v_min_bid THEN
    RAISE EXCEPTION 'Bid amount of % is too low. The minimum acceptable bid is %.', NEW.amount, v_min_bid;
  END IF;

  -- 8. Automatically update the auction's state columns and timestamp
  -- Since we hold the row lock, this update is safe and isolated.
  UPDATE public.auctions
  SET 
    current_bid = NEW.amount, 
    highest_bidder_id = NEW.user_id,
    last_bid_at = COALESCE(NEW.created_at, now()),
    updated_at = now()
  WHERE id = NEW.auction_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

CREATE TRIGGER trg_validate_and_process_bid
  BEFORE INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_and_process_bid();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_artifacts_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_auctions_updated_at
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Prevent unauthorized modification of security-sensitive fields on profiles
CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- 1. If the update is executed outside of an active auth context (e.g., migrations, database seeds, 
  -- or service role administrative tasks where auth.uid() IS NULL), allow the modification unconditionally.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 2. Strictly prevent any client-side update from modifying the primary key (id) column.
  -- Gaining or modifying the user's primary identity violates foreign key constraints and maps other users.
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Modifying the id field is strictly prohibited.';
  END IF;

  -- 3. Prevent non-admin users from changing the email column.
  -- In Supabase, the email in public.profiles is synced from auth.users. Changing it directly on the profiles
  -- table without auth verification bypasses the security flow.
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    IF caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'You do not have permission to modify the email field.';
    END IF;
  END IF;

  -- 4. Prevent non-admin users from modifying the user role column.
  -- This blocks standard users from self-escalating from 'guest' or 'bidder' to 'admin'.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF caller_role IS NULL THEN
      SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    END IF;
    IF caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only admins can modify user roles. Your current role is: %', COALESCE(caller_role, 'guest');
    END IF;
  END IF;

  -- 5. Prevent non-admin users from modifying the permissions column.
  -- This blocks standard users from escalating permissions directly.
  IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
    IF caller_role IS NULL THEN
      SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    END IF;
    IF caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only admins can modify permissions.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_updates();

CREATE TRIGGER update_exhibitions_updated_at
  BEFORE UPDATE ON public.exhibitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ─── Indexes ───

CREATE INDEX idx_artifacts_category ON public.artifacts(category);
CREATE INDEX idx_artifacts_status ON public.artifacts(status);
CREATE INDEX idx_artifacts_featured ON public.artifacts(is_featured) WHERE is_featured = true;
CREATE INDEX idx_auctions_status ON public.auctions(status);
CREATE INDEX idx_auctions_artifact ON public.auctions(artifact_id);
CREATE INDEX idx_bids_auction ON public.bids(auction_id);
CREATE INDEX idx_bids_user ON public.bids(user_id);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_venue ON public.bookings(venue_id);

-- ─── Favorites ───

CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artifact_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own favorites"
  ON public.favorites FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_favorites_user ON public.favorites(user_id);
CREATE INDEX idx_favorites_artifact ON public.favorites(artifact_id);
