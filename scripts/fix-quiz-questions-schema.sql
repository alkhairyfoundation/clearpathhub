-- Fix quiz_questions schema: add missing columns for checkpoint support
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS timestamp_seconds INTEGER DEFAULT 0;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS is_checkpoint BOOLEAN DEFAULT false;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'multiple_choice';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_images TEXT[];

-- Also ensure quiz_questions RLS is disabled
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
