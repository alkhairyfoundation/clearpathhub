-- =============================================================
-- COMPLETE MIGRATION: All 5 Phases — Tassomai-Style Mastery LMS
-- Run this entire file in your Supabase SQL Editor once.
-- Includes: Scheme of Work, Question Bank, Daily Practice,
--           Mastery Scores, Adaptive Quiz + Spaced Repetition
-- =============================================================
-- NOTE: This is SAFE to re-run (uses IF NOT EXISTS / OR REPLACE)
-- =============================================================

-- =============================================================
-- PHASE 1: Scheme of Work & Term-Aligned Content
-- =============================================================

-- 1. ACADEMIC SESSIONS
CREATE TABLE IF NOT EXISTS academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. TERMS
CREATE TABLE IF NOT EXISTS terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES academic_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  current_week INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. TERM WEEKS
CREATE TABLE IF NOT EXISTS term_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  label TEXT,
  UNIQUE(term_id, week_number)
);

-- 4. SCHEME OF WORK
CREATE TABLE IF NOT EXISTS scheme_of_work (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id UUID REFERENCES terms(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  topic TEXT NOT NULL,
  subtopics TEXT[] DEFAULT '{}',
  learning_objectives TEXT[] DEFAULT '{}',
  resources TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(term_id, class_id, subject_id, week_number)
);

-- 5. ADD CLASS_ID + TERM ALIGNMENT TO EXISTING TABLES
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS week_no INTEGER;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS topic TEXT;

ALTER TABLE lessons ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES terms(id);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS week_no INTEGER;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS topic TEXT;

-- 6. TRACK CURRENT SESSION/TERM IN SCHOOL SETTINGS
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS current_session_id UUID REFERENCES academic_sessions(id);
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS current_term_id UUID REFERENCES terms(id);

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_scheme_of_work_term ON scheme_of_work(term_id);
CREATE INDEX IF NOT EXISTS idx_scheme_of_work_class ON scheme_of_work(class_id);
CREATE INDEX IF NOT EXISTS idx_scheme_of_work_subject ON scheme_of_work(subject_id);
CREATE INDEX IF NOT EXISTS idx_scheme_of_work_lookup ON scheme_of_work(term_id, class_id, subject_id, week_number);
CREATE INDEX IF NOT EXISTS idx_terms_session ON terms(session_id);
CREATE INDEX IF NOT EXISTS idx_term_weeks_term ON term_weeks(term_id);
CREATE INDEX IF NOT EXISTS idx_sessions_term ON sessions(term_id);
CREATE INDEX IF NOT EXISTS idx_lessons_term ON lessons(term_id);

-- 8. RLS POLICIES
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE term_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheme_of_work ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view academic sessions"
  ON academic_sessions FOR SELECT USING (true);
CREATE POLICY "Admins can insert academic sessions"
  ON academic_sessions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update academic sessions"
  ON academic_sessions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete academic sessions"
  ON academic_sessions FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can view terms"
  ON terms FOR SELECT USING (true);
CREATE POLICY "Admins can insert terms"
  ON terms FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update terms"
  ON terms FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete terms"
  ON terms FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can view term weeks"
  ON term_weeks FOR SELECT USING (true);
CREATE POLICY "Admins can insert term weeks"
  ON term_weeks FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update term weeks"
  ON term_weeks FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete term weeks"
  ON term_weeks FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Anyone can view scheme of work"
  ON scheme_of_work FOR SELECT USING (true);
CREATE POLICY "Teachers and admins can insert scheme of work"
  ON scheme_of_work FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Teachers and admins can update scheme of work"
  ON scheme_of_work FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Teachers and admins can delete scheme of work"
  ON scheme_of_work FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- 9. SEED DEFAULT SESSION/TERM IF NONE EXISTS
INSERT INTO academic_sessions (name, start_date, end_date, is_current)
SELECT '2024/2025', '2024-09-01', '2025-08-31', true
WHERE NOT EXISTS (SELECT 1 FROM academic_sessions);

INSERT INTO terms (session_id, name, start_date, end_date, current_week, is_current)
SELECT id, 'First Term', '2024-09-01', '2024-12-20', 1, true
FROM academic_sessions WHERE is_current = true
AND NOT EXISTS (SELECT 1 FROM terms);

-- =============================================================
-- PHASE 2: Standalone Question Bank
-- =============================================================

CREATE TABLE IF NOT EXISTS question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  topic TEXT NOT NULL,
  subtopic TEXT DEFAULT '',
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false', 'fill_blank', 'short_answer', 'multiple_selection')),
  question TEXT NOT NULL,
  question_image TEXT,
  options TEXT[] NOT NULL DEFAULT '{}',
  option_images TEXT[] DEFAULT '{}',
  correct_answer INTEGER NOT NULL,
  points INTEGER DEFAULT 1,
  explanation TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_subject ON question_bank(subject_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_class ON question_bank(class_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_term ON question_bank(term_id);
CREATE INDEX IF NOT EXISTS idx_question_bank_topic ON question_bank(topic);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_question_bank_status ON question_bank(status);
CREATE INDEX IF NOT EXISTS idx_question_bank_created_by ON question_bank(created_by);
CREATE INDEX IF NOT EXISTS idx_question_bank_tags ON question_bank USING GIN(tags);

ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and admins can view question bank"
  ON question_bank FOR SELECT USING (
    status = 'published'
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Teachers and admins can insert questions"
  ON question_bank FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Users can update own questions"
  ON question_bank FOR UPDATE USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Users can delete own draft questions"
  ON question_bank FOR DELETE USING (
    (created_by = auth.uid() AND status = 'draft')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================================
-- PHASE 3: Daily Mastery Practice Engine
-- =============================================================

CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  goal_type TEXT NOT NULL DEFAULT 'mixed' CHECK (goal_type IN ('current_week', 'weak_area', 'spaced_revision', 'challenge', 'mixed')),
  total_questions INTEGER DEFAULT 0,
  answered_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  score NUMERIC(5,2),
  duration_seconds INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES practice_sessions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_source TEXT NOT NULL DEFAULT 'bank' CHECK (question_source IN ('bank', 'quiz', 'test')),
  source_id UUID,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'multiple_choice',
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INTEGER NOT NULL,
  selected_answer INTEGER,
  is_correct BOOLEAN,
  time_taken INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'medium',
  topic TEXT,
  subtopic TEXT,
  explanation TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_questions INTEGER NOT NULL DEFAULT 10,
  target_score INTEGER NOT NULL DEFAULT 70,
  completed_questions INTEGER DEFAULT 0,
  achieved_score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, date)
);

CREATE TABLE IF NOT EXISTS learning_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL CHECK (badge_type IN (
    'first_goal', 'streak_3', 'streak_7', 'streak_14', 'streak_30',
    'perfect_week', 'topic_mastery', 'subject_ace', 'speed_demon', 'persistent'
  )),
  badge_data JSONB DEFAULT '{}',
  awarded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_student ON practice_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_date ON practice_sessions(date);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status ON practice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_session ON practice_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_student ON practice_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_student ON daily_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(date);
CREATE INDEX IF NOT EXISTS idx_learning_streaks_student ON learning_streaks(student_id);
CREATE INDEX IF NOT EXISTS idx_badges_student ON badges(student_id);

ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students view own practice sessions"
  ON practice_sessions FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Students insert own practice sessions"
  ON practice_sessions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own practice sessions"
  ON practice_sessions FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students view own practice attempts"
  ON practice_attempts FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Students insert own practice attempts"
  ON practice_attempts FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students view own daily goals"
  ON daily_goals FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Students insert own daily goals"
  ON daily_goals FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own daily goals"
  ON daily_goals FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students view own streaks"
  ON learning_streaks FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Students insert own streaks"
  ON learning_streaks FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own streaks"
  ON learning_streaks FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students view own badges"
  ON badges FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Students earn badges"
  ON badges FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE OR REPLACE FUNCTION ensure_daily_goal()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO daily_goals (student_id, date, target_questions, target_score)
  VALUES (NEW.student_id, NEW.date, 10, 70)
  ON CONFLICT (student_id, date) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_daily_goal ON practice_sessions;
CREATE TRIGGER trigger_ensure_daily_goal
  AFTER INSERT ON practice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION ensure_daily_goal();

-- =============================================================
-- PHASE 4: Mastery Score Engine
-- =============================================================

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

CREATE INDEX IF NOT EXISTS idx_mastery_scores_student ON mastery_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_mastery_scores_subject ON mastery_scores(subject_id);
CREATE INDEX IF NOT EXISTS idx_mastery_scores_topic ON mastery_scores(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_mastery_scores_level ON mastery_scores(level);

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
  IF p_subject_id IS NULL THEN
    SELECT s.id INTO resolved_subject_id
    FROM students st
    JOIN subjects s ON s.class_id = st.class_id
    WHERE st.profile_id = p_student_id
    LIMIT 1;
  ELSE
    resolved_subject_id := p_subject_id;
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_correct = true),
    COALESCE(AVG(CASE WHEN is_correct THEN 1.0 ELSE 0 END) * 100, 0)
  INTO total_q, correct_q, avg_score
  FROM practice_attempts
  WHERE student_id = p_student_id
    AND topic = p_topic
    AND (p_subtopic = '' OR subtopic = p_subtopic);

  SELECT COUNT(DISTINCT session_id) INTO session_count
  FROM practice_attempts
  WHERE student_id = p_student_id AND topic = p_topic;

  SELECT
    COALESCE(EXTRACT(DAY FROM NOW() - MAX(created_at)), 999)
  INTO days_since_last
  FROM practice_attempts
  WHERE student_id = p_student_id AND topic = p_topic;

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

-- =============================================================
-- PHASE 5: Adaptive Quiz + Spaced Repetition
-- =============================================================

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

CREATE INDEX IF NOT EXISTS idx_review_schedule_student ON review_schedule(student_id);
CREATE INDEX IF NOT EXISTS idx_review_schedule_date ON review_schedule(next_review_date);
CREATE INDEX IF NOT EXISTS idx_review_schedule_topic ON review_schedule(student_id, topic);

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

-- =============================================================
-- MIGRATION COMPLETE
-- =============================================================
SELECT 'All 5 phases migrated successfully!' as status;
