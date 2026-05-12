-- =============================================================
-- MIGRATION: Phase 4 - Mastery Score Engine
-- Run after MIGRATION_PHASE3_MASTERY_PRACTICE.sql
-- =============================================================

-- 1. MASTERY SCORES TABLE
CREATE TABLE IF NOT EXISTS mastery_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  subtopic TEXT DEFAULT '',
  mastery_score NUMERIC(5,2) DEFAULT 0,
  accuracy NUMERIC(5,2) DEFAULT 0,
  consistency NUMERIC(5,2) DEFAULT 0,
  recency NUMERIC(5,2) DEFAULT 0,
  difficulty_progress NUMERIC(5,2) DEFAULT 0,
  level TEXT DEFAULT 'needs_support' CHECK (level IN ('needs_support', 'developing', 'good_progress', 'mastered')),
  total_attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, subject_id, topic, subtopic)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_mastery_scores_student ON mastery_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_mastery_scores_subject ON mastery_scores(subject_id);
CREATE INDEX IF NOT EXISTS idx_mastery_scores_topic ON mastery_scores(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_mastery_scores_level ON mastery_scores(level);

-- 3. RLS
ALTER TABLE mastery_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own mastery scores"
  ON mastery_scores FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "System can insert mastery scores"
  ON mastery_scores FOR INSERT WITH CHECK (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "System can update mastery scores"
  ON mastery_scores FOR UPDATE USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- 4. FUNCTION: Calculate mastery level from score
CREATE OR REPLACE FUNCTION calculate_mastery_level(score NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF score >= 80 THEN RETURN 'mastered';
  ELSIF score >= 60 THEN RETURN 'good_progress';
  ELSIF score >= 40 THEN RETURN 'developing';
  ELSE RETURN 'needs_support';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. FUNCTION: Recalculate mastery for a student-topic
CREATE OR REPLACE FUNCTION recalc_topic_mastery(
  p_student_id UUID,
  p_subject_id UUID DEFAULT NULL,
  p_topic TEXT DEFAULT '',
  p_subtopic TEXT DEFAULT ''
)
RETURNS void AS $$
DECLARE
  total_q INTEGER;
  correct_q INTEGER;
  avg_score NUMERIC;
  session_count INTEGER;
  days_since_last INTEGER;
  recency_score NUMERIC;
  diff_score NUMERIC;
  mastery NUMERIC;
  level_text TEXT;
  resolved_subject_id UUID;
BEGIN
  -- Resolve subject: use provided or find from student's class
  IF p_subject_id IS NULL THEN
    SELECT s.id INTO resolved_subject_id
    FROM students st
    JOIN subjects s ON s.class_id = st.class_id
    WHERE st.profile_id = p_student_id
    LIMIT 1;
  ELSE
    resolved_subject_id := p_subject_id;
  END IF;

  -- Get accuracy from practice attempts
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_correct = true),
    COALESCE(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) * 100, 0)
  INTO total_q, correct_q, avg_score
  FROM practice_attempts
  WHERE student_id = p_student_id
    AND topic = p_topic
    AND (p_subtopic = '' OR subtopic = p_subtopic);

  -- Get session count for consistency
  SELECT COUNT(DISTINCT session_id) INTO session_count
  FROM practice_attempts
  WHERE student_id = p_student_id AND topic = p_topic;

  -- Get recency
  SELECT
    COALESCE(EXTRACT(DAY FROM NOW() - MAX(created_at)), 999)
  INTO days_since_last
  FROM practice_attempts
  WHERE student_id = p_student_id AND topic = p_topic;

  -- Calculate components
  -- Accuracy: % correct
  -- Consistency: based on session count (capped at 10)
  -- Recency: 100 if today, decays by 10 per day
  -- Difficulty: based on hard question performance
  recency_score := GREATEST(0, 100 - (days_since_last * 10));
  diff_score := COALESCE(
    (SELECT AVG(CASE WHEN difficulty = 'hard' AND is_correct THEN 100
                     WHEN difficulty = 'hard' THEN 0
                     WHEN difficulty = 'medium' AND is_correct THEN 80
                     WHEN difficulty = 'medium' THEN 20
                     WHEN difficulty = 'easy' AND is_correct THEN 60
                     ELSE 40 END)
     FROM practice_attempts
     WHERE student_id = p_student_id AND topic = p_topic),
  0);

  mastery := (avg_score * 0.50)
           + (LEAST(session_count::NUMERIC * 10, 100) * 0.20)
           + (recency_score * 0.15)
           + (diff_score * 0.15);

  level_text := calculate_mastery_level(mastery);

  INSERT INTO mastery_scores (student_id, subject_id, topic, subtopic,
    mastery_score, accuracy, consistency, recency, difficulty_progress, level,
    total_attempts, correct_attempts, last_practiced_at, updated_at)
  VALUES (p_student_id, resolved_subject_id, p_topic, p_subtopic,
    mastery, avg_score, LEAST(session_count * 10, 100), recency_score, diff_score, level_text,
    total_q, correct_q, NOW(), NOW())
  ON CONFLICT (student_id, subject_id, topic, subtopic)
  DO UPDATE SET
    mastery_score = EXCLUDED.mastery_score,
    accuracy = EXCLUDED.accuracy,
    consistency = EXCLUDED.consistency,
    recency = EXCLUDED.recency,
    difficulty_progress = EXCLUDED.difficulty_progress,
    level = EXCLUDED.level,
    total_attempts = EXCLUDED.total_attempts,
    correct_attempts = EXCLUDED.correct_attempts,
    last_practiced_at = EXCLUDED.last_practiced_at,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER: Auto-recalculate mastery on practice attempt insert
CREATE OR REPLACE FUNCTION trigger_recalc_mastery()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.topic IS NOT NULL AND NEW.topic != '' THEN
    PERFORM recalc_topic_mastery(NEW.student_id, NULL, NEW.topic, COALESCE(NEW.subtopic, ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_after_practice_attempt ON practice_attempts;
CREATE TRIGGER trigger_after_practice_attempt
  AFTER INSERT ON practice_attempts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalc_mastery();

SELECT 'Phase 4 migration completed successfully!' as status;
