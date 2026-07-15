-- Migration: Sprint-1 Seller Verification & Final Role System (buyer/seller/admin)
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-18
-- Safely audits and migrates role vocab, tables, columns, and triggers.

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ROLE SYSTEM MIGRATION (guest/bidder -> buyer/seller)
-- ═══════════════════════════════════════════════════════════════════════════

-- Dynamically find and drop any check constraint on public.profiles containing 'role' or legacy vocab
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT concon.conname
        FROM pg_constraint concon
        JOIN pg_class classclass ON classclass.oid = concon.conrelid
        JOIN pg_namespace nspnsp ON nspnsp.oid = classclass.relnamespace
        WHERE nspnsp.nspname = 'public'
          AND classclass.relname = 'profiles'
          AND concon.contype = 'c'
          AND concon.conname LIKE '%role%'
    LOOP
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END;
$$;

-- Double-check drop for default naming conventions
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Change default role on profiles to 'buyer'
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'buyer';

-- Safely migrate existing role strings to the new vocab
UPDATE public.profiles SET role = 'buyer' WHERE role = 'guest';
UPDATE public.profiles SET role = 'seller' WHERE role = 'bidder';

-- Re-apply check constraint using final role vocab
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'seller', 'buyer'));

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. UPDATE PROFILE TRIGGER FUNCTION (FOR ROLE TRANSITIONS & ESCALATIONS)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_profile_updates()
RETURNS TRIGGER AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- If executed outside of auth context (e.g., system triggers, migrations, seeds), bypass checks
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Block any non-admin/client-side update from modifying the primary key (id) column
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Modifying the id field is strictly prohibited.';
  END IF;

  -- Block email modification unless executed by an admin
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    IF caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'You do not have permission to modify the email field.';
    END IF;
  END IF;

  -- Prevent non-admin users from escalating roles
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF caller_role IS NULL THEN
      SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    END IF;
    IF caller_role IS DISTINCT FROM 'admin' THEN
      -- Allow self-upgrade to 'seller' on registration/triggers, block all other promotions
      IF NOT (OLD.role = 'buyer' AND NEW.role = 'seller' AND NEW.id = auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can modify user roles. Your current role is: %', COALESCE(caller_role, 'buyer');
      END IF;
    END IF;
  END IF;

  -- Prevent non-admin users from modifying permissions
  IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
    IF caller_role IS NULL THEN
      SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();
    END IF;
    IF caller_role IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Only admins can modify permissions.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create profile update validation trigger
DROP TRIGGER IF EXISTS trg_check_profile_updates ON public.profiles;
CREATE TRIGGER trg_check_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_updates();

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ARTIFACT_DOCUMENTS SCHEMA & RLS UPDATES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.artifact_documents ALTER COLUMN artifact_id DROP NOT NULL;
ALTER TABLE public.artifact_documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Rebuild document type check constraint
ALTER TABLE public.artifact_documents DROP CONSTRAINT IF EXISTS artifact_documents_document_type_check;
ALTER TABLE public.artifact_documents ADD CONSTRAINT artifact_documents_document_type_check 
  CHECK (document_type IN ('provenance', 'certificate', 'authentication', 'ownership_proof', 'government_id', 'address_proof', 'selfie_verification', 'other'));

-- Re-create artifact document SELECT RLS Policy
DROP POLICY IF EXISTS "Sellers and admins can view artifact documents" ON public.artifact_documents;
CREATE POLICY "Sellers and admins can view artifact documents"
  ON public.artifact_documents FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR (artifact_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = artifact_id AND artifacts.seller_id = auth.uid()
    ))
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND role = 'admin'
    )
  );

-- Re-create artifact document INSERT RLS Policy
DROP POLICY IF EXISTS "Sellers and admins can insert artifact documents" ON public.artifact_documents;
CREATE POLICY "Sellers and admins can insert artifact documents"
  ON public.artifact_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      uploaded_by = auth.uid()
      AND (
        artifact_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.artifacts
          WHERE artifacts.id = artifact_id AND artifacts.seller_id = auth.uid()
        )
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND role = 'admin'
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. SELLER VERIFICATION REQUESTS TABLE & TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.seller_verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  legal_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  country TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  government_id_url TEXT NOT NULL,
  address_proof_url TEXT NOT NULL,
  selfie_verification_url TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  bank_account TEXT NOT NULL,
  seller_agreement_accepted BOOLEAN NOT NULL DEFAULT false,
  permanent_ban_acknowledgement BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  admin_comments TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Optimize queries by indexing user_id and status
CREATE INDEX IF NOT EXISTS idx_seller_verification_requests_user ON public.seller_verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_verification_requests_status ON public.seller_verification_requests(status);

-- Enable RLS on requests
ALTER TABLE public.seller_verification_requests ENABLE ROW LEVEL SECURITY;

-- Define SELECT RLS Policy for verification requests
DROP POLICY IF EXISTS "Sellers can view their own verification requests" ON public.seller_verification_requests;
CREATE POLICY "Sellers can view their own verification requests"
  ON public.seller_verification_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Define INSERT RLS Policy for verification requests
DROP POLICY IF EXISTS "Sellers can create verification requests" ON public.seller_verification_requests;
CREATE POLICY "Sellers can create verification requests"
  ON public.seller_verification_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Define admin management RLS Policy
DROP POLICY IF EXISTS "Admins can manage all verification requests" ON public.seller_verification_requests;
CREATE POLICY "Admins can manage all verification requests"
  ON public.seller_verification_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND role = 'admin'
    )
  );

-- Auto-update updated_at for requests
DROP TRIGGER IF EXISTS update_seller_verification_requests_updated_at ON public.seller_verification_requests;
CREATE TRIGGER update_seller_verification_requests_updated_at
  BEFORE UPDATE ON public.seller_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Trigger updates profile role to 'seller' and status to 'active' on approval
CREATE OR REPLACE FUNCTION public.handle_seller_verification_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE public.profiles
    SET role = 'seller', status = 'active'
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create onboarding approval trigger
DROP TRIGGER IF EXISTS trg_handle_seller_verification_approval ON public.seller_verification_requests;
CREATE TRIGGER trg_handle_seller_verification_approval
  AFTER UPDATE ON public.seller_verification_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_seller_verification_approval();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. EXTEND AUCTION APPLICATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.auction_applications 
ADD COLUMN IF NOT EXISTS cover_letter TEXT,
ADD COLUMN IF NOT EXISTS requested_start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requested_end_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requested_starting_bid NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS requested_reserve_price NUMERIC(15, 2),
ADD COLUMN IF NOT EXISTS requested_bid_increment NUMERIC(15, 2) DEFAULT 100;

ALTER TABLE public.auction_applications 
ADD COLUMN IF NOT EXISTS verified_provenance BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS verified_authenticity BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS verified_originality BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS verified_condition BOOLEAN DEFAULT false NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. REBUILD RLS POLICIES ON RELATED TABLES TO USE 'seller' AND ENFORCE STATUS
-- ═══════════════════════════════════════════════════════════════════════════

-- A. Rebuild artifacts insertion policies
DROP POLICY IF EXISTS "Sellers can insert their own artifacts" ON public.artifacts;
CREATE POLICY "Sellers can insert their own artifacts"
  ON public.artifacts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = seller_id 
    AND 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('seller', 'admin') AND status = 'active'
    )
  );

-- B. Rebuild auction applications policies
DROP POLICY IF EXISTS "Sellers can create their own applications" ON public.auction_applications;
CREATE POLICY "Sellers can create their own applications"
  ON public.auction_applications FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = seller_id
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('seller', 'admin') AND status = 'active'
    )
  );

-- C. Rebuild auctions creation policies
DROP POLICY IF EXISTS "Sellers can insert auctions for their own artifacts" ON public.auctions;
CREATE POLICY "Sellers can insert auctions for their own artifacts"
  ON public.auctions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE id = artifact_id AND seller_id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('seller', 'admin') AND status = 'active'
    )
  );

COMMIT;
