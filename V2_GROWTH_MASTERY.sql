-- ============================================================================
-- CLEARPATH EDU HUB - V2: GROWTH & MASTERY LEARNING PLATFORM
-- ============================================================================
-- This migration adds comprehensive student growth, mastery learning,
-- gamification, accountability, retention, promotion, and AI coach tables.
-- Safe to re-run: Uses IF NOT EXISTS for all tables, functions, triggers
-- ============================================================================

-- ============================================================================
-- PART 1: PERFORMANCE COLOR SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS performance_colors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    context_type TEXT NOT NULL,
    context_id UUID,
    score_range_min NUMERIC(5,2),
    score_range_max NUMERIC(5,2),
    color TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 2: DAILY ACCOUNTABILITY SCORE
-- ============================================================================
CREATE TABLE IF NOT EXISTS daily_accountability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    attendance_score NUMERIC(5,2) DEFAULT 0,
    participation_score NUMERIC(5,2) DEFAULT 0,
    homework_completion_score NUMERIC(5,2) DEFAULT 0,
    study_time_score NUMERIC(5,2) DEFAULT 0,
    quran_score NUMERIC(5,2) DEFAULT 0,
    prayer_tracking_score NUMERIC(5,2) DEFAULT 0,
    character_score NUMERIC(5,2) DEFAULT 0,
    skill_activity_score NUMERIC(5,2) DEFAULT 0,
    community_service_score NUMERIC(5,2) DEFAULT 0,
    behavior_score NUMERIC(5,2) DEFAULT 0,
    discipline_deductions NUMERIC(5,2) DEFAULT 0,
    total_score NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, date)
);

-- ============================================================================
-- PART 3: GOAL HIERARCHY
-- ============================================================================
CREATE TABLE IF NOT EXISTS goal_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    period_type TEXT NOT NULL CHECK (period_type IN ('daily','weekly','monthly','term','yearly')),
    dimension TEXT NOT NULL CHECK (dimension IN ('academic','islamic','skills')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    goal_text TEXT NOT NULL,
    target_metric TEXT,
    target_value NUMERIC,
    achieved_value NUMERIC,
    status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','missed','in_progress')),
    parent_goal_id UUID REFERENCES goal_hierarchy(id) ON DELETE SET NULL,
    source_goal_id UUID,
    source_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_hierarchy_student_period ON goal_hierarchy(student_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_goal_hierarchy_parent ON goal_hierarchy(parent_goal_id);

-- ============================================================================
-- PART 4: MASTERY LEARNING ENGINE
-- ============================================================================
CREATE TABLE IF NOT EXISTS mastery_learning_path (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('lesson','practice','challenge','mastery_verification','advancement')),
    is_unlocked BOOLEAN DEFAULT false,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    attempts_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    teacher_intervention_required BOOLEAN DEFAULT false,
    intervention_resolved_at TIMESTAMP,
    score_on_completion NUMERIC(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_id, topic, stage)
);

CREATE INDEX IF NOT EXISTS idx_mastery_path_student ON mastery_learning_path(student_id);
CREATE INDEX IF NOT EXISTS idx_mastery_path_subject_topic ON mastery_learning_path(subject_id, topic);

-- Topic prerequisites for the learning path
CREATE TABLE IF NOT EXISTS topic_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    prerequisite_topic TEXT NOT NULL,
    prerequisite_subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(subject_id, topic, prerequisite_topic)
);

-- ============================================================================
-- PART 5: KNOWLEDGE RETENTION SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS retention_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    mastery_score_at_verification NUMERIC(5,2),
    check_days INTEGER NOT NULL,
    check_date DATE NOT NULL,
    retest_score NUMERIC(5,2),
    passed BOOLEAN,
    entered_reinforcement BOOLEAN DEFAULT false,
    reinforcement_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, subject_id, topic, check_days, check_date)
);

CREATE INDEX IF NOT EXISTS idx_retention_checks_student ON retention_checks(student_id);
CREATE INDEX IF NOT EXISTS idx_retention_checks_date ON retention_checks(check_date);
CREATE INDEX IF NOT EXISTS idx_retention_checks_due ON retention_checks(student_id, check_date)
    WHERE passed IS NULL;

-- ============================================================================
-- PART 6: STUDENT PROMOTION ENGINE
-- ============================================================================
CREATE TABLE IF NOT EXISTS promotion_readiness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    academic_year TEXT NOT NULL,
    term TEXT NOT NULL,
    academic_mastery_score NUMERIC(5,2) DEFAULT 0,
    islamic_development_score NUMERIC(5,2) DEFAULT 0,
    skills_development_score NUMERIC(5,2) DEFAULT 0,
    behavior_score NUMERIC(5,2) DEFAULT 0,
    attendance_score NUMERIC(5,2) DEFAULT 0,
    consistency_score NUMERIC(5,2) DEFAULT 0,
    leadership_score NUMERIC(5,2) DEFAULT 0,
    retention_score NUMERIC(5,2) DEFAULT 0,
    overall_score NUMERIC(5,2) DEFAULT 0,
    promotion_status TEXT CHECK (promotion_status IN ('ready','needs_intervention','conditional','not_ready')),
    supporting_evidence JSONB DEFAULT '{}',
    recommended_next_class TEXT,
    conditional_requirements TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, academic_year, term)
);

CREATE INDEX IF NOT EXISTS idx_promotion_readiness_status ON promotion_readiness(promotion_status);
CREATE INDEX IF NOT EXISTS idx_promotion_readiness_student ON promotion_readiness(student_id);

-- ============================================================================
-- PART 7: AI COACH INTERACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_coach_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    trigger_event TEXT,
    prompt_text TEXT,
    response_text TEXT,
    recommendations JSONB DEFAULT '[]',
    context JSONB DEFAULT '{}',
    effectiveness_rating INTEGER CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 5),
    user_feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_coach_student ON ai_coach_interactions(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_coach_type ON ai_coach_interactions(interaction_type);

-- ============================================================================
-- PART 8: ADVANCED GAMIFICATION
-- ============================================================================

-- XP Transactions (earnings and spending)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    xp_amount INTEGER NOT NULL,
    xp_type TEXT NOT NULL,
    source TEXT NOT NULL,
    source_id UUID,
    multiplier NUMERIC(3,2) DEFAULT 1.0,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_student ON xp_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_xp_created ON xp_transactions(created_at);

-- Student Levels
CREATE TABLE IF NOT EXISTS student_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    level INTEGER DEFAULT 1,
    current_xp INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    xp_to_next_level INTEGER DEFAULT 1000,
    mastery_points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Extended Badge System (extends existing badges table)
CREATE TABLE IF NOT EXISTS badge_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    badge_type TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_key TEXT DEFAULT 'trophy',
    category TEXT NOT NULL CHECK (category IN ('academic','islamic','skills','streak','mastery','challenge','leadership','community')),
    tier INTEGER DEFAULT 1,
    xp_reward INTEGER DEFAULT 0,
    criteria JSONB DEFAULT '{}',
    is_hidden BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Leaderboard snapshots
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_type TEXT NOT NULL CHECK (leaderboard_type IN ('class_weekly','school_monthly','islamic','skills','mastery')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    rankings JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_type_period ON leaderboard_snapshots(leaderboard_type, period_start);

-- ============================================================================
-- PART 9: THREE-DIMENSIONAL GROWTH TRACKING
-- ============================================================================

-- Islamic Development Tracking
CREATE TABLE IF NOT EXISTS islamic_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    salah_fajr BOOLEAN DEFAULT false,
    salah_dhuhr BOOLEAN DEFAULT false,
    salah_asr BOOLEAN DEFAULT false,
    salah_maghrib BOOLEAN DEFAULT false,
    salah_isha BOOLEAN DEFAULT false,
    quran_surah TEXT,
    quran_ayah_start INTEGER,
    quran_ayah_end INTEGER,
    quran_memorized_ayahs INTEGER DEFAULT 0,
    quran_revision_ayahs INTEGER DEFAULT 0,
    adab_rating INTEGER CHECK (adab_rating >= 1 AND adab_rating <= 5),
    dhikr_completed BOOLEAN DEFAULT false,
    charity_action TEXT,
    notes TEXT,
    self_reported BOOLEAN DEFAULT true,
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_islamic_tracking_student ON islamic_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_islamic_tracking_date ON islamic_tracking(date);

-- Skills Development Tracking (builds on existing skills/portfolio)
CREATE TABLE IF NOT EXISTS skills_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    activity_type TEXT NOT NULL,
    activity_description TEXT,
    duration_minutes INTEGER DEFAULT 0,
    self_rating INTEGER CHECK (self_rating >= 1 AND self_rating <= 5),
    teacher_rating INTEGER CHECK (teacher_rating >= 1 AND teacher_rating <= 5),
    evidence_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(student_id, skill_id, date, activity_type)
);

CREATE INDEX IF NOT EXISTS idx_skills_tracking_student ON skills_tracking(student_id);
CREATE INDEX IF NOT EXISTS idx_skills_tracking_skill ON skills_tracking(skill_id);

-- ============================================================================
-- PART 10: NOTIFICATION SYSTEM
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    in_app_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    practice_goal_alerts BOOLEAN DEFAULT true,
    mastery_alerts BOOLEAN DEFAULT true,
    streak_milestones BOOLEAN DEFAULT true,
    teacher_feedback_alerts BOOLEAN DEFAULT true,
    parent_daily_reports BOOLEAN DEFAULT true,
    behavior_alerts BOOLEAN DEFAULT true,
    intervention_alerts BOOLEAN DEFAULT true,
    badge_alerts BOOLEAN DEFAULT true,
    announcement_alerts BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    related_id UUID,
    related_type TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    is_archived BOOLEAN DEFAULT false,
    action_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON user_notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON user_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON user_notifications(created_at);

-- ============================================================================
-- PART 11: COMPREHENSIVE REPORTING
-- ============================================================================
CREATE TABLE IF NOT EXISTS report_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL,
    frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','term','annual')),
    recipient_role TEXT NOT NULL CHECK (recipient_role IN ('student','parent','teacher','admin')),
    is_active BOOLEAN DEFAULT true,
    last_generated_at TIMESTAMP,
    next_scheduled_at TIMESTAMP,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type TEXT NOT NULL,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    report_data JSONB NOT NULL DEFAULT '{}',
    pdf_url TEXT,
    is_delivered BOOLEAN DEFAULT false,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_recipient ON generated_reports(recipient_id, report_type);
CREATE INDEX IF NOT EXISTS idx_reports_period ON generated_reports(period_start, period_end);

-- ============================================================================
-- PART 12: SCHOOL HEALTH & ANALYTICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS school_health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL UNIQUE,
    overall_health_score NUMERIC(5,2),
    academic_health_score NUMERIC(5,2),
    islamic_health_score NUMERIC(5,2),
    skills_health_score NUMERIC(5,2),
    attendance_rate NUMERIC(5,2),
    avg_mastery_score NUMERIC(5,2),
    active_students_pct NUMERIC(5,2),
    parent_engagement_rate NUMERIC(5,2),
    teacher_effectiveness_score NUMERIC(5,2),
    promotion_readiness_rate NUMERIC(5,2),
    at_risk_student_pct NUMERIC(5,2),
    intervention_success_rate NUMERIC(5,2),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- PART 13: FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Calculate XP needed for next level
CREATE OR REPLACE FUNCTION fn_xp_to_next_level(current_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN (current_level * 200) + 800;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Add XP and check level up
CREATE OR REPLACE FUNCTION fn_add_xp(
    p_student_id UUID,
    p_xp_amount INTEGER,
    p_xp_type TEXT,
    p_source TEXT,
    p_source_id UUID DEFAULT NULL,
    p_multiplier NUMERIC DEFAULT 1.0
) RETURNS TABLE(new_level INTEGER, new_total_xp INTEGER, leveled_up BOOLEAN) AS $$
DECLARE
    v_final_xp INTEGER;
    v_current_level INTEGER;
    v_current_total INTEGER;
    v_xp_needed INTEGER;
    v_new_level INTEGER;
    v_leveled_up BOOLEAN := false;
BEGIN
    v_final_xp := floor(p_xp_amount * p_multiplier)::INTEGER;

    INSERT INTO xp_transactions (student_id, xp_amount, xp_type, source, source_id, multiplier)
    VALUES (p_student_id, v_final_xp, p_xp_type, p_source, p_source_id, p_multiplier);

    INSERT INTO student_levels (student_id, current_xp, total_xp, xp_to_next_level)
    VALUES (p_student_id, v_final_xp, v_final_xp, fn_xp_to_next_level(1))
    ON CONFLICT (student_id) DO UPDATE SET
        current_xp = student_levels.current_xp + v_final_xp,
        total_xp = student_levels.total_xp + v_final_xp;

    SELECT level, total_xp, xp_to_next_level INTO v_current_level, v_current_total, v_xp_needed
    FROM student_levels WHERE student_id = p_student_id;

    WHILE v_current_total >= v_xp_needed LOOP
        v_current_total := v_current_total - v_xp_needed;
        v_current_level := v_current_level + 1;
        v_xp_needed := fn_xp_to_next_level(v_current_level);
        v_leveled_up := true;
    END LOOP;

    UPDATE student_levels SET
        level = v_current_level,
        current_xp = v_current_total,
        total_xp = student_levels.total_xp,
        xp_to_next_level = v_xp_needed,
        updated_at = NOW()
    WHERE student_id = p_student_id;

    RETURN QUERY SELECT v_current_level, (SELECT total_xp FROM student_levels WHERE student_id = p_student_id), v_leveled_up;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate daily accountability score
CREATE OR REPLACE FUNCTION fn_calculate_daily_accountability(p_student_id UUID, p_date DATE)
RETURNS NUMERIC(5,2) AS $$
DECLARE
    v_attendance NUMERIC(5,2) := 0;
    v_participation NUMERIC(5,2) := 0;
    v_homework NUMERIC(5,2) := 0;
    v_study_time NUMERIC(5,2) := 0;
    v_quran NUMERIC(5,2) := 0;
    v_prayer NUMERIC(5,2) := 0;
    v_character NUMERIC(5,2) := 0;
    v_skill NUMERIC(5,2) := 0;
    v_community NUMERIC(5,2) := 0;
    v_behavior NUMERIC(5,2) := 0;
    v_deductions NUMERIC(5,2) := 0;
    v_total NUMERIC(5,2);
BEGIN
    -- Attendance (10%)
    SELECT COALESCE(AVG(CASE status WHEN 'present' THEN 100 WHEN 'late' THEN 50 WHEN 'excused' THEN 70 ELSE 0 END), 0) * 0.10
    INTO v_attendance
    FROM attendance
    WHERE student_id = p_student_id AND date = p_date;

    -- Participation (10%) from behavioral reports
    SELECT COALESCE(AVG(class_participation::NUMERIC * 20), 0) * 0.10
    INTO v_participation
    FROM behavioral_reports
    WHERE student_id = p_student_id AND week_start <= p_date AND week_end >= p_date;

    -- Homework Completion (15%)
    SELECT COALESCE(
        (SUM(CASE WHEN hs.submitted_at IS NOT NULL AND hs.submitted_at <= h.due_date THEN 100
                  WHEN hs.submitted_at IS NOT NULL THEN 50 ELSE 0 END)::NUMERIC /
         NULLIF(COUNT(h.id), 0)), 0) * 0.15
    INTO v_homework
    FROM homework h
    LEFT JOIN homework_submissions hs ON hs.homework_id = h.id AND hs.student_id = p_student_id
    WHERE h.due_date = p_date;

    -- Study Time (10%) from practice sessions
    SELECT COALESCE(SUM(duration_seconds)::NUMERIC / 3600.0 * 20, 0) * 0.10
    INTO v_study_time
    FROM practice_sessions
    WHERE student_id = p_student_id AND date = p_date AND status = 'completed';

    -- Quran (15%) from islamic_tracking
    SELECT COALESCE(
        (COALESCE(quran_memorized_ayahs, 0) + COALESCE(quran_revision_ayahs, 0))::NUMERIC * 10, 0) * 0.15
    INTO v_quran
    FROM islamic_tracking
    WHERE student_id = p_student_id AND date = p_date;

    -- Prayer Tracking (10%)
    SELECT COALESCE(
        ((CASE WHEN salah_fajr THEN 20 ELSE 0 END) +
         (CASE WHEN salah_dhuhr THEN 20 ELSE 0 END) +
         (CASE WHEN salah_asr THEN 20 ELSE 0 END) +
         (CASE WHEN salah_maghrib THEN 20 ELSE 0 END) +
         (CASE WHEN salah_isha THEN 20 ELSE 0 END)), 0) * 0.10
    INTO v_prayer
    FROM islamic_tracking
    WHERE student_id = p_student_id AND date = p_date;

    -- Character (10%) from adab rating
    SELECT COALESCE(AVG(adab_rating::NUMERIC * 20), 0) * 0.10
    INTO v_character
    FROM islamic_tracking
    WHERE student_id = p_student_id AND date = p_date;

    -- Skills (10%) from skills_tracking
    SELECT COALESCE(AVG(COALESCE(teacher_rating, self_rating, 0)::NUMERIC * 20), 0) * 0.10
    INTO v_skill
    FROM skills_tracking
    WHERE student_id = p_student_id AND date = p_date;

    -- Community Service (5%)
    SELECT COALESCE(
        CASE WHEN COUNT(*) > 0 THEN LEAST(COUNT(*)::NUMERIC * 20, 100) ELSE 0 END, 0) * 0.05
    INTO v_community
    FROM skills_tracking
    WHERE student_id = p_student_id AND date = p_date AND activity_type = 'community_service';

    -- Behavior (10%) - from behavioral_reports rating
    SELECT COALESCE(AVG(rating::NUMERIC * 20), 0) * 0.10
    INTO v_behavior
    FROM behavioral_reports
    WHERE student_id = p_student_id AND week_start <= p_date AND week_end >= p_date;

    -- Discipline Deductions
    SELECT COALESCE(SUM(penalty_points), 0)
    INTO v_deductions
    FROM (
        SELECT CASE
            WHEN event_type = 'tab_switch' THEN 5
            WHEN event_type = 'fullscreen_exit' THEN 10
            WHEN event_type = 'copy_attempt' THEN 15
            WHEN event_type = 'paste_attempt' THEN 15
            ELSE 0
        END as penalty_points
        FROM exam_activity_logs
        WHERE student_id = p_student_id AND created_at::date = p_date
    ) penalties;

    v_total := GREATEST(0, LEAST(100,
        v_attendance + v_participation + v_homework + v_study_time +
        v_quran + v_prayer + v_character + v_skill + v_community +
        v_behavior - v_deductions
    ));

    INSERT INTO daily_accountability (
        student_id, date,
        attendance_score, participation_score, homework_completion_score,
        study_time_score, quran_score, prayer_tracking_score,
        character_score, skill_activity_score, community_service_score,
        behavior_score, discipline_deductions, total_score
    ) VALUES (
        p_student_id, p_date,
        v_attendance, v_participation, v_homework,
        v_study_time, v_quran, v_prayer,
        v_character, v_skill, v_community,
        v_behavior, v_deductions, v_total
    ) ON CONFLICT (student_id, date) DO UPDATE SET
        attendance_score = EXCLUDED.attendance_score,
        participation_score = EXCLUDED.participation_score,
        homework_completion_score = EXCLUDED.homework_completion_score,
        study_time_score = EXCLUDED.study_time_score,
        quran_score = EXCLUDED.quran_score,
        prayer_tracking_score = EXCLUDED.prayer_tracking_score,
        character_score = EXCLUDED.character_score,
        skill_activity_score = EXCLUDED.skill_activity_score,
        community_service_score = EXCLUDED.community_service_score,
        behavior_score = EXCLUDED.behavior_score,
        discipline_deductions = EXCLUDED.discipline_deductions,
        total_score = EXCLUDED.total_score,
        updated_at = NOW();

    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Schedule retention checks after mastery verification
CREATE OR REPLACE FUNCTION fn_schedule_retention_checks()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stage = 'mastery_verification' AND NEW.is_completed = true AND NEW.score_on_completion >= 80 THEN
        INSERT INTO retention_checks (student_id, subject_id, topic, mastery_score_at_verification, check_days, check_date)
        VALUES
            (NEW.student_id, NEW.subject_id, NEW.topic, NEW.score_on_completion, 3, CURRENT_DATE + INTERVAL '3 days'),
            (NEW.student_id, NEW.subject_id, NEW.topic, NEW.score_on_completion, 7, CURRENT_DATE + INTERVAL '7 days'),
            (NEW.student_id, NEW.subject_id, NEW.topic, NEW.score_on_completion, 14, CURRENT_DATE + INTERVAL '14 days'),
            (NEW.student_id, NEW.subject_id, NEW.topic, NEW.score_on_completion, 30, CURRENT_DATE + INTERVAL '30 days');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_schedule_retention_checks ON mastery_learning_path;
CREATE TRIGGER trg_schedule_retention_checks
    AFTER UPDATE ON mastery_learning_path
    FOR EACH ROW
    WHEN (NEW.stage = 'mastery_verification' AND NEW.is_completed = true AND OLD.is_completed = false)
    EXECUTE FUNCTION fn_schedule_retention_checks();

-- Function: Auto-promote goal hierarchy from daily to weekly
CREATE OR REPLACE FUNCTION fn_rollup_weekly_goals()
RETURNS void AS $$
DECLARE
    v_student RECORD;
    v_week_start DATE;
    v_week_end DATE;
    v_total_completed INTEGER;
    v_total_goals INTEGER;
    v_dimension TEXT;
BEGIN
    v_week_start := date_trunc('week', CURRENT_DATE)::DATE;
    v_week_end := v_week_start + INTERVAL '6 days';

    FOR v_student IN SELECT DISTINCT student_id FROM goal_hierarchy WHERE period_type = 'daily' LOOP
        FOR v_dimension IN SELECT unnest(ARRAY['academic','islamic','skills']) LOOP
            SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
            INTO v_total_goals, v_total_completed
            FROM goal_hierarchy
            WHERE student_id = v_student.student_id
              AND period_type = 'daily'
              AND dimension = v_dimension
              AND period_start >= v_week_start
              AND period_end <= v_week_end;

            IF v_total_goals > 0 THEN
                INSERT INTO goal_hierarchy (
                    student_id, period_type, dimension,
                    period_start, period_end,
                    goal_text,
                    target_metric, target_value, achieved_value,
                    status
                ) VALUES (
                    v_student.student_id, 'weekly', v_dimension,
                    v_week_start, v_week_end,
                    format('Complete weekly %s goals: %s of %s daily goals achieved', v_dimension, v_total_completed, v_total_goals),
                    'daily_goals_completed', v_total_goals, v_total_completed,
                    CASE WHEN v_total_completed >= v_total_goals THEN 'completed' ELSE 'in_progress' END
                );
            END IF;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 14: ROW LEVEL SECURITY POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE performance_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_accountability ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_learning_path ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coach_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE islamic_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Performance Colors: students view own, teachers view all, admins manage
DO $$ BEGIN CREATE POLICY "Students view own performance colors" ON performance_colors FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers view performance colors" ON performance_colors FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Daily Accountability: students view own, teachers view their students, admins all
DO $$ BEGIN CREATE POLICY "Students view own accountability" ON daily_accountability FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers view accountability" ON daily_accountability FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage accountability" ON daily_accountability FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Goal Hierarchy
DO $$ BEGIN CREATE POLICY "Students manage own goals" ON goal_hierarchy FOR ALL USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers view goals" ON goal_hierarchy FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mastery Learning Path
DO $$ BEGIN CREATE POLICY "Students view own learning path" ON mastery_learning_path FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System manages learning path" ON mastery_learning_path FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Topic Prerequisites
DO $$ BEGIN CREATE POLICY "Topic prerequisites viewable by all" ON topic_prerequisites FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage prerequisites" ON topic_prerequisites FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Retention Checks
DO $$ BEGIN CREATE POLICY "Students view own retention" ON retention_checks FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers view retention" ON retention_checks FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System inserts retention" ON retention_checks FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Promotion Readiness
DO $$ BEGIN CREATE POLICY "Students view own promotion" ON promotion_readiness FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers view promotion" ON promotion_readiness FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage promotions" ON promotion_readiness FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AI Coach Interactions
DO $$ BEGIN CREATE POLICY "Students view own AI coach" ON ai_coach_interactions FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Students insert own AI coach" ON ai_coach_interactions FOR INSERT WITH CHECK (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers view AI coach" ON ai_coach_interactions FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- XP Transactions
DO $$ BEGIN CREATE POLICY "Students view own XP" ON xp_transactions FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System inserts XP" ON xp_transactions FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Student Levels
DO $$ BEGIN CREATE POLICY "Students view own level" ON student_levels FOR SELECT USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System manages levels" ON student_levels FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Badge Definitions
DO $$ BEGIN CREATE POLICY "Badge definitions viewable by all" ON badge_definitions FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Admins manage badges" ON badge_definitions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Leaderboard Snapshots
DO $$ BEGIN CREATE POLICY "Leaderboards viewable by all" ON leaderboard_snapshots FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Islamic Tracking
DO $$ BEGIN CREATE POLICY "Students manage own islamic tracking" ON islamic_tracking FOR ALL USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers view islamic tracking" ON islamic_tracking FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Skills Tracking
DO $$ BEGIN CREATE POLICY "Students manage own skills tracking" ON skills_tracking FOR ALL USING (student_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers view skills tracking" ON skills_tracking FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Teachers update skills tracking" ON skills_tracking FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher','admin'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification Preferences
DO $$ BEGIN CREATE POLICY "Users manage own notification prefs" ON notification_preferences FOR ALL USING (profile_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- User Notifications
DO $$ BEGIN CREATE POLICY "Users view own notifications" ON user_notifications FOR SELECT USING (recipient_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users update own notifications" ON user_notifications FOR UPDATE USING (recipient_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System inserts notifications" ON user_notifications FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Report Schedule
DO $$ BEGIN CREATE POLICY "Admins manage report schedule" ON report_schedule FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users view own report schedule" ON report_schedule FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Generated Reports
DO $$ BEGIN CREATE POLICY "Users view own reports" ON generated_reports FOR SELECT USING (recipient_id = auth.uid()); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System generates reports" ON generated_reports FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- School Health Snapshots
DO $$ BEGIN CREATE POLICY "School health viewable by teachers/admin" ON school_health_snapshots FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','teacher'))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "System inserts school health" ON school_health_snapshots FOR INSERT WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- V2 SCHEMA CREATION COMPLETE!
-- ============================================================================
