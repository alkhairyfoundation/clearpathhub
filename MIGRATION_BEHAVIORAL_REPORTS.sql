-- Migration: Add missing columns to behavioral_reports table
-- The code expects these columns; add them to align schema with application logic

ALTER TABLE behavioral_reports
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general' CHECK (type IN ('positive', 'warning', 'concern', 'general')),
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES profiles(id);
