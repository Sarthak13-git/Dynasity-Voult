-- Migration: Create Order Status History Table, Add Courier and Update RLS Policies
-- Target: Supabase PostgreSQL Database
-- Date: 2026-07-08

BEGIN;

-- 1. Extend orders table with courier_name column
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS courier_name TEXT;

-- 2. Modify constraint on orders status to support all required workflows
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (
  status IN ('pending', 'payment_received', 'paid', 'packed', 'shipped', 'delivered', 'cancelled', 'refunded')
);

-- 3. Create public.order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  remarks TEXT,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Indexes for quick logs queries
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);

-- 5. Enable RLS on history table
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies on public.order_status_history
CREATE POLICY "Buyers can view their own order status history"
  ON public.order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_status_history.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can view order status history for their own artifacts"
  ON public.order_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      JOIN public.artifacts ON orders.artifact_id = artifacts.id
      WHERE orders.id = order_status_history.order_id
        AND artifacts.seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins have full access to status history"
  ON public.order_status_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 7. Add UPDATE policy for Sellers on public.orders (necessary for managing statuses)
DROP POLICY IF EXISTS "Sellers can update orders for their own artifacts" ON public.orders;
CREATE POLICY "Sellers can update orders for their own artifacts"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = orders.artifact_id
        AND artifacts.seller_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.artifacts
      WHERE artifacts.id = orders.artifact_id
        AND artifacts.seller_id = auth.uid()
    )
  );

-- 8. Trigger to automatically log history on order insert or status update
CREATE OR REPLACE FUNCTION public.tg_fn_log_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (order_id, status, remarks, changed_by)
    VALUES (
      NEW.id,
      NEW.status,
      'Status updated to ' || NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_order_status_history ON public.orders;
CREATE TRIGGER trg_log_order_status_history
  AFTER INSERT OR UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_fn_log_order_status_history();

COMMIT;
