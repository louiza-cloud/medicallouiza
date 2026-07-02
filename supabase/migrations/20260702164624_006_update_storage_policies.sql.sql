/*
# Update Storage Policies for Anon Uploads

1. Purpose
- Allow anonymous (non-authenticated) users to upload files
- This is needed for the messaging feature where patients can send attachments
- Patients use conversation codes, not authentication

2. Changes
- Update INSERT policy to allow both authenticated and anon users
- Keep DELETE restricted to authenticated users only (admin)
- Keep SELECT public for all users

3. Security
- Only the bucket_id is checked, all upload locations are allowed
- File type restrictions are applied at bucket level
*/

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

-- Create new policy allowing both authenticated and anon users to upload
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'cabinet-files');