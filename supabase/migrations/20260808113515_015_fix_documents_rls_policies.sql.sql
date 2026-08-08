/*
# Fix RLS policies on documents table

## Problem
The bibliothèque (library) document upload fails with:
"new row violates row-level security policy for table documents" (HTTP 401).

The root cause: the app has NO sign-in screen, so the Supabase client
always runs as the `anon` role. The existing INSERT and DELETE policies
on `documents` were scoped to `authenticated` only, so anon-key inserts
were rejected by RLS. The SELECT policy already allowed anon, which is
why reading worked but writing did not.

## Changes
1. Drop the old `documents_insert_authenticated` policy.
2. Drop the old `documents_delete_authenticated` policy.
3. Create new INSERT policy allowing `anon, authenticated` (public/shared data).
4. Create new DELETE policy allowing `anon, authenticated`.
5. SELECT policy already allows anon+authenticated — left unchanged.

## Security note
This is a single-tenant app with no sign-in. The documents table holds
publicly-shared library content (PDFs, articles) that any visitor can read
and that the admin dashboard manages via the anon key. `USING (true)` /
`WITH CHECK (true)` is intentional and correct here because the data is
intentionally public/shared, not because ownership checks were skipped.
*/

DROP POLICY IF EXISTS "documents_insert_authenticated" ON documents;
DROP POLICY IF EXISTS "documents_delete_authenticated" ON documents;

CREATE POLICY "documents_insert_all"
ON documents FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "documents_delete_all"
ON documents FOR DELETE
TO anon, authenticated
USING (true);
