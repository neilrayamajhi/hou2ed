-- Create saved_search_alerts table for notifying users of new matching listings

-- Create saved_search_alerts table
CREATE TABLE IF NOT EXISTS public.saved_search_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_search_listing_alert UNIQUE (saved_search_id, listing_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_search_id ON public.saved_search_alerts(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_user_id ON public.saved_search_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_listing_id ON public.saved_search_alerts(listing_id);
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_seen ON public.saved_search_alerts(seen) WHERE seen = false;
CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_created_at ON public.saved_search_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.saved_search_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_search_alerts

-- Users can view their own alerts
CREATE POLICY "Users can view their own alerts"
ON public.saved_search_alerts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own alerts (mark as seen)
CREATE POLICY "Users can update their own alerts"
ON public.saved_search_alerts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own alerts
CREATE POLICY "Users can delete their own alerts"
ON public.saved_search_alerts FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- System can create alerts (this would be done via a function/cron job)
CREATE POLICY "System can create alerts"
ON public.saved_search_alerts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_search_alerts TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Create a function to automatically populate user_id from saved_search
CREATE OR REPLACE FUNCTION public.populate_alert_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically set user_id from the saved_search
  SELECT user_id INTO NEW.user_id
  FROM public.saved_searches
  WHERE id = NEW.saved_search_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically populate user_id
DROP TRIGGER IF EXISTS populate_alert_user_id_trigger ON public.saved_search_alerts;
CREATE TRIGGER populate_alert_user_id_trigger
  BEFORE INSERT ON public.saved_search_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.populate_alert_user_id();
