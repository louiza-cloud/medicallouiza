/*
# Fix messaging: realtime publication, UPDATE/DELETE policies, and mark_messages_read

1. Realtime
- Add `messages` and `typing_indicators` to the supabase_realtime publication.
- Without this, the frontend's realtime subscriptions never receive INSERT/UPDATE/DELETE events,
  so messages sent by the doctor never appear in real time for the patient (and vice versa).

2. RLS policies on `messages`
- The current UPDATE policy (`messages_update_own`) restricts to `sender_type = 'patient'`,
  and the DELETE policy (`messages_delete_own`) does the same. This blocks:
  - The doctor (sender_type = 'doctor') from editing/deleting their own messages.
  - The `mark_messages_read` function from updating doctor messages' status to 'read'
    (the function runs with caller privileges, and the UPDATE policy's USING filters on
    sender_type = 'patient', so the UPDATE on doctor rows is silently dropped).
- Replace both policies with permissive ones (`TO anon, authenticated`) since this is a
  no-auth messaging app where conversation access is gated by conversation_id, not auth.

3. mark_messages_read function
- Recreate as SECURITY DEFINER so the internal UPDATE on messages bypasses RLS, ensuring
  message status/read_at is correctly updated regardless of caller role.
*/

-- 1. Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;

-- 2. Fix UPDATE policy on messages
DROP POLICY IF EXISTS "messages_update_own" ON messages;
DROP POLICY IF EXISTS "messages_update_authenticated" ON messages;
CREATE POLICY "messages_update_all" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Fix DELETE policy on messages
DROP POLICY IF EXISTS "messages_delete_own" ON messages;
DROP POLICY IF EXISTS "messages_delete_authenticated" ON messages;
CREATE POLICY "messages_delete_all" ON messages FOR DELETE
  TO anon, authenticated USING (true);

-- 4. Recreate mark_messages_read as SECURITY DEFINER
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_conversation_id text,
  p_user_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO conversation_read_status (conversation_id, user_type, last_read_at)
  VALUES (p_conversation_id, p_user_type, now())
  ON CONFLICT (conversation_id, user_type)
  DO UPDATE SET last_read_at = now();

  UPDATE messages
  SET status = 'read', read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_type != p_user_type
    AND status != 'read'
    AND deleted_at IS NULL;

  INSERT INTO conversation_participants (conversation_id, user_type, user_name, unread_count, last_read_at)
  VALUES (p_conversation_id, p_user_type, '', 0, now())
  ON CONFLICT (conversation_id, user_type)
  DO UPDATE SET
    unread_count = 0,
    last_read_at = now();
END;
$$;
