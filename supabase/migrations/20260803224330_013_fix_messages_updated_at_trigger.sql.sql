-- Fix: the trigger update_messages_updated_at called update_updated_at_column()
-- which sets NEW.updated_at = NOW(), but the messages table has no updated_at column.
-- This caused every UPDATE on messages to fail with:
--   ERROR 42703: record "new" has no field "updated_at"
--
-- The shared function update_updated_at_column() is also used by storage.objects,
-- so we must NOT modify it. Instead, drop the broken trigger and replace it with
-- a function that checks column existence at runtime, making it safe for tables
-- that lack an updated_at column.

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;

CREATE OR REPLACE FUNCTION public.set_messages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'updated_at'
  ) THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.set_messages_updated_at();
