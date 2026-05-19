-- ============================================================================
-- FIX STORAGE RLS: Replace role-based policies with fully permissive ones
-- The app uses NextAuth, not Supabase Auth, so auth.uid()/auth.role() are null
-- ============================================================================
-- Run this once in Supabase SQL Editor
-- ============================================================================

-- 1. Drop all existing storage policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 2. Create fully permissive policies for all operations
-- Anyone can SELECT (read) any file
CREATE POLICY "Allow all selects" ON storage.objects FOR SELECT USING (true);

-- Anyone can INSERT (upload) any file to any bucket
CREATE POLICY "Allow all inserts" ON storage.objects FOR INSERT WITH CHECK (true);

-- Anyone can UPDATE files
CREATE POLICY "Allow all updates" ON storage.objects FOR UPDATE USING (true) WITH CHECK (true);

-- Anyone can DELETE files
CREATE POLICY "Allow all deletes" ON storage.objects FOR DELETE USING (true);

-- ============================================================================
-- Done. No more RLS blocking file/pic/video uploads.
-- ============================================================================
