-- Migration: Add Verification Fields to Artifact Documents and Restrict Updates to Admins
-- Target: Supabase PostgreSQL Database
-- Date: 2026-07-08

BEGIN;

-- 1. Add verification/review fields to public.artifact_documents
ALTER TABLE public.artifact_documents 
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Create trigger function to enforce that only admins can modify verification fields
CREATE OR REPLACE FUNCTION public.tg_fn_enforce_admin_verification_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If not an admin, check that verification fields were not changed
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR
       NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR
       NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at OR
       NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      RAISE EXCEPTION 'Forbidden: Only administrators can modify verification fields.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind trigger BEFORE UPDATE
DROP TRIGGER IF EXISTS trg_enforce_admin_verification_fields ON public.artifact_documents;
CREATE TRIGGER trg_enforce_admin_verification_fields
BEFORE UPDATE ON public.artifact_documents
FOR EACH ROW
EXECUTE FUNCTION public.tg_fn_enforce_admin_verification_fields();

COMMIT;
