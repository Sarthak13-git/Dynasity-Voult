-- Migration: Create Auction Applications Table and RLS Policies
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-13

BEGIN;

-- 1. Create auction_applications table
CREATE TABLE public.auction_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT, -- Nullable, filled if rejected
  admin_comments TEXT, -- Nullable, admin review notes
  reviewed_by UUID REFERENCES public.profiles(id), -- Nullable admin reviewer
  reviewed_at TIMESTAMPTZ, -- Nullable reviewed timestamp
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create partial index to enforce unique active application per artifact
-- Prevents a seller from submitting duplicate pending or approved applications for the same artifact.
CREATE UNIQUE INDEX idx_active_auction_applications_per_artifact
  ON public.auction_applications(artifact_id)
  WHERE (status IN ('pending', 'approved'));

-- 3. Optimization Indexes for lookups
CREATE INDEX idx_auction_applications_seller ON public.auction_applications(seller_id);
CREATE INDEX idx_auction_applications_status ON public.auction_applications(status);
CREATE INDEX idx_auction_applications_artifact ON public.auction_applications(artifact_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.auction_applications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Policy A: Sellers can view their own applications
CREATE POLICY "Sellers can view their own applications"
  ON public.auction_applications FOR SELECT
  USING (auth.uid() = seller_id);

-- Policy B: Sellers can insert their own applications
CREATE POLICY "Sellers can create their own applications"
  ON public.auction_applications FOR INSERT
  WITH CHECK (
    auth.uid() = seller_id
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('bidder', 'admin')
    )
  );

-- Policy C: Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON public.auction_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy D: Admins can update applications (e.g. approve/reject/comment)
CREATE POLICY "Admins can update applications"
  ON public.auction_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy E: Admins can delete applications (for maintenance/cleanup)
CREATE POLICY "Admins can delete applications"
  ON public.auction_applications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Trigger to update updated_at timestamp
CREATE TRIGGER update_auction_applications_updated_at
  BEFORE UPDATE ON public.auction_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

COMMIT;
