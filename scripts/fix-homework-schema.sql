-- Fix homework schema: add missing columns and disable RLS
-- Run this in Supabase SQL Editor

-- Add missing columns to homework table
ALTER TABLE homework ADD COLUMN IF NOT EXISTS homework_type TEXT DEFAULT 'assignment';
ALTER TABLE homework ADD COLUMN IF NOT EXISTS attachments TEXT[];
ALTER TABLE homework ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Disable RLS on homework tables (app uses NextAuth, not Supabase Auth)
ALTER TABLE homework DISABLE ROW LEVEL SECURITY;
ALTER TABLE homework_submissions DISABLE ROW LEVEL SECURITY;
