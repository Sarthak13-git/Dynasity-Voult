-- Migration: Extend Payouts Table for Custom Withdrawals, bank account details, and RLS policies
-- Target: Supabase PostgreSQL Database
-- Date: 2026-07-08

BEGIN;

-- 1. Add bank_account and upi columns to payouts table
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS upi TEXT;

-- 2. Alter period_start and period_end to be NULLABLE
ALTER TABLE public.payouts 
  ALTER COLUMN period_start DROP NOT NULL,
  ALTER COLUMN period_end DROP NOT NULL;

-- 3. Modify status check constraint to support custom withdrawal workflows
ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_status_check;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_status_check CHECK (
  status IN ('pending', 'approved', 'processing', 'completed', 'failed', 'rejected')
);

-- 4. Enable RLS insert capability for authenticated sellers requesting withdrawals
DROP POLICY IF EXISTS "Sellers can request withdrawals" ON public.payouts;
CREATE POLICY "Sellers can request withdrawals"
  ON public.payouts FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

COMMIT;
