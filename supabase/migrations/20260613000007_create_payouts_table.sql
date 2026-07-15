-- Migration: Create Payouts and Seller Earnings Tables
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-13

BEGIN;

-- 1. Create payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripe_transfer_id TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  processed_at TIMESTAMPTZ,
  notes TEXT
);

-- 2. Create seller_earnings table
CREATE TABLE IF NOT EXISTS public.seller_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  artifact_id UUID REFERENCES public.artifacts(id) ON DELETE SET NULL,
  gross_amount NUMERIC(15,2) NOT NULL,
  commission_amount NUMERIC(15,2) NOT NULL,
  net_amount NUMERIC(15,2) NOT NULL,
  earning_type TEXT NOT NULL CHECK (earning_type IN ('auction_win', 'direct_sale')),
  payout_id UUID REFERENCES public.payouts(id) ON DELETE SET NULL, -- references payout batch if associated
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Create optimization indexes
CREATE INDEX IF NOT EXISTS idx_payouts_seller ON public.payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_seller ON public.seller_earnings(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_payout ON public.seller_earnings(payout_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_earnings ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies for public.payouts
DROP POLICY IF EXISTS "Sellers can view their own payouts" ON public.payouts;
CREATE POLICY "Sellers can view their own payouts"
  ON public.payouts FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all payouts" ON public.payouts;
CREATE POLICY "Admins can manage all payouts"
  ON public.payouts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Define RLS Policies for public.seller_earnings
DROP POLICY IF EXISTS "Sellers can view their own earnings" ON public.seller_earnings;
CREATE POLICY "Sellers can view their own earnings"
  ON public.seller_earnings FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all seller earnings" ON public.seller_earnings;
CREATE POLICY "Admins can manage all seller earnings"
  ON public.seller_earnings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND role = 'admin'
    )
  );

COMMIT;
