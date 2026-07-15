-- Migration: Create Artifact Provenance Table, Indexes and RLS Policies
-- Target: Supabase PostgreSQL Database
-- Date: 2026-07-08

BEGIN;

-- 1. Create table public.artifact_provenance
CREATE TABLE IF NOT EXISTS public.artifact_provenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  event_date DATE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  source_reference TEXT,
  document_id UUID REFERENCES public.artifact_documents(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for performance optimizations
CREATE INDEX IF NOT EXISTS idx_provenance_artifact_id ON public.artifact_provenance(artifact_id);
CREATE INDEX IF NOT EXISTS idx_provenance_artifact_id_sort ON public.artifact_provenance(artifact_id, sort_order);

-- 3. Enable RLS
ALTER TABLE public.artifact_provenance ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Public read-only for available artifacts whose seller is not suspended
CREATE POLICY "Allow public read of provenance events"
  ON public.artifact_provenance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts a
      JOIN public.profiles p ON a.seller_id = p.id
      WHERE a.id = artifact_provenance.artifact_id
        AND a.status = 'available'
        AND p.status <> 'suspended'
    )
  );

-- 5. RLS Policy: Sellers can manage provenance only for artifacts they own
CREATE POLICY "Allow sellers to manage owned artifact provenance"
  ON public.artifact_provenance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = artifact_provenance.artifact_id
        AND artifacts.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = artifact_provenance.artifact_id
        AND artifacts.seller_id = auth.uid()
    )
  );

-- 6. RLS Policy: Admins have full access to manage all provenance
CREATE POLICY "Allow admins full access to artifact provenance"
  ON public.artifact_provenance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

COMMIT;
