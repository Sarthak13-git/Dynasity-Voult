-- ============================================================
-- Migration: Fix artifact status CHECK constraint to include
--            'draft' status needed by document validation trigger
-- ============================================================
--
-- ROOT CAUSE:
--   The trigger function tg_fn_revalidate_artifact_documents() in migration
--   20260708000000_create_artifact_documents_v2.sql tries to set
--   artifacts.status = 'draft' when required documents are incomplete.
--   However, the artifacts_status_check constraint (last updated in
--   20260618000000_add_pending_auction_approval_status.sql) does NOT include
--   'draft' as a valid value.
--
--   Timeline of failure:
--     1. Seller creates product → artifact inserted as 'available' ✓
--     2. First document uploaded → INSERT to artifact_documents fires
--     3. AFTER INSERT trigger tg_fn_revalidate_artifact_documents fires
--     4. fn_artifact_has_required_documents() returns FALSE (only 1/3 docs)
--     5. Trigger tries: UPDATE artifacts SET status = 'draft' ...
--     6. CHECK constraint rejects 'draft' → entire INSERT transaction ABORTS
--     7. API returns: "Failed to register document database entry."
--     8. Seller is blocked from creating products.
--
-- FIX:
--   1. Add 'draft' to the artifacts.status CHECK constraint.
--   2. Change the trigger's intermediate state from 'draft' to 'pending_review'
--      which is semantically more accurate AND was already allowed. Actually,
--      simplest and safest fix is just to add 'draft' to the constraint.
--   3. Also update the API route to create artifacts as 'draft' initially
--      and publish to 'available' only AFTER all documents upload successfully.
--      (This is already the intended workflow in add-product/page.tsx)
--
-- SAFE: This migration only widens the CHECK constraint.
--       No data is modified. No tables are dropped.
-- ============================================================

BEGIN;

-- 1. Drop the existing status check constraint
ALTER TABLE public.artifacts
  DROP CONSTRAINT IF EXISTS artifacts_status_check;

-- 2. Re-add with 'draft' included
--    'draft'    → artifact created but documents not yet uploaded
--    'available' → fully published with all required documents
--    All other statuses remain unchanged
ALTER TABLE public.artifacts
  ADD CONSTRAINT artifacts_status_check CHECK (
    status IN (
      'draft',
      'archived',
      'available',
      'on_auction',
      'sold',
      'on_exhibition',
      'reserved',
      'pending_auction_approval'
    )
  );

-- 3. Update the products API default: artifacts created without documents
--    should start as 'draft', not 'available'. The trigger will prevent
--    'available' status while docs are incomplete anyway, but starting as
--    'draft' is more semantically correct and avoids trigger downgrades.
--    NOTE: The actual change is in the API route (see step B in the code fix).
--    This SQL just ensures the constraint accepts 'draft'.

COMMIT;
