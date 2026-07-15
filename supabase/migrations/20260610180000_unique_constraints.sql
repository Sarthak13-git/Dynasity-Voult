-- Migration: Add UNIQUE constraints to store_name and phone columns of public.profiles table
-- Created: 2026-06-10

BEGIN;

-- Add UNIQUE constraint on store_name with IF NOT EXISTS safety wrapper
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'profiles_store_name_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_store_name_key UNIQUE (store_name);
  END IF;
END $$;

-- Add UNIQUE constraint on phone with IF NOT EXISTS safety wrapper
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'profiles_phone_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_key UNIQUE (phone);
  END IF;
END $$;

COMMIT;
