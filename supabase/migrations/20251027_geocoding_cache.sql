-- Geocoding cache table for Mapbox (or other providers)
-- Stores normalized address text and resulting coordinates

create table if not exists public.geocoding_cache (
  id uuid primary key default gen_random_uuid(),
  normalized_address text not null,
  -- optional: simple hash if you later want to avoid storing the full text
  address_hash text,
  provider text not null default 'mapbox',
  lat decimal(10,8) not null,
  lng decimal(11,8) not null,
  components jsonb default '{}'::jsonb,
  place_id text,
  confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique on normalized address to dedupe exact matches
create unique index if not exists geocache_unique_normalized_address
  on public.geocoding_cache (lower(normalized_address));

-- Fast case-insensitive lookups
create index if not exists geocache_idx_norm_addr
  on public.geocoding_cache using btree (lower(normalized_address));

-- Basic trigger to keep updated_at fresh
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'update_geocoding_cache_updated_at'
  ) then
    create trigger update_geocoding_cache_updated_at
      before update on public.geocoding_cache
      for each row execute function public.update_updated_at();
  end if;
end $$;

-- Note on RLS: this cache is benign but can contain address text.
-- For MVP we leave RLS disabled. Consider adding RLS policies later
-- so clients can only select/insert by exact normalized address.

