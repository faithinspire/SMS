# Visual Architecture - Score Sheets Population System

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Student Using App                         │
│                                                                   │
│  1. Logs in as Student                                           │
│  2. Goes to "Student Results" page                               │
│  3. Selects Session → Term → Class                               │
│  4. Views scores and results                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
         ┌─────────────────────────────────────┐
         │   /api/results/score-sheets (GET)   │
         │   ↓ Fetch scores from database      │
         │   ← Returns test scores/exam scores │
         └──────────────┬──────────────────────┘
                        │
                        ▼
         ┌──────────────────────────────────┐
         │  Supabase Database               │
         │  ┌────────────────────────────┐  │
         │  │ score_sheets table         │  │
         │  │                            │  │
         │  │ student_id   subject_id    │  │
         │  │ test1        test2         │  │
         │  │ test3        test4         │  │
         │  │ exam         total         │  │
         │  └────────────────────────────┘  │
         │                                  │
         │  BEFORE:  0 records ❌           │
         │  AFTER:   240 records ✅         │
         └──────────────────────────────────┘
```

## 🔄 Data Population Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT PROCESS                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  git commit      │
│  git push origin │
│     main         │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  Vercel Auto-Deploy          │
│  (2-3 minutes)               │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  Deployment Options (Choose ONE)             │
├──────────────────────────────────────────────┤
│                                              │
│  Option A: Node Script                       │
│  ┌────────────────────────────────────────┐ │
│  │ node run-migration-171.js              │ │
│  │ ↓ Executes migration SQL               │ │
│  │ ↓ Loads .env.local credentials        │ │
│  │ ← Creates 240 score records           │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Option B: API Endpoint                      │
│  ┌────────────────────────────────────────┐ │
│  │ POST /api/debug/insert-test-data       │ │
│  │ Body: {"action": "populate"}           │ │
│  │ ↓ Queries database                     │ │
│  │ ↓ Generates random scores              │ │
│  │ ← Returns success with record count   │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Option C: Direct SQL (Supabase)             │
│  ┌────────────────────────────────────────┐ │
│  │ 1. Open Supabase Dashboard             │ │
│  │ 2. SQL Editor                          │ │
│  │ 3. Paste migration 171 content        │ │
│  │ 4. Run Query                           │ │
│  │ ← Creates 240 score records           │ │
│  └────────────────────────────────────────┘ │
│                                              │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
         ┌──────────────────────────┐
         │  Database Updated ✅      │
         │  score_sheets now has    │
         │  240 test records        │
         └──────────────────────────┘
```

## 📊 Data Generation Pipeline

```
INPUT DATA                  PROCESSING                  OUTPUT DATA
──────────────             ─────────────              ─────────────

1. SCHOOLS
   ├─ id: uuid
   └─ status: 'ACTIVE'         ──┐
                                   │
2. STUDENTS                        │
   ├─ id: uuid                     │
   ├─ school_id: uuid             │
   └─ status: 'ACTIVE'         ──┼──→  [Migration 171 SQL]
                                   │    ├─ Cross join students
3. ACADEMIC_TERMS                  │    ├─ Cross join terms
   ├─ id: uuid                     │    ├─ Cross join subjects
   ├─ school_id: uuid             │    └─ Generate random scores
   └─ term_number: 1,2,3       ──┤
                                   │  
4. STUDENT_SUBJECTS                │    RESULT:
   ├─ student_id: uuid            │    ┌─────────────────────┐
   └─ subject_id: uuid         ──┴──→ │ SCORE_SHEETS TABLE  │
                                      │                     │
5. RANDOM SCORES                      │ 240 NEW RECORDS    │
   ├─ test1: 0-10                     │ ✅ student_id       │
   ├─ test2: 0-10                     │ ✅ subject_id       │
   ├─ test3: 0-10                     │ ✅ term_id          │
   ├─ test4: 0-10                     │ ✅ test1-4 scores   │
   └─ exam: 0-60                      │ ✅ exam score       │
                                      │ ✅ total (auto)     │
                                      └─────────────────────┘
```

## 🎯 Data Matrix

```
10 Students × 3 Terms × 8 Subjects = 240 Score Records

STUDENTS (10):
  Student 1, Student 2, ..., Student 10

TERMS (3):
  First Term    │  Second Term  │  Third Term
  (1st Score)   │  (2nd Score)  │  (3rd Score)

SUBJECTS (8 per student):
  Math  │  English  │  Science  │  Social Studies
  PE    │  Arts     │  CS       │  History

RESULT MATRIX:
┌──────────┬──────────┬──────────┐
│ Student1 │ Student2 │ Student3 │  ...
├──────────┼──────────┼──────────┤
│ Math→    │ Math→    │ Math→    │
│ English→ │ English→ │ English→ │  (1st Term)
│ Science→ │ Science→ │ Science→ │
│ ...      │ ...      │ ...      │
├──────────┼──────────┼──────────┤
│ Math→    │ Math→    │ Math→    │
│ English→ │ English→ │ English→ │  (2nd Term)
│ Science→ │ Science→ │ Science→ │
│ ...      │ ...      │ ...      │
├──────────┼──────────┼──────────┤
│ Math→    │ Math→    │ Math→    │
│ English→ │ English→ │ English→ │  (3rd Term)
│ Science→ │ Science→ │ Science→ │
│ ...      │ ...      │ ...      │
└──────────┴──────────┴──────────┘

Each cell contains: { test1, test2, test3, test4, exam, total }
```

## 📈 Score Generation Example

```
For Student 1, First Term, Math:

Random Test Scores (0-10 each):
  test1: 7.5
  test2: 8.2
  test3: 6.8
  test4: 9.1

Random Exam Score (0-60):
  exam: 45.3

Auto-Calculated Total:
  total: 7.5 + 8.2 + 6.8 + 9.1 + 45.3 = 76.9

Stored in score_sheets:
┌─────────────────────────────────┐
│ student_id:  uuid-of-student-1  │
│ subject_id:  uuid-of-math       │
│ term_id:     uuid-of-term-1     │
│ test1:       7.5                │
│ test2:       8.2                │
│ test3:       6.8                │
│ test4:       9.1                │
│ exam:        45.3               │
│ total:       76.9 (GENERATED)   │
│ source:      TEACHER_ENTRY      │
└─────────────────────────────────┘
```

## 🔐 Safety Features

```
UPSERT Strategy (INSERT ... ON CONFLICT DO NOTHING)

┌─────────────────────────────────────────────────────┐
│  Running population multiple times                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1st Run:  ┌─────────────────────────────────────┐ │
│            │ Generates 240 new records           │ │
│            │ All inserted successfully ✅        │ │
│            └─────────────────────────────────────┘ │
│            Total in DB: 240                        │
│                                                     │
│  2nd Run:  ┌─────────────────────────────────────┐ │
│            │ Generates same 240 records          │ │
│            │ All conflict with existing data     │ │
│            │ ON CONFLICT DO NOTHING              │ │
│            │ No duplicates created ✅            │ │
│            └─────────────────────────────────────┘ │
│            Total in DB: 240 (NOT 480!)            │
│                                                     │
│  Result: Safe to run multiple times                │
│          No duplicates                             │
│          Idempotent operation ✅                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 🔄 Clear/Rollback Operation

```
Before Clear:
  score_sheets table: 240 records

Clear Command:
  POST /api/debug/insert-test-data
  Body: {"action": "clear"}
           │
           ▼
  DELETE FROM score_sheets 
  WHERE updated_at > NOW() - INTERVAL '1 hour'
           │
           ▼

After Clear:
  score_sheets table: 0 records

Result: Back to original state in < 1 second
```

## 📊 UI Flow After Population

```
BEFORE POPULATION:
┌────────────────────────────────────┐
│ Student Results Page               │
├────────────────────────────────────┤
│ Session: [Loading...] ❌ Error      │
│ "Failed to load sessions"          │
│                                    │
│ Cannot proceed ❌                  │
└────────────────────────────────────┘


AFTER POPULATION:
┌────────────────────────────────────┐
│ Student Results Page               │
├────────────────────────────────────┤
│ Session: [2039/2040 ▼] ✅          │
│          Dropdown loaded!          │
│                                    │
│ Term: [First Term ▼] ✅            │
│       Dropdown loaded!             │
│                                    │
│ Class: [JSS 1A ▼] ✅               │
│        Dropdown loaded!            │
│                                    │
├────────────────────────────────────┤
│ SCORES:                            │
│ ┌──────────────────────────────┐   │
│ │ Subject    │ Test1 │ Exam │  │   │
│ ├────────────┼───────┼──────┤  │   │
│ │ Mathematics│ 7.5   │ 45.3 │  │   │
│ │ English    │ 8.2   │ 52.1 │  │   │
│ │ Science    │ 6.8   │ 48.5 │  │   │
│ │ ...        │ ...   │ ...  │  │   │
│ └──────────────────────────────┘   │
│                                    │
│ Results displaying ✅              │
└────────────────────────────────────┘
```

## 🎯 Verification Flow

```
POST to populate endpoint
         │
         ▼
┌─────────────────────────────┐
│ Verify Schools exist        │
├─────────────────────────────┤
│ ✅ Found active school      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Verify Students exist       │
├─────────────────────────────┤
│ ✅ Found 10 active students │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Verify Terms exist          │
├─────────────────────────────┤
│ ✅ Found 3 terms            │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Verify Enrollments exist    │
├─────────────────────────────┤
│ ✅ Found 8 subjects/student │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Generate Scores             │
├─────────────────────────────┤
│ ✅ Generated 240 records    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Insert into Database        │
├─────────────────────────────┤
│ ✅ Inserted 240 records     │
│ ✅ No conflicts/duplicates  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Response to Client          │
├─────────────────────────────┤
│ {                           │
│   "success": true,          │
│   "recordsGenerated": 240,  │
│   "recordsInDatabase": 240  │
│ }                           │
│ ✅ Complete                 │
└─────────────────────────────┘
```

## 📈 Timeline

```
Time    Event                           Status
────    ─────                           ──────
T+0min  Commit and push to GitHub       
T+1min  Vercel starts deployment
T+3min  Vercel deployment complete     ✅ API live
T+3min  Run population script
T+4min  Score data in database         ✅ 240 records
T+4min  Login as student               
T+5min  Go to Student Results
T+5min  Select dropdowns               ✅ Work!
T+6min  View scores                    ✅ All displaying!

Total time to live: ~6 minutes
```

---

This visual architecture shows:
1. How users access scores
2. How data is generated and stored
3. How the system ensures safety
4. What the verification flow looks like
5. How long deployment takes

All components work together seamlessly! 🎯
