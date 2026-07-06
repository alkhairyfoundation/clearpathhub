export type UserRole = 'admin' | 'teacher' | 'student' | 'parent' | 'accountant';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  last_read_announcements?: string;
}

export interface SchoolSettings {
  id: string;
  school_name: string;
  school_motto?: string;
  school_address?: string;
  school_phone?: string;
  school_email?: string;
  school_logo?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  academic_year: string;
  term: string;
  session_start?: string;
  session_end?: string;
  current_session_id?: string;
  current_term_id?: string;
  assessment_config?: {
    ca1_enabled: boolean;
    ca1_max: number;
    ca1_label: string;
    ca2_enabled: boolean;
    ca2_max: number;
    ca2_label: string;
    ca3_enabled: boolean;
    ca3_max: number;
    ca3_label: string;
    exam_enabled: boolean;
    exam_max: number;
    exam_label: string;
  };
}

export interface AcademicSession {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
  terms?: Term[];
}

export interface Term {
  id: string;
  session_id: string;
  name: string;
  start_date: string;
  end_date: string;
  current_week: number;
  is_current: boolean;
  created_at: string;
  session?: AcademicSession;
}

export interface TermWeek {
  id: string;
  term_id: string;
  week_number: number;
  start_date: string;
  end_date: string;
  label?: string;
}

export interface SchemeOfWork {
  id: string;
  term_id: string;
  class_id: string;
  subject_id: string;
  week_number: number;
  topic: string;
  subtopics: string[];
  learning_objectives: string[];
  resources?: string;
  created_at: string;
  updated_at: string;
  class?: Class;
  subject?: Subject;
  term?: Term;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  head_id?: string;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  level: number;
  department_id?: string;
  class_teacher_id?: string;
  created_at: string;
  department?: Department;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  department_id?: string;
  teacher_id?: string;
  class_id?: string;
  created_at: string;
  class?: Class;
  teacher?: Profile;
}

export interface Student {
  id: string;
  profile_id: string;
  admission_number: string;
  class_id?: string;
  parent_id?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  blood_group?: string;
  emergency_contact?: string;
  created_at: string;
  profile?: Profile;
  class?: Class;
  parent?: Profile;
}

export interface Staff {
  id: string;
  profile_id: string;
  staff_id: string;
  department_id?: string;
  designation?: string;
  salary?: number;
  date_of_employment?: string;
  status: 'active' | 'inactive';
  created_at: string;
  profile?: Profile;
  department?: Department;
}

export interface Session {
  id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  video_url?: string;
  video_type?: 'youtube' | 'upload';
  duration?: number;
  is_published: boolean;
  created_at: string;
  class_id?: string;
  term_id?: string;
  week_no?: number;
  topic?: string;
  subject?: Subject;
  class?: Class;
  quiz?: Quiz[];
}

export interface VideoCheckpoint {
  id?: string;
  timestamp_seconds: number;
  question: string;
  question_image?: string;
  options: string[];
  option_images?: string[];
  correct_answer: any;
  points: number;
  question_type?: string;
}

export interface Quiz {
  id: string;
  session_id: string;
  title: string;
  description?: string;
  passing_score: number;
  time_limit?: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  question_image?: string;
  option_images?: string[];
  options: string[];
  correct_answer: any;
  points: number;
  question_type?: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'multiple_selection';
  order_index?: number;
  timestamp_seconds?: number;
  is_checkpoint?: boolean;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  passed: boolean;
  answers: any;
  started_at: string;
  completed_at?: string;
  time_taken?: number;
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
}

export interface Lesson {
  id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  content: string;
  attachments?: string[];
  is_published: boolean;
  created_at: string;
  class_id?: string;
  term_id?: string;
  week_no?: number;
  topic?: string;
  session_id?: string;
  class?: Class;
}

export interface Homework {
  id: string;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description?: string;
  due_date: string;
  total_marks: number;
  created_at: string;
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  submission_url?: string;
  marks?: number;
  feedback?: string;
  submitted_at?: string;
  graded_at?: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by?: string;
  marked_at?: string;
  scan_method?: 'manual' | 'qr_scan';
  created_at: string;
}

export interface StaffAttendance {
  id: string;
  staff_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  marked_by?: string;
  marked_at?: string;
  qr_code?: string;
  created_at: string;
}

export interface Result {
  id: string;
  student_id: string;
  subject_id: string;
  exam_type: 'ca1' | 'ca2' | 'ca3' | 'exam';
  score: number;
  grade?: string;
  remarks?: string;
  entered_by?: string;
  term?: string;
  academic_year?: string;
  created_at: string;
}

export interface ExamActivityLog {
  id: string;
  attempt_id: string;
  student_id: string;
  event_type: 'tab_switch' | 'fullscreen_exit' | 'copy_attempt' | 'paste_attempt' | 'screenshot' | 'right_click' | 'keyboard_shortcut' | 'multiple_device' | 'heartbeat_timeout';
  event_data?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface BehavioralReport {
  id: string;
  student_id: string;
  week_start: string;
  week_end: string;
  rating: number;
  punctuality: number;
  class_participation: number;
  homework_completion: number;
  behavior?: string;
  teacher_notes?: string;
  created_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  audience: 'all' | 'students' | 'teachers' | 'parents' | 'staff';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attachments?: string[];
  created_by?: string;
  created_at: string;
  expires_at?: string;
}

export interface Transaction {
  id: string;
  student_id?: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description?: string;
  payment_method?: string;
  reference_number?: string;
  recorded_by?: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  student_id: string;
  invoice_number: string;
  amount: number;
  description?: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  created_at: string;
}

export interface Receipt {
  id: string;
  invoice_id: string;
  receipt_number: string;
  amount_paid: number;
  payment_method?: string;
  reference_number?: string;
  verified_status?: 'pending' | 'verified' | 'rejected';
  uploaded_by?: string;
  notes?: string;
  payment_type?: 'full' | 'partial' | 'installment';
  balance_remaining?: number;
  storage_path?: string;
  created_at: string;
}

export interface IDCard {
  id: string;
  student_id: string;
  card_number: string;
  qr_code: string;
  is_active: boolean;
  issued_at: string;
  expires_at?: string;
}

export interface EntranceExam {
  id: string;
  title: string;
  description?: string;
  level: string;
  academic_year: string;
  exam_date: string;
  duration_minutes: number;
  passing_score: number;
  total_questions: number;
  is_published: boolean;
  is_active: boolean;
  shuffle_questions?: boolean;
  require_fullscreen?: boolean;
  prevent_tab_switch?: boolean;
  max_tab_switches?: number;
  created_by?: string;
  created_at: string;
}

export interface EntranceQuestion {
  id: string;
  exam_id: string;
  question: string;
  question_image?: string;
  options: string[];
  option_images?: string[];
  correct_answer: number;
  points: number;
  question_type: 'multiple_choice' | 'true_false' | 'fill_blank';
  subject?: string;
  created_at: string;
}

export interface EntranceCode {
  id: string;
  exam_id: string;
  code: string;
  max_uses: number;
  used_count: number;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

export interface EntranceApplication {
  id: string;
  exam_id: string;
  code_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  applied_class: string;
  admitted_class?: string;
  previous_school?: string;
  exam_score?: number;
  status: 'pending' | 'assigned' | 'passed' | 'failed' | 'admitted' | 'rejected' | 'banned';
  mastery_level?: string;
  subject_scores?: any;
  topic_mastery?: any;
  completed_at?: string;
  security_events?: any;
  answers?: any;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface Test {
  id: string;
  title: string;
  description?: string;
  subject_id?: string;
  class_id: string;
  created_by: string;
  test_type: 'class_test' | 'weekly' | 'monthly' | 'term' | 'practice';
  exam_date: string;
  duration_minutes: number;
  total_marks: number;
  passing_score: number;
  is_published: boolean;
  allow_image: boolean;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  require_fullscreen?: boolean;
  prevent_tab_switch?: boolean;
  max_tab_switches?: number;
  allow_camera?: boolean;
  created_at: string;
}

export interface TestQuestion {
  id: string;
  test_id: string;
  question: string;
  question_image?: string;
  options: string[];
  option_images?: string[];
  correct_answer: number;
  points: number;
  question_type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'multiple_selection';
  subject?: string;
  order_index?: number;
  created_at: string;
}

export interface TestAttempt {
  id: string;
  test_id: string;
  student_id: string;
  score: number;
  passed: boolean;
  answers: any;
  started_at: string;
  completed_at?: string;
  time_taken?: number;
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
  tab_switches?: number;
  fullscreen_exits?: number;
}

export interface TeacherEvaluation {
  id: string;
  teacher_id: string;
  evaluation_type: 'task' | 'observation' | 'review';
  title: string;
  description: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'evaluated';
  submitted_at?: string;
  score?: number;
  admin_notes?: string;
  evaluated_by?: string;
  evaluated_at?: string;
  created_at: string;
}

export interface TeacherTask {
  id: string;
  teacher_id: string;
  task_type: 'reading' | 'study' | 'project' | 'research' | 'other';
  title: string;
  description: string;
  due_date: string;
  status: 'pending' | 'submitted' | 'graded';
  submission_url?: string;
  grade?: number;
  admin_grade?: number;
  feedback?: string;
  created_by?: string;
  created_at: string;
}

export interface StudentPerformance {
  id: string;
  student_id: string;
  subject_id: string;
  term: string;
  academic_year: string;
  average_score: number;
  class_rank: number;
  total_students: number;
  improvement: 'improving' | 'declining' | 'stable';
  last_updated: string;
}

export interface ClassPerformance {
  id: string;
  class_id: string;
  term: string;
  academic_year: string;
  average_score: number;
  top_scorer: string;
  pass_rate: number;
  total_students: number;
}

export interface DepartmentPerformance {
  id: string;
  department_id: string;
  term: string;
  academic_year: string;
  average_score: number;
  top_class: string;
  total_students: number;
}

export interface AnalyticsData {
  totalStudents: number;
  totalTeachers: number;
  totalStaff: number;
  totalParents: number;
  attendanceRate: number;
  averageScore: number;
  topScorers: (Profile & { score: number })[];
  atRiskStudents: (Profile & { score: number })[];
  departmentPerformance: { department: string; avgScore: number }[];
  classPerformance: { class: string; avgScore: number }[];
}

export type ClassLevel = 'PRIMARY' | 'JSS' | 'SS' | 'SS1' | 'SS2' | 'SS3';

export const CLASS_LEVELS: { value: string; label: string }[] = [
  { value: 'PRIMARY', label: 'Elementary (Primary 1-6)' },
  { value: 'JSS', label: 'Junior Secondary (JSS 1-3)' },
  { value: 'SS1', label: 'Senior Secondary 1' },
  { value: 'SS2', label: 'Senior Secondary 2' },
  { value: 'SS3', label: 'Senior Secondary 3' },
];

export function formatGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function calculateGPA(scores: number[]): number {
   if (scores.length === 0) return 0;
   return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// Predictive Analytics Types
export interface StudentRiskPrediction {
   id: string;
   student_id: string;
   prediction_date: string;
   risk_level: 'low' | 'medium' | 'high' | 'critical';
   risk_score: number;
   contributing_factors: Record<string, any>;
   predicted_outcome?: string;
   confidence_score?: number;
   model_version?: string;
   is_acknowledged: boolean;
   acknowledged_by?: string;
   acknowledged_at?: string;
   created_at: string;
   updated_at: string;
   student?: Profile;
}

export interface PredictionFeature {
   id: string;
   prediction_id: string;
   feature_name: string;
   feature_value?: number;
   impact_score?: number;
   feature_category?: string;
   created_at: string;
}

export interface ModelPerformance {
   id: string;
   model_name: string;
   model_version: string;
   evaluation_date: string;
   accuracy?: number;
   precision_score?: number;
   recall_score?: number;
   f1_score?: number;
   auc_roc?: number;
   training_data_size?: number;
   feature_count?: number;
   notes?: string;
   created_at: string;
}

export interface Intervention {
   id: string;
   student_id: string;
   prediction_id?: string;
   intervention_type: string;
   description?: string;
   started_at: string;
   ended_at?: string;
   status: 'planned' | 'active' | 'completed' | 'cancelled';
   effectiveness_score?: number;
   notes?: string;
   created_by: string;
   created_at: string;
   updated_at: string;
    student?: Profile;
    prediction?: StudentRiskPrediction;
}

// Communication Hub Types
export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject?: string;
  content: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  recipient?: Profile;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

export interface NotificationPreferences {
  id: string;
  profile_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  announcement_emails: boolean;
  message_emails: boolean;
  attendance_alerts: boolean;
  grade_alerts: boolean;
  behavior_alerts: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  title: string;
  message: string;
  notification_type: 'announcement' | 'message' | 'attendance' | 'grade' | 'behavior' | 'system';
  related_id?: string;
  related_type?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  recipient?: Profile;
  sender?: Profile;
}

export interface PracticeSession {
  id: string;
  student_id: string;
  term_id?: string;
  date: string;
  goal_type: 'current_week' | 'weak_area' | 'spaced_revision' | 'challenge' | 'mixed';
  total_questions: number;
  answered_questions: number;
  correct_answers: number;
  score?: number;
  duration_seconds: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
  completed_at?: string;
}

export interface PracticeAttempt {
  id: string;
  session_id: string;
  student_id: string;
  question_source: 'bank' | 'quiz' | 'test';
  source_id?: string;
  question_text: string;
  question_type: string;
  options: any;
  correct_answer: number;
  selected_answer?: number;
  is_correct?: boolean;
  time_taken: number;
  difficulty: string;
  topic?: string;
  subtopic?: string;
  explanation?: string;
  created_at: string;
}

export interface DailyGoal {
  id: string;
  student_id: string;
  date: string;
  target_questions: number;
  target_score: number;
  completed_questions: number;
  achieved_score?: number;
  status: 'pending' | 'completed' | 'missed';
  created_at: string;
}

export interface LearningStreak {
  id: string;
  student_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
}

export interface Badge {
  id: string;
  student_id: string;
  badge_type: string;
  badge_data?: any;
  awarded_at: string;
}

export interface MasteryScore {
  id: string;
  student_id: string;
  subject_id: string;
  topic: string;
  subtopic: string;
  mastery_score: number;
  accuracy: number;
  consistency: number;
  recency: number;
  difficulty_progress: number;
  level: 'needs_support' | 'developing' | 'good_progress' | 'mastered';
  total_attempts: number;
  correct_attempts: number;
  last_practiced_at?: string;
  created_at: string;
  updated_at: string;
  subject?: Subject;
}

export interface ReviewSchedule {
  id: string;
  student_id: string;
  subject_id: string;
  topic: string;
  subtopic: string;
  next_review_date: string;
  interval_days: number;
  last_reviewed_at?: string;
  created_at: string;
  updated_at: string;
  subject?: Subject;
}

export interface QuestionBank {
  id: string;
  subject_id: string;
  class_id?: string;
  term_id?: string;
  topic: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer' | 'multiple_selection';
  question: string;
  question_image?: string;
  options: string[];
  option_images?: string[];
  correct_answer: number;
  points: number;
  explanation?: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  created_by?: string;
  created_at: string;
  updated_at: string;
  subject?: Subject;
  class?: Class;
}

// ============================================================================
// STUDENT GROWTH PORTFOLIO + IDENTITY BUILDER TYPES
// ============================================================================

export interface Archetype {
  id: string;
  name: string;
  description: string;
  icon_key: string;
  is_active: boolean;
  created_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category?: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface ArchetypeSkillMap {
  id: string;
  archetype_id: string;
  skill_id: string;
  recommendation_rank: number;
}

export interface ClassTermFramework {
  id: string;
  session_id: string;
  term_id: string;
  class_level: string;
  published_at?: string;
  created_by?: string;
  created_at: string;
  session?: AcademicSession;
  term?: Term;
  academic_competencies?: AcademicCompetency[];
  skill_expectations?: SkillExpectation[];
}

export interface AcademicCompetency {
  id: string;
  framework_id: string;
  subject_id: string;
  competency_text: string;
  order_index: number;
  subject?: Subject;
}

export interface SkillExpectation {
  id: string;
  framework_id: string;
  skill_id: string;
  expectation_text?: string;
  order_index: number;
  skill?: Skill;
}

export interface StudentTermGoal {
  id: string;
  student_id: string;
  session_id: string;
  term_id: string;
  archetype_id: string;
  goal_statement_snapshot: string;
  status: 'draft' | 'pending' | 'active' | 'archived';
  submitted_at?: string;
  approved_at?: string;
  approved_by?: string;
  reflection_text?: string;
  created_at: string;
  updated_at: string;
  archetype?: Archetype;
  student?: Profile;
  session?: AcademicSession;
  term?: Term;
  goal_skills?: StudentGoalSkill[];
  skill_rubrics?: StudentSkillRubric[];
}

export interface StudentGoalSkill {
  id: string;
  student_term_goal_id: string;
  skill_id: string;
  order_index: number;
  skill?: Skill;
}

export interface StudentSkillRubric {
  id: string;
  student_id: string;
  session_id: string;
  term_id: string;
  skill_id: string;
  level: 'emerging' | 'developing' | 'secure' | 'strong';
  updated_by?: string;
  updated_at: string;
  comment?: string;
  created_at: string;
  skill?: Skill;
  evidence_links?: SkillEvidenceLink[];
}

export interface PortfolioEvidence {
  id: string;
  student_id: string;
  session_id: string;
  term_id: string;
  evidence_type: 'attendance' | 'punctuality' | 'incident' | 'commendation' | 'audit' | 'assessment' | 'manual';
  reference_id?: string;
  text_snapshot?: string;
  created_by?: string;
  created_at: string;
}

export interface SkillEvidenceLink {
  id: string;
  student_skill_rubric_id: string;
  portfolio_evidence_id: string;
  evidence?: PortfolioEvidence;
}

export const RUBRIC_LEVELS = ['emerging', 'developing', 'secure', 'strong'] as const;
export type RubricLevel = typeof RUBRIC_LEVELS[number];

export const RUBRIC_COLORS: Record<RubricLevel, string> = {
  emerging: 'bg-red-500',
  developing: 'bg-amber-500',
  secure: 'bg-blue-500',
  strong: 'bg-emerald-500',
};

export const RUBRIC_LABELS: Record<RubricLevel, string> = {
  emerging: 'Emerging',
  developing: 'Developing',
  secure: 'Secure',
  strong: 'Strong',
};

export const GOAL_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-slate-100 text-slate-500',
};

// ============================================================================
// COMMUNICATION TYPES (existing)
// ============================================================================

export interface CommunicationGroup {
  id: string;
  name: string;
  description?: string;
  group_type: 'class' | 'subject' | 'team' | 'club' | 'custom';
  created_by: string;
  created_at: string;
  updated_at: string;
  creator?: Profile;
}

export interface CommunicationGroupMember {
  id: string;
  group_id: string;
  profile_id: string;
  role: 'member' | 'moderator' | 'admin';
  joined_at: string;
  group?: CommunicationGroup;
  profile?: Profile;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  attachment_urls?: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  sender?: Profile;
  group?: CommunicationGroup;
}

// ============================================================================
// V2: GROWTH & MASTERY LEARNING PLATFORM TYPES
// ============================================================================

// PERFORMANCE COLOR SYSTEM
export interface PerformanceColor {
  id: string;
  student_id: string;
  context_type: string;
  context_id?: string;
  score_range_min?: number;
  score_range_max?: number;
  color: MasteryColorKey;
  label: string;
  created_at: string;
}

export type MasteryColorKey = 'red' | 'orange' | 'yellow' | 'light_green' | 'green' | 'dark_green' | 'blue' | 'purple';

export interface MasteryColorConfig {
  range: [number, number] | null;
  label: string;
  hex: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

// DAILY ACCOUNTABILITY
export interface DailyAccountability {
  id: string;
  student_id: string;
  date: string;
  attendance_score: number;
  participation_score: number;
  homework_completion_score: number;
  study_time_score: number;
  quran_score: number;
  prayer_tracking_score: number;
  character_score: number;
  skill_activity_score: number;
  community_service_score: number;
  behavior_score: number;
  discipline_deductions: number;
  total_score: number;
  created_at: string;
  updated_at: string;
}

// GOAL HIERARCHY
export type GoalPeriodType = 'daily' | 'weekly' | 'monthly' | 'term' | 'yearly';
export type GoalDimension = 'academic' | 'islamic' | 'skills';
export type GoalStatus = 'active' | 'completed' | 'missed' | 'in_progress';

export interface GoalHierarchy {
  id: string;
  student_id: string;
  period_type: GoalPeriodType;
  dimension: GoalDimension;
  period_start: string;
  period_end: string;
  goal_text: string;
  target_metric?: string;
  target_value?: number;
  achieved_value?: number;
  status: GoalStatus;
  parent_goal_id?: string;
  source_goal_id?: string;
  source_type?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  parent_goal?: GoalHierarchy;
  child_goals?: GoalHierarchy[];
}

// MASTERY LEARNING ENGINE
export type MasteryStage = 'lesson' | 'practice' | 'challenge' | 'mastery_verification' | 'advancement';

export interface MasteryLearningPath {
  id: string;
  student_id: string;
  subject_id: string;
  topic: string;
  stage: MasteryStage;
  is_unlocked: boolean;
  is_completed: boolean;
  completed_at?: string;
  attempts_count: number;
  max_attempts: number;
  teacher_intervention_required: boolean;
  intervention_resolved_at?: string;
  score_on_completion?: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  subject?: Subject;
}

export interface TopicPrerequisite {
  id: string;
  subject_id: string;
  topic: string;
  prerequisite_topic: string;
  prerequisite_subject_id: string;
  order_index: number;
  created_at: string;
}

// KNOWLEDGE RETENTION SYSTEM
export interface RetentionCheck {
  id: string;
  student_id: string;
  subject_id: string;
  topic: string;
  mastery_score_at_verification: number;
  check_days: number;
  check_date: string;
  retest_score?: number;
  passed?: boolean;
  entered_reinforcement: boolean;
  reinforcement_completed: boolean;
  created_at: string;
  updated_at: string;
  subject?: Subject;
}

// PROMOTION ENGINE
export type PromotionStatus = 'ready' | 'needs_intervention' | 'conditional' | 'not_ready';

export interface PromotionReadiness {
  id: string;
  student_id: string;
  academic_year: string;
  term: string;
  academic_mastery_score: number;
  islamic_development_score: number;
  skills_development_score: number;
  behavior_score: number;
  attendance_score: number;
  consistency_score: number;
  leadership_score: number;
  retention_score: number;
  overall_score: number;
  promotion_status: PromotionStatus;
  supporting_evidence: Record<string, any>;
  recommended_next_class?: string;
  conditional_requirements?: string[];
  created_at: string;
  updated_at: string;
  student?: Profile;
}

// AI COACH
export type AICoachInteractionType = 'goal_suggestion' | 'lesson_recommendation' | 'revision_plan' | 'motivation' | 'gap_analysis' | 'prediction' | 'study_tip' | 'intervention_alert';

export interface AICoachInteraction {
  id: string;
  student_id: string;
  interaction_type: AICoachInteractionType;
  trigger_event?: string;
  prompt_text?: string;
  response_text?: string;
  recommendations?: Record<string, any>[];
  context?: Record<string, any>;
  effectiveness_rating?: number;
  user_feedback?: string;
  created_at: string;
}

// ADVANCED GAMIFICATION
export interface XPTransaction {
  id: string;
  student_id: string;
  xp_amount: number;
  xp_type: string;
  source: string;
  source_id?: string;
  multiplier: number;
  description?: string;
  created_at: string;
}

export interface StudentLevel {
  id: string;
  student_id: string;
  level: number;
  current_xp: number;
  total_xp: number;
  xp_to_next_level: number;
  mastery_points: number;
  created_at: string;
  updated_at: string;
}

export interface BadgeDefinition {
  id: string;
  badge_type: string;
  name: string;
  description: string;
  icon_key: string;
  category: 'academic' | 'islamic' | 'skills' | 'streak' | 'mastery' | 'challenge' | 'leadership' | 'community';
  tier: number;
  xp_reward: number;
  criteria: Record<string, any>;
  is_hidden: boolean;
  is_active: boolean;
  created_at: string;
}

export type LeaderboardType = 'class_weekly' | 'school_monthly' | 'islamic' | 'skills' | 'mastery';

export interface LeaderboardSnapshot {
  id: string;
  leaderboard_type: LeaderboardType;
  period_start: string;
  period_end: string;
  class_id?: string;
  rankings: LeaderboardEntry[];
  created_at: string;
}

export interface LeaderboardEntry {
  student_id: string;
  name: string;
  score: number;
  rank: number;
  avatar_url?: string;
  class_name?: string;
  level?: number;
  streak?: number;
}

// THREE-DIMENSIONAL GROWTH
export interface IslamicTracking {
  id: string;
  student_id: string;
  date: string;
  salah_fajr: boolean;
  salah_dhuhr: boolean;
  salah_asr: boolean;
  salah_maghrib: boolean;
  salah_isha: boolean;
  quran_surah?: string;
  quran_ayah_start?: number;
  quran_ayah_end?: number;
  quran_memorized_ayahs: number;
  quran_revision_ayahs: number;
  adab_rating?: number;
  dhikr_completed: boolean;
  charity_action?: string;
  notes?: string;
  self_reported: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SkillsTracking {
  id: string;
  student_id: string;
  skill_id: string;
  date: string;
  activity_type: string;
  activity_description?: string;
  duration_minutes: number;
  self_rating?: number;
  teacher_rating?: number;
  evidence_url?: string;
  created_at: string;
  skill?: Skill;
}

// NOTIFICATION SYSTEM
export interface NotificationPreferences {
  id: string;
  profile_id: string;
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  sms_notifications: boolean;
  practice_goal_alerts: boolean;
  mastery_alerts: boolean;
  streak_milestones: boolean;
  teacher_feedback_alerts: boolean;
  parent_daily_reports: boolean;
  behavior_alerts: boolean;
  intervention_alerts: boolean;
  badge_alerts: boolean;
  announcement_alerts: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  created_at: string;
  updated_at: string;
}

export interface UserNotification {
  id: string;
  recipient_id: string;
  sender_id?: string;
  title: string;
  message: string;
  notification_type: string;
  related_id?: string;
  related_type?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  read_at?: string;
  is_archived: boolean;
  action_url?: string;
  created_at: string;
  sender?: Profile;
}

// REPORTING
export type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'term' | 'annual';
export type ReportRecipientRole = 'student' | 'parent' | 'teacher' | 'admin';

export interface ReportSchedule {
  id: string;
  report_type: string;
  frequency: ReportFrequency;
  recipient_role: ReportRecipientRole;
  is_active: boolean;
  last_generated_at?: string;
  next_scheduled_at?: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface GeneratedReport {
  id: string;
  report_type: string;
  recipient_id: string;
  period_start: string;
  period_end: string;
  report_data: ReportData;
  pdf_url?: string;
  is_delivered: boolean;
  delivered_at?: string;
  created_at: string;
}

export interface ReportData {
  summary: ReportSummary;
  academic: ReportSection;
  islamic: ReportSection;
  skills: ReportSection;
  charts?: ReportChart[];
  recommendations?: string[];
  teacher_comments?: string[];
}

export interface ReportSummary {
  student_name: string;
  class_name: string;
  period_label: string;
  overall_score: number;
  overall_grade: string;
  days_active: number;
  goals_completed: number;
  goals_missed: number;
}

export interface ReportSection {
  score: number;
  level: string;
  strengths: string[];
  weaknesses: string[];
  trend: 'improving' | 'declining' | 'stable';
  details: Record<string, any>;
}

export interface ReportChart {
  type: 'bar' | 'line' | 'pie' | 'radar';
  title: string;
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

// SCHOOL HEALTH
export interface SchoolHealthSnapshot {
  id: string;
  snapshot_date: string;
  overall_health_score: number;
  academic_health_score: number;
  islamic_health_score: number;
  skills_health_score: number;
  attendance_rate: number;
  avg_mastery_score: number;
  active_students_pct: number;
  parent_engagement_rate: number;
  teacher_effectiveness_score: number;
  promotion_readiness_rate: number;
  at_risk_student_pct: number;
  intervention_success_rate: number;
  metadata: Record<string, any>;
  created_at: string;
}

// GROWTH MAP (game-like progression)
export interface GrowthMapNode {
  id: string;
  label: string;
  type: 'lesson' | 'practice' | 'challenge' | 'mastery' | 'achievement' | 'leadership' | 'islamic' | 'skills';
  x: number;
  y: number;
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  subject_id?: string;
  topic?: string;
  prerequisite_ids: string[];
  unlocked_by_ids: string[];
  metadata: Record<string, any>;
}

export interface GrowthMapConfig {
  id: string;
  class_level: string;
  nodes: GrowthMapNode[];
  connections: { from: string; to: string }[];
  is_active: boolean;
  created_at: string;
}

// ============================================================================
// FINANCE ENHANCEMENT TYPES
// ============================================================================

export interface FeeStructure {
  id: string;
  academic_session_id?: string;
  term_id?: string;
  class_id?: string;
  title: string;
  total_amount: number;
  due_date: string;
  status: 'draft' | 'published';
  created_by?: string;
  created_at: string;
  updated_at: string;
  class?: Class;
  term?: Term;
  academic_session?: AcademicSession;
  items?: FeeStructureItem[];
}

export interface FeeStructureItem {
  id: string;
  fee_structure_id: string;
  item_name: string;
  amount: number;
  description?: string;
  created_at: string;
}

export interface PaymentUpload {
  id: string;
  invoice_id?: string;
  fee_structure_id?: string;
  student_id: string;
  parent_id: string;
  amount: number;
  receipt_url: string;
  storage_path?: string;
  notes?: string;
  status: 'pending' | 'verified' | 'rejected';
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  created_at: string;
  student?: Profile;
  parent?: Profile;
  invoice?: Invoice;
}

// XP MULTIPLIERS
export const XP_MULTIPLIERS = {
  first_practice_of_day: 2.0,
  streak_3_bonus: 1.5,
  streak_7_bonus: 2.0,
  streak_30_bonus: 3.0,
  perfect_week: 2.0,
  mastery_achieved: 2.0,
  teacher_commendation: 1.5,
  challenge_win: 1.5,
  no_multiplier: 1.0,
} as const;