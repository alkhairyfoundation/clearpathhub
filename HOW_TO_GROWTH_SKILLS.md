# How to Use the Growth & Skills Features

## A Simple Step-by-Step Guide

---

# Before We Start

There are three types of people who use this system:

- **Admin** — Sets everything up
- **Teacher** — Guides and assesses students
- **Student** — Learns, practices, and grows

This guide follows the journey from start to finish. If you're an **Admin**, start at Step 1. If you're a **Student** or **Teacher**, you can skip ahead.

---

# Part 1: Admin Setup (Before the Term Starts)

## Step 1 — Create Skills

**Who:** Admin  
**Where:** `/admin/skills`

Think of skills as the building blocks of personal development. There are 4 types:

| Type | Examples |
|---|---|
| **Cognitive** | Critical Thinking, Problem Solving, Decision Making |
| **Social** | Communication, Teamwork, Leadership |
| **Personal** | Self-Discipline, Resilience, Time Management |
| **Technical** | Digital Literacy, Data Analysis, Research Skills |

**What to do:**
1. Go to the Skills page
2. You'll see a list of existing skills (47 are already seeded)
3. To add a new one, click "Add Skill", type the name, pick a category, write a description
4. You can also turn a skill off (students won't see it) or delete it

**Example:**
```
Name: Critical Thinking
Category: Cognitive
Description: The ability to analyze facts and form a judgment
```

There are already 47 skills in the system, so you probably don't need to add more unless you want something specific.

---

## Step 2 — Create Archetypes

**Who:** Admin  
**Where:** `/admin/archetypes`

An archetype is like an "identity card" a student picks each term. It answers the question: "Who do I want to become this term?"

**What to do:**
1. Go to the Archetypes page
2. You'll see 8 archetypes already created
3. Each has a name, description, and icon
4. You can add more, edit them, or turn them off

**The 8 Archetypes:**

| Archetype | Description |
|---|---|
| The Advocate | Stands up for what's right and supports others |
| The Analyst | Thinks critically and solves problems |
| The Communicator | Expresses ideas clearly and listens well |
| The Creator | Innovates and creates meaningful work |
| The Explorer | Curious, asks questions, seeks knowledge |
| The Innovator | Finds creative ways to make things better |
| The Leader | Inspires and guides others positively |
| The Scholar | Excels academically and loves learning |

---

## Step 3 — Set Up Growth Frameworks

**Who:** Admin  
**Where:** `/admin/growth-frameworks`

This is where you decide what skills each class level should focus on.

**What to do:**
1. Select a session (e.g., "2024/2025") and term (e.g., "Term 1")
2. Pick a class level (e.g., "JSS1", "SS2")
3. Add **academic competencies** — what subjects students should excel in
4. Add **skill expectations** — which skills matter for this class level and what "good" looks like

**Example — JSS1 Skill Expectation:**
```
Skill: Critical Thinking
Expectation: Can identify cause and effect in simple stories and everyday situations
```

You would create one framework per class level per term.

---

## Step 4 — Map Skills to Archetypes

**Who:** Admin  
**Where:** Database seed script (already done)

This step is handled by the seed script (`seed_growth_system.sql`). It decides which skills are recommended for which archetype.

**Example mapping:**
- The **Analyst** gets: Critical Thinking, Problem Solving, Information Literacy, Analytical Skills, Logical Reasoning
- The **Leader** gets: Communication, Teamwork, Empathy, Public Speaking, Mentoring

You usually only need to run the seed script once.

---

# Part 2: Student Creates Their Growth Goal

## Step 5 — Student Chooses an Archetype and Skills

**Who:** Student  
**Where:** `/student/growth-path`

This is where the student starts their growth journey.

**What the student does:**
1. Goes to "My Growth Path"
2. Sees a grid of archetype cards
3. Clicks on one — it lights up with a checkmark
4. Then sees a list of skills (all 47, but filtered by their archetype's recommendations)
5. Picks 3 to 5 skills (a counter shows: "3/5", "4/5", "5/5")
6. The system automatically writes a goal statement:

**Example — What the student sees:**
```
"This term I am growing to become a stronger Analyst
 by practising Critical Thinking, Problem Solving,
 and Information Literacy."
```

7. The student clicks "Submit Goal"
8. The goal is saved with status: **pending**

**What happens behind the scenes:**
```
POST /api/student-term-goals
{
  action: "create",
  archetype_id: "...",
  skill_ids: ["...", "...", "..."],
  goal_statement_snapshot: "This term I am growing..."
}
```

The system also checks: "Does this student already have a goal for this term?" If yes, they update it instead of creating a new one.

**Maximum 5 skills** — the student cannot select more. They need at least 3 to submit.

---

# Part 3: Teacher Reviews and Approves

## Step 6 — Teacher Sees All Pending Goals

**Who:** Teacher  
**Where:** `/teacher/goal-approvals`

The teacher opens this page and sees a list of all students in their class who have submitted goals.

**What the teacher sees:**
```
┌──────────────────────────────────────────────┐
│ Student Name │ Archetype  │ Skills    │ Status │
├──────────────┼────────────┼───────────┼────────┤
│ John Doe     │ Analyst    │ 3 skills  │ Pending│
│ Jane Smith   │ Leader     │ 4 skills  │ Pending│
│ Ahmed Khan   │ Scholar    │ 5 skills  │ Pending│
└──────────────────────────────────────────────┘
```

## Step 7 — Teacher Approves and Sets Rubric Levels

The teacher clicks on a student to see their full goal. If it looks good, they approve it.

**What happens during approval:**
1. Teacher clicks "Approve"
2. The goal status changes from **pending** to **active**
3. The teacher also sets an initial rubric level for each of the student's chosen skills

**Rubric Levels (from lowest to highest):**

| Level | Color | What it means |
|---|---|---|
| Emerging | Red | Just starting, needs lots of help |
| Developing | Amber | Making progress, some guidance needed |
| Secure | Blue | Can do this consistently |
| Strong | Green | Excels, could teach others |

**Example — Teacher sets initial levels:**
```
John's skills:
┌──────────────────────┬────────────┐
│ Skill                │ Level      │
├──────────────────────┼────────────┤
│ Critical Thinking    │ Developing │
│ Problem Solving      │ Emerging   │
│ Information Literacy │ Developing │
└──────────────────────┴────────────┘
```

**Behind the scenes, two things happen:**
```json
// 1. Goal status updated
POST /api/student-term-goals
{ action: "update", goal_id: "...", status: "active", approved_at: "..." }

// 2. Rubric levels saved
POST /api/portfolio/rubric
{ studentId: "...", rubrics: [
  { skill_id: "...", level: "developing" },
  { skill_id: "...", level: "emerging" }
]}
```

---

# Part 4: Throughout the Term

Now the real work begins. The student learns, practices, and grows. The teacher observes, assesses, and records evidence.

## Step 8 — Student Does Daily Practice

**Who:** Student  
**Where:** `/student/practice`

The practice system is adaptive — it shows questions the student needs most.

**How it picks questions:**
1. Looks at **weak topics** (mastery score below 60%) — these come first
2. Looks at **overdue retention checks** — topics that need review
3. Looks at the **current scheme of work** — what the class is learning now
4. Looks at **mastered topics** — for reinforcement

**What the student does:**
1. Opens the Practice page
2. Sees a "Start Practice" button
3. Answers 10 questions, one at a time
4. After each answer, sees if they were right or wrong
5. After all 10 questions, sees their score

**After practice, the system automatically:**
- Saves the session and each answer
- Recalculates mastery scores
- Awards XP (more if it's their first practice today)
- Updates their streak

## Step 9 — Student Tracks Islamic Development

**Who:** Student  
**Where:** `/student/islamic-growth`

This is for tracking daily Islamic practices.

**What the student does:**
1. Goes to "Islamic Growth"
2. Checks off which of the 5 prayers they performed today (Fajr, Dhuhr, Asr, Maghrib, Isha)
3. Enters Quran progress — which surah and how many ayahs they memorized or revised
4. Rates their character (adab) — 1 to 5 stars
5. Marks if they did morning/evening dhikr
6. Writes any charity action they did

**This data feeds into:**
- Their daily accountability score
- The Islamic leaderboard
- Their promotion readiness

## Step 10 — Student Tracks Skill Activities

**Who:** Student  
**Where:** `/student/skills-growth`

Students can log real-world activities that develop their chosen skills.

**What the student does:**
1. Goes to "Skills Growth"
2. Clicks "Log Activity"
3. Selects which skill they practiced
4. Describes what they did
5. Enters how many minutes they spent
6. Rates themselves (1-5)

**Example log entry:**
```
Skill: Communication
Activity: Led the morning assembly announcement
Duration: 15 minutes
Self-Rating: 4/5
```

## Step 11 — Student Checks Their Mastery Dashboard

**Who:** Student  
**Where:** `/student/mastery`

This shows how well the student understands each topic.

**What the student sees:**
```
Overall Mastery: 72% ────████████░░░░

Mathematics ──── 78%  ████████░░
  Algebra        85%  █████████░  (Mastered)
  Geometry       70%  ███████░░░  (Good Progress)
  Statistics     60%  ██████░░░░  (Developing)

English ──── 65%  ██████▒░░░
  Grammar        72%  (Good Progress)
  Comprehension  58%  (Developing)

Science ──── 45%  ████▒░░░░░
  Cells          45%  (Needs Support)
```

**Each topic has 4 components:**
- **Accuracy** (50% of score) — How often they get questions right
- **Consistency** (20%) — Do they perform well every time?
- **Recency** (15%) — Have they practiced recently?
- **Difficulty Progress** (15%) — Are they handling harder questions?

**Mastery Levels:**

| Level | Score | What it means |
|---|---|---|
| Needs Support | 0-39% | Student is struggling, needs teacher help |
| Developing | 40-59% | Making progress but inconsistent |
| Good Progress | 60-79% | Understanding most concepts |
| Mastered | 80-100% | Strong understanding, ready to move on |

## Step 12 — Student Advances Through Learning Stages

**Who:** Student  
**Where:** `/student/learning-path`

Each topic has 5 stages. The student must pass each one to unlock the next.

```
[Lesson] ──► [Practice] ──► [Challenge] ──► [Mastery Verification] ──► [Advancement]
```

**How it works:**
1. **Lesson** — The first stage, always unlocked. Watch/read the lesson material.
2. **Practice** — Unlocks after completing the lesson. Basic practice questions.
3. **Challenge** — Unlocks after scoring 80%+ on Practice. Harder questions.
4. **Mastery Verification** — Unlocks after scoring 80%+ on Challenge. The final test.
5. **Advancement** — Unlocks after scoring 80%+ on Mastery Verification. Topic is done!

**If a student scores below 80%:**
- They can try again
- Each attempt is counted
- After 3 attempts, the system flags the teacher for help

**When they pass Mastery Verification:**
- The system schedules retention checks at 3, 7, 14, and 30 days
- This makes sure they don't forget what they learned

## Step 13 — Student Reviews Past Topics (Retention Checks)

**Who:** Student  
**Where:** `/student/retention`

After mastering a topic, the system checks if the student still remembers it.

**What the student sees:**
```
Retention Timeline

Mathematics - Algebra (Mastered Jan 10)
  ┌────────────────────────────────────────┐
  │ Day 3  Jan 13  ✅ 90%  Passed!         │
  │ Day 7  Jan 17  ⏳  Due Today           │
  │ Day 14 Jan 24  ⏳  Upcoming            │
  │ Day 30 Feb 09  ⏳  Upcoming            │
  └────────────────────────────────────────┘

English - Grammar (Mastered Jan 5)
  ┌────────────────────────────────────────┐
  │ Day 3  Jan 8   ✅ 85%  Passed!         │
  │ Day 7  Jan 12  ❌ 65%  Reinforcement!  │
  └────────────────────────────────────────┘
```

**If they fail a retention check (score below 80%):**
- The system re-opens the Practice stage
- They need to practice and re-learn the topic
- This is called "entering reinforcement"

## Step 14 — Student Earns XP and Levels Up

**Who:** Student  
**Where:** `/student/xp-history`

Every learning action earns XP. The student can track their progress here.

**XP Sources:**

| Action | Base XP | Notes |
|---|---|---|
| Correct answer | 10 | Per question |
| Wrong answer | 3 | Effort still counts |
| Complete a session | 50 | Bonus for finishing |
| First practice of the day | 20 → 40 | 2× multiplier |
| 3-day streak | Varies | 1.5× multiplier |
| 7-day streak | Varies | 2× multiplier |
| 30-day streak | Varies | 3× multiplier |
| Master a topic | 200 | First time |
| Daily login | 20 | Just for showing up |

**Levels:**
```
Level 1 → 2:  Need 1,000 XP
Level 2 → 3:  Need 1,200 XP
Level 5 → 6:  Need 1,800 XP
Level 10 → 11: Need 2,800 XP
```

**Formula:** `XP needed = (current level × 200) + 800`

**What the student sees:**
```
Level 5 ────████████░░░░ 750 / 1,800 XP

Today: +120 XP
This Week: +850 XP

Streak: 7 days 🔥
```

## Step 15 — Student Checks Their Daily Accountability Score

**Who:** Student  
**Where:** `/student/accountability`

This is a daily score from 0-100 that combines everything the student did.

**What makes up the score:**

| Factor | Weight | Where it comes from |
|---|---|---|
| Attendance | 10% | Were they in class? |
| Participation | 10% | Did they engage? |
| Homework | 15% | Did they submit? |
| Study Time | 10% | Minutes practiced |
| Quran | 15% | Islamic tracking |
| Prayer | 10% | Salah consistency |
| Character | 10% | Adab rating |
| Skill Activity | 8% | Skills log |
| Community Service | 5% | Charity/logged acts |
| Behavior | 10% | Positive minus negative reports |

**Minus any deductions from exam monitoring** (tab switches, fullscreen exits, etc.)

**Example score breakdown:**
```
Today's Score: 84/100 ────████████░░ (Good!)

Attendance:      100% ████████████
Participation:    80% ████████░░░░
Homework:        100% ████████████
Study Time:       75% ███████░░░░░
Quran:            90% █████████░░░
Prayer:           80% ████████░░░░
Character:        85% █████████░░░
Skill Activity:   70% ███████░░░░░
Community:         0% ░░░░░░░░░░░░
Behavior:         95% █████████░░░
Deductions:        0
```

## Step 16 — Student Talks to the AI Coach

**Who:** Student  
**Where:** `/student/ai-coach`

The AI Coach reads the student's data and gives personalized advice.

**What the student can ask:**

1. **"Give me motivation!"**
   - If streak ≥ 3: "Masha'Allah! You're on a 5-day streak!"
   - If scores are high: "Excellent work! Your average is 85%!"
   - If struggling: "Let's focus on Algebra — small daily improvements add up!"

2. **"Analyze my gaps"**
   - Lists the 5 weakest topics with scores
   - "Algebra: 45% — needs focus"
   - "Grammar: 52% — improving"

3. **"Create a revision plan"**
   - Day 1: Revise Algebra (45%)
   - Day 2: Revise Grammar (52%)
   - Day 3: Revise Cells (58%)

4. **"Suggest goals"**
   - Lists active goals or suggests new ones

**Example conversation:**
```
Student: "Give me motivation!"
Coach: "Masha'Allah, John! You're on a 7-day learning streak!
        Your consistency is building strong habits. Keep going!"

        [Quick Actions]
        [📚 Practice Now] [🎯 Focus on Algebra] [📅 View Streak]
```

## Step 17 — Teacher Adds Evidence to Portfolios

**Who:** Teacher  
**Where:** `/teacher/portfolio-tracking`

Throughout the term, the teacher records things students do that show their skills in action.

**What the teacher does:**
1. Goes to Portfolio Tracking
2. Selects a student
3. Clicks "Add Evidence"
4. Writes what happened

**Examples of evidence:**
```
Type: Manual
Text: "John led the group project today. He organized
       tasks, made sure everyone had a role, and kept
       the team on schedule. Demonstrated strong leadership."

Type: Commendation
Text: "Aisha received a commendation for helping a new
       student adjust to the class. Showed empathy and
       communication skills."

Type: Assessment
Text: "Science test: 85%. Strong understanding of cell
       biology. Good analytical skills in the lab report."
```

## Step 18 — Teacher Updates Rubric Levels

**Who:** Teacher  
**Where:** `/teacher/portfolio-tracking`

As the term progresses, the teacher updates how the student is doing on each skill.

**Example progression:**
```
Week 1:  Critical Thinking ── Emerging   (Red)
Week 4:  Critical Thinking ── Developing (Amber)
Week 8:  Critical Thinking ── Secure     (Blue)
Week 12: Critical Thinking ── Strong     (Green) ✅
```

The teacher can update levels at any time by clicking the student's skill and selecting a new level.

## Step 19 — Student Checks Their Growth Map

**Who:** Student  
**Where:** `/student/growth-map`

This is a visual "game map" showing all subjects and topics.

**What the student sees:**
```
  ┌──────────────────────────────────────────┐
  │           MY GROWTH MAP                  │
  │                                          │
  │  📘 MATHEMATICS                          │
  │    ├── 📝 Algebra       🟢 Completed      │
  │    ├── 📝 Geometry      🟡 In Progress    │
  │    ├── 📝 Statistics    🔵 Unlocked       │
  │    └── 🏆 Milestone     🔒 Locked        │
  │                                          │
  │  📘 ENGLISH                              │
  │    ├── 📝 Grammar       🟡 In Progress    │
  │    ├── 📝 Comprehension 🔵 Unlocked       │
  │    └── 🏆 Milestone     🔒 Locked        │
  │                                          │
  │  📘 SCIENCE                              │
  │    ├── 📝 Cells         🔴 Needs Support  │
  │    └── 🔒 More topics coming...          │
  └──────────────────────────────────────────┘
```

**Color key:**
- 🟢 **Completed** — All stages done
- 🟡 **In Progress** — Some stages done, working on it
- 🔵 **Unlocked** — Ready to start
- 🔒 **Locked** — Prerequisites not met
- 🔴 **Needs Support** — Teacher intervention needed

---

# Part 5: End of Term

## Step 20 — Student Writes Their Reflection

**Who:** Student  
**Where:** `/student/portfolio`

At the end of the term, the student reflects on their growth.

**What the student does:**
1. Goes to their Portfolio page
2. Scrolls to the Reflection section
3. Writes about what they learned, how they changed, what they'll do next term

**Example reflection:**
```
"This term I chose to be an Analyst. I worked on
Critical Thinking, Problem Solving, and Information
Literacy. At first, I found it hard to break down
problems, but after practicing, I can now identify
the main issue quickly. I want to continue being
an Analyst next term and add Communication to my skills."
```

The reflection is saved automatically or when they click "Save Reflection".

## Step 21 — Teacher Archives the Goal

**Who:** Teacher  
**Where:** `/teacher/portfolio-tracking`

At the end of the term, the teacher marks the goal as "archived".

This happens after:
- All rubric levels are final
- All evidence has been added
- The student has submitted their reflection

Archiving the goal locks it so no more changes can be made. It becomes a permanent record.

## Step 22 — Promotion Readiness is Computed

**Who:** System (automatically, or admin can trigger)  
**Where:** `/student/promotion`

The system calculates whether the student is ready to move to the next class.

**The 8 dimensions checked:**

| Dimension | What it measures |
|---|---|
| Academic Mastery | Average score across all subjects |
| Islamic Development | Salah, Quran, adab consistency |
| Skills Development | Rubric levels for chosen skills |
| Behavior | Behavior records |
| Attendance | How often they attended |
| Consistency | Do they perform steadily? |
| Leadership | Leadership activities logged |
| Retention | Did they pass retention checks? |

**Possible outcomes:**

| Status | Meaning |
|---|---|
| Ready ✅ | Student can move to next class |
| Needs Intervention ⚠️ | Some weak areas but can progress with support |
| Conditional 📋 | Can move forward only if certain conditions are met |
| Not Ready ❌ | Should repeat the term |

**What the student sees:**
```
               PROMOTION READINESS
               ┌─────────────────┐
               │     READY!     │
               │   Overall: 79% │
               └─────────────────┘

  Academic Mastery   78%  ████████░░
  Islamic Dev.       82%  ████████░░
  Skills Dev.        70%  ███████░░░
  Behavior           85%  ████████░░
  Attendance         95%  █████████░
  Consistency        76%  ███████░░░
  Leadership         65%  ██████░░░░
  Retention          80%  ████████░░

  Recommended: JSS 1 → JSS 2
```

---

# Part 6: Anytime — Leaderboards

## Step 23 — Students Compete on Leaderboards

**Who:** Student  
**Where:** `/student/leaderboard`

There are 5 leaderboards students can check anytime:

**1. Class Weekly — Based on total XP**
```
Rank │ Name          │ XP
─────┼───────────────┼──────
 #1  │ Ahmed Khan    │ 5,750
 #2  │ Jane Smith    │ 5,200
 #3  │ John Doe      │ 4,800  ← You
```

**2. School Monthly — Based on XP earned this month**

**3. Islamic — Based on prayers, Quran, adab, dhikr**
```
Scoring:
  Each salah = 10 points
  Each ayah memorized = 5 points
  Adab rating × 10 = points
  Dhikr completed = 20 points
```

**4. Skills — Based on skill activities**
```
Score = (number of activities × 10) + (average rating × 20)
```

**5. Mastery — Based on average mastery score**

---

# Part 7: Admin Reports

## Step 24 — Admin Views Portfolio Reports

**Who:** Admin  
**Where:** `/admin/portfolio-reports`

At any time, admins can see aggregate data across the whole school.

**What they see:**

**Archetype Distribution — Which archetypes are most popular?**
```
The Leader    ████████████  35%
The Analyst   ██████████    28%
The Scholar   ██████        18%
The Creator   ████          12%
The Communicator ██         7%
```

**Top Skills — What skills are students working on most?**
```
1. Critical Thinking     — chosen by 142 students
2. Communication         — chosen by 128 students
3. Problem Solving       — chosen by 115 students
4. Leadership            — chosen by 98 students
5. Resilience            — chosen by 87 students
```

**Rubric Averages — Average rubric level per skill (1-4 scale)**

**Goal Stats — How many goals are pending, active, or archived**

---

# Summary: The Complete Journey

```
START OF TERM                  DURING THE TERM             END OF TERM
─────────────────              ────────────────            ──────────────

Admin creates skills ──┐
Admin creates          ├──► Student creates goal ──► Teacher approves
  archetypes           │       (picks archetype         (sets rubric
Admin sets up          │        + 3-5 skills)            levels)
  frameworks ──────────┘              │                       │
                                      ▼                       ▼
                              Student practices ──────► Mastery scores
                              Student tracks islamic        │
                              Student logs skills      Retention checks
                              Teacher adds evidence         │
                              Teacher updates rubrics  Student reflects
                              AI Coach guides               │
                              XP + levels earned       Teacher archives
                              Leaderboards update           │
                                                      Promotion readiness
                                                      computed
```

---

# Frequently Asked Questions

**Q: What if a student wants to change their archetype mid-term?**
A: They can go back to "/student/growth-path" and update their goal. If the teacher already approved it, the status stays "active". The teacher can adjust rubric levels for any new skills.

**Q: What if a student fails a retention check?**
A: The system automatically re-opens the "Practice" stage for that topic. The student needs to practice again. Their mastery score may decrease to reflect the gap.

**Q: How many skills can a student pick?**
A: Minimum 3, maximum 5.

**Q: What happens if a student doesn't set a goal?**
A: The teacher will see them with no goal on the approvals page. The teacher can remind them. Without a goal, the student won't have rubric assessments or a portfolio for that term.

**Q: Can a teacher reject a goal?**
A: Yes. The teacher can set the goal status back to "draft" and leave a comment explaining why.

**Q: When should the teacher update rubric levels?**
A: There's no fixed schedule. Teachers should update them as they observe the student demonstrating the skill at a higher level. Some teachers update monthly, others when they see significant growth.

**Q: Who can see the portfolio?**
A: The student, their teacher, their parents, and admins.

**Q: Does the AI Coach use real AI?**
A: It uses rule-based logic based on the student's actual data (mastery scores, streaks, recent sessions). It doesn't use a language model — it's a smart, contextual recommendation system.

---

*That's the complete guide! Start from Step 1 if you're setting up, or jump to the student/teacher sections as needed.*
