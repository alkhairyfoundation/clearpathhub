-- ============================================================================
-- SUPABASE STORAGE SETUP
-- ============================================================================
-- Run this after the main schema to create storage buckets
-- Execute via Supabase Dashboard or CLI: supabase db execute --file path/to/this/file.sql
-- ============================================================================

-- Create storage buckets (idempotent - safe to re-run)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', true, 10485760, NULL),
  ('videos', 'videos', true, 104857600, ARRAY['video/mp4', 'video/webm']),
  ('homework', 'homework', true, 10485760, NULL),
  ('id-cards', 'id-cards', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('lessons', 'lessons', true, 104857600, NULL)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
CREATE POLICY "Avatar public access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for documents bucket
CREATE POLICY "Documents public access" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
CREATE POLICY "Authenticated users can upload documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own documents" ON storage.objects FOR UPDATE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for videos bucket
CREATE POLICY "Videos public access" ON storage.objects FOR SELECT USING (bucket_id = 'videos');
CREATE POLICY "Teachers can upload videos" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'videos' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
);
CREATE POLICY "Teachers can manage videos" ON storage.objects FOR UPDATE USING (
  bucket_id = 'videos' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
);
CREATE POLICY "Teachers can delete videos" ON storage.objects FOR DELETE USING (
  bucket_id = 'videos' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
);

-- Storage policies for homework bucket
CREATE POLICY "Homework submissions viewable by teachers" ON storage.objects FOR SELECT USING (bucket_id = 'homework');
CREATE POLICY "Students can upload homework" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'homework' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
);
CREATE POLICY "Students can update own homework" ON storage.objects FOR UPDATE USING (
  bucket_id = 'homework' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Teachers can delete homework submissions" ON storage.objects FOR DELETE USING (
  bucket_id = 'homework' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
);

-- Storage policies for id-cards bucket
CREATE POLICY "ID cards public access" ON storage.objects FOR SELECT USING (bucket_id = 'id-cards');
CREATE POLICY "Admins can upload ID cards" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'id-cards' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage ID cards" ON storage.objects FOR UPDATE USING (
  bucket_id = 'id-cards' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete ID cards" ON storage.objects FOR DELETE USING (
  bucket_id = 'id-cards' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Storage policies for lessons bucket
CREATE POLICY "Lessons public access" ON storage.objects FOR SELECT USING (bucket_id = 'lessons');
CREATE POLICY "Teachers can upload lessons" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'lessons' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
);
CREATE POLICY "Teachers can manage lessons" ON storage.objects FOR UPDATE USING (
  bucket_id = 'lessons' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
);
CREATE POLICY "Teachers can delete lessons" ON storage.objects FOR DELETE USING (
  bucket_id = 'lessons' AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
);

-- ============================================================================
-- Storage setup complete!
-- ============================================================================