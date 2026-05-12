-- =============================================================
-- MIGRATION: Phase 3 - Daily Mastery Practice Engine
-- Run after MIGRATION_PHASE2_QUESTION_BANK.sql
-- =============================================================

-- 1. PRACTICE SESSIONS
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

-- 2. PRACTICE ATTEMPTS
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

-- 3. DAILY GOALS
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

-- 4. LEARNING STREAKS
CREATE TABLE IF NOT EXISTS learning_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id)
);

-- 5. BADGES
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

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student ON practice_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_date ON practice_sessions(date);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_status ON practice_sessions(status);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_session ON practice_attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_student ON practice_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_student ON daily_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(date);
CREATE INDEX IF NOT EXISTS idx_learning_streaks_student ON learning_streaks(student_id);
CREATE INDEX IF NOT EXISTS idx_badges_student ON badges(student_id);

-- 7. RLS
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Practice sessions: students see own, teachers/admins see relevant
CREATE POLICY "Students view own practice sessions"
  ON practice_sessions FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Students insert own practice sessions"
  ON practice_sessions FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own practice sessions"
  ON practice_sessions FOR UPDATE USING (auth.uid() = student_id);

-- Practice attempts: same pattern
CREATE POLICY "Students view own practice attempts"
  ON practice_attempts FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Students insert own practice attempts"
  ON practice_attempts FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Daily goals
CREATE POLICY "Students view own daily goals"
  ON daily_goals FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Students insert own daily goals"
  ON daily_goals FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own daily goals"
  ON daily_goals FOR UPDATE USING (auth.uid() = student_id);

-- Learning streaks
CREATE POLICY "Students view own streaks"
  ON learning_streaks FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Students insert own streaks"
  ON learning_streaks FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students update own streaks"
  ON learning_streaks FOR UPDATE USING (auth.uid() = student_id);

-- Badges
CREATE POLICY "Students view own badges"
  ON badges FOR SELECT USING (
    auth.uid() = student_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );
CREATE POLICY "Students earn badges"
  ON badges FOR INSERT WITH CHECK (auth.uid() = student_id);

-- 8. FUNCTION: Auto-create daily goal
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

SELECT 'Phase 3 migration completed successfully!' as status;
