-- Migration: Auction System Phase 1 Setup
-- Includes: Active Auction Uniqueness Index, RLS Policies, Auto-activation & Settlement Functions
-- Created: 2026-06-12

BEGIN;

-- 1. Create UNIQUE partial index to prevent duplicate active auctions on same artifact
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_auctions_unique_per_artifact
  ON public.auctions (artifact_id)
  WHERE (status IN ('upcoming', 'live'));

-- 2. Add RLS insert policy for sellers
DROP POLICY IF EXISTS "Sellers can insert auctions for their own artifacts" ON public.auctions;
CREATE POLICY "Sellers can insert auctions for their own artifacts"
  ON public.auctions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE id = artifact_id AND seller_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('bidder', 'admin')
    )
  );

-- 3. Add RLS update policy for sellers & admins
DROP POLICY IF EXISTS "Sellers can update auctions for their own artifacts" ON public.auctions;
CREATE POLICY "Sellers can update auctions for their own artifacts"
  ON public.auctions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE id = artifact_id AND seller_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Add RLS delete policy for sellers & admins
DROP POLICY IF EXISTS "Sellers can delete auctions for their own artifacts" ON public.auctions;
CREATE POLICY "Sellers can delete auctions for their own artifacts"
  ON public.auctions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE id = artifact_id AND seller_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Define auto-activation function
CREATE OR REPLACE FUNCTION public.activate_scheduled_auctions()
RETURNS void AS $$
BEGIN
  UPDATE public.auctions
  SET 
    status = 'live',
    updated_at = now()
  WHERE 
    status = 'upcoming'
    AND start_time <= now()
    AND end_time > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Define revised settlement function with reserve price checks
CREATE OR REPLACE FUNCTION public.settle_expired_auctions()
RETURNS void AS $$
BEGIN
  UPDATE public.auctions
  SET 
    status = 'ended',
    winner_id = CASE 
      WHEN reserve_price IS NULL THEN highest_bidder_id
      WHEN current_bid >= reserve_price THEN highest_bidder_id
      ELSE NULL
    END,
    updated_at = now()
  WHERE 
    status = 'live'
    AND now() > end_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
