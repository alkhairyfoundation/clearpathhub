-- Add assessment_config JSONB column to school_settings for CA/Exam configuration
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS assessment_config JSONB DEFAULT jsonb_build_object(
  'ca1_enabled', true,
  'ca1_max', 40,
  'ca1_label', 'Mid-Term Test',
  'ca2_enabled', false,
  'ca2_max', 10,
  'ca2_label', '2nd CA',
  'ca3_enabled', false,
  'ca3_max', 10,
  'ca3_label', '3rd CA',
  'exam_enabled', true,
  'exam_max', 60,
  'exam_label', 'Exam'
);
