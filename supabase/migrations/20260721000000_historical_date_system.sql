-- ============================================================
-- Migration: Enterprise Historical Date System (Production Safe)
-- Target: Supabase PostgreSQL Database
-- Date: 2026-07-21
-- ============================================================

BEGIN;

-- 1. Add new columns to public.artifacts (Idempotent)
ALTER TABLE public.artifacts
  ADD COLUMN IF NOT EXISTS creation_year INTEGER,
  ADD COLUMN IF NOT EXISTS calendar_era TEXT DEFAULT 'CE',
  ADD COLUMN IF NOT EXISTS is_estimated BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS historical_period TEXT;

-- 2. Drop and recreate check constraint to only allow canonical values ('BCE', 'CE')
ALTER TABLE public.artifacts DROP CONSTRAINT IF EXISTS check_calendar_era;
ALTER TABLE public.artifacts ADD CONSTRAINT check_calendar_era CHECK (calendar_era IN ('BCE', 'CE'));

-- 3. Migrate existing data (backward compatibility conversion)
--    E.g. "1900"      -> creation_year = 1900, calendar_era = 'CE', is_estimated = TRUE
--         "120 BCE"   -> creation_year = 120, calendar_era = 'BCE', is_estimated = TRUE
--         "350 BC"    -> creation_year = 350, calendar_era = 'BCE', is_estimated = TRUE
--         "1895 AD"   -> creation_year = 1895, calendar_era = 'CE', is_estimated = TRUE
--         "150 CE"    -> creation_year = 150, calendar_era = 'CE', is_estimated = TRUE
UPDATE public.artifacts
SET
  creation_year = CASE 
    WHEN year_estimate ~ '[0-9]+' THEN (substring(year_estimate from '([0-9]+)'))::INTEGER
    ELSE NULL
  END,
  calendar_era = CASE
    WHEN year_estimate ILIKE '%bce%' OR year_estimate ILIKE '%bc%' THEN 'BCE'
    ELSE 'CE'
  END,
  is_estimated = TRUE
WHERE year_estimate IS NOT NULL AND creation_year IS NULL;

-- 4. Set standard defaults for column modifications
ALTER TABLE public.artifacts
  ALTER COLUMN calendar_era SET DEFAULT 'CE',
  ALTER COLUMN is_estimated SET DEFAULT TRUE;

COMMIT;
