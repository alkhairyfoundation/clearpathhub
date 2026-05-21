-- Disable Row Level Security on ALL tables in the public schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)

-- Dynamic approach: disables RLS on every table automatically
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', tbl);
  END LOOP;
END $$;

-- Also drop all existing policies to clean up
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', pol.policyname, pol.tablename);
  END LOOP;
END $$;
