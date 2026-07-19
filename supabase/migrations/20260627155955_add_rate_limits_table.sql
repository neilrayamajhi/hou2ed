-- Rate limiting table: tracks request counts per key per time window.
-- Used by edge functions to enforce per-IP limits without an external cache.
create table if not exists rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        integer     not null default 1,
  primary key (key, window_start)
);

create index if not exists rate_limits_window_start_idx on rate_limits (window_start);

-- Atomically increments the counter for (key, current hour window) and
-- returns true if the resulting count is within the allowed maximum.
-- Stale rows (older than p_window) are cleaned up on each call.
create or replace function check_rate_limit(
  p_key    text,
  p_window interval,
  p_max    integer
) returns boolean language plpgsql security definer as $$
declare
  v_window_start timestamptz := date_trunc('hour', now());
  v_count        integer;
begin
  delete from rate_limits where window_start < now() - p_window;

  insert into rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;
