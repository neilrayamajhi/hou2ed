import { env } from "../utils/env";
import { supabase } from "../lib/supabase";

type Address = {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type GeocodeResult = {
  lat: number;
  lng: number;
  placeId?: string;
  confidence?: number;
  components?: any;
};

// 1) Normalize an address into a stable string key
export function normalizeAddress(addr: Address): string {
  const parts = [addr.street, addr.city, addr.state, addr.zip]
    .filter(Boolean)
    .map((p) => String(p).trim().toLowerCase().replace(/\s+/g, " "));
  return parts.join(", ");
}

// 2) Cache helpers (Supabase table: geocoding_cache)
async function getCachedGeocode(normalized: string): Promise<GeocodeResult | null> {
  // Exact match lookup; normalized is already lowercased and trimmed
  const { data, error } = await supabase
    .from("geocoding_cache")
    .select("lat,lng,place_id,confidence,components")
    .eq("normalized_address", normalized);

  if (error) {
    console.warn("geocoding cache read error", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  const row = data[0] as any;
  return {
    lat: Number(row.lat),
    lng: Number(row.lng),
    placeId: row.place_id ?? undefined,
    confidence: row.confidence != null ? Number(row.confidence) : undefined,
    components: row.components ?? undefined,
  };
}

async function putCachedGeocode(
  normalized: string,
  value: GeocodeResult
): Promise<void> {
  const payload = {
    normalized_address: normalized,
    lat: value.lat,
    lng: value.lng,
    place_id: value.placeId ?? null,
    confidence: value.confidence ?? null,
    components: value.components ?? {},
    provider: "mapbox",
  };

  // Upsert by unique normalized_address index (case-insensitive handled by index on lower())
  const { error } = await supabase
    .from("geocoding_cache")
    .upsert(payload, { onConflict: "normalized_address" });

  if (error) {
    console.warn("geocoding cache write error", error);
  }
}

// 3) Call Mapbox Geocoding API when cache misses
async function geocodeWithMapbox(normalized: string): Promise<GeocodeResult | null> {
  const token = env.MAPBOX_TOKEN;
  if (!token) {
    console.warn("Mapbox token not configured: EXPO_PUBLIC_MAPBOX_TOKEN");
    return null;
  }

  const endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    normalized
  )}.json?access_token=${encodeURIComponent(token)}&limit=1`;

  try {
    const res = await fetch(endpoint);
    if (!res.ok) {
      console.warn("Mapbox geocoding failed", res.status);
      return null;
    }
    const json = await res.json();
    const feat = json?.features?.[0];
    if (!feat || !Array.isArray(feat.center)) return null;

    const [lng, lat] = feat.center;
    const placeId = feat.id as string | undefined;
    const confidence = typeof feat.relevance === "number" ? feat.relevance : undefined;
    const components = feat.context ?? {};

    return { lat: Number(lat), lng: Number(lng), placeId, confidence, components };
  } catch (e) {
    console.warn("Mapbox fetch error", e);
    return null;
  }
}

// 4) Public helper: cache-first geocode
export async function geocodeAddress(addr: Address): Promise<GeocodeResult | null> {
  const normalized = normalizeAddress(addr);
  if (!normalized) return null;

  // Try cache
  const cached = await getCachedGeocode(normalized);
  if (cached) return cached;

  // Call provider
  const fresh = await geocodeWithMapbox(normalized);
  if (!fresh) return null;

  // Store and return
  await putCachedGeocode(normalized, fresh);
  return fresh;
}

// Convenience: only geocode if missing coordinates
export async function ensureCoords(
  listing: { lat?: number | null; lng?: number | null; address?: string | null; city?: string | null; state?: string | null; zip_code?: string | null }
): Promise<{ lat: number; lng: number } | null> {
  if (listing.lat != null && listing.lng != null) {
    return { lat: Number(listing.lat), lng: Number(listing.lng) };
  }

  const result = await geocodeAddress({
    street: listing.address ?? null,
    city: listing.city ?? null,
    state: listing.state ?? null,
    zip: listing.zip_code ?? null,
  });
  return result;
}
