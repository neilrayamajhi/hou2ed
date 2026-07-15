-- profiles.verification_status has never had a defined set of allowed
-- values (nothing writes to it today — there's no provider document
-- submission flow yet). Constrain it now so the new admin review screen
-- can't write a typo'd status. NULL remains allowed implicitly (a CHECK
-- constraint passes on NULL, only fails on an explicit false match).

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_verification_status_check
  CHECK (verification_status IN ('unsubmitted', 'pending', 'verified', 'rejected'));
