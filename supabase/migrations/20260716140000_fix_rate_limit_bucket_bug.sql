-- CRITICAL FIX: check_rate_limit() has been silently non-functional
-- whenever called with a window shorter than "time since the top of the
-- hour" - which, in practice, is most of every hour.
--
-- Root cause: it bucketed window_start by truncating to the top of the
-- clock HOUR (date_trunc('hour', now())), completely independent of the
-- caller-supplied p_window. Its own cleanup step deletes any row where
-- window_start < now() - p_window. With a short p_window (e.g. the 900
-- seconds / 15 minutes used for login/signup rate limiting), that delete
-- condition becomes true the moment more than 15 minutes have passed
-- since the top of the hour - deleting the row and recreating it fresh
-- with count=1 on almost every call, so the count could never actually
-- accumulate past 1. Verified live: calling it repeatedly with the same
-- key and a 900-second window never blocked, and the row was gone
-- entirely moments after being created.
--
-- This means the server-side login/signup rate limiting added earlier
-- this session, and the username-lookup rate limiting added minutes ago,
-- have both been providing effectively no real protection - the RPC
-- always returned true.
--
-- Fixed by aligning window_start to p_window-sized buckets since epoch
-- (a standard fixed-window rate-limiter pattern) instead of a fixed,
-- window-independent hour truncation - the current bucket is now always
-- within p_window of now(), so the cleanup delete correctly leaves it
-- alone.

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_window interval, p_max integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_window_seconds double precision := extract(epoch from p_window);
  v_window_start    timestamptz := to_timestamp(
    floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds
  );
  v_count           integer;
begin
  delete from rate_limits where window_start < now() - p_window;

  insert into rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$function$;
