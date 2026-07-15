-- Migration: Recreate Artifact Documents Table, Constraints, RLS, Validation Functions and Triggers
-- Target: Supabase PostgreSQL Database
-- Date: 2026-07-08

BEGIN;

-- Drop trigger first to prevent execution during table replacement
DROP TRIGGER IF EXISTS trg_revalidate_artifact_documents ON public.artifact_documents;
DROP FUNCTION IF EXISTS public.tg_fn_revalidate_artifact_documents();
DROP FUNCTION IF EXISTS public.fn_artifact_has_required_documents(UUID);

-- Drop existing artifact_documents table
DROP TABLE IF EXISTS public.artifact_documents CASCADE;

-- Create public.artifact_documents table matching new schema requirements
CREATE TABLE public.artifact_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT artifact_documents_document_type_check CHECK (
    document_type IN (
      'provenance_record',
      'certificate_of_authenticity',
      'government_approval_certificate',
      'additional_document'
    )
  )
);

-- Create required indexes
CREATE INDEX IF NOT EXISTS idx_artifact_documents_artifact_id ON public.artifact_documents(artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_documents_document_type ON public.artifact_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_artifact_documents_art_id_doc_type ON public.artifact_documents(artifact_id, document_type);

-- Enable RLS
ALTER TABLE public.artifact_documents ENABLE ROW LEVEL SECURITY;

-- Define RLS Policies for public.artifact_documents

-- 1. SELLER POLICIES
-- Sellers can select documents for their own artifacts
DROP POLICY IF EXISTS "Sellers can select own artifact documents" ON public.artifact_documents;
CREATE POLICY "Sellers can select own artifact documents"
  ON public.artifact_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = artifact_documents.artifact_id
        AND artifacts.seller_id = auth.uid()
    )
  );

-- Sellers can insert documents for their own artifacts
DROP POLICY IF EXISTS "Sellers can insert own artifact documents" ON public.artifact_documents;
CREATE POLICY "Sellers can insert own artifact documents"
  ON public.artifact_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = artifact_id
        AND artifacts.seller_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Sellers can update documents for their own artifacts
DROP POLICY IF EXISTS "Sellers can update own artifact documents" ON public.artifact_documents;
CREATE POLICY "Sellers can update own artifact documents"
  ON public.artifact_documents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = artifact_documents.artifact_id
        AND artifacts.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = artifact_id
        AND artifacts.seller_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Sellers can delete documents for their own artifacts
DROP POLICY IF EXISTS "Sellers can delete own artifact documents" ON public.artifact_documents;
CREATE POLICY "Sellers can delete own artifact documents"
  ON public.artifact_documents FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = artifact_documents.artifact_id
        AND artifacts.seller_id = auth.uid()
    )
  );

-- 2. ADMIN POLICY
-- Admins have full access to all artifact documents
DROP POLICY IF EXISTS "Admins have full access to artifact documents" ON public.artifact_documents;
CREATE POLICY "Admins have full access to artifact documents"
  ON public.artifact_documents FOR ALL
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

-- 3. PUBLIC POLICY
-- Public can select documents of active, available artifacts owned by non-suspended sellers
DROP POLICY IF EXISTS "Public can select documents of active available artifacts" ON public.artifact_documents;
CREATE POLICY "Public can select documents of active available artifacts"
  ON public.artifact_documents FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts a
      JOIN public.profiles p ON a.seller_id = p.id
      WHERE a.id = artifact_documents.artifact_id
        AND a.status = 'available'
        AND p.status <> 'suspended'
    )
  );

-- Create database validation function
CREATE OR REPLACE FUNCTION public.fn_artifact_has_required_documents(artifact_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_provenance BOOLEAN;
  has_certificate BOOLEAN;
  has_gov_approval BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.artifact_documents
    WHERE artifact_id = artifact_id_param AND document_type = 'provenance_record'
  ) INTO has_provenance;

  SELECT EXISTS (
    SELECT 1 FROM public.artifact_documents
    WHERE artifact_id = artifact_id_param AND document_type = 'certificate_of_authenticity'
  ) INTO has_certificate;

  SELECT EXISTS (
    SELECT 1 FROM public.artifact_documents
    WHERE artifact_id = artifact_id_param AND document_type = 'government_approval_certificate'
  ) INTO has_gov_approval;

  RETURN (has_provenance AND has_certificate AND has_gov_approval);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.tg_fn_revalidate_artifact_documents()
RETURNS TRIGGER AS $$
DECLARE
  target_artifact_id UUID;
  has_required BOOLEAN;
  curr_status TEXT;
BEGIN
  -- Determine which artifact to validate
  IF TG_OP = 'DELETE' THEN
    target_artifact_id := OLD.artifact_id;
  ELSE
    target_artifact_id := NEW.artifact_id;
  END IF;

  -- Validate documents for the target artifact
  has_required := public.fn_artifact_has_required_documents(target_artifact_id);

  IF NOT has_required THEN
    -- Check if the artifact status is 'available' and needs to be demoted to 'draft'
    SELECT status INTO curr_status FROM public.artifacts WHERE id = target_artifact_id;
    IF curr_status = 'available' THEN
      UPDATE public.artifacts
      SET status = 'draft'
      WHERE id = target_artifact_id;
    END IF;
  END IF;

  -- If it's an UPDATE and artifact_id changed, also validate the OLD artifact
  IF TG_OP = 'UPDATE' AND OLD.artifact_id <> NEW.artifact_id THEN
    has_required := public.fn_artifact_has_required_documents(OLD.artifact_id);
    IF NOT has_required THEN
      SELECT status INTO curr_status FROM public.artifacts WHERE id = OLD.artifact_id;
      IF curr_status = 'available' THEN
        UPDATE public.artifacts
        SET status = 'draft'
        WHERE id = OLD.artifact_id;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trg_revalidate_artifact_documents
AFTER INSERT OR UPDATE OR DELETE ON public.artifact_documents
FOR EACH ROW
EXECUTE FUNCTION public.tg_fn_revalidate_artifact_documents();

COMMIT;
