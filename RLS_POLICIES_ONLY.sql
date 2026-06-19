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
