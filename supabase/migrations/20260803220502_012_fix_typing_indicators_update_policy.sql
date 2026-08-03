/*
# Fix typing_indicators: add missing UPDATE policy

1. Problem
- The frontend uses `supabase.from('typing_indicators').upsert(..., { onConflict: 'conversation_id,user_type' })`.
- An upsert that hits an existing row performs an UPDATE, but `typing_indicators` only had
  SELECT, INSERT, and DELETE policies — no UPDATE policy.
- Result: the first typing indicator INSERT works, but subsequent upserts (which UPDATE the
  existing row) are silently blocked by RLS. Typing indicators stop appearing after the first one.

2. Fix
- Add an UPDATE policy (`TO anon, authenticated`) so upserts on existing rows succeed.
*/

DROP POLICY IF EXISTS "typing_update_all" ON typing_indicators;
CREATE POLICY "typing_update_all" ON typing_indicators FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
