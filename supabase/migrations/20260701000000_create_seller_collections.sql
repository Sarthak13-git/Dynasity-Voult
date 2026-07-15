BEGIN;

-- TABLES

CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    visibility TEXT NOT NULL DEFAULT 'private',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- CHECK constraints instead of PostgreSQL ENUMs
    CONSTRAINT check_collections_status CHECK (status IN ('draft', 'published', 'archived', 'hidden')),
    CONSTRAINT check_collections_visibility CHECK (visibility IN ('public', 'private')),
    
    -- URL-safe lowercase slug validation
    CONSTRAINT check_collections_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
    
    -- Composite unique constraint on seller_id and title
    CONSTRAINT uniq_seller_collection_title UNIQUE (seller_id, title)
);

CREATE TABLE IF NOT EXISTS public.collection_artifacts (
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Composite primary key on collection_id and artifact_id
    PRIMARY KEY (collection_id, artifact_id)
);

-- INDEXES

-- Case-insensitive unique constraint index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_slug_lower_uniq 
ON public.collections (LOWER(slug));

-- Search lookup index on slug
CREATE INDEX IF NOT EXISTS idx_collections_slug 
ON public.collections (slug);

-- Index on seller_id + status
CREATE INDEX IF NOT EXISTS idx_collections_seller_id_status 
ON public.collections (seller_id, status);

-- Index on is_featured and created_at
CREATE INDEX IF NOT EXISTS idx_collections_featured_created 
ON public.collections (is_featured, created_at);

-- Index on artifact_id for lookup inversion
CREATE INDEX IF NOT EXISTS idx_collection_artifacts_artifact_id 
ON public.collection_artifacts (artifact_id);

-- Index on collection_id + sort_order
CREATE INDEX IF NOT EXISTS idx_collection_artifacts_sort_order 
ON public.collection_artifacts (collection_id, sort_order);

-- FUNCTIONS

CREATE OR REPLACE FUNCTION public.fn_update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.fn_validate_collection_artifact_ownership()
RETURNS TRIGGER AS $$
DECLARE
    v_collection_owner UUID;
    v_artifact_owner UUID;
    v_status TEXT;
    v_price NUMERIC;
    v_has_auction BOOLEAN;
    v_has_active_app BOOLEAN;
BEGIN
    -- 1. Fetch collection owner
    SELECT seller_id INTO v_collection_owner 
    FROM public.collections 
    WHERE id = NEW.collection_id;
    
    -- 2. Fetch artifact status, price, and owner
    SELECT seller_id, status, buy_now_price INTO v_artifact_owner, v_status, v_price
    FROM public.artifacts 
    WHERE id = NEW.artifact_id;
    
    -- 3. Check basic ownership matching
    IF v_collection_owner IS NULL OR v_artifact_owner IS NULL OR v_collection_owner <> v_artifact_owner THEN
        RAISE EXCEPTION 'Ownership Mismatch: Seller must own both the collection and the linked artifact.';
    END IF;
    
    -- 4. Check eligibility criteria: status must be 'available' and buy_now_price must not be null
    IF v_status <> 'available' OR v_price IS NULL THEN
        RAISE EXCEPTION 'Artifact Ineligibility: Linked artifact must have status "available" and a valid buy_now_price.';
    END IF;
    
    -- 5. Check if it has any auction links
    SELECT EXISTS (
        SELECT 1 FROM public.auctions 
        WHERE artifact_id = NEW.artifact_id
    ) INTO v_has_auction;
    
    IF v_has_auction THEN
        RAISE EXCEPTION 'Artifact Ineligibility: Linked artifact cannot belong to an auction.';
    END IF;
    
    -- 6. Check if it has any active auction applications
    SELECT EXISTS (
        SELECT 1 FROM public.auction_applications 
        WHERE artifact_id = NEW.artifact_id AND status IN ('pending', 'approved', 'under_review')
    ) INTO v_has_active_app;
    
    IF v_has_active_app THEN
        RAISE EXCEPTION 'Artifact Ineligibility: Linked artifact has an active auction application.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- TRIGGERS

DROP TRIGGER IF EXISTS trigger_update_collections_updated_at ON public.collections;
CREATE TRIGGER trigger_update_collections_updated_at
BEFORE UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.fn_update_collections_updated_at();

DROP TRIGGER IF EXISTS trg_validate_collection_artifact_ownership ON public.collection_artifacts;
CREATE TRIGGER trg_validate_collection_artifact_ownership
BEFORE INSERT OR UPDATE ON public.collection_artifacts
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_collection_artifact_ownership();

-- RLS

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_artifacts ENABLE ROW LEVEL SECURITY;

-- collections policies
DROP POLICY IF EXISTS "Public published collections are viewable by everyone" ON public.collections;
CREATE POLICY "Public published collections are viewable by everyone" 
ON public.collections FOR SELECT 
USING (status = 'published' AND visibility = 'public');

DROP POLICY IF EXISTS "Sellers can manage their own collections" ON public.collections;
CREATE POLICY "Sellers can manage their own collections" 
ON public.collections FOR ALL 
USING (
    auth.uid() = seller_id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    auth.uid() = seller_id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- collection_artifacts policies
DROP POLICY IF EXISTS "Collection artifacts are viewable by everyone" ON public.collection_artifacts;
CREATE POLICY "Collection artifacts are viewable by everyone" 
ON public.collection_artifacts FOR SELECT 
USING (
    (
        EXISTS (
            SELECT 1 FROM public.collections 
            WHERE id = collection_id AND status = 'published' AND visibility = 'public'
        )
        AND EXISTS (
            SELECT 1 FROM public.artifacts a
            WHERE a.id = artifact_id
              AND a.seller_id IS NOT NULL
              AND a.status = 'available'
              AND a.buy_now_price IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM public.auctions auc 
                  WHERE auc.artifact_id = a.id
              )
              AND NOT EXISTS (
                  SELECT 1 FROM public.auction_applications app 
                  WHERE app.artifact_id = a.id AND app.status IN ('pending', 'approved', 'under_review')
              )
        )
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Sellers can manage their own collection artifacts" ON public.collection_artifacts;
CREATE POLICY "Sellers can manage their own collection artifacts" 
ON public.collection_artifacts FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.collections 
        WHERE id = collection_id AND (
            seller_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.collections 
        WHERE id = collection_id AND (
            seller_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    )
);

-- POSTGREST

NOTIFY pgrst, 'reload schema';

COMMIT;
