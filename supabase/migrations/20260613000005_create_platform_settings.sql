-- Migration: Create Platform Settings Table and Policies
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-13

BEGIN;

-- 1. Create platform_settings table
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL, -- JSON stringified value
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  description TEXT
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies for public.platform_settings

-- Policy A: View policy (Anyone can view platform settings so they are accessible to fees and system rules)
DROP POLICY IF EXISTS "Platform settings are viewable by everyone" ON public.platform_settings;
CREATE POLICY "Platform settings are viewable by everyone"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Policy B: Manage policy (Only admins can insert, update, or delete platform settings)
DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL
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

-- 4. Seed initial default values
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('auction_commission_rate', '"10"', 'Auction Commission Rate (%) - Collect X% of winning bids'),
  ('direct_sale_commission', '"5"', 'Direct Sale Commission (%) - Collect X% of direct sales'),
  ('platform_transaction_fee', '"2.99"', 'Platform Fee per Transaction ($)'),
  ('min_bid_increment', '"100"', 'Minimum Bid Increment ($) for premium auctions'),
  ('reserve_price_requirement', '"80"', 'Reserve Price Requirement (%) - Seller reserve must be at least X% of estimated value'),
  ('auction_duration_days', '"7"', 'Default Auction Duration in days'),
  ('platform_name', '"Dynasity-Voult"', 'Platform Brand Name'),
  ('contact_email', '"support@dynasityvoult.com"', 'Platform Contact/Support Email'),
  ('support_phone', '"+1 (555) 0199"', 'Platform Support Phone Number'),
  ('website_url', '"https://dynasityvoult.com"', 'Base website URL domain'),
  ('tax_id', '"TX-99882211-A"', 'Business Registration Tax ID'),
  ('email_notifications_enabled', 'true', 'Enable outbound email notifications'),
  ('sms_notifications_enabled', 'false', 'Enable SMS alerts (Future Use)'),
  ('slack_integration_enabled', 'false', 'Enable Slack notifications (Future Use)')
ON CONFLICT (key) DO NOTHING;

COMMIT;
