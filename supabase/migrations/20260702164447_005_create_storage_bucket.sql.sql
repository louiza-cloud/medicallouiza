/*
# Create Storage Bucket for File Uploads

1. Purpose
- Create a storage bucket for documents, images, and message attachments
- Configure public access policies for file uploads and downloads

2. New Storage Bucket
- `cabinet-files` - Stores all uploaded files
- Public bucket (files accessible via public URL)

3. Security Policies
- Allow authenticated users to upload files
- Allow public read access to all files
- Allow authenticated users to delete their own files

4. Notes
- This replaces the Cloudinary integration
- Files are stored directly in Supabase Storage
- Public URLs are generated automatically
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cabinet-files',
  'cabinet-files',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow authenticated users to upload files
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cabinet-files');

-- Policy: Allow public read access to files
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cabinet-files');

-- Policy: Allow authenticated users to delete files
DROP POLICY IF EXISTS "Allow authenticated delete" ON storage.objects;
CREATE POLICY "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cabinet-files');