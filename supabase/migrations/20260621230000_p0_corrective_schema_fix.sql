-- Migration: P0 Corrective Schema Fix
-- Applies artifact_media table, missing columns on auction_applications & artifacts
-- Run this in Supabase SQL Editor BEFORE deploying application code
-- Created: 2026-06-21

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. CREATE artifact_media TABLE (normalized media architecture)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.artifact_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CONSTRAINT artifact_media_type_check CHECK (
    media_type IN ('image', 'video', 'model_3d', 'certificate', 'document')
  ),
  url TEXT NOT NULL,
  view_label TEXT CONSTRAINT artifact_media_view_label_check CHECK (
    view_label IS NULL OR view_label IN ('front', 'back', 'left', 'right', 'gallery', 'hero', 'certificate')
  ),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) on artifact_media
ALTER TABLE public.artifact_media ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Artifact media is viewable by everyone" ON public.artifact_media;
DROP POLICY IF EXISTS "Sellers can insert media for their own artifacts" ON public.artifact_media;
DROP POLICY IF EXISTS "Sellers can update media for their own artifacts" ON public.artifact_media;
DROP POLICY IF EXISTS "Sellers can delete media for their own artifacts" ON public.artifact_media;

-- Policy 1: Read Access (Everyone can view media)
CREATE POLICY "Artifact media is viewable by everyone"
  ON public.artifact_media FOR SELECT
  USING (true);

-- Policy 2: Insert Access (Sellers can only link media to artifacts they own)
CREATE POLICY "Sellers can insert media for their own artifacts"
  ON public.artifact_media FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE id = artifact_media.artifact_id AND seller_id = auth.uid()
    )
  );

-- Policy 3: Update Access
CREATE POLICY "Sellers can update media for their own artifacts"
  ON public.artifact_media FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE id = artifact_media.artifact_id AND seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE id = artifact_media.artifact_id AND seller_id = auth.uid()
    )
  );

-- Policy 4: Delete Access
CREATE POLICY "Sellers can delete media for their own artifacts"
  ON public.artifact_media FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE id = artifact_media.artifact_id AND seller_id = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 2. ADD MISSING COLUMNS TO auction_applications
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.auction_applications
  ADD COLUMN IF NOT EXISTS requested_starting_bid NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS requested_reserve_price NUMERIC(15, 2),
  ADD COLUMN IF NOT EXISTS requested_start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS requested_duration_days INTEGER;

-- ═══════════════════════════════════════════════════════════════
-- 3. ADD MISSING COLUMNS TO artifacts (provenance metadata)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.artifacts
  ADD COLUMN IF NOT EXISTS short_headline TEXT,
  ADD COLUMN IF NOT EXISTS ownership_history TEXT,
  ADD COLUMN IF NOT EXISTS condition_report TEXT,
  ADD COLUMN IF NOT EXISTS historical_period TEXT;

-- Note: provenance column already exists in the base schema

-- ═══════════════════════════════════════════════════════════════
-- 4. NOTIFY PostgREST to RELOAD SCHEMA CACHE
-- ═══════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';

COMMIT;
