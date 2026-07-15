-- Migration: P0 Provenance Metadata Columns on Artifacts
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-21

BEGIN;

ALTER TABLE public.artifacts
ADD COLUMN IF NOT EXISTS short_headline TEXT,
ADD COLUMN IF NOT EXISTS provenance TEXT,
ADD COLUMN IF NOT EXISTS ownership_history TEXT,
ADD COLUMN IF NOT EXISTS condition_report TEXT,
ADD COLUMN IF NOT EXISTS historical_period TEXT;

COMMIT;
