-- ============================================================================
-- LEARNING ZONE: LIVE STUDY PRESENCE
-- ----------------------------------------------------------------------------
-- Adds live "traffic-light" study monitoring for teachers/admins.
--
--   learning_presence : one row per student, written by the student's browser
--                       every ~30s (heartbeat) while studying.
--   learning_events   : append-only audit trail (tab switch, fullscreen exit,
--                       idle, start/end, teacher check-in, ...).
--   study_sessions    : one row per "I started studying X" episode.
--
-- IMPORTANT: Unlike the rest of this project's tables (which do not enforce
-- RLS), these tables DO enable ROW LEVEL SECURITY. All writes/reads go through
-- the browser's Supabase client using the signed-in user's JWT, so auth.uid()
-- resolves to the logged-in user.
--
-- Teacher scope is derived from real data (subjects.teacher_id -> class_id ->
-- students.class_id). classes.form_teacher_id / class_teacher_id are currently
-- unset for all classes, and teacher_classes does not exist in this Supabase
-- project, so subjects is the only reliable mapping.
--
-- Apply this file in the Supabase SQL editor.
-- ============================================================================

-- ============================================================================
-- learning_presence
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.learning_presence (
  student_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'video'
    CHECK (activity_type IN ('video', 'notes', 'quiz', 'other')),
  content_id TEXT,
  content_title TEXT,
  progress NUMERIC(5,2) NOT NULL DEFAULT 0,
  signals JSONB NOT NULL DEFAULT '[]',
  client_id TEXT,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  checked_by UUID REFERENCES public.profiles(id),
  checked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS learning_presence_last_heartbeat_idx
  ON public.learning_presence (last_heartbeat_at DESC);

-- ============================================================================
-- learning_events
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'presence_start', 'presence_end', 'heartbeat', 'tab_hidden',
      'tab_switch', 'fullscreen_exit', 'idle', 'active', 'paused',
      'checkpoint', 'teacher_checkin'
    )),
  detail TEXT,
  activity_type TEXT,
  content_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS learning_events_student_time_idx
  ON public.learning_events (student_id, created_at DESC);

-- ============================================================================
-- study_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'video'
    CHECK (activity_type IN ('video', 'notes', 'quiz', 'other')),
  content_id TEXT,
  content_title TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  signals_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS study_sessions_student_time_idx
  ON public.study_sessions (student_id, started_at DESC);

-- ============================================================================
-- GRANTS (match Supabase default privileges; explicit for safety)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_presence TO authenticated;
GRANT SELECT, INSERT ON public.learning_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.study_sessions TO authenticated;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.learning_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- Shared helper: is the calling user a teacher of the class the given student
-- belongs to? Uses real data only (subjects.teacher_id + students.class_id).
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(target_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subjects s
    JOIN public.students st ON st.class_id = s.class_id
    WHERE s.teacher_id = auth.uid()
      AND st.profile_id = target_student_id
  );
$$;

-- Shared helper: is the calling user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- learning_presence policies
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "lp_select_own" ON public.learning_presence
    FOR SELECT USING (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lp_select_teacher" ON public.learning_presence
    FOR SELECT USING (public.is_teacher_of_student(student_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lp_select_admin" ON public.learning_presence
    FOR SELECT USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lp_insert_own" ON public.learning_presence
    FOR INSERT WITH CHECK (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lp_update_own" ON public.learning_presence
    FOR UPDATE USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lp_update_teacher_checkin" ON public.learning_presence
    FOR UPDATE USING (public.is_teacher_of_student(student_id))
    WITH CHECK (public.is_teacher_of_student(student_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lp_update_admin" ON public.learning_presence
    FOR UPDATE USING (public.is_admin())
    WITH CHECK (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lp_delete_own" ON public.learning_presence
    FOR DELETE USING (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- learning_events policies
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "le_insert_own" ON public.learning_events
    FOR INSERT WITH CHECK (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "le_select_own" ON public.learning_events
    FOR SELECT USING (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "le_select_teacher" ON public.learning_events
    FOR SELECT USING (public.is_teacher_of_student(student_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "le_select_admin" ON public.learning_events
    FOR SELECT USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------------------------------------------------------------
-- study_sessions policies
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "ss_insert_own" ON public.study_sessions
    FOR INSERT WITH CHECK (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ss_update_own" ON public.study_sessions
    FOR UPDATE USING (auth.uid() = student_id)
    WITH CHECK (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ss_select_own" ON public.study_sessions
    FOR SELECT USING (auth.uid() = student_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ss_select_teacher" ON public.study_sessions
    FOR SELECT USING (public.is_teacher_of_student(student_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ss_select_admin" ON public.study_sessions
    FOR SELECT USING (public.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Learning Zone schema complete!
-- ============================================================================
