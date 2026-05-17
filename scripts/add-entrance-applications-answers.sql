-- Migration: Add answers column to entrance_applications
-- The answers column stores per-question exam responses as JSONB
-- Without this column, exam submissions silently fail (PostgREST rejects unknown columns)

ALTER TABLE entrance_applications ADD COLUMN IF NOT EXISTS answers JSONB;
