-- Migration: Add Verification ID and sequence auto-generation
-- Target: Supabase PostgreSQL Database
-- Date: 2026-07-08

BEGIN;

-- 1. Create a global sequence for verification IDs
CREATE SEQUENCE IF NOT EXISTS public.verification_id_seq START WITH 1;

-- 2. Add columns to artifact_documents table
ALTER TABLE public.artifact_documents
  ADD COLUMN IF NOT EXISTS verification_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- 3. Create BEFORE UPDATE trigger function to automatically generate verification_id
CREATE OR REPLACE FUNCTION public.tg_fn_generate_verification_id()
RETURNS TRIGGER AS $$
DECLARE
  current_year INT;
  seq_val BIGINT;
  new_id TEXT;
BEGIN
  -- Generate verification ID only when transition to is_verified = true occurs and verification_id is empty
  IF NEW.is_verified = TRUE AND (OLD.is_verified IS NULL OR OLD.is_verified = FALSE) AND NEW.verification_id IS NULL THEN
    current_year := EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::INT;
    seq_val := nextval('public.verification_id_seq');
    new_id := 'DV-' || current_year || '-' || LPAD(seq_val::text, 6, '0');
    
    NEW.verification_id := new_id;
    NEW.verified_at := CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Bind trigger to public.artifact_documents table
DROP TRIGGER IF EXISTS trg_generate_verification_id ON public.artifact_documents;
CREATE TRIGGER trg_generate_verification_id
BEFORE UPDATE ON public.artifact_documents
FOR EACH ROW
EXECUTE FUNCTION public.tg_fn_generate_verification_id();

COMMIT;
