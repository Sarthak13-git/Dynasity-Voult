-- Migration: Marketplace Isolation & Slug Backfill
-- Enables automatic syncing of public.artifacts.status based on public.auctions lifecycle.
-- Backfills any NULL slugs and NULL buy_now_price for existing artifacts.

BEGIN;

-- 1. Create or replace the synchronization function
CREATE OR REPLACE FUNCTION public.sync_artifact_status_on_auction_change()
RETURNS TRIGGER AS $$
DECLARE
  v_has_buy_price BOOLEAN;
BEGIN
  -- Fetch whether the artifact has a buy now price
  SELECT (buy_now_price IS NOT NULL) INTO v_has_buy_price
  FROM public.artifacts
  WHERE id = COALESCE(NEW.artifact_id, OLD.artifact_id);

  IF TG_OP = 'INSERT' THEN
    -- On create, move artifact to 'on_auction'
    UPDATE public.artifacts
    SET status = 'on_auction'
    WHERE id = NEW.artifact_id;

  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.winner_id IS DISTINCT FROM OLD.winner_id THEN
      IF NEW.status IN ('upcoming', 'live') THEN
        UPDATE public.artifacts
        SET status = 'on_auction'
        WHERE id = NEW.artifact_id;
      ELSIF NEW.status = 'cancelled' THEN
        UPDATE public.artifacts
        SET status = CASE WHEN v_has_buy_price THEN 'available'::text ELSE 'archived'::text END
        WHERE id = NEW.artifact_id;
      ELSIF NEW.status = 'ended' THEN
        IF NEW.winner_id IS NOT NULL THEN
          UPDATE public.artifacts
          SET status = 'sold'
          WHERE id = NEW.artifact_id;
        ELSE
          UPDATE public.artifacts
          SET status = CASE WHEN v_has_buy_price THEN 'available'::text ELSE 'archived'::text END
          WHERE id = NEW.artifact_id;
        END IF;
      END IF;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- If auction listing is deleted, revert artifact status
    UPDATE public.artifacts
    SET status = CASE WHEN v_has_buy_price THEN 'available'::text ELSE 'archived'::text END
    WHERE id = OLD.artifact_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_sync_artifact_status_on_auction_change ON public.auctions;
CREATE TRIGGER trg_sync_artifact_status_on_auction_change
  AFTER INSERT OR UPDATE OR DELETE ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_artifact_status_on_auction_change();

-- 3. Backfill slugs for existing artifacts with NULL slugs
UPDATE public.artifacts
SET slug = lower(regexp_replace(regexp_replace(trim(title), '\s+', '-', 'g'), '[^a-zA-Z0-9-]', '', 'g'))
    || '-' 
    || substring(id::text, 1, 8)
WHERE slug IS NULL;

-- 4. Backfill buy_now_price for existing artifacts with NULL buy_now_price
UPDATE public.artifacts
SET buy_now_price = estimated_value
WHERE buy_now_price IS NULL AND status = 'available';

COMMIT;
