# Production Readiness Plan — ClearPath Edu Hub

## Phased Implementation Roadmap

---

## Phase 0: Audit Baseline (Pre-Flight Checks)

Before starting, establish a safety net:

- [ ] Take a full DB backup / snapshot of current schema
- [ ] Git commit/tag the current state (`git tag pre-production-audit`)
- [ ] Run existing schema SQL files against a test Supabase instance to verify they apply cleanly
- [ ] Create a test plan checklist to validate each fix

---

## Phase 1: Critical Bug Fixes (Do First — Showstoppers)

> **Goal**: Fix bugs that cause data loss, silent failures, or broken core flows.

### 1.1 Fix Admin Student Creation to Create `students` Record

**Files:** `src/app/api/admin/users/route.ts`, `src/app/admin/users/page.tsx`

**Problem:** Admin creates a student profile but no `students` table record — no admission number, no class, student is invisible to most features.

**Fix:**
1. After profile creation in `POST /api/admin/users`, when `role === 'student'`, also insert into `students` table:
   - `profile_id` = auth user ID
   - `admission_number` = auto-generated (e.g., `ADM-{year}-{counter}`)
   - `class_id` = `null` initially (admin assigns later via edit)
2. Update the admin UI modal: when creating a student, show optional fields (class, DOB, gender)
3. Add a follow-up step: after creation, redirect to student detail/edit to assign class and fill extra fields

### 1.2 Fix Entrance Exams — Filter by Current Student

**File:** `src/app/student/entrance-exams/page.tsx`

**Problem:** Fetches ALL entrance applications — no filter.

**Fix:**
```typescript
// Before
const { data: applications } = await supabase
  .from('entrance_applications')
  .select('*, exam:entrance_exams(*)');

// After
const { data: applications } = await supabase
  .from('entrance_applications')
  .select('*, exam:entrance_exams(*)')
  .eq('email', profile?.email);
```

### 1.3 Fix Parent Profile Page — Wrong ID

**File:** `src/app/parent/profile/page.tsx`

**Problem:** Uses `child.id` (students table PK) instead of `child.profile_id` to query attendance/results/behavior.

**Fix:** Change all `.eq('student_id', child.id)` → `.eq('student_id', child.profile_id)` on lines 41, 43, 45.

### 1.4 Fix Behavioral Reports Schema Mismatch

**Files:** `COMPLETE_SCHEMA.sql`, `src/app/parent/page.tsx`, `src/app/parent/behavior/page.tsx`

**Problem:** Code references `entered_by`, `title`, `type`, `severity` columns that don't exist on `behavioral_reports`.

**Fix (option A — update schema):**
```sql
ALTER TABLE behavioral_reports
  ADD COLUMN entered_by UUID REFERENCES profiles(id),
  ADD COLUMN title TEXT,
  ADD COLUMN type TEXT DEFAULT 'general',
  ADD COLUMN severity TEXT DEFAULT 'medium';
```

**Fix (option B — update code):** Map to actual columns (`teacher_notes` etc.) and remove `entered_by` join.

### 1.5 Fix Homework Submission — Column Name

**File:** `src/app/student/homework/page.tsx`

**Problem:** Inserts into non-existent `submission_files` column.

**Fix:** Change `submission_files` → `submission_url` in the insert payload. If file upload is intended, store the storage URL in `submission_url`.

---

## Phase 2: High Priority — Data Integrity & Queries

> **Goal**: Fix incorrect queries, N+1 problems, and data scoping issues.

### 2.1 Fix Student Dashboard Sessions Query

**File:** `src/app/student/page.tsx`

**Problem:** `.eq('class_id', null)` excludes all class-assigned sessions.

**Fix:** Query sessions by the student's actual class:
```typescript
const { data: studentData } = await supabase
  .from('students')
  .select('class_id')
  .eq('profile_id', profile?.id)
  .single();

const sessionsQuery = supabase
  .from('sessions')
  .select('*, subject:subjects(name)')
  .eq('is_published', true)
  .or(`class_id.eq.${studentData?.class_id},class_id.is.null`);
```

### 2.2 Fix Dashboard Progress Bar

**File:** `src/app/student/page.tsx` (line ~161)

**Problem:** `width: item.value` → raw number as pixels.

**Fix:** `style={{ width: \`${item.value}%\` }}`

### 2.3 Fix Profile Subject Name Display

**File:** `src/app/student/profile/page.tsx`

**Problem:** Shows truncated UUID instead of subject name.

**Fix:** Join with `subjects` table in the query or fetch subject names separately.

### 2.4 Eliminate N+1 Queries on Parent Pages

**File:** `src/app/parent/children/page.tsx`, `src/app/parent/profile/page.tsx`

**Problem:** Sequential per-child queries inside `for...of` loops.

**Fix:** Batch queries using `Promise.all` with all child IDs:
```typescript
const childIds = children.map(c => c.profile_id);

const [attendanceRes, resultsRes, ...] = await Promise.all([
  supabase.from('attendance').select('student_id, status').in('student_id', childIds),
  supabase.from('results').select('student_id, score').in('student_id', childIds),
  // ... etc
]);
```

### 2.5 Add Class Scoping to All Student Content Queries

**Files:**
- `src/app/student/lessons/page.tsx`
- `src/app/student/homework/page.tsx`
- `src/app/student/quizzes/page.tsx`
- `src/app/student/video-lessons/page.tsx` (sessions)

**Fix:** Fetch the student's `class_id` once on mount, then append `.eq('class_id', studentClassId)` to every content query. Fall back to showing all if class is null.

### 2.6 Add Pagination to All List Views

**Files:** Announcements, attendance logs, homework, results, quizzes, activity logs.

**Fix:** Use `.range(start, end)` with state-based pagination. Add "Load More" button or page numbers. Default page size: 20.

### 2.7 Fix Parent Dashboard — Announcements Read Tracking

**File:** `src/app/parent/page.tsx`

**Problem:** All announcements counted as "unread".

**Fix:** Store last-read timestamp per user in `profiles` or a new `announcement_reads` table. Compare `created_at > last_read_at` for unread count.

---

## Phase 3: Database Schema & RLS Security

> **Goal**: Make the database secure and robust enough for production.

### 3.1 Implement Proper RLS Policies

**Files:** `COMPLETE_SCHEMA.sql` + run as migration

Create policies for each table:

```sql
-- Students: parents see own children, admins see all
CREATE POLICY "Parents can view own children"
  ON students FOR SELECT
  USING (
    auth.uid() = parent_id
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Attendance: students see own, parents see children's
CREATE POLICY "Students view own attendance"
  ON attendance FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Parents view children's attendance"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE profile_id = attendance.student_id
      AND parent_id = auth.uid()
    )
  );

-- Results: same pattern
-- Behavioral reports: same pattern
-- Invoices: parents see children's invoices
```

### 3.2 Add Parent-Student Junction Table

**Migration:**
```sql
CREATE TABLE parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  relationship TEXT CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(parent_id, student_id)
);
```

Then update queries to use this table alongside (or instead of) `students.parent_id`. Initially:
- Write to both `students.parent_id` AND `parent_students` for backward compatibility
- Read from `parent_students` for the parent-facing queries
- Phase out `students.parent_id` in a future migration

### 3.3 Add `ON DELETE SET NULL` to `students.parent_id`

```sql
ALTER TABLE students
  DROP CONSTRAINT students_parent_id_fkey,
  ADD FOREIGN KEY (parent_id) REFERENCES profiles(id) ON DELETE SET NULL;
```

### 3.4 Add `UNIQUE(profile_id)` on `students`

```sql
ALTER TABLE students ADD UNIQUE (profile_id);
```

### 3.5 Add Missing Columns to `behavioral_reports`

```sql
ALTER TABLE behavioral_reports
  ADD COLUMN title TEXT,
  ADD COLUMN type TEXT DEFAULT 'general',
  ADD COLUMN severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  ADD COLUMN entered_by UUID REFERENCES profiles(id);
```

### 3.6 Add Indexes for Query Performance

```sql
CREATE INDEX idx_students_parent_id ON students(parent_id);
CREATE INDEX idx_students_profile_id ON students(profile_id);
CREATE INDEX idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX idx_results_student_subject ON results(student_id, subject_id);
CREATE INDEX idx_behavioral_reports_student ON behavioral_reports(student_id);
CREATE INDEX idx_homework_class ON homework(class_id);
CREATE INDEX idx_sessions_class ON sessions(class_id);
CREATE INDEX idx_lessons_class ON lessons(class_id);
CREATE INDEX idx_announcements_audience ON announcements(audience);
```

---

## Phase 4: Code Quality & Architecture

> **Goal**: Eliminate technical debt, improve maintainability.

### 4.1 Extract Shared Data Fetching Hooks

Create custom hooks in `src/hooks/`:

- `useChildren()` — returns all children for current parent
- `useStudentClass()` — returns current student's class_id
- `useParentOrStudent()` — auth-aware hook that returns role-appropriate data

Then refactor all 7 parent pages to use `useChildren()`.

### 4.2 Replace `any[]` with Proper Types

**Files:** All parent pages, student pages, admin pages.

**Fix:** Audit every `useState<any[]>` and `useState<Record<string, any>>` and replace with proper interfaces from `src/types/index.ts`. Create new types where missing.

### 4.3 Add Error Handling to All Data Fetches

**Files:** All pages that query Supabase.

**Fix:** Every `supabase.from().select()` should have try/catch or error-checking:
```typescript
const { data, error } = await supabase.from('...').select('...');
if (error) {
  console.error('Failed to fetch X:', error);
  // Show user-friendly toast or error state
  setError('Unable to load data. Please try again.');
  return;
}
```

### 4.4 Add Per-Section Loading States

**Fix:** Replace single loading spinner with skeleton loaders per section. Use a `loadingStates: Record<string, boolean>` pattern.

### 4.5 Consolidate Admin Helper Library

**Fix:** Either remove `src/lib/admin.ts` and use API routes exclusively, or refactor API routes to call the library. Eliminate duplicate logic.

### 4.6 Add Type Safety to Database Types

**File:** `src/lib/database.types.ts`

**Fix:** Regenerate from actual Supabase schema using `supabase gen types typescript`. Ensure all table types match reality.

---

## Phase 5: Feature Completeness

> **Goal**: Fill in missing pieces for a complete parent/student experience.

### 5.1 Add Parent Settings Page

**File:** `src/app/parent/settings/page.tsx`

**What it needs:** Notification preferences management (existing `notification_preferences` table), theme toggle, account management.

### 5.2 Add Parent-Child Unlinking UI

**File:** `src/app/admin/users/page.tsx`

**Fix:** In the link modal, show currently linked students with an "Unlink" button that sets `parent_id = null`.

### 5.3 Add Child Selector to Parent Progress/Behavior Pages

**Fix:** Add a dropdown at the top of each page to switch between children, updating the displayed data dynamically. No need for query param.

### 5.4 Add Date Picker to Weekly Report

**Fix:** Add a week selector (previous/next buttons + date input) to allow viewing historical reports. Query by selected week range.

### 5.5 Add Duplicate Homework Submission Prevention

**File:** `src/app/student/homework/page.tsx`

**Fix:** Replace current `isSubmitted` check with stricter enforcement — disable submit button, show "Already Submitted" notice, and consider adding "Resubmit" option if teacher allows.

### 5.6 Add `multiple_selection` Question Type Handler

**File:** `src/app/student/quizzes/[quizId]/page.tsx`, entrance exam take page

**Fix:** Add checkbox-based UI for `multiple_selection` type. Score by checking all correct options are selected.

### 5.7 Add Payment Gateway Integration

**File:** `src/app/parent/payments/page.tsx`

**Fix:** Integrate Paystack or Flutterwave. Add "Pay Now" button on pending invoices. Webhook handler to update invoice status.

---

## Phase 6: Production Hardening

> **Goal**: Monitoring, logging, performance, reliability.

### 6.1 Add Centralized Error Logging

- Add a logging service (Sentry, or custom endpoint) to capture client-side errors
- Add server-side request logging to API routes
- Log Supabase query errors with context

### 6.2 Add Rate Limiting to API Routes

**File:** `src/middleware.ts` or per-route

**Fix:** Add rate limiting to `/api/admin/*` routes to prevent abuse. Consider using a token bucket or sliding window.

### 6.3 Add Input Validation Library

**Fix:** Add Zod or Joi for request body validation in API routes. Currently only does basic "field exists" checks.

### 6.4 Add Audit Logging

Create an `audit_logs` table and log:
- User creation/deletion (who did it, when)
- Parent-child linking/unlinking
- Role changes
- Payment actions

### 6.5 Add Data Export/Backup

- Add admin data export for all tables (CSV)
- Schedule automated Supabase backups
- Document restore procedure

### 6.6 Add Environment Validation

**File:** Startup script or middleware

**Fix:** Validate all required env vars are present on startup. Fail fast with clear error message if `SUPABASE_SERVICE_ROLE_KEY` or `NEXT_PUBLIC_SUPABASE_URL` are missing.

---

## Phase 7: Testing

> **Goal**: Ensure all fixes work and regressions are caught.

### 7.1 Write Integration Tests for API Routes

Test each `/api/admin/users` endpoint:
- POST (create admin, teacher, student, parent)
- PATCH (update, password reset)
- DELETE (with cascade check)
- Edge cases: duplicate email, missing fields, non-admin caller

### 7.2 Write Component Tests for Critical Pages

- Student dashboard data loading
- Parent dashboard data aggregation (multi-child stats)
- Homework submission flow
- Quiz submission and scoring

### 7.3 Manual QA Checklist

Create a test matrix covering:
- Create student as admin → verify admission number, class assignment
- Create parent → link to student → verify parent dashboard shows child data
- Student views lessons → verify only class-relevant content
- Parent views progress → verify all child data correct
- Parent views behavior → verify report data displays
- Weekly report PDF generation → verify content
- Tab-switch detection in tests → verify logging
- Delete parent → verify student parent_id is cleared

---

## Phase 8: Deployment

> **Goal**: Go to production safely.

### 8.1 Pre-Deployment Checklist

- [ ] Run all Phase 1-4 fixes in order
- [ ] Apply all database migrations (Phase 3)
- [ ] Verify RLS policies with test accounts
- [ ] Run test suite
- [ ] Build: `npm run build` — must pass with 0 errors
- [ ] Lint: `npm run lint` — must pass
- [ ] TypeScript: `npx tsc --noEmit` — must pass
- [ ] Load test with 100 concurrent users
- [ ] Security audit (check for exposed env vars, API keys)
- [ ] Verify analytics/charts render correctly
- [ ] Test on mobile devices

### 8.2 Staged Rollout

1. **Staging:** Deploy to staging Supabase project + Vercel preview
2. **Data migration:** Run all SQL migrations, verify data integrity
3. **Smoke test:** Walk through every user role's critical path
4. **Production:** Deploy during low-usage window
5. **Post-deploy:** Monitor error logs for 48 hours

### 8.3 Monitoring

- Set up uptime monitoring (e.g., Upptime, Better Uptime)
- Set up error alerting (Sentry + email/slack)
- Track key metrics: login success rate, query response times, error rates

---

## Effort Estimate

| Phase | Effort (person-days) | Risk |
|-------|---------------------|------|
| 1. Critical Fixes | 2-3 | Low (contained changes) |
| 2. High Priority | 3-5 | Medium (query changes) |
| 3. Schema & RLS | 2-4 | High (DB changes) |
| 4. Code Quality | 3-5 | Medium (refactoring) |
| 5. Feature Complete | 5-8 | Medium (new features) |
| 6. Production Harden | 3-4 | Low (infrastructure) |
| 7. Testing | 3-5 | Low (test writing) |
| 8. Deployment | 1-2 | High (cutover) |
| **Total** | **22-36 days** | ~4-7 weeks |

---

## Quick Wins (Can Be Done in 1-2 Days)

If you need immediate improvements with minimal risk:

1. **1.2** — Fix entrance exams filter (one line change)
2. **1.3** — Fix parent profile ID (one line change)
3. **1.5** — Fix homework column name (one line change)
4. **2.2** — Fix progress bar CSS (one line change)
5. **2.3** — Fix subject name display (add a join)
6. **2.6** — Add pagination to announcements
7. **5.2** — Add unlink button in admin linking modal
8. **4.3** — Add error handling to top 5 most-used pages
