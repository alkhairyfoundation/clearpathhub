-- ============================================================================
-- COMPREHENSIVE MIGRATION: Add Missing Tables to Neon Database
-- ============================================================================
-- This script creates all tables that are defined in the schema files but
-- missing from the actual Neon database. Safe to re-run.
-- ============================================================================

-- ============================================================================
-- 1. CCR (ClearPath Child Review) Responses Table
-- ============================================================================
-- Referenced by: CcrForm.tsx, teacher/ccr/page.tsx, parent/ccr/page.tsx,
--               api/ccr/submit/route.ts

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ccr_responses') THEN
    CREATE TABLE ccr_responses (
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

    CREATE INDEX idx_ccr_responses_student_id ON ccr_responses(student_id);
    CREATE INDEX idx_ccr_responses_respondent_type ON ccr_responses(respondent_type);
    CREATE INDEX idx_ccr_responses_is_submitted ON ccr_responses(is_submitted);

    ALTER TABLE ccr_responses ENABLE ROW LEVEL SECURITY;

    -- Policies
    DO $$ BEGIN
      CREATE POLICY "Students can view own CCR responses" ON ccr_responses FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
      DO $$ BEGIN
        CREATE POLICY "Teachers can view all CCR responses" ON ccr_responses FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        DO $$ BEGIN
          CREATE POLICY "Students can insert own CCR responses" ON ccr_responses FOR INSERT WITH CHECK (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
          DO $$ BEGIN
            CREATE POLICY "Students can update own CCR responses" ON ccr_responses FOR UPDATE USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
            DO $$ BEGIN
              CREATE POLICY "Parents can view linked student CCR responses" ON ccr_responses FOR SELECT USING (EXISTS (SELECT 1 FROM students WHERE parent_id = auth.uid() AND profile_id = ccr_responses.student_id)); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
              DO $$ BEGIN
                CREATE POLICY "Admins can manage all CCR responses" ON ccr_responses FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
              END $$;
            END $$;
          END $$;
        END $$;
      END $$;
    END $$;

    RAISE NOTICE 'Created table ccr_responses with RLS policies';
  ELSE
    RAISE NOTICE 'ccr_responses already exists';
  END IF;
END $$;

-- ============================================================================
-- 2. Student Risk Predictions Table
-- ============================================================================
-- Referenced by: admin/analytics/overview, admin/analytics/student/[id],
--               analytics/[predictionId]/acknowledge, analytics,
--               supabase/functions/generate_risk_predictions,
--               full-status.ps1

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_risk_predictions') THEN
    CREATE TABLE student_risk_predictions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID REFERENCES profiles(id),
      prediction_date DATE DEFAULT CURRENT_DATE,
      risk_level TEXT DEFAULT 'low',
      risk_score NUMERIC(5,2),
      contributing_factors JSONB,
      predicted_outcome TEXT,
      confidence_score NUMERIC(5,2),
      model_version TEXT,
      is_acknowledged BOOLEAN DEFAULT false,
      acknowledged_by UUID REFERENCES profiles(id),
      acknowledged_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX idx_risk_predictions_student_id ON student_risk_predictions(student_id);
    CREATE INDEX idx_risk_predictions_date ON student_risk_predictions(prediction_date);

    RAISE NOTICE 'Created table student_risk_predictions';
  ELSE
    RAISE NOTICE 'student_risk_predictions already exists';
  END IF;
END $$;

-- ============================================================================
-- 3. Ensure student_risk_predictions has updated columns
-- ============================================================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_risk_predictions') THEN
    ALTER TABLE student_risk_predictions ADD COLUMN IF NOT EXISTS is_acknowledged BOOLEAN DEFAULT false;
    ALTER TABLE student_risk_predictions ADD COLUMN IF NOT EXISTS acknowledged_by UUID;
    ALTER TABLE student_risk_predictions ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP;
    RAISE NOTICE 'Updated student_risk_predictions columns';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  ccr_count INT;
  risk_count INT;
BEGIN
  SELECT COUNT(*) INTO ccr_count FROM information_schema.tables WHERE table_name = 'ccr_responses';
  SELECT COUNT(*) INTO risk_count FROM information_schema.tables WHERE table_name = 'student_risk_predictions';
  RAISE NOTICE 'Migration complete: ccr_responses=%, student_risk_predictions=%', ccr_count, risk_count;
END $$;
