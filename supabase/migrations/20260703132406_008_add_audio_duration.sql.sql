-- Add audio duration column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_duration integer;

-- Create index for performance on long conversations
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_desc ON messages(conversation_id, created_at DESC);

-- Add updated_at trigger for messages
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Optimize read status tracking
DROP FUNCTION IF EXISTS mark_messages_read(text, text);
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_conversation_id text,
  p_user_type text
)
RETURNS void AS $$
BEGIN
  INSERT INTO conversation_read_status (conversation_id, user_type, last_read_at)
  VALUES (p_conversation_id, p_user_type, now())
  ON CONFLICT (conversation_id, user_type) 
  DO UPDATE SET last_read_at = now();
  
  -- Update message status to read for the other user's messages
  UPDATE messages 
  SET status = 'read', read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_type != p_user_type
    AND status != 'read'
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;