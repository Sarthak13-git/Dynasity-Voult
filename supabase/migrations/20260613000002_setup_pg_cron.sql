-- Migration: Set up pg_cron extension and schedule automatic auction jobs
-- Target: Supabase PostgreSQL Database
-- Created: 2026-06-13

-- 1. Enable the pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Prevent duplication of cron jobs on migration re-runs by unscheduling them first if they exist
SELECT cron.unschedule(jobname) 
FROM cron.job 
WHERE jobname IN ('activate-auctions', 'settle-auctions');

-- 3. Schedule the cron job to activate scheduled auctions every minute
SELECT cron.schedule(
  'activate-auctions',              -- unique job name
  '* * * * *',                      -- cron schedule (every minute)
  'SELECT public.activate_scheduled_auctions();' -- sql command to execute
);

-- 4. Schedule the cron job to settle expired auctions every minute
SELECT cron.schedule(
  'settle-auctions',                -- unique job name
  '* * * * *',                      -- cron schedule (every minute)
  'SELECT public.settle_expired_auctions();' -- sql command to execute
);
