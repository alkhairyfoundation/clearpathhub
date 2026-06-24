# EduHub Growth, Skills & Mastery Learning Platform

## Comprehensive Feature Documentation

---

# Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Skills & Archetypes (Identity Builder)](#2-skills--archetypes-identity-builder)
3. [Student Term Goals & Portfolio](#3-student-term-goals--portfolio)
4. [Mastery Learning Engine](#4-mastery-learning-engine)
5. [Knowledge Retention System (Spaced Repetition)](#5-knowledge-retention-system-spaced-repetition)
6. [Practice System](#6-practice-system)
7. [XP & Gamification](#7-xp--gamification)
8. [Daily Accountability](#8-daily-accountability)
9. [Islamic Development Tracking](#9-islamic-development-tracking)
10. [Goals Hierarchy](#10-goals-hierarchy)
11. [Promotion Readiness](#11-promotion-readiness)
12. [AI Coach](#12-ai-coach)
13. [Growth Map](#13-growth-map)
14. [Leaderboard](#14-leaderboard)
15. [Feature Interconnection Diagram](#15-feature-interconnection-diagram)
16. [Database Schema](#16-database-schema)
17. [API Route Reference](#17-api-route-reference)
18. [Type Definitions](#18-type-definitions)

---

# 1. Platform Overview

EduHub is a comprehensive education management platform with a strong emphasis on **holistic student development** across three dimensions: **Academic**, **Islamic Character**, and **Life Skills**. The platform implements a V2 "Growth & Mastery Learning Platform" that adds gamification, mastery learning, knowledge retention, promotion readiness, AI coaching, and portfolio-based identity building on top of a traditional LMS.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ (App Router), React 18, TypeScript |
| Backend | Next.js API Routes (serverless) |
| Database | PostgreSQL via `pg` driver (Neon-compatible) |
| Auth | NextAuth.js with `getToken()` for API auth |
| Real-time | Direct Supabase queries for some student pages |
| Styling | Tailwind CSS with custom component library |

## Core Principles

1. **Three-Dimensional Growth**: Academic mastery + Islamic character development + Life skills
2. **Stage-Based Mastery**: Lesson → Practice → Challenge → Mastery Verification → Advancement
3. **Spaced Retention**: 3/7/14/30 day retention checks after mastery
4. **Identity-Led Development**: Students choose archetypes and skills to shape their growth identity
5. **Gamified Progression**: XP, levels, streaks, badges, leaderboards
6. **Data-Driven Coaching**: AI coach reads student data to provide contextual guidance

---

# 2. Skills & Archetypes (Identity Builder)

## Purpose

Every term, students choose a **growth identity** by selecting an archetype (e.g., The Analyst, The Creator, The Leader) and 3–5 skills from four categories (Cognitive, Social, Personal, Technical) to focus on. This forms the foundation of their term goal and portfolio.

## Database Tables

### `archetypes`

Stores the 8 identity cards students can choose from.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Archetype name (e.g., "The Analyst") |
| `description` | TEXT | What this archetype means |
| `icon_key` | VARCHAR(50) | Icon identifier for UI |
| `is_active` | BOOLEAN | Whether students can select it |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Seeded Archetypes:**

| Name | Description |
|---|---|
| The Advocate | Stands up for what's right and supports others |
| The Analyst | Thinks critically and solves problems |
| The Communicator | Expresses ideas clearly and listens well |
| The Creator | Innovates and creates meaningful work |
| The Explorer | Curious, asks questions, seeks knowledge |
| The Innovator | Finds creative ways to make things better |
| The Leader | Inspires and guides others positively |
| The Scholar | Excels academically and loves learning |

### `skills`

47 life skills across 4 categories.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Skill name |
| `category` | VARCHAR(50) | Cognitive / Social / Personal / Technical |
| `description` | TEXT | What this skill involves |
| `is_active` | BOOLEAN | Whether it's available for selection |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Skill Categories Breakdown:**

- **Cognitive** (12 skills): Critical Thinking, Problem Solving, Decision Making, Creative Thinking, Information Literacy, Media Literacy, Logical Reasoning, Systems Thinking, Analytical Skills, Strategic Planning, Metacognition, Computational Thinking
- **Social** (13 skills): Communication, Collaboration, Teamwork, Leadership, Empathy, Conflict Resolution, Active Listening, Public Speaking, Negotiation, Networking, Cultural Awareness, Persuasion, Mentoring
- **Personal** (13 skills): Self-Awareness, Self-Management, Resilience, Adaptability, Growth Mindset, Time Management, Goal Setting, Emotional Intelligence, Stress Management, Self-Discipline, Integrity, Responsibility, Perseverance
- **Technical** (9 skills): Digital Literacy, Data Analysis, Research Skills, Project Management, Financial Literacy, First Aid & Safety, Technical Writing, Basic Coding, Entrepreneurship

### `archetype_skill_map`

Maps skills to archetypes with recommendation rankings.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `archetype_id` | UUID | FK to archetypes |
| `skill_id` | UUID | FK to skills |
| `recommendation_rank` | INTEGER | Priority rank within archetype |

### `class_term_frameworks`

Admin-defined expectations per class level per term.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `session_id` | UUID | FK to academic_sessions |
| `term_id` | UUID | FK to terms |
| `class_level` | VARCHAR(20) | PRIMARY, JSS1, JSS2, JSS3, SS1, SS2, SS3 |
| `published_at` | TIMESTAMPTZ | When framework was published |
| `created_by` | UUID | FK to profiles (admin) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### `skill_expectations`

Level-appropriate expectations for each skill per class level.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `framework_id` | UUID | FK to class_term_frameworks |
| `skill_id` | UUID | FK to skills |
| `expectation_text` | TEXT | What students at this level should demonstrate |
| `order_index` | INTEGER | Display order |

## API Routes

### `GET /api/skills`

Returns all active skills, ordered by category then name.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Critical Thinking",
    "category": "Cognitive",
    "description": "Ability to analyze facts to form a judgment",
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

**Usage Example (Student Growth Path page):**
```typescript
const response = await fetch('/api/skills');
const skills = await response.json();
// skills is an array of Skill objects
```

### `GET /api/admin/skills` (Admin CRUD)

Full CRUD for skills management (admin only).

**GET:** Returns all skills regardless of active status, ordered by category, name.

**POST:** Creates a new skill:
```json
{
  "name": "New Skill",
  "category": "Cognitive",
  "description": "Description of the skill"
}
```

**PUT** `/api/admin/skills?id=xxx`: Updates a skill (name, category, description, is_active).

**DELETE** `/api/admin/skills?id=xxx`: Soft delete by setting `is_active = false`.

## Pages

### `/admin/archetypes/`

Admin interface for CRUD operations on archetypes. Uses Supabase direct queries.

**Features:**
- List all archetypes in a card grid
- Edit name, description, icon
- Toggle active/inactive
- Delete archetypes

### `/admin/skills/`

Admin interface for managing the skills bank.

**Features:**
- List all 47+ skills grouped by category
- Create new skills (name, category, description)
- Edit existing skills
- Toggle active/inactive via inline switch
- Delete skills (sets is_active = false)

### `/admin/growth-frameworks/`

Admin interface for creating and managing class_term_frameworks.

**Features:**
- Select session, term, class level
- Add academic competencies (per subject)
- Add skill expectations (per skill) with level-appropriate text
- Publish framework for teacher/student access

### `/student/growth-path/` (Student Goal Creation Wizard)

This is the student's primary interface for setting their term growth goal.

**Data Flow:**

```
Page Load:
  1. Fetch archetypes: supabase.from('archetypes').select('*').eq('is_active', true).order('name')
  2. Fetch skills: fetch('/api/skills')
  3. Fetch current session & term: supabase.from('academic_sessions').eq('is_current', true)
  4. Check existing goal: fetch('/api/student-term-goals?studentId=X&sessionId=Y&termId=Z')

User Flow:
  1. Select archetype (click card)
  2. Select 3-5 skills (toggle buttons, max 5 enforced)
  3. Review auto-generated goal statement
  4. Submit: POST /api/student-term-goals { action: 'create' | 'update', ... }
```

**Example Goal Statement Generated:**
```
"This term I am growing to become a stronger Analyst by practising
Critical Thinking, Problem Solving, Information Literacy."
```

**UI States:**
- Loading spinner while data fetches
- Success/error banners after submission
- Disabled submit button until archetype + 3 skills selected
- Read-only mode if goal is already approved

---

# 3. Student Term Goals & Portfolio

## Purpose

Each term, a student creates a growth goal (archetype + skills), submits for teacher approval, receives rubric assessments throughout the term, and collects evidence in their portfolio. The portfolio is a living record of the student's growth journey.

## Database Tables

### `student_term_goals`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `session_id` | UUID | FK to academic_sessions |
| `term_id` | UUID | FK to terms |
| `archetype_id` | UUID | FK to archetypes |
| `goal_statement_snapshot` | TEXT | The student's goal statement |
| `status` | VARCHAR(20) | draft → pending → active → archived |
| `submitted_at` | TIMESTAMPTZ | When student submitted |
| `approved_at` | TIMESTAMPTZ | When teacher approved |
| `approved_by` | UUID | FK to profiles (teacher) |
| `reflection_text` | TEXT | End-of-term student reflection |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Update timestamp |

**Status Flow:**
```
draft ──► pending ──► active ──► archived
              ▲          │
              │          ▼
              └── (teacher can reject back to draft)
```

### `student_goal_skills`

Links skills to a student's term goal.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_term_goal_id` | UUID | FK to student_term_goals |
| `skill_id` | UUID | FK to skills |
| `order_index` | INTEGER | Display order |

### `student_skill_rubrics`

Teacher assessment of each skill's level.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `session_id` | UUID | FK to academic_sessions |
| `term_id` | UUID | FK to terms |
| `skill_id` | UUID | FK to skills |
| `level` | VARCHAR(20) | emerging / developing / secure / strong |
| `updated_by` | UUID | FK to profiles (teacher) |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `comment` | TEXT | Teacher comment |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Rubric Levels:**

| Level | Color | Meaning |
|---|---|---|
| Emerging | Red | Student is beginning to develop this skill |
| Developing | Amber | Student shows growth but needs guidance |
| Secure | Blue | Student consistently demonstrates this skill |
| Strong | Emerald | Student excels and can teach others |

### `portfolio_evidence`

Evidence entries attached to a student's portfolio.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `session_id` | UUID | FK to academic_sessions |
| `term_id` | UUID | FK to terms |
| `evidence_type` | VARCHAR(30) | attendance / punctuality / incident / commendation / audit / assessment / manual |
| `reference_id` | UUID | Optional FK to source record |
| `text_snapshot` | TEXT | Snapshot of the evidence content |
| `created_by` | UUID | FK to profiles (who recorded it) |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Evidence Types:**

| Type | Source | Description |
|---|---|---|
| `attendance` | Auto | Daily attendance record |
| `punctuality` | Auto | Late arrival record |
| `incident` | Manual | Behavior incident report |
| `commendation` | Manual | Positive behavior recognition |
| `audit` | Auto | Academic audit snapshot |
| `assessment` | Auto | Test/quiz score snapshot |
| `manual` | Manual | Teacher-added note or observation |

### `skill_evidence_links`

Links portfolio evidence to rubric assessments.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_skill_rubric_id` | UUID | FK to student_skill_rubrics |
| `portfolio_evidence_id` | UUID | FK to portfolio_evidence |

## API Routes

### `GET /api/student-term-goals`

**Query Parameters:**
- `studentId` (optional) — Fetch goal for a specific student
- `studentIds` (optional, comma-separated) — Bulk fetch for multiple students
- `sessionId` (optional) — Filter by session
- `termId` (optional) — Filter by term

**Single Student Response:**
```json
{
  "goal": {
    "id": "uuid",
    "student_id": "uuid",
    "session_id": "uuid",
    "term_id": "uuid",
    "archetype_id": "uuid",
    "goal_statement_snapshot": "This term I am growing...",
    "status": "pending",
    "goal_skills": [
      {
        "id": "uuid",
        "student_term_goal_id": "uuid",
        "skill_id": "uuid",
        "order_index": 0,
        "skill": { "id": "uuid", "name": "Critical Thinking", "category": "Cognitive" }
      }
    ],
    "archetype": { "id": "uuid", "name": "The Analyst", "description": "...", "icon_key": "analyst" }
  }
}
```

**Bulk Response (for teacher page):**
```json
{
  "goals": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "student": { "first_name": "John", "last_name": "Doe" },
      "archetype": { "name": "The Analyst" },
      "goal_skills": [ ... ]
    }
  ]
}
```

### `POST /api/student-term-goals`

**Create/Update Actions:**

```json
// Create new goal
{
  "action": "create",
  "student_id": "uuid",
  "session_id": "uuid",
  "term_id": "uuid",
  "archetype_id": "uuid",
  "goal_statement_snapshot": "This term I am growing...",
  "skill_ids": ["uuid1", "uuid2", "uuid3"]
}

// Update goal (change archetype/skills)
{
  "action": "update",
  "goal_id": "uuid",
  "student_id": "uuid",
  "session_id": "uuid",
  "term_id": "uuid",
  "archetype_id": "uuid",
  "goal_statement_snapshot": "Updated statement...",
  "skill_ids": ["uuid1", "uuid2"]
}

// Approve goal (teacher action)
{
  "action": "update",
  "goal_id": "uuid",
  "approved_at": "2024-01-15T10:00:00Z",
  "approved_by": "teacher_uuid",
  "status": "active"
}

// Submit reflection (end-of-term)
{
  "action": "update",
  "goal_id": "uuid",
  "reflection_text": "This term I learned..."
}
```

**Error Responses:**
- `409 Conflict` — Goal already exists for this student/session/term
- `400 Bad Request` — Missing required fields
- `401 Unauthorized` — No valid auth token

### `GET /api/portfolio/rubric`

**Query Parameters:**
- `studentId` (optional)
- `sessionId` (optional)
- `termId` (optional)

**Response:**
```json
{
  "rubrics": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "session_id": "uuid",
      "term_id": "uuid",
      "skill_id": "uuid",
      "level": "developing",
      "comment": "Shows good progress in group discussions",
      "skill": { "id": "uuid", "name": "Communication", "category": "Social" }
    }
  ]
}
```

### `POST /api/portfolio/rubric`

Upserts rubric assessments for multiple skills at once.

```json
{
  "studentId": "uuid",
  "rubrics": [
    { "skill_id": "uuid", "level": "emerging", "updated_by": "teacher_uuid" },
    { "skill_id": "uuid", "level": "secure", "updated_by": "teacher_uuid" }
  ]
}
```

**Logic:**
1. Looks up current session/term (must have `is_current = true`)
2. For each rubric: checks if existing record exists
3. If exists: updates level and updated_by
4. If not exists: inserts new record
5. Validates level against allowed values: emerging, developing, secure, strong

### `GET /api/portfolio-evidence`

**Query Parameters:**
- `studentId` (required)
- `sessionId` (optional)
- `termId` (optional)

### `POST /api/portfolio-evidence`

```json
{
  "student_id": "uuid",
  "session_id": "uuid",
  "term_id": "uuid",
  "evidence_type": "manual",
  "text_snapshot": "John demonstrated excellent leadership during the group project by organizing tasks and motivating team members.",
  "created_by": "teacher_uuid"
}
```

## Pages

### `/student/growth-path/`

See [Section 2 - Skills & Archetypes](#student-growth-path-student-goal-creation-wizard) for full details. This is the student's goal creation wizard.

### `/student/portfolio/`

Student's personal portfolio page showing their complete term growth record.

**Data Loaded:**
```typescript
const [goalRes, rubricRes, evidenceRes] = await Promise.all([
  fetch(`/api/student-term-goals?studentId=${id}&sessionId=${session}&termId=${term}`),
  fetch(`/api/portfolio/rubric?studentId=${id}&sessionId=${session}&termId=${term}`),
  fetch(`/api/portfolio-evidence?studentId=${id}&sessionId=${session}&termId=${term}`),
]);
```

**UI Sections:**
1. **Goal Card** — Archetype name, icon, goal statement, current status badge (colored)
2. **Skills Progress** — Rubric level for each skill with colored badges and teacher comments
3. **Evidence Feed** — Chronological list of evidence entries by type
4. **Reflection Section** — End-of-term reflection text area (editable by student)
5. **Status Timeline** — Visual timeline showing draft → pending → active → archived

### `/teacher/goal-approvals/`

Teacher page to review and approve student term goals.

**Data Loaded:**
```typescript
// Fetch teacher's students
const students = await fetch(`/api/teacher/students?teacherId=${profile.id}`);
// Bulk fetch goals
const goalIds = students.map(s => s.id).join(',');
const goals = await fetch(`/api/student-term-goals?studentIds=${goalIds}&sessionId=${session}&termId=${term}`);
```

**Teacher Workflow:**
1. Lists all students in teacher's class with their goal status
2. Click on a student to see their goal in detail
3. Approve goal (sets status = 'active', approved_at, approved_by)
4. Set initial rubric levels for each selected skill
5. Reject goal back to draft with comment

**Example Approval Request:**
```json
// POST /api/student-term-goals (approve)
{
  "action": "update",
  "goal_id": "uuid",
  "approved_at": "2024-01-15T10:30:00Z",
  "approved_by": "teacher_uuid",
  "status": "active"
}

// POST /api/portfolio/rubric (set initial rubrics)
{
  "studentId": "uuid",
  "rubrics": [
    { "skill_id": "uuid", "level": "developing" },
    { "skill_id": "uuid", "level": "emerging" }
  ]
}
```

### `/teacher/portfolio-tracking/`

Full portfolio tracking page where teachers manage student progress.

**Features:**
- Student selector (filter by class)
- View current goal, archetype, and selected skills
- Update rubric levels for each skill (dropdown: emerging/developing/secure/strong)
- Add evidence entries to portfolio
- View evidence history
- Mark goal as archived at end of term

**Example Rubric Update:**
```typescript
await fetch('/api/portfolio/rubric', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    studentId: student.id,
    rubrics: [{ skill_id: skill.id, level: 'secure', updated_by: teacherId }],
  }),
});
```

**Example Evidence Addition:**
```typescript
await fetch('/api/portfolio-evidence', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    student_id: student.id,
    session_id: sessionId,
    term_id: termId,
    evidence_type: 'manual',
    text_snapshot: 'Student led the class prayer this morning with confidence.',
    created_by: teacherId,
  }),
});
```

### `/admin/portfolio-reports/`

Admin dashboard showing aggregate portfolio data across the school.

**Data Loaded:**
```typescript
// Bulk fetch all student goals for current session/term
const { goals } = await fetch(`/api/student-term-goals?sessionId=${session}&termId=${term}`);

// For each goal, fetch rubrics and evidence
const rubricPromises = goals.map(g =>
  fetch(`/api/portfolio/rubric?studentId=${g.student_id}&sessionId=${session}&termId=${term}`)
);
```

**Reports Displayed:**
- **Archetype Distribution** — Bar chart showing how many students chose each archetype
- **Top Skills** — Most commonly selected skills across all students
- **Rubric Averages** — Average rubric level per skill (1-4 mapping)
- **Goal Stats** — Count of goals by status (pending/active/archived)
- **Evidence Count** — Evidence entries by type

---

# 4. Mastery Learning Engine

## Purpose

The mastery engine provides a stage-based learning path for each topic per student. Students progress through 5 stages sequentially: **Lesson → Practice → Challenge → Mastery Verification → Advancement**. Stages unlock automatically when the preceding stage is completed with a passing score (≥80%).

## Database Tables

### `mastery_learning_path`

One row per student per subject per topic per stage (5 rows per topic).

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `subject_id` | UUID | FK to subjects |
| `topic` | VARCHAR(255) | Topic name |
| `stage` | VARCHAR(30) | lesson / practice / challenge / mastery_verification / advancement |
| `is_unlocked` | BOOLEAN | Whether student can access this stage |
| `is_completed` | BOOLEAN | Whether stage is finished |
| `completed_at` | TIMESTAMPTZ | When stage was completed |
| `attempts_count` | INTEGER | Number of attempts at this stage |
| `max_attempts` | INTEGER | Max attempts before teacher intervention (default: 3) |
| `teacher_intervention_required` | BOOLEAN | Whether teacher help is needed |
| `intervention_resolved_at` | TIMESTAMPTZ | When teacher resolved |
| `score_on_completion` | NUMERIC(5,2) | Best score on this stage |
| `metadata` | JSONB | Additional data |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Stage Progression:**
```
[Lesson] ──► [Practice] ──► [Challenge] ──► [Mastery Verification] ──► [Advancement]
    │              │               │                    │                       │
    │ score ≥ 80   │  score ≥ 80   │   score ≥ 80       │  score ≥ 80           │
    ▼              ▼               ▼                    ▼                       ▼
  Unlocks       Unlocks         Unlocks              Unlocks               + Retention
  Practice      Challenge      Mastery              Advancement           Checks
                               Verification                                Scheduled
```

**Score < 80 Behavior:**
- Increments `attempts_count`
- When `attempts_count >= max_attempts (3)`: sets `teacher_intervention_required = true`
- Stage is NOT locked; student can retry

### `mastery_scores`

Aggregated mastery score per topic with component breakdown.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `subject_id` | UUID | FK to subjects |
| `topic` | VARCHAR(255) | Topic name |
| `subtopic` | VARCHAR(255) | Optional subtopic |
| `mastery_score` | NUMERIC(5,2) | 0-100 overall score |
| `accuracy` | NUMERIC(5,2) | Accuracy component (50% weight) |
| `consistency` | NUMERIC(5,2) | Consistency component (20% weight) |
| `recency` | NUMERIC(5,2) | Recency component (15% weight) |
| `difficulty_progress` | NUMERIC(5,2) | Difficulty progress component (15% weight) |
| `level` | VARCHAR(30) | needs_support / developing / good_progress / mastered |
| `total_attempts` | INTEGER | Total practice attempts |
| `correct_attempts` | INTEGER | Correct answers |
| `last_practiced_at` | TIMESTAMPTZ | Last practice timestamp |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Mastery Score Formula:**
```
mastery_score = (accuracy × 0.50) + (consistency × 0.20) + (recency × 0.15) + (difficulty_progress × 0.15)
```

**Level Thresholds:**

| Level | Score Range | Meaning |
|---|---|---|
| needs_support | 0–39 | Significant gaps; needs teacher intervention |
| developing | 40–59 | Making progress but inconsistent |
| good_progress | 60–79 | Good understanding in most areas |
| mastered | 80–100 | Strong understanding; ready for advancement |

### `topic_prerequisites`

Defines prerequisite relationships between topics.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `subject_id` | UUID | FK to subjects |
| `topic` | VARCHAR(255) | The dependent topic |
| `prerequisite_topic` | VARCHAR(255) | Topic that must be completed first |
| `prerequisite_subject_id` | UUID | FK to subjects (for cross-subject prereqs) |
| `order_index` | INTEGER | Display order in topic sequence |
| `created_at` | TIMESTAMPTZ | |

## API Routes

### `GET /api/mastery/scores`

Returns mastery scores with optional filtering.

**Query Parameters:**
- `studentId` (required)
- `subjectId` (optional)
- `topic` (optional)
- `withSubject` (optional, `true` to join subject name)

**Response:**
```json
{
  "scores": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "subject_id": "uuid",
      "topic": "Algebra Basics",
      "mastery_score": 75.5,
      "accuracy": 80.0,
      "consistency": 70.0,
      "recency": 85.0,
      "difficulty_progress": 60.0,
      "level": "good_progress",
      "total_attempts": 12,
      "correct_attempts": 9,
      "subject": { "name": "Mathematics", "code": "MATH" }
    }
  ]
}
```

### `GET /api/mastery/path`

Returns mastery learning path entries.

**Query Parameters:**
- `studentId` (required)
- `subjectId` (optional)
- `topic` (optional)

**Response:**
```json
{
  "path": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "subject_id": "uuid",
      "topic": "Algebra Basics",
      "stage": "lesson",
      "is_unlocked": true,
      "is_completed": true,
      "completed_at": "2024-01-10T10:00:00Z",
      "attempts_count": 2,
      "max_attempts": 3,
      "teacher_intervention_required": false,
      "score_on_completion": 85.00,
      "subject_name": "Mathematics",
      "subject_code": "MATH"
    }
  ]
}
```

### `POST /api/mastery/path`

Three actions available:

**Action: `initialize`** — Creates all 5 stages for a topic.

```json
{
  "student_id": "uuid",
  "subject_id": "uuid",
  "topic": "Algebra Basics",
  "action": "initialize"
}
```

Creates rows for: lesson, practice, challenge, mastery_verification, advancement.
Only 'lesson' is unlocked initially. `ON CONFLICT DO NOTHING` prevents duplicates.

**Action: `complete_stage`** — Marks a stage complete and unlocks next if score ≥ 80.

```json
{
  "student_id": "uuid",
  "subject_id": "uuid",
  "topic": "Algebra Basics",
  "action": "complete_stage",
  "stage": "practice",
  "score": 85
}
```

**Unlock Logic:**
- lesson → unlocks practice (always)
- practice → unlocks challenge (always)
- challenge → unlocks mastery_verification (only if score ≥ 80)
- mastery_verification → unlocks advancement (only if score ≥ 80)
- If score < 80: increments attempts_count, checks if max_attempts reached → sets teacher_intervention_required

**Action: `request_intervention`** — Flags a stage for teacher help.

```json
{
  "student_id": "uuid",
  "subject_id": "uuid",
  "topic": "Algebra Basics",
  "action": "request_intervention",
  "stage": "practice"
}
```

### `POST /api/mastery/recalc`

Recomputes mastery scores for all topics a student has practiced. Calls the `recalc_topic_mastery` stored procedure in the database.

```json
{
  "student_id": "uuid"
}
```

**Response:**
```json
{ "message": "Mastery scores recalculated", "topics_updated": 5 }
```

## Pages

### `/student/learning-path/`

Subject-level overview showing each subject's topic progress.

**Data Loaded:**
```typescript
// Get student's class and subjects
const { data: studentData } = await supabase.from('students').select('class_id').eq('profile_id', id).single();
const { data: subjects } = await supabase.from('subjects').select('*').eq('class_id', studentData.class_id);

// Get mastery path data
const { path } = await fetch(`/api/mastery/path?studentId=${id}`);

// Get mastery scores
const { scores } = await fetch(`/api/mastery/scores?studentId=${id}&withSubject=true`);
```

**UI:**
- Subject cards showing overall mastery percentage
- Topic list within each subject with stage indicators
- Color-coded progress bars per topic
- Lock/unlock icons for inaccessible topics

### `/student/mastery/`

Detailed mastery dashboard with per-topic breakdown.

**Features:**
- **Overall Mastery Score** — Large ring/circle showing average across all subjects
- **Per-Subject Breakdown** — Bar chart of mastery levels by subject
- **Per-Topic Scores** — Detailed table showing accuracy, consistency, recency, difficulty_progress components
- **Topic Filter** — Filter by subject or search by topic name
- **Level Distribution** — Pie chart showing count of topics at each level

**Component Bars (per topic):**
```
Topic: Algebra Basics
─────────────────────────────────────
Mastery:         75.5%  ████████████░░░░
Accuracy:        80.0%  ██████████████░░
Consistency:     70.0%  ███████████░░░░░
Recency:         85.0%  ██████████████░░
Difficulty:      60.0%  ██████████░░░░░░
Level: good_progress  🟡
```

---

# 5. Knowledge Retention System (Spaced Repetition)

## Purpose

After a student masters a topic (completes mastery_verification with ≥80%), the system automatically schedules retention checks at intervals of 3, 7, 14, and 30 days. This ensures long-term knowledge retention through spaced repetition.

## Database Table

### `retention_checks`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `subject_id` | UUID | FK to subjects |
| `topic` | VARCHAR(255) | Topic name |
| `mastery_score_at_verification` | NUMERIC(5,2) | Score when mastery was verified |
| `check_days` | INTEGER | Interval in days (3, 7, 14, or 30) |
| `check_date` | DATE | Scheduled date for this check |
| `retest_score` | NUMERIC(5,2) | Student's score on retest |
| `passed` | BOOLEAN | Whether retest score ≥ 80 |
| `entered_reinforcement` | BOOLEAN | Whether student entered reinforcement (failed) |
| `reinforcement_completed` | BOOLEAN | Whether reinforcement is done |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

## Trigger Logic

The database function `fn_schedule_retention_checks()` is triggered when a `mastery_verification` stage is completed with `score_on_completion >= 80`.

```sql
-- Pseudocode for the trigger function
CREATE OR REPLACE FUNCTION fn_schedule_retention_checks()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage = 'mastery_verification' AND NEW.is_completed AND NEW.score_on_completion >= 80 THEN
    INSERT INTO retention_checks (student_id, subject_id, topic, mastery_score_at_verification, check_days, check_date)
    VALUES
      (NEW.student_id, NEW.subject_id, NEW.topic, NEW.score_on_completion, 3, CURRENT_DATE + 3),
      (NEW.student_id, NEW.subject_id, NEW.topic, NEW.score_on_completion, 7, CURRENT_DATE + 7),
      (NEW.student_id, NEW.subject_id, NEW.topic, NEW.score_on_completion, 14, CURRENT_DATE + 14),
      (NEW.student_id, NEW.subject_id, NEW.topic, NEW.score_on_completion, 30, CURRENT_DATE + 30);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## API Routes

### `GET /api/mastery/retention`

**Query Parameters:**
- `studentId` (required)
- `status` (optional): `due` | `passed` | `failed`

**Status Filters:**
- `due`: `check_date <= CURRENT_DATE AND passed IS NULL`
- `passed`: `passed = true`
- `failed`: `passed = false`
- (none): All checks

**Response:**
```json
{
  "checks": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "subject_id": "uuid",
      "topic": "Algebra Basics",
      "mastery_score_at_verification": 85.00,
      "check_days": 7,
      "check_date": "2024-01-20",
      "retest_score": 90.00,
      "passed": true,
      "entered_reinforcement": false,
      "reinforcement_completed": false,
      "subject_name": "Mathematics",
      "subject_code": "MATH"
    }
  ]
}
```

### `POST /api/mastery/retention`

Updates a retention check with retest results.

```json
{
  "check_id": "uuid",
  "retest_score": 65,
  "student_id": "uuid"
}
```

**Logic:**
1. Updates the retention check with `retest_score` and `passed` (score ≥ 80)
2. Sets `entered_reinforcement = NOT passed` (true if failed)
3. If failed: re-opens the `practice` stage in `mastery_learning_path` so the student can re-learn

**Reinforcement Re-activation:**
```sql
UPDATE mastery_learning_path SET
  is_unlocked = true,
  teacher_intervention_required = false
WHERE student_id = $1
  AND subject_id = $2
  AND topic = $3
  AND stage = 'practice';
```

## Page

### `/student/retention/`

Timeline view of all retention checks.

**Data Loaded:**
```typescript
const { checks } = await fetch(`/api/mastery/retention?studentId=${id}`);

// Filter tabs
const dueChecks = checks.filter(c => !c.passed && c.check_date <= new Date());
const passedChecks = checks.filter(c => c.passed);
const failedChecks = checks.filter(c => c.passed === false);
const upcomingChecks = checks.filter(c => c.passed === null && c.check_date > new Date());
```

**UI Sections:**
1. **Stats Bar** — Total checks, passed count, failed count, due count, reinforcement count
2. **Filter Tabs** — All | Due | Passed | Failed | Upcoming
3. **Timeline Cards** — Each check shows:
   - Topic + Subject name
   - Days since mastery check (e.g., "7-day check")
   - Scheduled date with relative time ("Due today", "2 days overdue")
   - Score badge if tested (green if passed, red if failed)
   - Status icon: ✅ passed, ❌ failed, ⏳ pending, 🔄 reinforcement
4. **Reinforcement Alert** — If any check entered reinforcement, banner shows with "Re-practice now" link

---

# 6. Practice System

## Purpose

Adaptive 10-question practice sessions that prioritize weak topics, due retention reviews, current scheme-of-work topics, and mastered topics (in that priority order). Each session completion triggers a mastery score recalculation.

## Database Tables

### `practice_sessions`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `term_id` | UUID | FK to terms |
| `date` | DATE | Session date |
| `goal_type` | VARCHAR(50) | daily / revision / challenge / test_prep |
| `total_questions` | INTEGER | Number of questions in session |
| `correct_answers` | INTEGER | Number of correct answers |
| `score` | NUMERIC(5,2) | Percentage score |
| `duration_seconds` | INTEGER | Session duration |
| `status` | VARCHAR(20) | in_progress / completed / abandoned |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `practice_attempts`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `session_id` | UUID | FK to practice_sessions |
| `question_source` | VARCHAR(50) | question_bank / test / custom |
| `question_id` | UUID | FK to source question |
| `question_text` | TEXT | The question |
| `selected_answer` | TEXT | Student's answer |
| `correct_answer` | TEXT | Correct answer |
| `is_correct` | BOOLEAN | Whether answer was correct |
| `time_taken` | INTEGER | Time in seconds |
| `difficulty` | VARCHAR(20) | easy / medium / hard |
| `topic` | VARCHAR(255) | Topic tag |
| `created_at` | TIMESTAMPTZ | |

### `question_bank`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `subject_id` | UUID | FK to subjects |
| `class_id` | UUID | FK to classes |
| `topic` | VARCHAR(255) | Topic |
| `subtopic` | VARCHAR(255) | Subtopic |
| `difficulty` | VARCHAR(20) | easy / medium / hard |
| `question` | TEXT | Question text |
| `options` | JSONB | Array of answer options |
| `correct_answer` | TEXT | Correct answer |
| `explanation` | TEXT | Explanation of answer |
| `status` | VARCHAR(20) | draft / published / retired |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `learning_streaks`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `current_streak` | INTEGER | Consecutive days of activity |
| `longest_streak` | INTEGER | Best streak ever |
| `last_activity_date` | DATE | Last practice date |
| `updated_at` | TIMESTAMPTZ | |

### `daily_goals`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `goal_date` | DATE | Date for this goal |
| `target_questions` | INTEGER | Daily question target |
| `completed_questions` | INTEGER | Questions completed |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

## Page

### `/student/practice/`

The main adaptive practice interface.

**Data Flow:**
```typescript
// 1. Load mastery scores, retention schedule, scheme of work
const { scores } = await fetch(`/api/mastery/scores?studentId=${id}&withSubject=true`);
const { checks } = await fetch(`/api/mastery/retention?studentId=${id}`);
const { data: sow } = await supabase.from('scheme_of_work').select('*')
  .eq('class_id', studentClassId)
  .eq('term_id', currentTermId);

// 2. Build priority topic list
const weakTopics = scores.filter(s => s.mastery_score < 60);
const dueReviews = checks.filter(c => c.passed === null && new Date(c.check_date) <= new Date());
const currentSOW = sow.filter(s => s.week === currentWeek);
const masteredTopics = scores.filter(s => s.mastery_score >= 80);

const priorityTopics = [
  ...weakTopics.map(t => t.topic),
  ...dueReviews.map(c => c.topic),
  ...currentSOW.map(s => s.topic),
  ...masteredTopics.map(t => t.topic),
];

// 3. Fetch questions from bank (limit 10)
const questions = await supabase
  .from('question_bank')
  .select('*')
  .in('topic', priorityTopics)
  .in('status', ['published', 'active'])
  .limit(10);
```

**Priority Logic:**
1. **Weak topics** (mastery < 60%) — Students need the most practice here
2. **Due retention reviews** — Checks that haven't been tested and are past due date
3. **Current SOW topic** — What the class is currently learning
4. **Mastered topics** — Maintained for reinforcement

**During the Session:**
- Questions are displayed one at a time
- After each answer: shows correct/incorrect with explanation
- Tracks time per question
- Session stats update in real-time (correct, total, score)

**On Session Completion:**
```typescript
// Save practice session + attempts to Supabase
await supabase.from('practice_sessions').insert({
  student_id: id,
  term_id: currentTermId,
  goal_type: 'daily',
  total_questions: 10,
  correct_answers: correctCount,
  score: (correctCount / 10) * 100,
  duration_seconds: elapsedSeconds,
  status: 'completed',
});

// Recalculate mastery scores
await fetch('/api/mastery/recalc', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ student_id: id }),
});
```

---

# 7. XP & Gamification

## Purpose

Every learning action earns XP (experience points). Students level up, maintain streaks, earn badges, and compete on leaderboards. The gamification system drives engagement and rewards consistent effort.

## Database Tables

### `xp_transactions`

Every XP earn or spend is logged here.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `xp_amount` | INTEGER | Amount of XP (positive = earn, negative = spend) |
| `xp_type` | VARCHAR(50) | earn / spend / bonus / penalty |
| `source` | VARCHAR(50) | What generated this XP (practice, mastery, streak, etc.) |
| `source_id` | UUID | FK to the source record |
| `multiplier` | NUMERIC(3,2) | XP multiplier applied |
| `description` | TEXT | Human-readable description |
| `created_at` | TIMESTAMPTZ | |

### `student_levels`

One row per student tracking their level and XP totals.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles (unique) |
| `level` | INTEGER | Current level (starts at 1) |
| `current_xp` | INTEGER | XP earned this level |
| `total_xp` | INTEGER | Lifetime XP |
| `xp_to_next_level` | INTEGER | XP needed to reach next level |
| `mastery_points` | INTEGER | Bonus points from mastery achievements |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

### `badge_definitions`

Badge templates that define what badges exist and how they're earned.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `badge_type` | VARCHAR(50) | Unique type identifier |
| `name` | VARCHAR(255) | Display name |
| `description` | TEXT | What the badge represents |
| `icon_key` | VARCHAR(50) | Icon identifier |
| `category` | VARCHAR(30) | academic / islamic / skills / streak / mastery / challenge / leadership / community |
| `tier` | INTEGER | 1 = bronze, 2 = silver, 3 = gold, 4 = platinum |
| `xp_reward` | INTEGER | Bonus XP awarded when earned |
| `criteria` | JSONB | Conditions for earning (configurable) |
| `is_hidden` | BOOLEAN | Whether badge is secret |
| `is_active` | BOOLEAN | Whether badge can be earned |
| `created_at` | TIMESTAMPTZ | |

### `badges`

Awarded badges per student.

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `badge_type` | VARCHAR(50) | FK to badge_definitions |
| `badge_data` | JSONB | Snapshot of earning context |
| `awarded_at` | TIMESTAMPTZ | When badge was earned |

## XP Formula

```sql
-- Database function
CREATE OR REPLACE FUNCTION fn_xp_to_next_level(current_level INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN (current_level * 200) + 800;
END;
$$ LANGUAGE plpgsql;
```

| Level | XP Needed |
|-------|-----------|
| 1 → 2 | 1,000 |
| 2 → 3 | 1,200 |
| 3 → 4 | 1,400 |
| 4 → 5 | 1,600 |
| 5 → 6 | 1,800 |
| 10 → 11 | 2,800 |
| 20 → 21 | 4,800 |

## XP Multipliers

```typescript
const XP_MULTIPLIERS = {
  first_practice_of_day: 2.0,   // Double XP for first daily practice
  streak_3_bonus: 1.5,          // 3-day streak: 1.5×
  streak_7_bonus: 2.0,          // 7-day streak: 2×
  streak_30_bonus: 3.0,         // 30-day streak: 3×
  perfect_week: 2.0,            // Perfect week (daily practice, all high scores): 2×
  mastery_achieved: 2.0,        // New mastery earned: 2×
  teacher_commendation: 1.5,    // Teacher recognized achievement: 1.5×
  challenge_win: 1.5,           // Won a challenge: 1.5×
  no_multiplier: 1.0,           // Default: 1×
} as const;
```

## XP Earning Sources

| Source | Base XP | Description |
|---|---|---|
| practice_question_correct | 10 | Each correct answer in practice |
| practice_question_wrong | 3 | Each wrong answer (effort rewarded) |
| practice_completion | 50 | Bonus for completing a session |
| mastery_achieved | 200 | First time mastering a topic |
| streak_milestone_3 | 50 | 3-day streak |
| streak_milestone_7 | 150 | 7-day streak |
| streak_milestone_30 | 500 | 30-day streak |
| daily_login | 20 | Logging in each day |
| challenge_completed | 100 | Completing a challenge stage |
| teacher_commendation | 75 | Recognized by teacher |
| badge_earned | varies | XP reward from badge definition |

## API Route

### `GET /api/xp/history`

Returns XP transactions, level data, and streak info.

**Query Parameters:**
- `studentId` (required)

**Response:**
```json
{
  "level": {
    "level": 5,
    "current_xp": 750,
    "total_xp": 5750,
    "xp_to_next_level": 1800,
    "mastery_points": 400
  },
  "transactions": [
    {
      "id": "uuid",
      "xp_amount": 50,
      "xp_type": "earn",
      "source": "practice_completion",
      "multiplier": 2.0,
      "description": "First practice of the day bonus!",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ],
  "streak": {
    "current_streak": 7,
    "longest_streak": 14,
    "last_activity_date": "2024-01-15"
  },
  "todayXP": 120,
  "weekXP": 850
}
```

## Page

### `/student/xp-history/`

XP and gamification overview.

**UI Sections:**
1. **Level Card** — Current level number, XP progress bar to next level, total XP
2. **Today/Week Totals** — XP earned today and this week
3. **Streak Info** — Current streak with fire icon, longest streak
4. **Breakdown Chart** — XP by source (pie or bar chart)
5. **Recent Transactions** — Scrollable list of recent XP events with icons
6. **How to Earn XP** — Guide table showing sources and amounts

---

# 8. Daily Accountability

## Purpose

A holistic daily score (0–100) computed from 10 weighted components, providing a single daily "accountability" metric that reflects the student's overall engagement and character development.

## Database Table

### `daily_accountability`

| Column | Type | Description | Weight |
|---|---|---|---|
| `id` | UUID | Primary key | — |
| `student_id` | UUID | FK to profiles | — |
| `date` | DATE | Record date | — |
| `attendance_score` | NUMERIC(5,2) | Were they present | 10% |
| `participation_score` | NUMERIC(5,2) | Active in class | 10% |
| `homework_completion_score` | NUMERIC(5,2) | Homework submitted | 15% |
| `study_time_score` | NUMERIC(5,2) | Time spent studying | 10% |
| `quran_score` | NUMERIC(5,2) | Quran progress | 15% |
| `prayer_tracking_score` | NUMERIC(5,2) | Salah consistency | 10% |
| `character_score` | NUMERIC(5,2) | Adab and behavior | 10% |
| `skill_activity_score` | NUMERIC(5,2) | Skill development | 8% |
| `community_service_score` | NUMERIC(5,2) | Community contribution | 5% |
| `behavior_score` | NUMERIC(5,2) | General behavior | 10% |
| `discipline_deductions` | NUMERIC(5,2) | Negative deductions | — |
| `total_score` | NUMERIC(5,2) | Final computed score | 100% |
| `created_at` | TIMESTAMPTZ | | |
| `updated_at` | TIMESTAMPTZ | | |

## Computation Logic

The `fn_calculate_daily_accountability` function aggregates data from multiple sources:

```sql
-- Simplified pseudocode for the computation
total_score = (
  attendance_score * 0.10 +
  participation_score * 0.10 +
  homework_completion_score * 0.15 +
  study_time_score * 0.10 +
  quran_score * 0.15 +
  prayer_tracking_score * 0.10 +
  character_score * 0.10 +
  skill_activity_score * 0.08 +
  community_service_score * 0.05 +
  behavior_score * 0.10
) - discipline_deductions;

-- Discipline deductions (from exam monitoring)
-- tab_switch = -5 points
-- fullscreen_exit = -10 points
-- suspicious_activity = -15 points
```

**Data Sources for Each Component:**
- `attendance_score`: From attendance records
- `participation_score`: From class participation logs
- `homework_completion_score`: From homework_submissions
- `study_time_score`: From practice_sessions duration
- `quran_score`: From islamic_tracking (quran_memorized_ayahs + quran_revision_ayahs)
- `prayer_tracking_score`: From islamic_tracking (salah flags)
- `character_score`: From islamic_tracking (adab_rating) + behavioral_reports
- `skill_activity_score`: From skills_tracking (duration_minutes + self_rating)
- `community_service_score`: From islamic_tracking (charity_action) + community service logs
- `behavior_score`: From behavioral_reports (positive minus negative)
- `discipline_deductions`: From exam_activity_logs (monitoring events)

## API Route

### `GET /api/accountability`

**Query Parameters:**
- `student_id` (required)

**Response:**
```json
{
  "today": {
    "id": "uuid",
    "student_id": "uuid",
    "date": "2024-01-15",
    "attendance_score": 100.0,
    "participation_score": 80.0,
    "homework_completion_score": 100.0,
    "study_time_score": 75.0,
    "quran_score": 90.0,
    "prayer_tracking_score": 80.0,
    "character_score": 85.0,
    "skill_activity_score": 70.0,
    "community_service_score": 0.0,
    "behavior_score": 95.0,
    "discipline_deductions": 0.0,
    "total_score": 84.5
  },
  "history": [ ... ],     // Last 30 days
  "stats": {
    "total_days": 45,
    "avg_score": 78.3,
    "avg_good_score": 88.1,
    "good_days": 28,
    "best_score": 97.0,
    "worst_score": 45.0
  }
}
```

## Page

### `/student/accountability/`

Daily accountability dashboard.

**UI Sections:**
1. **Today's Score** — Large number with color coding (>80 green, >60 amber, <60 red)
2. **Component Breakdown** — Horizontal bar chart showing each component's contribution
3. **30-Day Trend** — Line chart of total scores over the last 30 days
4. **Stats Summary** — Average, best, worst, "good days" count
5. **Deductions Alert** — If discipline deductions were applied, show what caused them

---

# 9. Islamic Development Tracking

## Purpose

Students track their daily Islamic practices including the 5 daily prayers, Quran memorization/revision, adab (character/etiquette), dhikr, and charity actions.

## Database Table

### `islamic_tracking`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `date` | DATE | Tracking date |
| `salah_fajr` | BOOLEAN | Fajr prayer performed |
| `salah_dhuhr` | BOOLEAN | Dhuhr prayer performed |
| `salah_asr` | BOOLEAN | Asr prayer performed |
| `salah_maghrib` | BOOLEAN | Maghrib prayer performed |
| `salah_isha` | BOOLEAN | Isha prayer performed |
| `quran_surah` | VARCHAR(100) | Surah being studied |
| `quran_ayah_start` | INTEGER | Starting ayah |
| `quran_ayah_end` | INTEGER | Ending ayah |
| `quran_memorized_ayahs` | INTEGER | New ayahs memorized |
| `quran_revision_ayahs` | INTEGER | Ayahs revised |
| `adab_rating` | INTEGER | 1–5 self-assessment of character |
| `dhikr_completed` | BOOLEAN | Morning/evening adhkar completed |
| `charity_action` | TEXT | Description of charity/sadaqah |
| `notes` | TEXT | Additional notes |
| `self_reported` | BOOLEAN | Whether self-reported |
| `verified_by` | UUID | FK to profiles (teacher who verified) |
| `verified_at` | TIMESTAMPTZ | Verification timestamp |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

## Page

### `/student/islamic-growth/`

Daily Islamic tracking form.

**Data Flow:**
```typescript
// Load today's record (or create if not exists)
const { data } = await supabase
  .from('islamic_tracking')
  .select('*')
  .eq('student_id', id)
  .eq('date', today)
  .single();

// Save/update
await supabase
  .from('islamic_tracking')
  .upsert({
    student_id: id,
    date: today,
    salah_fajr: fajrChecked,
    salah_dhuhr: dhuhrChecked,
    // ... other fields
  }, { onConflict: 'student_id, date' });
```

**UI Sections:**
1. **Salah Checkboxes** — 5 toggle buttons for each prayer with sun icon
2. **Quran Section** — Surah selector, ayah range, memorized count, revision count
3. **Adab Rating** — 1–5 star rating for character self-assessment
4. **Dhikr Toggle** — Checkbox for morning/evening adhkar
5. **Charity Input** — Text field describing charity action
6. **Notes** — Free text notes
7. **Stats Section** — Weekly/monthly salah completion, quran progress, adab trends

**Leaderboard Impact:**
Islamic tracking data feeds into the Islamic leaderboard scoring:
```sql
-- Score per row:
(CASE WHEN salah_fajr THEN 10 ELSE 0 END) +
(CASE WHEN salah_dhuhr THEN 10 ELSE 0 END) +
(CASE WHEN salah_asr THEN 10 ELSE 0 END) +
(CASE WHEN salah_maghrib THEN 10 ELSE 0 END) +
(CASE WHEN salah_isha THEN 10 ELSE 0 END) +
(quran_memorized_ayahs * 5) +
(adab_rating * 10) +
(CASE WHEN dhikr_completed THEN 20 ELSE 0 END)
```

---

# 10. Goals Hierarchy

## Purpose

A unified goal system spanning 5 time periods and 3 dimensions. Daily goals roll up to weekly, weekly to monthly, monthly to term, and term to yearly goals.

## Database Table

### `goal_hierarchy`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `period_type` | VARCHAR(10) | daily / weekly / monthly / term / yearly |
| `dimension` | VARCHAR(10) | academic / islamic / skills |
| `period_start` | DATE | Start of goal period |
| `period_end` | DATE | End of goal period |
| `goal_text` | TEXT | What the goal is |
| `target_metric` | VARCHAR(100) | Measurable metric (e.g., "practice_score", "salah_count") |
| `target_value` | NUMERIC | Target number |
| `achieved_value` | NUMERIC | Actual achievement |
| `status` | VARCHAR(20) | active / completed / missed / in_progress |
| `parent_goal_id` | UUID | FK to parent goal (for rollup hierarchy) |
| `source_goal_id` | UUID | FK to source system |
| `source_type` | VARCHAR(50) | System that created this goal |
| `metadata` | JSONB | Additional data payload |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Rollup Hierarchy:**
```
Yearly Goal
    └── Term Goals (4 per year)
            └── Monthly Goals (3 per term)
                    └── Weekly Goals (4-5 per month)
                            └── Daily Goals (7 per week)
```

Each level aggregates achievements from the level below.

## API Route

### `GET /api/goals/hierarchy`

**Query Parameters:**
- `studentId` (required)
- `periodType` (optional): daily / weekly / monthly / term / yearly
- `dimension` (optional): academic / islamic / skills
- `status` (optional): active / completed / missed / in_progress

**Response:**
```json
{
  "goals": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "period_type": "yearly",
      "dimension": "academic",
      "period_start": "2024-01-01",
      "period_end": "2024-12-31",
      "goal_text": "Achieve 80%+ mastery in all subjects",
      "target_metric": "avg_mastery_score",
      "target_value": 80,
      "achieved_value": 72,
      "status": "in_progress",
      "child_goals": [ ... ]
    }
  ]
}
```

### `POST /api/goals/hierarchy`

Creates a new goal.

```json
{
  "student_id": "uuid",
  "period_type": "monthly",
  "dimension": "islamic",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "goal_text": "Complete salah tracking for 30 days",
  "target_metric": "salah_completion_rate",
  "target_value": 100,
  "status": "active"
}
```

## Pages

### `/student/goals/yearly/`

Auto-generates yearly goals if none exist.

```typescript
// Auto-generation on first visit
if (goals.length === 0) {
  await fetch('/api/goals/hierarchy', {
    method: 'POST',
    body: JSON.stringify([
      {
        student_id: id,
        period_type: 'yearly',
        dimension: 'academic',
        goal_text: 'Achieve mastery in all core subjects',
        target_metric: 'avg_mastery_score',
        target_value: 85,
      },
      {
        student_id: id,
        period_type: 'yearly',
        dimension: 'islamic',
        goal_text: 'Strengthen daily Islamic practices',
        target_metric: 'accountability_score',
        target_value: 90,
      },
      {
        student_id: id,
        period_type: 'yearly',
        dimension: 'skills',
        goal_text: 'Develop 3 personal skills to secure level',
        target_metric: 'rubric_levels',
        target_value: 3,
      },
    ]),
  });
}
```

### `/student/goals/monthly/`

Monthly goals from the goal hierarchy.

### `/student/goals/weekly/`

Weekly goals for the current week.

---

# 11. Promotion Readiness

## Purpose

End-of-term assessment determining whether a student is ready for promotion to the next class level. Considers 8 dimensions: academic mastery, Islamic development, skills development, behavior, attendance, consistency, leadership, and retention.

## Database Table

### `promotion_readiness`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `academic_year` | VARCHAR(20) | Academic year |
| `term` | VARCHAR(20) | Term name |
| `academic_mastery_score` | NUMERIC(5,2) | Average mastery score across subjects |
| `islamic_development_score` | NUMERIC(5,2) | Islamic tracking composite |
| `skills_development_score` | NUMERIC(5,2) | Skills rubric average |
| `behavior_score` | NUMERIC(5,2) | Behavior record composite |
| `attendance_score` | NUMERIC(5,2) | Attendance percentage |
| `consistency_score` | NUMERIC(5,2) | Consistency across dimensions |
| `leadership_score` | NUMERIC(5,2) | Leadership activities |
| `retention_score` | NUMERIC(5,2) | Average retention check pass rate |
| `overall_score` | NUMERIC(5,2) | Weighted composite |
| `promotion_status` | VARCHAR(30) | ready / needs_intervention / conditional / not_ready |
| `supporting_evidence` | JSONB | Structured evidence data |
| `recommended_next_class` | VARCHAR(20) | Recommended class level |
| `conditional_requirements` | TEXT[] | Requirements if conditional |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Promotion Statuses:**

| Status | Description |
|---|---|
| ready | Student meets all criteria for promotion |
| needs_intervention | Some areas need improvement but student can be promoted with support |
| conditional | Student can be promoted only if certain conditions are met |
| not_ready | Student should repeat the term |

## API Route

### `GET /api/promotion`

Returns the latest promotion readiness record for a student.

**Query Parameters:**
- `studentId` (required)

**Response:**
```json
{
  "promotion": {
    "academic_year": "2023/2024",
    "term": "Term 1",
    "academic_mastery_score": 78.5,
    "islamic_development_score": 82.0,
    "skills_development_score": 70.0,
    "behavior_score": 85.0,
    "attendance_score": 95.0,
    "consistency_score": 76.0,
    "leadership_score": 65.0,
    "retention_score": 80.0,
    "overall_score": 78.9,
    "promotion_status": "ready",
    "recommended_next_class": "JSS2",
    "conditional_requirements": null,
    "current_class": { "name": "JSS 1A" },
    "next_class": { "name": "JSS 2A" }
  }
}
```

## Page

### `/student/promotion/`

Promotion readiness dashboard.

**UI Sections:**
1. **Status Card** — Large colored banner (green=ready, amber=needs_intervention, orange=conditional, red=not_ready) with status label
2. **Score Breakdown** — 8 radial progress rings, one per dimension, showing score + label
3. **Overall Progress Ring** — Large ring showing overall_score
4. **Supporting Evidence** — Expandable JSON evidence viewer
5. **Conditional Requirements** — List with checkboxes if status is conditional
6. **Class Progress** — Current class → next class visualization

---

# 12. AI Coach

## Purpose

An intelligent chat-based coach that provides contextual guidance — motivation, gap analysis, revision planning, and goal suggestions — based on the student's actual data.

## Database Table

### `ai_coach_interactions`

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `student_id` | UUID | FK to profiles |
| `interaction_type` | VARCHAR(30) | goal_suggestion / lesson_recommendation / revision_plan / motivation / gap_analysis / prediction / study_tip / intervention_alert |
| `trigger_event` | VARCHAR(50) | What triggered this interaction |
| `prompt_text` | TEXT | Student's input or system prompt |
| `response_text` | TEXT | AI coach's response |
| `recommendations` | JSONB | Array of recommended actions |
| `context` | JSONB | Snapshot of student data at time of interaction |
| `effectiveness_rating` | INTEGER | Student feedback (1–5) |
| `user_feedback` | TEXT | Student's free-text feedback |
| `created_at` | TIMESTAMPTZ | |

## API Route

### `POST /api/ai/coach`

The main AI Coach endpoint. It assembles a rich context about the student and generates rule-based responses.

**Request:**
```json
{
  "student_id": "uuid",
  "interaction_type": "gap_analysis",
  "context": {}
}
```

**Backend Data Assembly:**
```typescript
// 1. Get student info (name, class)
const student = await pool.query(`
  SELECT p.first_name, p.last_name, s.class_id, c.name as class_name
  FROM profiles p
  LEFT JOIN students s ON s.profile_id = p.id
  LEFT JOIN classes c ON c.id = s.class_id
  WHERE p.id = $1`, [student_id]);

// 2. Get weak topics (bottom 5 mastery scores)
const weakTopics = await pool.query(`
  SELECT ms.topic, ms.mastery_score, ms.level, sub.name as subject_name
  FROM mastery_scores ms
  LEFT JOIN subjects sub ON ms.subject_id = sub.id
  WHERE ms.student_id = $1
  ORDER BY ms.mastery_score ASC LIMIT 5`, [student_id]);

// 3. Get streak data
const streak = await pool.query(`
  SELECT current_streak, longest_streak
  FROM learning_streaks WHERE student_id = $1`, [student_id]);

// 4. Get recent practice sessions
const recentSessions = await pool.query(`
  SELECT score, correct_answers, created_at
  FROM practice_sessions
  WHERE student_id = $1 AND status = 'completed'
  ORDER BY created_at DESC LIMIT 5`, [student_id]);

// 5. Get active daily goals
const activeGoals = await pool.query(`
  SELECT goal_text, status, dimension
  FROM goal_hierarchy
  WHERE student_id = $1 AND period_type = 'daily' AND status = 'active'
  LIMIT 3`, [student_id]);
```

**Response Types by Interaction:**

**motivation:**
- If streak ≥ 3: Praises streak and encourages consistency
- If recent avg score ≥ 80: Celebrates high performance
- If weak topics exist: Encourages focus on improvement
- Default: General welcome message

**gap_analysis:**
- Lists weakest 5 topics with scores and levels
- Generates "focus" recommendations for each

**revision_plan:**
- Creates multi-day study plan for weak topics
- Day 1 → weakest topic, Day 2 → next weakest, etc.

**goal_suggestion:**
- Lists active goals with progress
- If no active goals: Suggests default daily goals

**default (welcome):**
```
"Assalamu Alaikum {name}! I'm your AI Learning Coach. I can help you with:
  📚 Personalized study recommendations
  🎯 Learning gap analysis
  📅 Revision planning
  💪 Motivation and encouragement
  
  What would you like help with?"
```

**Recommendations** are returned as clickable chips that trigger new interactions.

**Response:**
```json
{
  "response": "Here's your learning gap analysis, John:\n\n1. Mathematics - Algebra: 45% mastery (developing)\n2. English - Grammar: 52% mastery (developing)\n3. Science - Cells: 58% mastery (good_progress)\n4. Mathematics - Geometry: 60% mastery (good_progress)\n5. English - Comprehension: 62% mastery (good_progress)\n\nI recommend focusing on these topics first. Would you like a study plan?",
  "recommendations": [
    { "type": "study", "text": "Create revision plan for Algebra", "priority": "critical" },
    { "type": "study", "text": "Create revision plan for Grammar", "priority": "high" }
  ],
  "history": [ ... ],
  "student": { "name": "John Doe", "className": "JSS 1A" },
  "weakTopics": [ ... ],
  "streak": { "current_streak": 5, "longest_streak": 12 },
  "recentSessions": [ ... ]
}
```

## Page

### `/student/ai-coach/`

Chat interface for the AI Coach.

**Features:**
- **Chat Messages** — Scrollable chat window with user messages and coach responses
- **Quick Action Buttons** — Preset buttons: "Give me motivation!", "Analyze my gaps", "Create revision plan", "Suggest goals"
- **Recommendation Chips** — Clickable chips below each response that trigger follow-up actions
- **History** — Last 10 interactions loaded on page visit
- **Welcome Message** — Auto-triggered on page load with interaction_type 'welcome'

**Data Flow:**
```typescript
// On page load - trigger welcome
const response = await fetch('/api/ai/coach', {
  method: 'POST',
  body: JSON.stringify({
    student_id: id,
    interaction_type: 'welcome',
  }),
});

// On quick action click
const response = await fetch('/api/ai/coach', {
  method: 'POST',
  body: JSON.stringify({
    student_id: id,
    interaction_type: 'motivation', // 'gap_analysis', 'revision_plan', etc.
  }),
});
```

---

# 13. Growth Map

## Purpose

A visual "game-like" map showing the student's learning journey across subjects, topics, and milestones. Each topic is a node that appears locked/unlocked/completed based on the mastery learning path.

## Display Logic

```typescript
// Build growth map from mastery data
const subjects = await supabase.from('subjects').select('*').eq('class_id', classId);
const { path } = await fetch(`/api/mastery/path?studentId=${id}`);
const { scores } = await fetch(`/api/mastery/scores?studentId=${id}`);

// Group path entries by subject
const subjectMap = subjects.map(subject => ({
  ...subject,
  topics: uniqueTopics
    .filter(t => t.subject_id === subject.id)
    .map(topic => ({
      name: topic.topic,
      stages: path.filter(p => p.topic === topic.topic && p.subject_id === subject.id),
      masteryScore: scores.find(s => s.topic === topic.topic)?.mastery_score || 0,
      status: getTopicStatus(path, topic.topic), // 'locked' | 'unlocked' | 'in_progress' | 'completed'
    })),
}));
```

**Node Types:**
| Type | Icon | Description |
|---|---|---|
| Subject | 📘 | Container for topics (always completed once visible) |
| Topic | 📝 | Individual learning topic |
| Milestone | 🏆 | Auto-generated when all topics in a subject are completed |

**Status Colors:**
| Status | Color | Description |
|---|---|---|
| Completed | Emerald (#10B981) | All stages done |
| In Progress | Amber (#F59E0B) | Some stages done |
| Unlocked | Blue (#3B82F6) | Available to start |
| Locked | Slate (#64748B) | Prerequisites not met |

## Page

### `/student/growth-map/`

Renders an interactive node map.

**UI:**
- Vertical tree layout: Subject → Topic nodes → Milestone node
- Each subject is a section header
- Topic nodes are clickable (link to learning path for that topic)
- Lines/arrows connect nodes showing progression
- Color coding per status
- "View Subject" button per subject section

---

# 14. Leaderboard

## Purpose

Five leaderboard types provide competitive motivation across different dimensions of student development.

## API Route

### `GET /api/leaderboard`

**Query Parameters:**
- `type` (required): class_weekly / school_monthly / islamic / skills / mastery
- `student_id` (optional): Include to get the current user's rank

**Leaderboard Queries:**

**class_weekly:**
```sql
SELECT p.id as student_id, CONCAT(p.first_name, ' ', p.last_name) as name,
       COALESCE(sl.total_xp, 0) as score
FROM students s
JOIN profiles p ON p.id = s.profile_id
LEFT JOIN student_levels sl ON sl.student_id = p.id
WHERE s.class_id = $1
ORDER BY score DESC LIMIT 50
```

**school_monthly:**
```sql
SELECT p.id, CONCAT(p.first_name, ' ', p.last_name) as name,
       COALESCE(SUM(xt.xp_amount), 0) as score
FROM profiles p
JOIN students s ON s.profile_id = p.id
LEFT JOIN xp_transactions xt ON xt.student_id = p.id
  AND xt.created_at >= date_trunc('month', CURRENT_DATE)
GROUP BY p.id, p.first_name, p.last_name
ORDER BY score DESC LIMIT 50
```

**islamic:**
```sql
SELECT p.id, CONCAT(p.first_name, ' ', p.last_name) as name,
       COALESCE(SUM(
         (CASE WHEN it.salah_fajr THEN 10 ELSE 0 END) +
         (CASE WHEN it.salah_dhuhr THEN 10 ELSE 0 END) +
         (CASE WHEN it.salah_asr THEN 10 ELSE 0 END) +
         (CASE WHEN it.salah_maghrib THEN 10 ELSE 0 END) +
         (CASE WHEN it.salah_isha THEN 10 ELSE 0 END) +
         COALESCE(it.quran_memorized_ayahs, 0) * 5 +
         COALESCE(it.adab_rating, 0) * 10 +
         (CASE WHEN it.dhikr_completed THEN 20 ELSE 0 END)
       ), 0) as score
FROM profiles p
JOIN islamic_tracking it ON it.student_id = p.id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY score DESC LIMIT 50
```

**skills:**
```sql
SELECT p.id, CONCAT(p.first_name, ' ', p.last_name) as name,
       COALESCE(COUNT(st.id) * 10 + AVG(COALESCE(st.self_rating, 0)) * 20, 0) as score
FROM profiles p
JOIN skills_tracking st ON st.student_id = p.id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY score DESC LIMIT 50
```
Formula: `count_of_activities × 10 + average_self_rating × 20`

**mastery:**
```sql
SELECT p.id, CONCAT(p.first_name, ' ', p.last_name) as name,
       COALESCE(AVG(ms.mastery_score), 0) as score
FROM profiles p
JOIN mastery_scores ms ON ms.student_id = p.id
GROUP BY p.id, p.first_name, p.last_name
ORDER BY score DESC LIMIT 50
```

**Response Format:**
```json
{
  "rankings": [
    { "student_id": "uuid", "name": "John Doe", "score": 5750, "rank": 1 },
    { "student_id": "uuid", "name": "Jane Smith", "score": 5200, "rank": 2 }
  ],
  "myRank": { "rank": 5, "total": 50, "score": 4200 }
}
```

## Page

### `/student/leaderboard/`

Tabbed leaderboard interface.

**UI:**
- **Tab Navigation** — 5 tabs: Weekly XP | Monthly XP | Islamic | Skills | Mastery
- **Ranking List** — Scrollable list showing rank number, student name/avatar, score
- **Current User Highlight** — Current student's row is highlighted with a different background
- **My Rank Card** — Sticky card showing current student's rank, score, and total participants

---

# 15. Feature Interconnection Diagram

```
                         ┌─────────────────────────────────────────────────────────────┐
                         │                     STUDENT JOURNEY                          │
                         └─────────────────────────────────────────────────────────────┘
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              ▼                           ▼                           ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   Growth Path           │   │   Practice System       │   │   Islamic Tracking      │
│   (Choose Archetype +   │   │   (Adaptive questions)  │   │   (Salah, Quran, Adab)  │
│    3-5 Skills)          │   │                         │   │                         │
└────────┬────────────────┘   └────────┬────────────────┘   └────────┬────────────────┘
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   Student Term Goals    │   │   Mastery Scores        │   │   Goals Hierarchy       │
│   (Pending → Active)    │   │   (recalc_topic_mastery)│   │   (Daily→Weekly→Monthly) │
└────────┬────────────────┘   └────────┬────────────────┘   └────────┬────────────────┘
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   Portfolio             │◄──┤   Mastery Learning Path │   │   AI Coach              │
│   (Rubrics + Evidence)  │   │   (Lesson→Practice→     │   │   (Motivation, Gap      │
│                         │   │    Challenge→Verification│   │    Analysis, Plans)      │
└────────┬────────────────┘   │    →Advancement)        │   └────────┬────────────────┘
         │                    └────────┬────────────────┘            │
         ▼                             ▼                             ▼
┌─────────────────────────┐   ┌─────────────────────────┐   ┌─────────────────────────┐
│   Promotion Readiness   │   │   Retention Checks      │   │   XP & Gamification     │
│   (8-Dimension Score)   │   │   (3/7/14/30 days)      │   │   (Levels + Badges)     │
└─────────────────────────┘   └─────────────────────────┘   └────────┬────────────────┘
                                                                      │
                                                                      ▼
                                                              ┌─────────────────────────┐
                                                              │   Leaderboards          │
                                                              │   (5 Types)             │
                                                              └─────────────────────────┘
```

**Key Data Flow Paths:**

1. **Practice → Mastery Scores**: Each practice session triggers `recalc_topic_mastery` which updates the 4-component mastery score (accuracy 50% + consistency 20% + recency 15% + difficulty_progress 15%)

2. **Mastery Scores → Mastery Path**: Mastery scores determine when stages unlock (≥80 for challenge→mastery_verification→advancement)

3. **Mastery Path → Retention Checks**: Completing mastery_verification with ≥80 triggers `fn_schedule_retention_checks()` which creates 4 retention checks at 3/7/14/30 days

4. **Practice → XP**: Completing practice earns XP via `fn_add_xp()` with multiplier system (2× for first daily, 1.5–3× for streaks, etc.)

5. **Practice + Islamic + Skills → Daily Accountability**: The daily accountability score aggregates attendance, participation, homework, study time, Quran, prayer, character, skills, community service, and behavior

6. **Mastery + Islamic + Skills + Behavior + Attendance + Consistency + Leadership + Retention → Promotion**: Promotion readiness is computed from all 8 dimensions

7. **AI Coach → All Data**: AI coach reads mastery_scores, learning_streaks, practice_sessions, and goal_hierarchy to generate contextual responses

8. **Goals Hierarchy → All Goals**: The goal_hierarchy unifies goals across time periods (daily→weekly→monthly→term→yearly) with rollup functionality

---

# 16. Database Schema

## Core LMS Tables

```sql
-- From: neon-schema.sql

-- Users
profiles (id UUID PK, email, first_name, last_name, role, avatar_url, ...)
students (id UUID PK, profile_id FK, class_id FK, admission_number, ...)
classes (id UUID PK, name, level, form_teacher_id FK, next_class_id FK, ...)
subjects (id UUID PK, name, code, class_id FK, ...)
academic_sessions (id UUID PK, name, start_date, end_date, is_current, ...)
terms (id UUID PK, session_id FK, name, start_date, end_date, is_current, current_week, ...)

-- Content
question_bank (id UUID PK, subject_id FK, class_id FK, topic, subtopic, difficulty,
               question TEXT, options JSONB, correct_answer, explanation, status, ...)
scheme_of_work (id UUID PK, class_id FK, subject_id FK, term_id FK, week, topic, ...)
```

## Growth Portfolio + Identity Builder Tables

```sql
-- From: neon-schema.sql (Part 12)

archetypes (id UUID PK, name, description, icon_key, is_active)
skills (id UUID PK, name, category, description, is_active)
archetype_skill_map (id UUID PK, archetype_id FK, skill_id FK, recommendation_rank)
class_term_frameworks (id UUID PK, session_id FK, term_id FK, class_level, published_at, created_by FK)
academic_competencies (id UUID PK, framework_id FK, subject_id FK, competency_text, order_index)
skill_expectations (id UUID PK, framework_id FK, skill_id FK, expectation_text, order_index)
student_term_goals (id UUID PK, student_id FK, session_id FK, term_id FK, archetype_id FK,
                    goal_statement_snapshot, status, submitted_at, approved_at, approved_by FK,
                    reflection_text, created_at, updated_at)
student_goal_skills (id UUID PK, student_term_goal_id FK, skill_id FK, order_index)
student_skill_rubrics (id UUID PK, student_id FK, session_id FK, term_id FK, skill_id FK,
                       level, updated_by FK, updated_at, comment, created_at)
portfolio_evidence (id UUID PK, student_id FK, session_id FK, term_id FK,
                    evidence_type, reference_id, text_snapshot, created_by FK, created_at)
skill_evidence_links (id UUID PK, student_skill_rubric_id FK, portfolio_evidence_id FK)
```

## V2 Growth & Mastery Tables

```sql
-- From: V2_GROWTH_MASTERY.sql

-- Gamification
xp_transactions (id UUID PK, student_id FK, xp_amount, xp_type, source, source_id,
                 multiplier, description, created_at)
student_levels (id UUID PK, student_id FK UNIQUE, level, current_xp, total_xp,
                xp_to_next_level, mastery_points, created_at, updated_at)
badge_definitions (id UUID PK, badge_type, name, description, icon_key, category,
                   tier, xp_reward, criteria JSONB, is_hidden, is_active, created_at)
badges (id UUID PK, student_id FK, badge_type, badge_data JSONB, awarded_at)

-- Mastery Learning
mastery_scores (id UUID PK, student_id FK, subject_id FK, topic, subtopic,
                mastery_score, accuracy, consistency, recency, difficulty_progress,
                level, total_attempts, correct_attempts, last_practiced_at, created_at, updated_at)
mastery_learning_path (id UUID PK, student_id FK, subject_id FK, topic, stage,
                       is_unlocked, is_completed, completed_at, attempts_count, max_attempts,
                       teacher_intervention_required, intervention_resolved_at,
                       score_on_completion, metadata JSONB, created_at, updated_at)
topic_prerequisites (id UUID PK, subject_id FK, topic, prerequisite_topic,
                     prerequisite_subject_id FK, order_index, created_at)

-- Retention
retention_checks (id UUID PK, student_id FK, subject_id FK, topic,
                  mastery_score_at_verification, check_days, check_date,
                  retest_score, passed, entered_reinforcement, reinforcement_completed,
                  created_at, updated_at)

-- Promotion
promotion_readiness (id UUID PK, student_id FK, academic_year, term,
                     academic_mastery_score, islamic_development_score, skills_development_score,
                     behavior_score, attendance_score, consistency_score, leadership_score,
                     retention_score, overall_score, promotion_status,
                     supporting_evidence JSONB, recommended_next_class,
                     conditional_requirements TEXT[], created_at, updated_at)

-- Goals
goal_hierarchy (id UUID PK, student_id FK, period_type, dimension,
                period_start, period_end, goal_text, target_metric, target_value,
                achieved_value, status, parent_goal_id FK, source_goal_id, source_type,
                metadata JSONB, created_at, updated_at)

-- Accountability
daily_accountability (id UUID PK, student_id FK, date,
                      attendance_score, participation_score, homework_completion_score,
                      study_time_score, quran_score, prayer_tracking_score,
                      character_score, skill_activity_score, community_service_score,
                      behavior_score, discipline_deductions, total_score, created_at, updated_at)

-- Islamic & Skills Tracking
islamic_tracking (id UUID PK, student_id FK, date, salah_fajr..isha BOOLEAN,
                  quran_surah, quran_ayah_start, quran_ayah_end,
                  quran_memorized_ayahs, quran_revision_ayahs, adab_rating,
                  dhikr_completed, charity_action, notes, self_reported, verified_by FK, ...)
skills_tracking (id UUID PK, student_id FK, skill_id FK, date, activity_type,
                 activity_description, duration_minutes, self_rating, teacher_rating,
                 evidence_url, created_at)

-- AI Coach
ai_coach_interactions (id UUID PK, student_id FK, interaction_type, trigger_event,
                       prompt_text, response_text, recommendations JSONB, context JSONB,
                       effectiveness_rating, user_feedback, created_at)

-- Notifications
notification_preferences (id UUID PK, profile_id FK, email_notifications, ...)
user_notifications (id UUID PK, recipient_id FK, title, message, notification_type,
                    priority, is_read, action_url, ...)

-- Reports
report_schedule (id UUID PK, report_type, frequency, recipient_role, config JSONB, ...)
generated_reports (id UUID PK, report_type, recipient_id FK, period_start, period_end,
                   report_data JSONB, pdf_url, ...)

-- Leaderboard
leaderboard_snapshots (id UUID PK, leaderboard_type, period_start, period_end,
                       class_id FK, rankings JSONB, created_at)

-- School Health
school_health_snapshots (id UUID PK, snapshot_date, overall_health_score,
                         academic_health_score, islamic_health_score, skills_health_score, ...)

-- Performance Colors
performance_colors (id UUID PK, student_id FK, context_type, context_id,
                    score_range_min, score_range_max, color, label, created_at)
```

## Database Functions

```sql
-- XP calculation
fn_xp_to_next_level(current_level INTEGER) RETURNS INTEGER
-- Formula: (level * 200) + 800

-- XP earning + level up
fn_add_xp(student_id UUID, amount INTEGER, type VARCHAR, source VARCHAR,
          source_id UUID, multiplier NUMERIC)

-- Daily accountability computation
fn_calculate_daily_accountability(student_id UUID, date DATE)

-- Retention check scheduling (trigger function)
fn_schedule_retention_checks() RETURNS TRIGGER
-- Fires after INSERT or UPDATE on mastery_learning_path
-- When stage = 'mastery_verification', is_completed = true, score_on_completion >= 80
-- Creates 4 retention_checks at 3, 7, 14, 30 days

-- Weekly goal rollup
fn_rollup_weekly_goals()
-- Aggregates daily goals into weekly goals in goal_hierarchy
```

---

# 17. API Route Reference

| Method | Route | Purpose | Auth |
|---|---|---|---|
| **Skills & Archetypes** | | | |
| GET | `/api/skills` | List active skills | Public |
| GET | `/api/admin/skills` | List all skills (admin) | Admin |
| POST | `/api/admin/skills` | Create skill | Admin |
| PUT | `/api/admin/skills` | Update skill | Admin |
| DELETE | `/api/admin/skills` | Soft delete skill | Admin |
| **Student Term Goals** | | | |
| GET | `/api/student-term-goals` | Fetch goal(s) | Student/Teacher |
| POST | `/api/student-term-goals` | Create/update goal | Student/Teacher |
| **Portfolio** | | | |
| GET | `/api/portfolio/rubric` | Fetch rubric assessments | Student/Teacher |
| POST | `/api/portfolio/rubric` | Upsert rubric levels | Teacher |
| POST | `/api/portfolio/goal` | Create goal with archetype+skills | Student |
| GET | `/api/portfolio-evidence` | Fetch evidence entries | Student/Teacher |
| POST | `/api/portfolio-evidence` | Add evidence entry | Teacher |
| **Mastery** | | | |
| GET | `/api/mastery/scores` | Fetch mastery scores | Student/Teacher |
| GET | `/api/mastery/path` | Fetch learning path | Student/Teacher |
| POST | `/api/mastery/path` | Initialize/complete/intervene | Student/Teacher |
| POST | `/api/mastery/recalc` | Recalculate mastery scores | System |
| GET | `/api/mastery/retention` | Fetch retention checks | Student |
| POST | `/api/mastery/retention` | Update retention check | Student |
| **Gamification** | | | |
| GET | `/api/xp/history` | XP transactions + level + streak | Student |
| GET | `/api/leaderboard` | 5 leaderboard types | Student |
| **Accountability** | | | |
| GET | `/api/accountability` | Daily accountability record | Student |
| **Skills Tracking** | | | |
| GET | `/api/skills-tracking` | Fetch skill activities | Student/Teacher |
| POST | `/api/skills-tracking` | Log skill activity | Student |
| **Goals** | | | |
| GET | `/api/goals/hierarchy` | Fetch goals hierarchy | Student |
| POST | `/api/goals/hierarchy` | Create goal | Student |
| **Promotion** | | | |
| GET | `/api/promotion` | Fetch promotion readiness | Student |
| **AI Coach** | | | |
| POST | `/api/ai/coach` | Generate coach response | Student |
| **Tests** | | | |
| GET/POST | `/api/manage-tests` | CRUD tests | Teacher |
| GET/POST | `/api/student-tests` | Student test management | Student |
| GET | `/api/test-attempts` | Fetch test attempts | Student/Parent |

---

# 18. Type Definitions

All types are defined in `src/types/index.ts`.

## Growth Portfolio Types (lines 852–975)

```typescript
interface Archetype {
  id: string;
  name: string;
  description: string;
  icon_key: string;
  is_active: boolean;
  created_at: string;
}

interface Skill {
  id: string;
  name: string;
  category?: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface StudentTermGoal {
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

interface StudentSkillRubric {
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

interface PortfolioEvidence {
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

type RubricLevel = 'emerging' | 'developing' | 'secure' | 'strong';

// Color mappings for rubric levels
const RUBRIC_COLORS: Record<RubricLevel, string> = {
  emerging: 'bg-red-500',
  developing: 'bg-amber-500',
  secure: 'bg-blue-500',
  strong: 'bg-emerald-500',
};

const RUBRIC_LABELS: Record<RubricLevel, string> = {
  emerging: 'Emerging',
  developing: 'Developing',
  secure: 'Secure',
  strong: 'Strong',
};
```

## V2 Growth & Mastery Types (lines 1039–1475)

```typescript
// Daily Accountability
interface DailyAccountability {
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
}

// Goals Hierarchy
type GoalPeriodType = 'daily' | 'weekly' | 'monthly' | 'term' | 'yearly';
type GoalDimension = 'academic' | 'islamic' | 'skills';
type GoalStatus = 'active' | 'completed' | 'missed' | 'in_progress';

interface GoalHierarchy {
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
  child_goals?: GoalHierarchy[];
}

// Mastery Learning
type MasteryStage = 'lesson' | 'practice' | 'challenge' | 'mastery_verification' | 'advancement';

interface MasteryLearningPath {
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
  score_on_completion?: number;
}

interface MasteryScore {
  id: string;
  student_id: string;
  subject_id: string;
  topic: string;
  subtopic?: string;
  mastery_score: number;    // 0-100
  accuracy: number;         // 50% weight
  consistency: number;      // 20% weight
  recency: number;          // 15% weight
  difficulty_progress: number; // 15% weight
  level: 'needs_support' | 'developing' | 'good_progress' | 'mastered';
  total_attempts: number;
  correct_attempts: number;
  last_practiced_at?: string;
}

// Retention
interface RetentionCheck {
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
}

// Promotion
type PromotionStatus = 'ready' | 'needs_intervention' | 'conditional' | 'not_ready';

interface PromotionReadiness {
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
  recommended_next_class?: string;
  conditional_requirements?: string[];
}

// AI Coach
type AICoachInteractionType = 'goal_suggestion' | 'lesson_recommendation' | 'revision_plan'
  | 'motivation' | 'gap_analysis' | 'prediction' | 'study_tip' | 'intervention_alert';

interface AICoachInteraction {
  id: string;
  student_id: string;
  interaction_type: AICoachInteractionType;
  prompt_text?: string;
  response_text?: string;
  recommendations?: Record<string, any>[];
  context?: Record<string, any>;
  effectiveness_rating?: number;
}

// Gamification
interface XPTransaction {
  id: string;
  student_id: string;
  xp_amount: number;
  xp_type: string;
  source: string;
  source_id?: string;
  multiplier: number;
  description?: string;
}

interface StudentLevel {
  id: string;
  student_id: string;
  level: number;
  current_xp: number;
  total_xp: number;
  xp_to_next_level: number;
  mastery_points: number;
}

interface BadgeDefinition {
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
}

// Leaderboard
type LeaderboardType = 'class_weekly' | 'school_monthly' | 'islamic' | 'skills' | 'mastery';

interface LeaderboardEntry {
  student_id: string;
  name: string;
  score: number;
  rank: number;
  level?: number;
  streak?: number;
}

// Islamic & Skills Tracking
interface IslamicTracking {
  id: string;
  student_id: string;
  date: string;
  salah_fajr: boolean;
  salah_dhuhr: boolean;
  salah_asr: boolean;
  salah_maghrib: boolean;
  salah_isha: boolean;
  quran_surah?: string;
  quran_memorized_ayahs: number;
  quran_revision_ayahs: number;
  adab_rating?: number;
  dhikr_completed: boolean;
  charity_action?: string;
}

interface SkillsTracking {
  id: string;
  student_id: string;
  skill_id: string;
  date: string;
  activity_type: string;
  activity_description?: string;
  duration_minutes: number;
  self_rating?: number;
  teacher_rating?: number;
}

// Growth Map
interface GrowthMapNode {
  id: string;
  label: string;
  type: 'lesson' | 'practice' | 'challenge' | 'mastery' | 'achievement' | 'leadership' | 'islamic' | 'skills';
  status: 'locked' | 'unlocked' | 'in_progress' | 'completed';
  subject_id?: string;
  topic?: string;
  prerequisite_ids: string[];
}

// XP Multipliers
const XP_MULTIPLIERS = {
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
```

---

*Document generated from EduHub codebase analysis — see `src/types/index.ts` for all type definitions and individual page/route files for implementation details.*
