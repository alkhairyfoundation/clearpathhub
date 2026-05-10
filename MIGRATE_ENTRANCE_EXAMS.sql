-- Add security and shuffle settings to entrance_exams
ALTER TABLE entrance_exams 
ADD COLUMN IF NOT EXISTS shuffle_questions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS require_fullscreen BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prevent_tab_switch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_tab_switches INTEGER DEFAULT 3;
