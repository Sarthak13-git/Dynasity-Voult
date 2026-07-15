-- Migration: Add emails_sent column to auctions table
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-13

BEGIN;

-- Add emails_sent column if it doesn't already exist
ALTER TABLE public.auctions 
ADD COLUMN IF NOT EXISTS emails_sent BOOLEAN DEFAULT false;

-- Create index to quickly fetch ended auctions that haven't sent emails yet
CREATE INDEX IF NOT EXISTS idx_auctions_emails_sent 
ON public.auctions(status, emails_sent);

COMMIT;
