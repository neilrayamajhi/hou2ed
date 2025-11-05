-- Fix messaging system
ALTER TABLE public.messages
ALTER COLUMN application_id DROP NOT NULL;

-- Add RPC for performance
CREATE OR REPLACE FUNCTION public.add_user_to_read_by(
  p_message_ids UUID[],
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.messages
  SET read_by = array_append(
    array_remove(COALESCE(read_by, ARRAY[]::UUID[]), p_user_id),
    p_user_id
  )
  WHERE id = ANY(p_message_ids)
    AND NOT (p_user_id = ANY(COALESCE(read_by, ARRAY[]::UUID[])));
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION public.add_user_to_read_by(UUID[], UUID) TO authenticated;

-- Verify the fix
SELECT column_name, is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name = 'application_id'
  AND table_schema = 'public';