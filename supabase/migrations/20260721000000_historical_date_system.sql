-- ============================================================
-- Migration: Enterprise Historical Date System
-- Target: Supabase PostgreSQL Database
-- Date: 2026-07-21
-- ============================================================
--
-- This migration implements:
--   1. Add creation_year INTEGER
--   2. Add calendar_era TEXT CHECK (calendar_era IN ('BCE', 'BC', 'CE', 'AD')) DEFAULT 'CE'
--   3. Add is_estimated BOOLEAN DEFAULT TRUE
--   4. Keep year_estimate TEXT as deprecated (nullable, no constraints)
--   5. Safely convert existing year_estimate values via regular expression matching
-- ============================================================

BEGIN;

-- 1. Add new columns to public.artifacts
ALTER TABLE public.artifacts
  ADD COLUMN IF NOT EXISTS creation_year INTEGER,
  ADD COLUMN IF NOT EXISTS calendar_era TEXT DEFAULT 'CE' CONSTRAINT check_calendar_era CHECK (calendar_era IN ('BCE', 'BC', 'CE', 'AD')),
  ADD COLUMN IF NOT EXISTS is_estimated BOOLEAN DEFAULT TRUE;

-- 2. Migrate existing data (backward compatibility conversion)
--    E.g. "1900"      -> creation_year = 1900, calendar_era = 'CE', is_estimated = TRUE
--         "120 BCE"   -> creation_year = 120, calendar_era = 'BCE', is_estimated = TRUE
--         "350 BC"    -> creation_year = 350, calendar_era = 'BC', is_estimated = TRUE
--         "1895 AD"   -> creation_year = 1895, calendar_era = 'AD', is_estimated = TRUE
--         "150 CE"    -> creation_year = 150, calendar_era = 'CE', is_estimated = TRUE
UPDATE public.artifacts
SET
  creation_year = (substring(year_estimate from '([0-9]+)'))::INTEGER,
  calendar_era = CASE
    WHEN year_estimate ILIKE '%bce%' THEN 'BCE'
    WHEN year_estimate ILIKE '%bc%'  THEN 'BC'
    WHEN year_estimate ILIKE '%ad%'  THEN 'AD'
    ELSE 'CE'
  END,
  is_estimated = TRUE
WHERE year_estimate IS NOT NULL AND creation_year IS NULL;

-- 3. Set a default value for any NULL records created in future (or set them to CE)
ALTER TABLE public.artifacts
  ALTER COLUMN calendar_era SET DEFAULT 'CE',
  ALTER COLUMN is_estimated SET DEFAULT TRUE;

COMMIT;
