-- CRITICAL FIX: get_email_from_username(p_username) was granted to `anon`
-- with no rate limiting of its own, and is directly callable via RPC,
-- completely bypassing the login-flow rate limiting added earlier this
-- session (that only gates loginUser()/signUpUser() in the app, not a
-- direct RPC call to this function). Verified live: a fully anonymous,
-- unauthenticated request with a guessed username returned the real
-- account's real email address instantly, with unlimited retries.
--
-- This is a real de-anonymization risk for this specific app: if an
-- abuser knows or guesses a domestic-violence survivor's username, they
-- could unmask their real email address with a single request. Rate
-- limiting is not a complete fix (an attacker can still eventually
-- succeed, and bulk enumeration across many different usernames isn't
-- addressed by a per-username limit), but it makes casual/scripted
-- enumeration impractical, matching the same defense-in-depth philosophy
-- as the login/signup rate limiting.
--
-- A more complete fix (e.g. CAPTCHA, IP-based limiting, or removing
-- username-based login entirely in favor of email-only) is a larger
-- product decision beyond a database migration - flagged as a follow-up.

CREATE OR REPLACE FUNCTION public.get_email_from_username(p_username text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE v_email TEXT;
  BEGIN
    IF NOT public.check_rate_limit('username_lookup:' || p_username, '900 seconds', 5) THEN
      RETURN NULL;
    END IF;

    SELECT email INTO v_email FROM public.profiles WHERE username = p_username LIMIT 1;
    RETURN v_email;
  END;
  $function$;
