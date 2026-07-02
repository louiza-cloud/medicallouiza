/*
# Enhance Messages Table for Modern Messaging Features

1. Purpose
- Add support for reply, edit, delete, read status, and typing indicators
- Enable modern messaging features like WhatsApp/Telegram style

2. New Columns Added to messages
- reply_to_id (uuid) - Reference to message being replied to
- is_edited (boolean) - Flag for edited messages
- edited_at (timestamptz) - Timestamp of last edit
- deleted_at (timestamptz) - Soft delete timestamp
- status (text) - Message status: 'sent', 'delivered', 'read'
- read_at (timestamptz) - When message was read by recipient

3. New Table: typing_indicators
- Tracks who is typing in which conversation

4. New Table: conversation_read_status
- Tracks last read message per user per conversation

5. Security
- RLS enabled on all new tables
*/

-- Add new columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Create typing_indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('patient', 'doctor')),
  user_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create conversation_read_status table for unread tracking
CREATE TABLE IF NOT EXISTS conversation_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('patient', 'doctor')),
  last_read_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_type)
);

-- Enable RLS on new tables
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_read_status ENABLE ROW LEVEL SECURITY;

-- Policies for typing_indicators
DROP POLICY IF EXISTS "typing_select_all" ON typing_indicators;
CREATE POLICY "typing_select_all" ON typing_indicators FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "typing_insert_all" ON typing_indicators;
CREATE POLICY "typing_insert_all" ON typing_indicators FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "typing_delete_all" ON typing_indicators;
CREATE POLICY "typing_delete_all" ON typing_indicators FOR DELETE
  TO anon, authenticated USING (true);

-- Policies for conversation_read_status
DROP POLICY IF EXISTS "read_status_select_all" ON conversation_read_status;
CREATE POLICY "read_status_select_all" ON conversation_read_status FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "read_status_insert_all" ON conversation_read_status;
CREATE POLICY "read_status_insert_all" ON conversation_read_status FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "read_status_update_all" ON conversation_read_status;
CREATE POLICY "read_status_update_all" ON conversation_read_status FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);