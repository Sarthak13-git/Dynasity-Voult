-- Migration: P0 Real Auction Lifecycle and Anti-Sniping Trigger
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-21

BEGIN;

CREATE OR REPLACE FUNCTION public.validate_and_process_bid()
RETURNS TRIGGER AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
  v_min_bid NUMERIC(15, 2);
  v_seller_id UUID;
BEGIN
  -- 1. Identity Check
  IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You cannot place a bid on behalf of another user account.';
  END IF;

  -- 2. Suspension Check
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = NEW.user_id AND status = 'suspended'
  ) THEN
    RAISE EXCEPTION 'Bidding failed: Your account has been suspended by the platform owner.';
  END IF;

  -- 3. Obtain Row-Level Lock
  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = NEW.auction_id
  FOR UPDATE;

  IF v_auction.id IS NULL THEN
    RAISE EXCEPTION 'Auction with ID % does not exist.', NEW.auction_id;
  END IF;

  -- 4. Auto-Activation Check:
  -- If status is 'upcoming' but start_time has passed and end_time is in the future, activate atomically.
  IF v_auction.status = 'upcoming' AND v_auction.start_time <= now() AND v_auction.end_time > now() THEN
    UPDATE public.auctions
    SET status = 'live', updated_at = now()
    WHERE id = v_auction.id;
    
    -- Reload the locked row state
    SELECT * INTO v_auction FROM public.auctions WHERE id = NEW.auction_id FOR UPDATE;
  END IF;

  -- 5. Verify the auction is live
  IF v_auction.status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'Bidding is only allowed on live auctions. Current status: %', v_auction.status;
  END IF;

  -- 6. Verify timing window bounds
  IF now() < v_auction.start_time THEN
    RAISE EXCEPTION 'Bidding has not started yet for this auction.';
  END IF;
  
  IF now() > v_auction.end_time THEN
    RAISE EXCEPTION 'This auction has already ended.';
  END IF;

  -- 7. Prevent owner bidding
  SELECT seller_id INTO v_seller_id
  FROM public.artifacts
  WHERE id = v_auction.artifact_id;
  
  IF NEW.user_id = v_seller_id THEN
    RAISE EXCEPTION 'Sellers are not permitted to bid on their own artifacts.';
  END IF;

  -- 8. Bid threshold checks
  IF v_auction.current_bid IS NULL THEN
    v_min_bid := v_auction.starting_bid;
  ELSE
    v_min_bid := v_auction.current_bid + v_auction.bid_increment;
  END IF;

  IF NEW.amount < v_min_bid THEN
    RAISE EXCEPTION 'Bid amount of % is too low. The minimum acceptable bid is %.', NEW.amount, v_min_bid;
  END IF;

  -- 9. Anti-Sniping: Auto-extend end_time by 60 seconds if within final 60 seconds of end_time
  IF (v_auction.end_time - now()) < INTERVAL '60 seconds' THEN
    v_auction.end_time := now() + INTERVAL '60 seconds';
  END IF;

  -- 10. Perform state update on the auction record
  UPDATE public.auctions
  SET 
    current_bid = NEW.amount, 
    highest_bidder_id = NEW.user_id,
    last_bid_at = COALESCE(NEW.created_at, now()),
    end_time = v_auction.end_time,
    updated_at = now()
  WHERE id = NEW.auction_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

COMMIT;
