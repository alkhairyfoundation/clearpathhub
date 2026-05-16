-- Add missing columns to entrance_questions
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS difficulty_level TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS option_images TEXT[];
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
ALTER TABLE entrance_questions ADD COLUMN IF NOT EXISTS subject TEXT;

-- Add subjects column to entrance_exams
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Verify all columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'entrance_questions' 
ORDER BY ordinal_position;