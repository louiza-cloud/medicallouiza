/*
# Add cover_url column to documents table

1. Modified Tables
- `documents`
  - Added `cover_url` (text, nullable) — stores the Cloudinary secure_url of an optional cover image uploaded by the doctor alongside the PDF/Word document.
2. Security
- No policy changes. Existing RLS policies on `documents` already allow anon/authenticated SELECT and authenticated INSERT/UPDATE/DELETE, which covers the new column automatically.
3. Important Notes
- The column is nullable so existing documents without a cover photo continue to work.
- No data is lost — this is a purely additive change.
*/

ALTER TABLE documents ADD COLUMN IF NOT EXISTS cover_url text;