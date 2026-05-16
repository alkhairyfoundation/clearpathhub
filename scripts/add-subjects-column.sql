-- Add subjects column to entrance_exams table
ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'entrance_exams' AND column_name = 'subjects';