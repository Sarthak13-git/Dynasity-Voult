-- Migration: Create Artifact Documents Table, Indexes, Storage Bucket, and Policies
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-13

BEGIN;

-- 1. Create artifact_documents table
CREATE TABLE IF NOT EXISTS public.artifact_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('provenance', 'certificate', 'authentication', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create index on artifact_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_artifact_documents_artifact_id ON public.artifact_documents(artifact_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.artifact_documents ENABLE ROW LEVEL SECURITY;

-- 4. Define RLS Policies for public.artifact_documents

-- Policy A: View policy (Sellers can view documents for their artifacts, Admins can view all)
DROP POLICY IF EXISTS "Sellers and admins can view artifact documents" ON public.artifact_documents;
CREATE POLICY "Sellers and admins can view artifact documents"
  ON public.artifact_documents FOR SELECT
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = artifact_id AND artifacts.seller_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND role = 'admin'
    )
  );

-- Policy B: Insert policy (Sellers can insert documents for their own artifacts, Admins can insert any)
DROP POLICY IF EXISTS "Sellers and admins can insert artifact documents" ON public.artifact_documents;
CREATE POLICY "Sellers and admins can insert artifact documents"
  ON public.artifact_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      uploaded_by = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.artifacts
        WHERE artifacts.id = artifact_id AND artifacts.seller_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND role = 'admin'
    )
  );

-- Policy C: Delete policy (Sellers can delete their own documents, Admins can delete any)
DROP POLICY IF EXISTS "Sellers and admins can delete artifact documents" ON public.artifact_documents;
CREATE POLICY "Sellers and admins can delete artifact documents"
  ON public.artifact_documents FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Create storage bucket for artifact documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('artifact-documents', 'artifact-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 6. Define Storage Policies in storage.objects table for 'artifact-documents' bucket

-- Policy A: Insert policy for uploads
DROP POLICY IF EXISTS "Authenticated users can upload to artifact-documents bucket" ON storage.objects;
CREATE POLICY "Authenticated users can upload to artifact-documents bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'artifact-documents'
  );

-- Policy B: Select policy for reading documents
DROP POLICY IF EXISTS "Sellers and admins can read from artifact-documents bucket" ON storage.objects;
CREATE POLICY "Sellers and admins can read from artifact-documents bucket"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'artifact-documents'
  );

-- Policy C: Delete policy for deleting documents
DROP POLICY IF EXISTS "Sellers and admins can delete from artifact-documents bucket" ON storage.objects;
CREATE POLICY "Sellers and admins can delete from artifact-documents bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'artifact-documents'
  );

COMMIT;
