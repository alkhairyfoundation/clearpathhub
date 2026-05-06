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
  subject?: Subject;
  quiz?: Quiz[];
}

export interface VideoCheckpoint {
  id?: string;
  timestamp_seconds: number;
  question: string;
  question_image?: string;
  options: string[];
  option_images?: string[];
  correct_answer: number;
  points: number;
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
  options: string[];
  correct_answer: number;
  points: number;
  created_at: string;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number;
  passed: boolean;
  answers: number[];
  started_at: string;
  completed_at?: string;
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
  previous_school?: string;
  exam_score?: number;
  status: 'pending' | 'passed' | 'failed' | 'reviewed';
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
  question_type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  subject?: string;
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