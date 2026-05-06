-- ============================================================================
-- AUTH & PROFILE AUTOMATION SETUP
-- ============================================================================
-- This script sets up:
-- 1. Database trigger to auto-create profiles on user signup
-- 2. Admin user seeding
-- 3. Storage bucket configuration
-- ============================================================================

-- ============================================================================
-- PART 1: PROFILE CREATION TRIGGER
-- ============================================================================

-- First, create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table using the auth.users data
  INSERT INTO public.profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 2: ADMIN USER SEEDING
-- ============================================================================
-- NOTE: User profiles are now created automatically via the trigger in Part 1
-- To create an admin user, sign up through the app or use Supabase Admin API
-- The trigger will automatically create the profile when a user signs up
-- 
-- If you need to create users directly, use the Supabase Admin API:
-- POST /auth/v1/admin/users
-- With user_metadata containing first_name, last_name, and role
-- ============================================================================

-- ============================================================================
-- PART 3: STORAGE BUCKETS
-- ============================================================================

-- Note: Storage buckets are created via Supabase Dashboard or API
-- This SQL shows the recommended bucket structure

-- We'll create a function to initialize storage buckets
CREATE OR REPLACE FUNCTION public.initialize_storage_buckets()
RETURNS void AS $$
BEGIN
  -- Avatars bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
  ON CONFLICT (id) DO NOTHING;

  -- Documents bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('documents', 'documents', true, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
  ON CONFLICT (id) DO NOTHING;

  -- Videos bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('videos', 'videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime'])
  ON CONFLICT (id) DO NOTHING;

  -- Homework submissions bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('homework', 'homework', true, 20971520, ARRAY['application/pdf', 'application/zip', 'image/jpeg', 'image/png'])
  ON CONFLICT (id) DO NOTHING;

  -- ID Cards bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('id-cards', 'id-cards', true, 1048576, ARRAY['image/jpeg', 'image/png'])
  ON CONFLICT (id) DO NOTHING;

  -- Lessons bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('lessons', 'lessons', true, 52428800, ARRAY['application/pdf', 'application/zip', 'video/mp4', 'image/jpeg'])
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to create buckets
SELECT public.initialize_storage_buckets();

-- ============================================================================
-- PART 4: STORAGE POLICIES (Create via Supabase Dashboard UI instead)
-- ============================================================================
-- Storage policies cannot be created via SQL in this environment.
-- Please create them manually in Supabase Dashboard:
-- 1. Go to Storage
-- 2. Select each bucket
-- 3. Click "Policies" and add policies for:
--    - Public read access
--    - Authenticated upload
--    - Owner delete
-- Alternatively, use the API to create policies.
-- ============================================================================

-- ============================================================================
-- PART 5: VERIFICATION
-- ============================================================================

SELECT 
  'Auth trigger created: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN '✓' ELSE '✗' END AS auth_trigger,
  'Admin profile created: ' || 
  CASE WHEN EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@clearpatheduhub.com') THEN '✓' ELSE '✗' END AS admin_profile,
  'Storage buckets: ' || 
  CASE WHEN (SELECT COUNT(*) FROM storage.buckets) > 0 THEN (SELECT COUNT(*)::text FROM storage.buckets) ELSE '0' END AS bucket_count;

-- ============================================================================
-- COMPLETE!
-- ============================================================================