-- Migration: Create Orders Table, Indexes, RLS Policies, and Triggers
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-13

BEGIN;

-- 1. Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- the buyer
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE, -- the purchased item
  auction_id UUID REFERENCES public.auctions(id) ON DELETE SET NULL, -- optional auction link
  amount NUMERIC(15,2) NOT NULL, -- final price paid
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'payment_received', 'shipped', 'delivered', 'cancelled')),
  payment_intent_id TEXT, -- Stripe payment intent ID
  shipping_address JSONB, -- stores address details as JSON
  shipping_status TEXT DEFAULT 'not_shipped' CHECK (shipping_status IN ('not_shipped', 'shipped', 'in_transit', 'delivered')),
  tracking_number TEXT,
  notes TEXT, -- admin notes
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create indexes for quick queries
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_artifact_id ON public.orders(artifact_id);
CREATE INDEX idx_orders_auction_id ON public.orders(auction_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at_desc ON public.orders(created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Policy A: Buyers can SELECT their own orders
CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- Policy B: Sellers can SELECT orders for their artifacts
CREATE POLICY "Sellers can view orders for their own artifacts"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = orders.artifact_id
        AND artifacts.seller_id = auth.uid()
    )
  );

-- Policy C: Admins can SELECT all orders
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Policy D: Admins can UPDATE all orders
CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Policy E: Buyers can INSERT their own orders
CREATE POLICY "Buyers can insert their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy F: Admins can INSERT any orders
CREATE POLICY "Admins can insert any orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 5. Create trigger to update updated_at timestamp
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

COMMIT;
