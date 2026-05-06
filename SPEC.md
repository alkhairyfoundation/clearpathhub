# ClearPath Edu Hub - School Management System Specification

## Project Overview
- **Project Name**: ClearPath Edu Hub LMS
- **Type**: Full-stack School Management Web Application
- **Core Functionality**: Comprehensive learning management system for a single school with multi-portal access (Admin, Teacher, Student, Parent, Accountant)
- **Target Users**: School administrators, teachers, students, parents, and accountants

---

## Tech Stack
- **Frontend**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Deployment**: Vercel
- **QR Codes**: qrcode library
- **Charts**: Recharts
- **PDF Generation**: @react-pdf/renderer

---

## Database Schema

### Tables

#### `profiles`
- `id` (uuid, PK) - references auth.users
- `email` (text)
- `first_name` (text)
- `last_name` (text)
- `phone` (text)
- `role` (enum: 'admin', 'teacher', 'student', 'parent', 'accountant')
- `avatar_url` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `school_settings`
- `id` (uuid, PK)
- `school_name` (text)
- `school_motto` (text)
- `school_address` (text)
- `school_phone` (text)
- `school_email` (text)
- `school_logo` (text)
- `primary_color` (text) - hex color
- `secondary_color` (text) - hex color
- `accent_color` (text) - hex color
- `academic_year` (text)
- `term` (text)
- `session_start` (date)
- `session_end` (date)

#### `departments`
- `id` (uuid, PK)
- `name` (text)
- `code` (text)
- `head_id` (uuid) - references profiles(id)
- `created_at` (timestamp)

#### `classes`
- `id` (uuid, PK)
- `name` (text)
- `level` (int)
- `department_id` (uuid) - references departments(id)
- `class_teacher_id` (uuid) - references profiles(id)
- `created_at` (timestamp)

#### `subjects`
- `id` (uuid, PK)
- `name` (text)
- `code` (text)
- `department_id` (uuid) - references departments(id)
- `teacher_id` (uuid) - references profiles(id)
- `class_id` (uuid) - references classes(id)
- `created_at` (timestamp)

#### `students`
- `id` (uuid, PK)
- `profile_id` (uuid) - references profiles(id)
- `admission_number` (text, unique)
- `class_id` (uuid) - references classes(id)
- `parent_id` (uuid) - references profiles(id)
- `date_of_birth` (date)
- `gender` (text)
- `address` (text)
- `guardian_name` (text)
- `guardian_phone` (text)
- `guardian_email` (text)
- `blood_group` (text)
- `emergency_contact` (text)
- `created_at` (timestamp)

#### `staff`
- `id` (uuid, PK)
- `profile_id` (uuid) - references profiles(id)
- `staff_id` (text, unique)
- `department_id` (uuid) - references departments(id)
- `designation` (text)
- `salary` (decimal)
- `date_of_employment` (date)
- `status` (text) - 'active', 'inactive'
- `created_at` (timestamp)

#### `sessions`
- `id` (uuid, PK)
- `subject_id` (uuid) - references subjects(id)
- `teacher_id` (uuid) - references profiles(id)
- `title` (text)
- `description` (text)
- `video_url` (text) - YouTube or upload URL
- `video_type` (enum: 'youtube', 'upload')
- `duration` (int) - minutes
- `is_published` (bool)
- `created_at` (timestamp)

#### `quizzes`
- `id` (uuid, PK)
- `session_id` (uuid) - references sessions(id)
- `title` (text)
- `description` (text)
- `passing_score` (int)
- `time_limit` (int) - minutes
- `created_at` (timestamp)

#### `quiz_questions`
- `id` (uuid, PK)
- `quiz_id` (uuid) - references quizzes(id)
- `question` (text)
- `options` (jsonb) - array of options
- `correct_answer` (int) - index of correct option
- `points` (int)
- `created_at` (timestamp)

#### `quiz_attempts`
- `id` (uuid, PK)
- `quiz_id` (uuid) - references quizzes(id)
- `student_id` (uuid) - references profiles(id)
- `score` (int)
- `passed` (bool)
- `answers` (jsonb)
- `started_at` (timestamp)
- `completed_at` (timestamp)

#### `lessons`
- `id` (uuid, PK)
- `subject_id` (uuid) - references subjects(id)
- `teacher_id` (uuid) - references profiles(id)
- `title` (text)
- `content` (text) - markdown
- `attachments` (jsonb) - array of file URLs
- `is_published` (bool)
- `created_at` (timestamp)

#### `homework`
- `id` (uuid, PK)
- `subject_id` (uuid) - references subjects(id)
- `class_id` (uuid) - references classes(id)
- `teacher_id` (uuid) - references profiles(id)
- `title` (text)
- `description` (text)
- `due_date` (date)
- `total_marks` (int)
- `created_at` (timestamp)

#### `homework_submissions`
- `id` (uuid, PK)
- `homework_id` (uuid) - references homework(id)
- `student_id` (uuid) - references profiles(id)
- `submission_url` (text)
- `marks` (int)
- `feedback` (text)
- `submitted_at` (timestamp)
- `graded_at` (timestamp)

#### `attendance`
- `id` (uuid, PK)
- `student_id` (uuid) - references profiles(id)
- `class_id` (uuid) - references classes(id)
- `date` (date)
- `status` (enum: 'present', 'absent', 'late', 'excused')
- `marked_by` (uuid) - references profiles(id)
- `marked_at` (timestamp)
- `scan_method` (enum: 'manual', 'qr_scan')
- `created_at` (timestamp)

#### `staff_attendance`
- `id` (uuid, PK)
- `staff_id` (uuid) - references profiles(id)
- `date` (date)
- `status` (enum: 'present', 'absent', 'late')
- `marked_by` (uuid) - references profiles(id)
- `marked_at` (timestamp)
- `qr_code` (text) - unique for the day
- `created_at` (timestamp)

#### `results`
- `id` (uuid, PK)
- `student_id` (uuid) - references profiles(id)
- `subject_id` (uuid) - references subjects(id)
- `exam_type` (enum: 'ca1', 'ca2', 'ca3', 'exam')
- `score` (decimal)
- `grade` (text)
- `remarks` (text)
- `entered_by` (uuid) - references profiles(id)
- `created_at` (timestamp)

#### `behavioral_reports`
- `id` (uuid, PK)
- `student_id` (uuid) - references profiles(id)
- `week_start` (date)
- `week_end` (date)
- `rating` (int) - 1-5
- `punctuality` (int)
- `class_participation` (int)
- `homework_completion` (int)
- `behavior` (text)
- `teacher_notes` (text)
- `created_at` (timestamp)

#### `announcements`
- `id` (uuid, PK)
- `title` (text)
- `content` (text)
- `audience` (enum: 'all', 'students', 'teachers', 'parents', 'staff')
- `priority` (enum: 'low', 'normal', 'high', 'urgent')
- `attachments` (jsonb)
- `created_by` (uuid) - references profiles(id)
- `created_at` (timestamp)
- `expires_at` (timestamp)

#### `transactions`
- `id` (uuid, PK)
- `student_id` (uuid) - references profiles(id)
- `type` (enum: 'income', 'expense')
- `category` (text)
- `amount` (decimal)
- `description` (text)
- `payment_method` (text)
- `reference_number` (text)
- `recorded_by` (uuid) - references profiles(id)
- `created_at` (timestamp)

#### `invoices`
- `id` (uuid, PK)
- `student_id` (uuid) - references profiles(id)
- `invoice_number` (text, unique)
- `amount` (decimal)
- `description` (text)
- `due_date` (date)
- `status` (enum: 'pending', 'paid', 'overdue')
- `created_at` (timestamp)

#### `receipts`
- `id` (uuid, PK)
- `invoice_id` (uuid) - references invoices(id)
- `receipt_number` (text, unique)
- `amount_paid` (decimal)
- `payment_method` (text)
- `reference_number` (text)
- `created_at` (timestamp)

#### `id_cards`
- `id` (uuid, PK)
- `student_id` (uuid) - references profiles(id)
- `card_number` (text, unique)
- `qr_code` (text)
- `is_active` (bool)
- `issued_at` (timestamp)
- `expires_at` (timestamp)

---

## Portal Features

### Admin Portal
1. **Dashboard**
   - Total students, teachers, staff counts
   - Today's attendance overview
   - Recent announcements
   - Quick stats cards

2. **User Management**
   - Create/edit/delete all user types
   - Assign roles and permissions
   - Bulk import students/teachers

3. **School Settings**
   - School name, logo, colors (primary, secondary, accent)
   - Academic year and term setup
   - Session dates

4. **Department & Class Management**
   - Create/edit departments
   - Create/edit classes with levels
   - Assign class teachers

5. **Subject Management**
   - Create subjects
   - Assign teachers to subjects

6. **ID Card Generation**
   - Generate ID cards with QR codes
   - Batch generate for classes
   - Customizable template

7. **Staff Attendance**
   - Generate daily QR code for staff scanning
   - Download/print QR code
   - View staff attendance records

8. **Analytics & Reports**
   - Student performance by class/department
   - Top scorers
   - At-risk students
   - Attendance trends
   - Financial summaries

9. **Announcements**
   - Create announcements for specific audiences
   - Priority levels (low, normal, high, urgent)
   - Schedule announcements

### Teacher Portal
1. **Dashboard**
   - My classes overview
   - Pending homework to grade
   - Recent announcements

2. **Classes**
   - View assigned classes
   - Take attendance

3. **Sessions (Video Lessons)**
   - Create video lessons (YouTube/Upload)
   - Add quizzes to sessions
   - Track completion

4. **Quizzes**
   - Create quizzes with questions
   - Set passing scores
   - View attempts and results

5. **Lessons**
   - Upload lesson notes
   - Add attachments (PDFs, images)

6. **Homework**
   - Create homework
   - Grade submissions
   - Give feedback

7. **Results**
   - Enter exam scores
   - Calculate grades
   - Generate reports

8. **Behavioral Reports**
   - Weekly behavior reports
   - Rate students on various metrics

9. **Student ID Scanning**
   - Scan student ID for attendance
   - Quick attendance marking

### Student Portal
1. **Dashboard**
   - My subjects
   - Pending homework
   - Upcoming quizzes

2. **Video Lessons**
   - Watch assigned lessons
   - Complete quizzes

3. **Lessons**
   - Download lesson notes
   - View attachments

4. **Homework**
   - Submit homework
   - View grades and feedback

5. **Results**
   - View all results by subject
   - Performance trends

6. **Attendance**
   - View attendance record

7. **My ID Card**
   - View digital ID card
   - QR code for attendance

8. **Announcements**
   - View announcements

### Parent Portal
1. **Dashboard**
   - Children's progress overview
   - Recent announcements

2. **Children**
   - View linked children
   - Each child's: attendance, results, homework

3. **Behavioral Reports**
   - Weekly behavior reports
   - Teacher notes

4. **Payments**
   - View invoices
   - Make payments

5. **Announcements**
   - School announcements

### Accountant Portal
1. **Dashboard**
   - Financial overview
   - Pending payments

2. **Transactions**
   - Record income/expenses
   - Categorize transactions
   - Search and filter

3. **Invoices**
   - Create invoices
   - Send to parents

4. **Receipts**
   - Generate receipts
   - Auto-generate from payments

5. **Reports**
   - Financial summaries
   - Income vs expense
   - Class-wise fees collection

---

## UI/UX Design

### Color Scheme (Default - Customizable)
- Primary: `#2563eb` (Blue)
- Secondary: `#1e293b` (Slate)
- Accent: `#10b981` (Emerald)

### Typography
- Headings: Inter (Bold)
- Body: Inter (Regular)

### Layout
- Sidebar navigation (collapsible)
- Top header with user menu
- Main content area with cards

### Responsive
- Mobile: Bottom navigation
- Tablet: Collapsed sidebar
- Desktop: Full sidebar

---

## API Routes (Next.js)

### Auth
- `/api/auth/callback` - Supabase auth callback

### Admin
- `/api/admin/users` - CRUD users
- `/api/admin/settings` - School settings
- `/api/admin/departments` - CRUD departments
- `/api/admin/classes` - CRUD classes
- `/api/admin/subjects` - CRUD subjects
- `/api/admin/id-cards` - Generate ID cards
- `/api/admin/analytics` - Get analytics data

### Teacher
- `/api/teacher/sessions` - CRUD sessions
- `/api/teacher/quizzes` - CRUD quizzes
- `/api/teacher/lessons` - CRUD lessons
- `/api/teacher/homework` - CRUD homework
- `/api/teacher/results` - CRUD results
- `/api/teacher/behavior` - CRUD behavioral reports

### Student
- `/api/student/sessions` - Get assigned sessions
- `/api/student/lessons` - Get lessons
- `/api/student/homework` - Get/submit homework
- `/api/student/results` - Get results

### Parent
- `/api/parent/children` - Get linked children
- `/api/parent/behavior` - Get behavior reports

### Accountant
- `/api/accountant/transactions` - CRUD transactions
- `/api/accountant/invoices` - CRUD invoices
- `/api/accountant/receipts` - Generate receipts

---

## Deployment

### Vercel Configuration
- Environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### Supabase Setup
- Enable Auth
- Enable Storage (buckets: videos, documents, id-cards)
- Enable Realtime for announcements

---

## Acceptance Criteria

1. ✅ All 5 portals accessible with role-based auth
2. ✅ Admin can customize school theme/colors
3. ✅ ID cards generate with QR codes
4. ✅ Staff attendance via QR code scanning
5. ✅ Student attendance via ID card scanning
6. ✅ Video lessons support YouTube + uploads
7. ✅ Quizzes with auto-grading
8. ✅ Results with grade calculation
9. ✅ Weekly behavioral reports to parents
10. ✅ Comprehensive analytics dashboard
11. ✅ Financial management with receipts
12. ✅ Announcements with audience targeting
13. ✅ Responsive design for all devices