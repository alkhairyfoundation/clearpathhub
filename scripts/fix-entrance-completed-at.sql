-- Fix: Add missing completed_at column to entrance_applications
ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
