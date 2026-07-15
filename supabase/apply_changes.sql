-- ═══════════════════════════════════════════════════════════════════════════
-- CONSOLIDATED DATABASE MIGRATION: SECURITY HARDENING & STATE TRACKING
-- ═══════════════════════════════════════════════════════════════════════════
-- Target: Supabase PostgreSQL Database
-- Version: 1.0.0
-- Security Level: Enterprise Hardened
-- Idempotency: Fully Idempotent (Safe to run multiple times or on a fresh project)
-- ═══════════════════════════════════════════════════════════════════════════

/*
 ===========================================================================
  📋 PRE-DEPLOYMENT CHECKLIST
  ===========================================================================
  1. Backup the production database profiles and auctions tables.
  2. Verify that there are no active, uncommitted transactions on the target tables.
  3. Ensure your database user has superuser or owner privileges to create triggers and alter tables.
  4. Ensure you run this script within the Supabase SQL Editor or migration utility.
*/

BEGIN;

-- ─── 1. PROFILE SCHEMA EXPANSION ───
-- Add missing columns to support seller settings and security permissions
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS store_name TEXT,
ADD COLUMN IF NOT EXISTS store_description TEXT,
ADD COLUMN IF NOT EXISTS bank_account TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─── 2. AUCTION SCHEMA EXPANSION ───
-- Add columns to support performant highest bidder and timing tracking
ALTER TABLE public.auctions 
ADD COLUMN IF NOT EXISTS highest_bidder_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS last_bid_at TIMESTAMPTZ;

-- ─── 3. PROFILE SECURITY TRIGGER ───
-- Enforces identity immutability and blocks unauthorized role or permission escalation
CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- A. SYSTEM CONTEXT BYPASS: If auth.uid() is NULL, it is a service role, system trigger,
  -- or migration execution. Allow the modification unconditionally.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- B. IDENTITY IMMUTABILITY: Block any client update from altering the primary key (id).
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Modifying the id field is strictly prohibited.';
  END IF;

  -- C. UNIFIED SECURITY FIELD CHECK: If any security-sensitive field (role, permissions, email) is changed,
  -- verify that the user executing the change has the 'admin' role.
  IF (NEW.role IS DISTINCT FROM OLD.role) OR 
     (NEW.permissions IS DISTINCT FROM OLD.permissions) OR
     (NEW.email IS DISTINCT FROM OLD.email) THEN
     
    -- Retrieve the active caller's current role
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

    -- Allow standard users to self-upgrade from guest to bidder during registration
    -- Reject any other transitions (such as self-escalating to admin or demoting themselves)
    IF NOT (OLD.role = 'guest' AND NEW.role = 'bidder' AND NEW.id = auth.uid()) THEN
      IF caller_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can modify security-sensitive fields (role, permissions, email).';
      END IF;
    END IF;

    -- Prevent admins from accidentally demoting themselves to avoid lockouts
    IF NEW.id = auth.uid() AND NEW.role IS DISTINCT FROM 'admin' AND OLD.role = 'admin' THEN
      RAISE EXCEPTION 'Safety Lock: Admins are not permitted to self-demote and revoke their own access.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public;

-- Attach check_profile_updates trigger
DROP TRIGGER IF EXISTS trg_check_profile_updates ON public.profiles;
CREATE TRIGGER trg_check_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_updates();

-- ─── 4. PROFILE RLS UPDATE POLICY ───
-- Replace the update policy to allow users to update themselves or admins to update any
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile or admins can update any" ON public.profiles;

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

-- ─── 5. BID VALIDATION TRIGGER & SYSTEM CLEANUP ───
-- Remove old update trigger
DROP TRIGGER IF EXISTS on_new_bid ON public.bids;
DROP FUNCTION IF EXISTS public.update_current_bid();

-- Create hardened validation and lock-based update function
CREATE OR REPLACE FUNCTION public.validate_and_process_bid()
RETURNS TRIGGER AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
  v_min_bid NUMERIC(15, 2);
  v_seller_id UUID;
BEGIN
  -- A. IDENTITY VERIFICATION (Defense-in-depth)
  -- Enforce that the inserting user matches the active session.
  IF auth.uid() IS NOT NULL AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'You cannot place a bid on behalf of another user account.';
  END IF;

  -- B. CONCURRENCY CONTROL: Obtain an exclusive write-lock on the auction row.
  -- This blocks concurrent insert transactions on the same auction, serializing validations.
  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = NEW.auction_id
  FOR UPDATE;

  -- C. EXISTENCE CHECK: Verify that the target auction exists
  IF v_auction.id IS NULL THEN
    RAISE EXCEPTION 'Auction with ID % does not exist.', NEW.auction_id;
  END IF;

  -- D. STATUS CHECK: Verify the auction is live
  IF v_auction.status IS DISTINCT FROM 'live' THEN
    RAISE EXCEPTION 'Bidding is only allowed on live auctions. Current status: %', v_auction.status;
  END IF;

  -- E. TIMING CHECK: Verify current time is within active bounds
  IF now() < v_auction.start_time THEN
    RAISE EXCEPTION 'Bidding has not started yet for this auction.';
  END IF;
  
  IF now() > v_auction.end_time THEN
    RAISE EXCEPTION 'This auction has already ended.';
  END IF;

  -- F. OWNER CHECK: Prevent the seller of the artifact from bidding on their own item
  SELECT seller_id INTO v_seller_id
  FROM public.artifacts
  WHERE id = v_auction.artifact_id;
  
  IF NEW.user_id = v_seller_id THEN
    RAISE EXCEPTION 'Sellers are not permitted to bid on their own artifacts.';
  END IF;

  -- G. THRESHOLD CHECK: Determine minimum allowed bid
  IF v_auction.current_bid IS NULL THEN
    v_min_bid := v_auction.starting_bid;
  ELSE
    v_min_bid := v_auction.current_bid + v_auction.bid_increment;
  END IF;

  IF NEW.amount < v_min_bid THEN
    RAISE EXCEPTION 'Bid amount of % is too low. The minimum acceptable bid is %.', NEW.amount, v_min_bid;
  END IF;

  -- H. ATOMIC STATE UPDATE: Safely update auctions columns inside the lock
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

-- Attach trg_validate_and_process_bid trigger
DROP TRIGGER IF EXISTS trg_validate_and_process_bid ON public.bids;
CREATE TRIGGER trg_validate_and_process_bid
  BEFORE INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_and_process_bid();

-- ─── 6. AUTO-CREATE PROFILE ON SIGNUP TRIGGER ───
-- Auto-create profile row in public.profiles when a new user registers in auth.users
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ─── 7. ARTIFACTS SCHEMA & OWNER RLS POLICY ───
ALTER TABLE public.artifacts 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES public.profiles(id);

DROP POLICY IF EXISTS "Admins can manage artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Sellers can insert their own artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Sellers can update their own artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Sellers can delete their own artifacts" ON public.artifacts;

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

-- ─── 8. OPTIMIZATION INDEXES ───
-- Indexes on keys used in filters, joins, and RLS checks
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_auctions_highest_bidder ON public.auctions(highest_bidder_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_artifact ON public.favorites(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_seller ON public.artifacts(seller_id);

COMMIT;

/*
  ===========================================================================
  📋 POST-DEPLOYMENT VERIFICATION CHECKLIST
  ===========================================================================
  1. Confirm the new columns exist on profiles and auctions tables:
     - profiles: phone, store_name, store_description, bank_account, tax_id, permissions
     - auctions: highest_bidder_id, last_bid_at
  2. Confirm the active triggers are attached:
     - profiles: trg_check_profile_updates
     - bids: trg_validate_and_process_bid
  3. Verify that standard updates of display_name, phone, and store_name on profiles succeed.
  4. Verify that trying to change role to admin or modify permissions on profiles fails.
  5. Verify that bidding on a live auction correctly updates current_bid, highest_bidder_id, and last_bid_at.
  6. Verify that bidding below starting_bid or on an ended auction is blocked.

  ===========================================================================
  🔄 ROLLBACK PROCEDURES
  ===========================================================================
  To revert the changes applied by this migration, execute the following SQL:
  
  BEGIN;
  
  -- Drop triggers and functions
  DROP TRIGGER IF EXISTS trg_check_profile_updates ON public.profiles;
  DROP FUNCTION IF EXISTS public.check_profile_updates();
  
  DROP TRIGGER IF EXISTS trg_validate_and_process_bid ON public.bids;
  DROP FUNCTION IF EXISTS public.validate_and_process_bid();
  
  -- Recreate old simple bid update trigger if needed
  CREATE OR REPLACE FUNCTION public.update_current_bid()
  RETURNS TRIGGER AS $$
  BEGIN
    UPDATE public.auctions
    SET current_bid = NEW.amount, updated_at = now()
    WHERE id = NEW.auction_id;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_new_bid
    AFTER INSERT ON public.bids
    FOR EACH ROW
    EXECUTE FUNCTION public.update_current_bid();

  -- Revert RLS policy
  DROP POLICY IF EXISTS "Users can update their own profile or admins can update any" ON public.profiles;
  CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

  -- Drop optimization indexes
  DROP INDEX IF EXISTS idx_profiles_role;
  DROP INDEX IF EXISTS idx_auctions_highest_bidder;

  -- Note: We generally do not drop table columns in rollback scripts to prevent data loss. 
  -- If you explicitly wish to drop them:
  -- ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone, DROP COLUMN IF EXISTS store_name...
  -- ALTER TABLE public.auctions DROP COLUMN IF EXISTS highest_bidder_id, DROP COLUMN IF EXISTS last_bid_at;

  COMMIT;
*/
