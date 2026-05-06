# ClearPath Edu Hub - School Management System

A comprehensive school management system built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

### Admin Portal
- Dashboard with analytics and quick stats
- User management (students, teachers, parents, accountants)
- Department and class management
- Subject management
- ID card generation with QR codes
- Staff attendance QR code generation
- Student attendance tracking
- Comprehensive analytics and reports
- Announcements management
- School settings (colors, logo, academic year)

### Teacher Portal
- Dashboard with class overview
- Video lessons (YouTube and uploads)
- Quizzes with auto-grading
- Lesson notes
- Homework management and grading
- Results entry
- Attendance taking
- Behavioral reports
- Student ID scanning

### Student Portal
- Video lessons
- Lesson notes
- Homework submission
- Results view
- Attendance record
- Digital ID card with QR code

### Parent Portal
- Children progress tracking
- Behavioral reports
- Payment management
- Announcements

### Accountant Portal
- Transaction management
- Invoicing
- Receipt generation
- Financial reports

## Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **QR Codes**: qrcode library
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <your-repo>
cd eduhub
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Supabase Setup

### Database Schema

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'accountant')),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- School settings
CREATE TABLE school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_name TEXT NOT NULL DEFAULT 'ClearPath Edu Hub',
  school_motto TEXT,
  school_address TEXT,
  school_phone TEXT,
  school_email TEXT,
  school_logo TEXT,
  primary_color TEXT DEFAULT '#2563eb',
  secondary_color TEXT DEFAULT '#1e293b',
  accent_color TEXT DEFAULT '#10b981',
  academic_year TEXT,
  term TEXT DEFAULT 'First Term',
  session_start DATE,
  session_end DATE
);

-- Departments
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  head_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Classes
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level INTEGER NOT NULL,
  department_id UUID REFERENCES departments(id),
  class_teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  teacher_id UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  admission_number TEXT UNIQUE NOT NULL,
  class_id UUID REFERENCES classes(id),
  parent_id UUID REFERENCES profiles(id),
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  blood_group TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Staff
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  staff_id TEXT UNIQUE NOT NULL,
  department_id UUID REFERENCES departments(id),
  designation TEXT,
  salary NUMERIC,
  date_of_employment DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Sessions (Video Lessons)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_type TEXT DEFAULT 'youtube',
  duration INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 50,
  time_limit INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quiz Questions
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL,
  points INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Quiz Attempts
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  student_id UUID REFERENCES profiles(id),
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers INTEGER[],
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Lessons
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  content TEXT,
  attachments TEXT[],
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Homework
CREATE TABLE homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  class_id UUID REFERENCES classes(id),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  total_marks INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Homework Submissions
CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID REFERENCES homework(id),
  student_id UUID REFERENCES profiles(id),
  submission_url TEXT,
  marks INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMP,
  graded_at TIMESTAMP
);

-- Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by UUID REFERENCES profiles(id),
  marked_at TIMESTAMP,
  scan_method TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Staff Attendance
CREATE TABLE staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by UUID REFERENCES profiles(id),
  marked_at TIMESTAMP,
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Results
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  subject_id UUID REFERENCES subjects(id),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('ca1', 'ca2', 'ca3', 'exam')),
  score NUMERIC NOT NULL,
  grade TEXT,
  remarks TEXT,
  entered_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Behavioral Reports
CREATE TABLE behavioral_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  rating INTEGER NOT NULL,
  punctuality INTEGER NOT NULL,
  class_participation INTEGER NOT NULL,
  homework_completion INTEGER NOT NULL,
  behavior TEXT,
  teacher_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('all', 'students', 'teachers', 'parents', 'staff')),
  priority TEXT DEFAULT 'normal',
  attachments TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_method TEXT,
  reference_number TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  invoice_number TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Receipts
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  receipt_number TEXT UNIQUE NOT NULL,
  amount_paid NUMERIC NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ID Cards
CREATE TABLE id_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  card_number TEXT UNIQUE NOT NULL,
  qr_code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

### Row Level Security (RLS)

Enable RLS and set up policies for each table:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

## Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

## License

MIT