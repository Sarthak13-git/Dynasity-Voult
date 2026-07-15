-- Migration: Add 'pending_auction_approval' to artifacts.status check constraint
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-18

BEGIN;

-- 1. Drop existing status check constraint
ALTER TABLE public.artifacts
DROP CONSTRAINT IF EXISTS artifacts_status_check;

-- 2. Add updated status check constraint allowing 'pending_auction_approval'
ALTER TABLE public.artifacts
ADD CONSTRAINT artifacts_status_check CHECK (
  status IN (
    'archived', 
    'available', 
    'on_auction', 
    'sold', 
    'on_exhibition', 
    'reserved', 
    'pending_auction_approval'
  )
);

COMMIT;
