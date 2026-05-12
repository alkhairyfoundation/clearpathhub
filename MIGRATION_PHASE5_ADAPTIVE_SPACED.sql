-- =============================================================
-- MIGRATION: Phase 5 - Adaptive Quiz + Spaced Repetition
-- Run after MIGRATION_PHASE4_MASTERY_SCORES.sql
-- =============================================================

-- 1. REVIEW SCHEDULE TABLE
-- Tracks when each topic should next be reviewed (spaced repetition)
CREATE TABLE IF NOT EXISTS review_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subtopic TEXT DEFAULT '',
  next_review_date DATE NOT NULL,
  interval_days INTEGER DEFAULT 1,
  last_reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, subject_id, topic, subtopic)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_review_schedule_student ON review_schedule(student_id);
CREATE INDEX IF NOT EXISTS idx_review_schedule_date ON review_schedule(next_review_date);
CREATE INDEX IF NOT EXISTS idx_review_schedule_topic ON review_schedule(student_id, topic);

-- 3. RLS
ALTER TABLE review_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own review schedule"
  ON review_schedule FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "System can insert review schedule"
  ON review_schedule FOR INSERT WITH CHECK (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "System can update review schedule"
  ON review_schedule FOR UPDATE USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

SELECT 'Phase 5 migration completed successfully!' as status;
