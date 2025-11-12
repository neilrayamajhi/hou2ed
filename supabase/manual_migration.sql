-- Manual migration to create saved_searches and saved_search_alerts tables
-- Run this in the Supabase SQL Editor if automatic migrations fail

-- ============================================
-- CREATE SAVED_SEARCHES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_enabled BOOLEAN NOT NULL DEFAULT false,
  notification_frequency TEXT CHECK (notification_frequency IN ('instant', 'daily', 'weekly')),
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_search_name UNIQUE (user_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created_at ON public.saved_searches(created_at DESC);

-- Create trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_saved_searches_updated_at ON public.saved_searches;
CREATE TRIGGER update_saved_searches_updated_at
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can view their own saved searches"
ON public.saved_searches FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can create their own saved searches"
ON public.saved_searches FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can update their own saved searches"
ON public.saved_searches FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved searches" ON public.saved_searches;
CREATE POLICY "Users can delete their own saved searches"
ON public.saved_searches FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;

-- ============================================
-- CREATE SAVED_SEARCH_ALERTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.saved_search_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_search_listing_alert UNIQUE (saved_search_id, listing_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_search_id ON public.saved_search_alerts(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_user_id ON public.saved_search_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_listing_id ON public.saved_search_alerts(listing_id);
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_seen ON public.saved_search_alerts(seen) WHERE seen = false;
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_created_at ON public.saved_search_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.saved_search_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.saved_search_alerts;
CREATE POLICY "Users can view their own alerts"
ON public.saved_search_alerts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own alerts" ON public.saved_search_alerts;
CREATE POLICY "Users can update their own alerts"
ON public.saved_search_alerts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own alerts" ON public.saved_search_alerts;
CREATE POLICY "Users can delete their own alerts"
ON public.saved_search_alerts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can create alerts" ON public.saved_search_alerts;
CREATE POLICY "System can create alerts"
ON public.saved_search_alerts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_search_alerts TO authenticated;

-- Create trigger function to populate user_id
CREATE OR REPLACE FUNCTION public.populate_alert_user_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT user_id INTO NEW.user_id
  FROM public.saved_searches
  WHERE id = NEW.saved_search_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS populate_alert_user_id_trigger ON public.saved_search_alerts;
CREATE TRIGGER populate_alert_user_id_trigger
  BEFORE INSERT ON public.saved_search_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_alert_user_id();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Saved searches tables created successfully!';
END $$;
