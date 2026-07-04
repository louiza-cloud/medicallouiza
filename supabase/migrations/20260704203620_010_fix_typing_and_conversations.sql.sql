/*
# Fix typing indicators and add conversation features

1. Add unique constraint for typing_indicators to allow upsert
2. Add missing policies for conversation_participants
3. Add function to mark conversation as read/unread
4. Add function to delete conversation softly
*/

-- Add unique constraint for typing_indicators upsert
ALTER TABLE typing_indicators DROP CONSTRAINT IF EXISTS typing_indicators_conversation_user_unique;
ALTER TABLE typing_indicators ADD CONSTRAINT typing_indicators_conversation_user_unique UNIQUE (conversation_id, user_type);

-- Add DELETE policy for conversation_participants if missing
DROP POLICY IF EXISTS "participants_delete_all" ON conversation_participants;
CREATE POLICY "participants_delete_all" ON conversation_participants FOR DELETE
  TO anon, authenticated USING (true);

-- Function to mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_conversation_id text,
  p_user_type text
)
RETURNS void AS $$
BEGIN
  INSERT INTO conversation_participants (conversation_id, user_type, user_name, unread_count, last_read_at)
  VALUES (p_conversation_id, p_user_type, '', 0, now())
  ON CONFLICT (conversation_id, user_type)
  DO UPDATE SET
    unread_count = 0,
    last_read_at = now();
END;
$$ LANGUAGE plpgsql;

-- Function to mark conversation as unread
CREATE OR REPLACE FUNCTION mark_conversation_unread(
  p_conversation_id text,
  p_user_type text
)
RETURNS void AS $$
BEGIN
  INSERT INTO conversation_participants (conversation_id, user_type, user_name, unread_count)
  VALUES (p_conversation_id, p_user_type, '', 1)
  ON CONFLICT (conversation_id, user_type)
  DO UPDATE SET
    unread_count = 1;
END;
$$ LANGUAGE plpgsql;

-- Function to soft delete conversation for a user
CREATE OR REPLACE FUNCTION delete_conversation_for_user(
  p_conversation_id text,
  p_user_type text
)
RETURNS void AS $$
BEGIN
  INSERT INTO conversation_participants (conversation_id, user_type, user_name, is_deleted)
  VALUES (p_conversation_id, p_user_type, '', true)
  ON CONFLICT (conversation_id, user_type)
  DO UPDATE SET is_deleted = true;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread count for a conversation
CREATE OR REPLACE FUNCTION get_unread_count(
  p_conversation_id text,
  p_user_type text
)
RETURNS integer AS $$
DECLARE
  count integer;
BEGIN
  SELECT unread_count INTO count
  FROM conversation_participants
  WHERE conversation_id = p_conversation_id AND user_type = p_user_type;
  
  RETURN COALESCE(count, 0);
END;
$$ LANGUAGE plpgsql;

-- Update the mark_messages_read function to also update unread_count
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_conversation_id text,
  p_user_type text
)
RETURNS void AS $$
BEGIN
  -- Update conversation_read_status
  INSERT INTO conversation_read_status (conversation_id, user_type, last_read_at)
  VALUES (p_conversation_id, p_user_type, now())
  ON CONFLICT (conversation_id, user_type) 
  DO UPDATE SET last_read_at = now();
  
  -- Update messages status
  UPDATE messages 
  SET status = 'read', read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_type != p_user_type
    AND status != 'read'
    AND deleted_at IS NULL;
  
  -- Update unread_count in participants
  INSERT INTO conversation_participants (conversation_id, user_type, user_name, unread_count, last_read_at)
  VALUES (p_conversation_id, p_user_type, '', 0, now())
  ON CONFLICT (conversation_id, user_type)
  DO UPDATE SET
    unread_count = 0,
    last_read_at = now();
END;
$$ LANGUAGE plpgsql;