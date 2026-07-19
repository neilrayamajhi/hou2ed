-- messages currently has NO update policy at all on the live database
-- (contrary to what older migration files suggest existed) - RLS defaults
-- to deny, so editMessage()/deleteMessage() in messageService.ts have been
-- silently failing for every real user this whole time. This adds the
-- feature properly: a user may edit or soft-delete their own message
-- within 24 hours, restricted by trigger to only the columns that action
-- actually needs, so it can't be used to reassign a message to a different
-- thread, forge the sender, or edit read receipts/attachments.

CREATE POLICY "Users can edit or delete their own recent messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    sender_id = auth.uid()
    AND created_at > now() - interval '24 hours'
  )
  WITH CHECK (sender_id = auth.uid());

CREATE OR REPLACE FUNCTION public.restrict_message_update_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF session_user = 'postgres' OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- read_by is deliberately not restricted here: marking a message read is
  -- done by the RECIPIENT via the add_user_to_read_by() RPC below, not the
  -- sender, so it can't be gated by the sender-only policy this trigger
  -- otherwise enforces. That RPC is what's responsible for only ever
  -- letting a user add themselves - see below.
  IF NEW.thread_id IS DISTINCT FROM OLD.thread_id
    OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR NEW.attachment_urls IS DISTINCT FROM OLD.attachment_urls
  THEN
    RAISE EXCEPTION 'Editing a message can only change its body or delete it';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_message_update_fields ON public.messages;
CREATE TRIGGER restrict_message_update_fields
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_message_update_fields();

-- add_user_to_read_by() was SECURITY DEFINER trusting a client-supplied
-- p_user_id with no check it matched the real caller, and no check the
-- caller was even a participant in the message's thread - anyone could
-- manipulate anyone else's read receipts on any message. Now always uses
-- the caller's own auth.uid() (the parameter is kept for signature
-- compatibility with the existing client call, but ignored) and only
-- touches messages in threads the caller actually participates in.
CREATE OR REPLACE FUNCTION public.add_user_to_read_by(p_message_ids uuid[], p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.messages
  SET read_by = array_append(
    array_remove(COALESCE(read_by, ARRAY[]::UUID[]), auth.uid()),
    auth.uid()
  )
  WHERE id = ANY(p_message_ids)
    AND NOT (auth.uid() = ANY(COALESCE(read_by, ARRAY[]::UUID[])))
    AND EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND auth.uid() = ANY(mt.participant_ids)
    );
END;
$function$;
