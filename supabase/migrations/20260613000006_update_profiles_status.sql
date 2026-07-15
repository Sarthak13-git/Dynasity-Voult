-- Migration: Add User Status and Secure Bid/Listing Triggers
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-13

BEGIN;

-- 1. Add status and last_login to public.profiles if they do not exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 2. Create index on status for rapid filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 3. Revise validate_and_process_bid trigger function to block suspended users
CREATE OR REPLACE FUNCTION public.validate_and_process_bid()
RETURNS TRIGGER AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
  v_min_bid NUMERIC(15, 2);
  v_seller_id UUID;
BEGIN
  -- A. IDENTITY VERIFICATION: Enforce that the inserting user matches the active session.
  IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You cannot place a bid on behalf of another user account.';
  END IF;

  -- B. SUSPENSION ENFORCEMENT: Enforce that suspended users cannot place bids.
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.user_id AND status = 'suspended'
  ) THEN
    RAISE EXCEPTION 'Bidding failed: Your account has been suspended by the platform owner.';
  END IF;

  -- C. Obtain exclusive row-level lock on the corresponding auction row to prevent race conditions.
  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = NEW.auction_id
  FOR UPDATE;

  -- D. Verify the auction exists
  IF v_auction.id IS NULL THEN
    RAISE EXCEPTION 'Auction with ID % does not exist.', NEW.auction_id;
  END IF;

  -- E. Verify the auction is live
  IF v_auction.status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'Bidding is only allowed on live auctions. Current status: %', v_auction.status;
  END IF;

  -- F. Verify auction timing window (start and end times)
  IF now() < v_auction.start_time THEN
    RAISE EXCEPTION 'Bidding has not started yet for this auction.';
  END IF;
  
  IF now() > v_auction.end_time THEN
    RAISE EXCEPTION 'This auction has already ended.';
  END IF;

  -- G. Prevent artifact owner/seller from bidding on their own item
  SELECT seller_id INTO v_seller_id
  FROM public.artifacts
  WHERE id = v_auction.artifact_id;
  
  IF NEW.user_id = v_seller_id THEN
    RAISE EXCEPTION 'Sellers are not permitted to bid on their own artifacts.';
  END IF;

  -- H. Calculate the minimum required bid amount
  IF v_auction.current_bid IS NULL THEN
    v_min_bid := v_auction.starting_bid;
  ELSE
    v_min_bid := v_auction.current_bid + v_auction.bid_increment;
  END IF;

  -- I. Validate that the submitted bid amount is sufficient
  IF NEW.amount < v_min_bid THEN
    RAISE EXCEPTION 'Bid amount of % is too low. The minimum acceptable bid is %.', NEW.amount, v_min_bid;
  END IF;

  -- J. Automatically update the auction's state columns and timestamp
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

-- 4. Update artifacts INSERT policy to block suspended sellers from listing products
DROP POLICY IF EXISTS "Sellers can insert their own artifacts" ON public.artifacts;
CREATE POLICY "Sellers can insert their own artifacts"
  ON public.artifacts FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id 
    AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('bidder', 'admin') AND status = 'active'
    )
  );

COMMIT;
