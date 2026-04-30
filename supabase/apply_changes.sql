-- 1. Add buy_now_price column to artifacts
ALTER TABLE public.artifacts 
ADD COLUMN IF NOT EXISTS buy_now_price NUMERIC(15, 2);

-- 2. Update category check constraint
-- First we need to drop the old constraint (it's usually named artifacts_category_check)
ALTER TABLE public.artifacts 
DROP CONSTRAINT IF EXISTS artifacts_category_check;

-- Then add the new one with the updated categories
ALTER TABLE public.artifacts 
ADD CONSTRAINT artifacts_category_check CHECK (
  category IN (
    'painting', 'sculpture', 'manuscript', 'jewelry',
    'antiquity', 'decorative_art', 'timepiece', 'textile',
    'weapon', 'numismatic', 'other', 'arms_and_armor', 'objets_d_art'
  )
);

-- 3. Create Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, artifact_id)
);

-- 4. Set up Row Level Security for Favorites
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Drop policy if it exists so we can recreate it cleanly
DROP POLICY IF EXISTS "Users can manage their own favorites" ON public.favorites;

CREATE POLICY "Users can manage their own favorites"
  ON public.favorites FOR ALL
  USING (auth.uid() = user_id);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_artifact ON public.favorites(artifact_id);
