-- Create a public function to get active listings
-- This bypasses RLS for public data that seekers should be able to see

CREATE OR REPLACE FUNCTION public.get_active_listings(
    user_lat DOUBLE PRECISION DEFAULT NULL,
    user_lng DOUBLE PRECISION DEFAULT NULL,
    radius_miles INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    housing_type TEXT,
    unit_beds JSONB,
    availability JSONB,
    cost JSONB,
    amenities JSONB,
    services JSONB,
    rules JSONB,
    eligibility JSONB,
    images TEXT[],
    provider_id UUID,
    verified BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.title,
        l.description,
        l.address,
        l.city,
        l.state,
        l.zip_code,
        l.lat,
        l.lng,
        l.housing_type,
        l.unit_beds,
        l.availability,
        l.cost,
        l.amenities,
        l.services,
        l.rules,
        l.eligibility,
        l.images,
        l.provider_id,
        l.verified,
        l.created_at,
        l.updated_at
    FROM public.listings l
    WHERE l.is_active = true
    ORDER BY l.created_at DESC
    LIMIT 100;
END;
$$;

-- Grant execute permission to anonymous users (seekers)
GRANT EXECUTE ON FUNCTION public.get_active_listings TO anon;
GRANT EXECUTE ON FUNCTION public.get_active_listings TO authenticated;

-- Create a simpler version without parameters for testing
CREATE OR REPLACE FUNCTION public.get_all_active_listings()
RETURNS TABLE (
    id UUID,
    title TEXT,
    is_active BOOLEAN,
    provider_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.id,
        l.title,
        l.is_active,
        l.provider_id
    FROM public.listings l
    WHERE l.is_active = true
    ORDER BY l.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_active_listings TO anon;
GRANT EXECUTE ON FUNCTION public.get_all_active_listings TO authenticated;