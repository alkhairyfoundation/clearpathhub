-- ============================================================================
-- MIGRATION: Add Missing Tables to Supabase
-- Tables: archetypes, skills, archetype_skill_map, class_term_frameworks,
--         academic_competencies, skill_expectations, student_term_goals,
--         student_goal_skills, student_skill_rubrics, portfolio_evidence,
--         skill_evidence_links, ccr_responses
-- ============================================================================
-- Safe to re-run: Uses IF NOT EXISTS for all tables, indexes, and policies
-- ============================================================================

-- ============================================================================
-- PART 1: PORTFOLIO & GROWTH SYSTEM TABLES
-- ============================================================================

-- ARCHETYPES (Identity Cards)
CREATE TABLE IF NOT EXISTS archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SKILLS BANK
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ARCHETYPE -> SKILL RECOMMENDATION MAP
CREATE TABLE IF NOT EXISTS archetype_skill_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype_id UUID NOT NULL REFERENCES archetypes(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  recommendation_rank INTEGER DEFAULT 0,
  UNIQUE(archetype_id, skill_id)
);

-- CLASS TERM FRAMEWORKS (Admin-defined expectations per class + term)
CREATE TABLE IF NOT EXISTS class_term_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES academic_sessions(id),
  term_id UUID NOT NULL REFERENCES terms(id),
  class_level TEXT NOT NULL,
  published_at TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(session_id, term_id, class_level)
);

-- ACADEMIC COMPETENCIES within a framework
CREATE TABLE IF NOT EXISTS academic_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES class_term_frameworks(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id),
  competency_text TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  UNIQUE(framework_id, subject_id, order_index)
);

-- SKILL EXPECTATIONS within a framework
CREATE TABLE IF NOT EXISTS skill_expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES class_term_frameworks(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id),
  expectation_text TEXT,
  order_index INTEGER DEFAULT 0,
  UNIQUE(framework_id, skill_id)
);

-- STUDENT TERM GOALS (core goal record)
CREATE TABLE IF NOT EXISTS student_term_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id),
  term_id UUID NOT NULL REFERENCES terms(id),
  archetype_id UUID NOT NULL REFERENCES archetypes(id),
  goal_statement_snapshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'active', 'archived')),
  submitted_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES profiles(id),
  reflection_text TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, term_id)
);

-- STUDENT GOAL SKILLS (selected 3-5 skills per goal)
CREATE TABLE IF NOT EXISTS student_goal_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_term_goal_id UUID NOT NULL REFERENCES student_term_goals(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id),
  order_index INTEGER DEFAULT 0,
  UNIQUE(student_term_goal_id, skill_id)
);

-- STUDENT SKILL RUBRICS (teacher tracking per skill per term)
CREATE TABLE IF NOT EXISTS student_skill_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id),
  term_id UUID NOT NULL REFERENCES terms(id),
  skill_id UUID NOT NULL REFERENCES skills(id),
  level TEXT NOT NULL CHECK (level IN ('emerging', 'developing', 'secure', 'strong')),
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, session_id, term_id, skill_id)
);

-- PORTFOLIO EVIDENCE (linked or manual evidence entries)
CREATE TABLE IF NOT EXISTS portfolio_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id),
  term_id UUID NOT NULL REFERENCES terms(id),
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('attendance', 'punctuality', 'incident', 'commendation', 'audit', 'assessment', 'manual')),
  reference_id UUID,
  text_snapshot TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- SKILL <-> EVIDENCE LINKS
CREATE TABLE IF NOT EXISTS skill_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_skill_rubric_id UUID NOT NULL REFERENCES student_skill_rubrics(id) ON DELETE CASCADE,
  portfolio_evidence_id UUID NOT NULL REFERENCES portfolio_evidence(id) ON DELETE CASCADE,
  UNIQUE(student_skill_rubric_id, portfolio_evidence_id)
);

-- ============================================================================
-- PART 2: CCR (ClearPath Child Review) TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ccr_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  academic_session_id UUID REFERENCES academic_sessions(id) ON DELETE SET NULL,
  term_id UUID REFERENCES terms(id) ON DELETE SET NULL,
  respondent_type TEXT NOT NULL CHECK (respondent_type IN ('student', 'father', 'mother', 'teacher', 'subject_teacher')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_submitted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, academic_session_id, term_id, respondent_type)
);

-- ============================================================================
-- PART 3: INDEXES
-- ============================================================================

DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_archetypes_active ON archetypes(is_active); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_skills_active ON skills(is_active); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_term_goals_student ON student_term_goals(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_term_goals_term ON student_term_goals(term_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_term_goals_status ON student_term_goals(status); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_student_skill_rubrics_student ON student_skill_rubrics(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_portfolio_evidence_student ON portfolio_evidence(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ccr_responses_student_id ON ccr_responses(student_id); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ccr_responses_respondent_type ON ccr_responses(respondent_type); EXCEPTION WHEN undefined_column THEN NULL; END $$;
DO $$ BEGIN CREATE INDEX IF NOT EXISTS idx_ccr_responses_is_submitted ON ccr_responses(is_submitted); EXCEPTION WHEN undefined_column THEN NULL; END $$;

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY ENABLE
-- ============================================================================

ALTER TABLE archetypes ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE archetype_skill_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_term_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_term_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_goal_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_skill_rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ccr_responses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 5: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Archetypes Policies (read: all, write: admin only)
DO $$ BEGIN CREATE POLICY "Anyone can view archetypes" ON archetypes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage archetypes" ON archetypes FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Skills Policies (read: all, write: admin only)
DO $$ BEGIN CREATE POLICY "Anyone can view skills" ON skills FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage skills" ON skills FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Archetype Skill Map Policies (read: all, write: admin only)
DO $$ BEGIN CREATE POLICY "Anyone can view archetype skill map" ON archetype_skill_map FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage archetype skill map" ON archetype_skill_map FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Class Term Frameworks Policies (read: all, write: admin only)
DO $$ BEGIN CREATE POLICY "Anyone can view frameworks" ON class_term_frameworks FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage frameworks" ON class_term_frameworks FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Academic Competencies Policies (read: all, write: admin only)
DO $$ BEGIN CREATE POLICY "Anyone can view competencies" ON academic_competencies FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage competencies" ON academic_competencies FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Skill Expectations Policies (read: all, write: admin only)
DO $$ BEGIN CREATE POLICY "Anyone can view skill expectations" ON skill_expectations FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage skill expectations" ON skill_expectations FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Student Term Goals Policies
DO $$ BEGIN CREATE POLICY "Students can view own goals" ON student_term_goals FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can view all goals" ON student_term_goals FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can create own goals" ON student_term_goals FOR INSERT WITH CHECK (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can update own goals" ON student_term_goals FOR UPDATE USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage all goals" ON student_term_goals FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can approve goals" ON student_term_goals FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Student Goal Skills Policies
DO $$ BEGIN CREATE POLICY "Students can view own goal skills" ON student_goal_skills FOR SELECT USING (EXISTS (SELECT 1 FROM student_term_goals WHERE id = student_term_goal_id AND student_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can view all goal skills" ON student_goal_skills FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can manage own goal skills" ON student_goal_skills FOR ALL USING (EXISTS (SELECT 1 FROM student_term_goals WHERE id = student_term_goal_id AND student_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Student Skill Rubrics Policies
DO $$ BEGIN CREATE POLICY "Students can view own rubrics" ON student_skill_rubrics FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can view all rubrics" ON student_skill_rubrics FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage rubrics" ON student_skill_rubrics FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Portfolio Evidence Policies
DO $$ BEGIN CREATE POLICY "Students can view own evidence" ON portfolio_evidence FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can view all evidence" ON portfolio_evidence FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can create evidence" ON portfolio_evidence FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Skill Evidence Links Policies
DO $$ BEGIN CREATE POLICY "Anyone can view skill evidence links" ON skill_evidence_links FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can manage skill evidence links" ON skill_evidence_links FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CCR Responses Policies
DO $$ BEGIN CREATE POLICY "Students can view own CCR responses" ON ccr_responses FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers can view all CCR responses" ON ccr_responses FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can insert own CCR responses" ON ccr_responses FOR INSERT WITH CHECK (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students can update own CCR responses" ON ccr_responses FOR UPDATE USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Parents can view linked student CCR responses" ON ccr_responses FOR SELECT USING (EXISTS (SELECT 1 FROM students WHERE parent_id = auth.uid() AND profile_id = ccr_responses.student_id)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins can manage all CCR responses" ON ccr_responses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- PART 6: SEED DATA - DEFAULT ARCHETYPES
-- ============================================================================

INSERT INTO archetypes (name, description, icon_key, is_active) VALUES
  ('The Scholar', 'Driven by knowledge and academic excellence. Values critical thinking, research, and deep understanding.', 'book-open', true),
  ('The Leader', 'Born to inspire and guide others. Values leadership, communication, and ethical judgement.', 'users', true),
  ('The Innovator', 'Creative problem-solver who embraces change. Values creative thinking, adaptability, and digital literacy.', 'lightbulb', true),
  ('The Communicator', 'Expresses ideas with clarity and empathy. Values communication, public speaking, and inclusion.', 'message-square', true),
  ('The Analyst', 'Thinks deeply and works with data. Values critical thinking, data literacy, and scientific reasoning.', 'bar-chart-3', true),
  ('The Creator', 'Imagines and brings new things to life. Values creative thinking, self-motivation, and expression.', 'palette', true),
  ('The Advocate', 'Champions fairness and justice. Values empathy, ethical judgement, and active citizenship.', 'heart', true),
  ('The Explorer', 'Seeks new experiences and challenges. Values adaptability, resilience, and curiosity.', 'compass', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PART 7: SEED DATA - DEFAULT SKILLS
-- ============================================================================

INSERT INTO skills (name, category, description, is_active) VALUES
  ('Critical Thinking', 'Cognitive', 'Ability to analyze, evaluate, and synthesize information to form reasoned judgments.', true),
  ('Research & Analysis', 'Cognitive', 'Skills in gathering, interpreting, and presenting data and findings.', true),
  ('Scientific Reasoning', 'Cognitive', 'Understanding and applying the scientific method and logical reasoning.', true),
  ('Leadership', 'Social', 'Ability to inspire, guide, and influence others toward a common goal.', true),
  ('Communication', 'Social', 'Effective expression of ideas through verbal, written, and non-verbal means.', true),
  ('Collaboration', 'Social', 'Working effectively with others to achieve shared objectives.', true),
  ('Conflict Resolution', 'Social', 'Ability to peacefully resolve disputes and find mutually acceptable solutions.', true),
  ('Creative Thinking', 'Cognitive', 'Generating novel ideas and approaching problems from unique perspectives.', true),
  ('Problem Solving', 'Cognitive', 'Identifying issues and implementing effective solutions.', true),
  ('Digital Literacy', 'Technical', 'Competence in using digital tools and technology for learning and productivity.', true),
  ('Adaptability', 'Personal', 'Adjusting effectively to new situations, challenges, and changes.', true),
  ('Self-Motivation', 'Personal', 'Driving oneself to take initiative and act toward goals without external prompting.', true),
  ('Resilience & Grit', 'Personal', 'Persevering through setbacks and maintaining effort toward long-term goals.', true),
  ('Empathy & Inclusion', 'Social', 'Understanding others perspectives and creating welcoming environments.', true),
  ('Ethical Judgement', 'Personal', 'Making decisions based on moral principles and integrity.', true),
  ('Active Citizenship', 'Social', 'Contributing positively to community and society.', true),
  ('Public Speaking', 'Social', 'Communicating effectively to audiences of various sizes.', true),
  ('Data Literacy', 'Cognitive', 'Reading, interpreting, and communicating with data.', true),
  ('Goal Setting', 'Personal', 'Defining clear, achievable objectives and planning steps to reach them.', true),
  ('Time Management', 'Personal', 'Planning and controlling how time is spent on activities to maximize efficiency.', true)
ON CONFLICT (name) DO NOTHING;
