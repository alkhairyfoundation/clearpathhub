# ClearPath Edu Hub - Complete Setup Guide

A comprehensive school management system built with Next.js, TypeScript, Tailwind CSS, and Supabase.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Installation](#installation)
4. [Supabase Setup](#supabase-setup)
5. [Environment Variables](#environment-variables)
6. [Running the Application](#running-the-application)
7. [Features Overview](#features-overview)
8. [Database Schema](#database-schema)
9. [Troubleshooting](#troubleshooting)
10. [Deployment](#deployment)

---

## Prerequisites

Before starting, ensure you have:
- **Node.js 18+** installed
- **npm** or **yarn** package manager
- **Supabase account** (free at supabase.com)
- A code editor (VS Code recommended)

---

## Project Structure

```
eduhub/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (portal)/          # Portal layouts
│   │   ├── admin/            # Admin portal pages
│   │   ├── teacher/          # Teacher portal pages
│   │   ├── student/          # Student portal pages
│   │   ├── parent/           # Parent portal pages
│   │   ├── accountant/       # Accountant portal pages
│   │   ├── login/           # Login page
│   │   └── page.tsx          # Landing page
│   ├── components/           # Shared components
│   ├── context/             # React context (Auth)
│   ├── lib/                 # Utilities & Supabase client
│   └── types/               # TypeScript types
├── public/                   # Static files
├── package.json             # Dependencies
├── tailwind.config.ts      # Tailwind config
├── tsconfig.json           # TypeScript config
└── README.md              # This file
```

---

## Installation

### Step 1: Navigate to Project

```bash
cd eduhub
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install:
- `next` - React framework
- `react` & `react-dom` - UI library
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - SSR utilities
- `tailwindcss` - Styling
- `lucide-react` - Icons
- `qrcode` - QR code generation
- `recharts` - Charts and graphs
- `date-fns` - Date utilities
- `uuid` - ID generation

### Step 3: Create Environment File

```bash
cp .env.local.example .env.local
```

---

## Supabase Setup

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Enter details:
   - **Name**: clearpath-eduhub
   - **Database Password**: (strong password)
   - **Region**: (closest to you)
4. Click "Create new project"
5. Wait for setup to complete

### Step 2: Get Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** (for `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (for `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

### Step 3: Run SQL Schema

In Supabase dashboard, go to **SQL Editor** and run this complete schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student', 'parent', 'accountant')),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- SCHOOL SETTINGS
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

-- DEPARTMENTS
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  head_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- CLASSES
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 12),
  department_id UUID REFERENCES departments(id),
  class_teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- SUBJECTS
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  department_id UUID REFERENCES departments(id),
  teacher_id UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- STUDENTS
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  admission_number TEXT UNIQUE NOT NULL,
  class_id UUID REFERENCES classes(id),
  parent_id UUID REFERENCES profiles(id),
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  blood_group TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- STAFF
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  staff_id TEXT UNIQUE NOT NULL,
  department_id UUID REFERENCES departments(id),
  designation TEXT,
  salary NUMERIC(10,2),
  date_of_employment DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- SESSIONS (Video Lessons)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id),
  teacher_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_type TEXT DEFAULT 'youtube' CHECK (video_type IN ('youtube', 'upload')),
  duration INTEGER,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QUIZZES
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  passing_score INTEGER DEFAULT 50,
  time_limit INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QUIZ QUESTIONS
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  points INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QUIZ ATTEMPTS
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  score INTEGER NOT NULL,
  passed BOOLEAN NOT NULL,
  answers INTEGER[],
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- LESSONS (Notes)
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

-- HOMEWORK
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

-- HOMEWORK SUBMISSIONS
CREATE TABLE homework_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  homework_id UUID REFERENCES homework(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id),
  submission_url TEXT,
  marks INTEGER,
  feedback TEXT,
  submitted_at TIMESTAMP,
  graded_at TIMESTAMP
);

-- ATTENDANCE
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  class_id UUID REFERENCES classes(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by UUID REFERENCES profiles(id),
  marked_at TIMESTAMP,
  scan_method TEXT CHECK (scan_method IN ('manual', 'qr_scan')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- STAFF ATTENDANCE
CREATE TABLE staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES profiles(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by UUID REFERENCES profiles(id),
  marked_at TIMESTAMP,
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- RESULTS
CREATE TABLE results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  subject_id UUID REFERENCES subjects(id),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('ca1', 'ca2', 'ca3', 'exam')),
  score NUMERIC(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  grade TEXT,
  remarks TEXT,
  entered_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- BEHAVIORAL REPORTS
CREATE TABLE behavioral_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  punctuality INTEGER NOT NULL CHECK (punctuality BETWEEN 1 AND 5),
  class_participation INTEGER NOT NULL CHECK (class_participation BETWEEN 1 AND 5),
  homework_completion INTEGER NOT NULL CHECK (homework_completion BETWEEN 1 AND 5),
  behavior TEXT,
  teacher_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ANNOUNCEMENTS
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('all', 'students', 'teachers', 'parents', 'staff')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  attachments TEXT[],
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- TRANSACTIONS
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  payment_method TEXT,
  reference_number TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- INVOICES
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  invoice_number TEXT UNIQUE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- RECEIPTS
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  receipt_number TEXT UNIQUE NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ID CARDS
CREATE TABLE id_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id),
  card_number TEXT UNIQUE NOT NULL,
  qr_code TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  issued_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Insert default school settings
INSERT INTO school_settings (school_name, primary_color, secondary_color, accent_color)
VALUES ('ClearPath Edu Hub', '#2563eb', '#1e293b', '#10b981');
```

### Step 4: Enable Row Level Security

Run this SQL to add security policies:

```sql
-- PROFILES RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Create index on email for faster lookups
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_results_student ON results(student_id);
```

---

## Environment Variables

Edit `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Running the Application

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Access the Application

Open [http://localhost:3000](http://localhost:3000)

### Step 3: Create First Admin User

1. Go to `/login`
2. You need to manually insert the first admin user in Supabase:
   - Go to **Table Editor** → **profiles**
   - Click **Insert row**
   - Fill in:
     - `id`: (Generate UUID)
     - `email`: admin@clearpatheduhub.com
     - `first_name`: Admin
     - `last_name`: User
     - `role`: admin
   - Click **Save**

**Note**: For authentication to work, you need to set up Supabase Auth. In development, you can use the Supabase dashboard to create users, or implement the full signup flow.

---

## Features Overview

### Admin Portal
| Feature | Description |
|---------|-------------|
| Dashboard | Stats, quick actions, recent activity |
| Users | CRUD all user types |
| Departments | Create/edit departments |
| Classes | Manage classes with levels |
| Subjects | Assign teachers to subjects |
| ID Cards | Generate QR-coded ID cards |
| Staff QR | Daily attendance QR generation |
| Attendance | Student attendance tracking |
| Analytics | Charts, top performers, at-risk |
| Announcements | Priority-based announcements |
| Settings | School colors, logo, academic year |

### Teacher Portal
| Feature | Description |
|---------|-------------|
| Dashboard | Class overview, upcoming tasks |
| Video Lessons | YouTube/upload lessons |
| Quizzes | Create with questions |
| Lesson Notes | Upload materials |
| Homework | Create and grade |
| Results | Enter scores |
| Attendance | Take class attendance |
| Behavior | Weekly reports |
| Scan ID | QR code scanner |

### Student Portal
| Feature | Description |
|---------|-------------|
| Dashboard | Progress overview |
| Video Lessons | Watch and learn |
| Lessons | Download notes |
| Homework | Submit assignments |
| Results | View grades |
| Attendance | Track record |
| My ID Card | Digital ID with QR |

### Parent Portal
| Feature | Description |
|---------|-------------|
| Dashboard | Children overview |
| Children | Linked students |
| Progress | Academic performance |
| Behavior | Weekly reports |
| Payments | View invoices |
| Announcements | School updates |

### Accountant Portal
| Feature | Description |
|---------|-------------|
| Dashboard | Financial overview |
| Transactions | Income/expense CRUD |
| Invoices | Create & manage |
| Receipts | Generate receipts |
| Reports | Financial summaries |

---

## Key Features in Detail

### ID Cards with QR Codes
- Automatic QR generation from admission number
- Print-ready format
- Scannable for attendance

### Staff Attendance QR
- Generate daily unique QR code
- Download and paste
- Staff scans to mark attendance

### Video Lessons
- YouTube URL support
- Embedded player
- Quiz attachment

### Behavioral Reports
- Weekly reports for each student
- Rating system (1-5 stars)
- Parent notifications

### Comprehensive Analytics
- Attendance trends (line charts)
- Performance by subject (bar charts)
- Class distribution (pie charts)
- Top performers ranking

---

## Troubleshooting

### Common Issues

**1. "Table not found" error**
- Solution: Run the SQL schema again in Supabase SQL Editor

**2. Authentication not working**
- Solution: Ensure your Supabase URL and anon key are correct in `.env.local`

**3. Build errors**
- Solution: Run `npm install` to ensure all dependencies are installed

**4. Charts not displaying**
- Solution: Ensure you have data in the database first

### Getting Help

For issues, check:
1. Browser console for errors
2. Supabase dashboard logs
3. Network tab for failed requests

---

## Deployment

### Vercel Deployment

1. Push your code to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Go to [vercel.com](https://vercel.com)

3. Click "Add New..." → "Project"

4. Import your GitHub repository

5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

6. Click "Deploy"

### Production Checklist

- [ ] All SQL tables created
- [ ] Seed data added (departments, classes, subjects)
- [ ] Test all portals work
- [ ] Configure custom domain (optional)
- [ ] Set up backup schedule in Supabase

---

## Support

- Documentation: [docs.clearpatheduhub.com](https://docs.clearpatheduhub.com)
- GitHub Issues: [github.com/clearpatheduhub/issues](https://github.com/clearpatheduhub/issues)
- Email: support@clearpatheduhub.com

---

## License

MIT License - ClearPath Edu Hub 2024