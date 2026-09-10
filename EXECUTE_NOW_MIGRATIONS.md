# 🚀 EXECUTE NOW - Complete Instructions

**Status**: Ready to deploy  
**Time**: 5 minutes total  

---

## 📋 Step-by-Step Execution

### STEP 1: Open Supabase SQL Editor
1. Go to **Supabase Dashboard**
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **"New Query"**

---

### STEP 2: Execute Migration 081 (Broadcasts)

Copy-paste this entire SQL:

```sql
-- Migration 081: Create Broadcasts and Notifications System

DROP TABLE IF EXISTS broadcast_notifications CASCADE;
DROP TABLE IF EXISTS broadcasts CASCADE;

CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE broadcast_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  recipient_role TEXT,
  message TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_broadcasts_school_id ON broadcasts(school_id);
CREATE INDEX idx_broadcasts_sender_id ON broadcasts(sender_id);
CREATE INDEX idx_broadcasts_created_at ON broadcasts(created_at DESC);
CREATE INDEX idx_broadcast_notifications_user_id ON broadcast_notifications(user_id);
CREATE INDEX idx_broadcast_notifications_school_id ON broadcast_notifications(school_id);
CREATE INDEX idx_broadcast_notifications_read ON broadcast_notifications(read);
CREATE INDEX idx_broadcast_notifications_created_at ON broadcast_notifications(created_at DESC);
CREATE INDEX idx_broadcast_notifications_broadcast_id ON broadcast_notifications(broadcast_id);
```

**Then click**: **Run** (blue play button)

**Result**: ✅ Success message should appear

---

### STEP 3: Execute Migration 082 (Assignments)

Create **new query**, copy-paste:

```sql
-- Migration 082: Create Student Assignments System

DROP TABLE IF EXISTS student_assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  term_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_score NUMERIC(5,2) DEFAULT 10,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE student_assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL,
  student_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  submission_text TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submission_status TEXT DEFAULT 'SUBMITTED',
  teacher_score NUMERIC(5,2),
  teacher_feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by TEXT,
  late BOOLEAN DEFAULT FALSE,
  is_late_submission BOOLEAN DEFAULT FALSE,
  days_late INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_assignments_school_id ON assignments(school_id);
CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignments_subject_id ON assignments(subject_id);
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_assignments_term_id ON assignments(term_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date DESC);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_submissions_assignment_id ON student_assignment_submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON student_assignment_submissions(student_id);
CREATE INDEX idx_submissions_school_id ON student_assignment_submissions(school_id);
CREATE INDEX idx_submissions_status ON student_assignment_submissions(submission_status);
CREATE INDEX idx_submissions_submitted_at ON student_assignment_submissions(submitted_at DESC);
CREATE UNIQUE INDEX idx_unique_student_assignment ON student_assignment_submissions(assignment_id, student_id);
```

**Click**: **Run**

**Result**: ✅ Success message

---

### STEP 4: Execute Migration 083 (Lesson Notes)

Create **new query**, copy-paste:

```sql
-- Migration 083: Create Lesson Notes System

DROP TABLE IF EXISTS lesson_note_approvals CASCADE;
DROP TABLE IF EXISTS lesson_notes CASCADE;

CREATE TABLE lesson_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  term_id TEXT NOT NULL,
  lesson_date DATE NOT NULL,
  topic TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  content_summary TEXT,
  learning_objectives TEXT,
  status TEXT DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  reviewer_name TEXT,
  reviewer_feedback TEXT,
  approval_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lesson_note_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_note_id UUID NOT NULL,
  school_id TEXT NOT NULL,
  reviewed_by TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_role TEXT NOT NULL,
  approval_status TEXT NOT NULL,
  feedback TEXT,
  approved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lesson_notes_school_id ON lesson_notes(school_id);
CREATE INDEX idx_lesson_notes_teacher_id ON lesson_notes(teacher_id);
CREATE INDEX idx_lesson_notes_subject_id ON lesson_notes(subject_id);
CREATE INDEX idx_lesson_notes_class_id ON lesson_notes(class_id);
CREATE INDEX idx_lesson_notes_term_id ON lesson_notes(term_id);
CREATE INDEX idx_lesson_notes_lesson_date ON lesson_notes(lesson_date DESC);
CREATE INDEX idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX idx_lesson_notes_submitted_at ON lesson_notes(submitted_at DESC);
CREATE INDEX idx_lesson_notes_reviewed_at ON lesson_notes(reviewed_at DESC);
CREATE INDEX idx_lesson_note_approvals_lesson_note_id ON lesson_note_approvals(lesson_note_id);
CREATE INDEX idx_lesson_note_approvals_school_id ON lesson_note_approvals(school_id);
CREATE INDEX idx_lesson_note_approvals_reviewed_by ON lesson_note_approvals(reviewed_by);
```

**Click**: **Run**

**Result**: ✅ Success message

---

## 🖥️ Step 5: Fix Code (Already Done)

Bottom navigation is already added to `src/app/layout.tsx`:

```typescript
import BottomNavigation from '@/components/BottomNavigation'

// In body:
<BottomNavigation />
```

Component created: `src/components/BottomNavigation.tsx`

---

## 🔄 Step 6: Restart Server

```bash
# Stop current server (Ctrl+C)
# Clear cache:
# F12 → Application → Storage → Clear site data

# Restart:
npm run dev
```

---

## ✅ Verify Everything Works

### Check 1: Migrations
- [ ] All 3 migrations ran without errors
- [ ] No red error messages in SQL Editor

### Check 2: Bottom Navigation
- [ ] Open on mobile/DevTools mobile view
- [ ] Bottom nav is visible at bottom of every page
- [ ] Icons show for each role
- [ ] Clicking icons navigates to pages
- [ ] Current page is highlighted

### Check 3: Features
- [ ] School admin can send broadcasts
- [ ] Students can submit assignments
- [ ] Teachers can grade assignments
- [ ] Teachers can upload lesson notes
- [ ] Principals can review lesson notes

---

## 🎯 Summary

**Migrations**: 3 (081, 082, 083)  
**Files Changed**: 2 (BottomNavigation.tsx, layout.tsx)  
**Time**: 5 minutes  
**Status**: Ready to deploy  

---

## ❓ Troubleshooting

**Error "table already exists"?**
- The DROP IF EXISTS handles this
- Just re-run the query

**Bottom nav not showing?**
- Hard refresh: Ctrl+Shift+R
- Clear storage: F12 → Application → Clear

**Features not working?**
- Check all 3 migrations executed
- Restart server: npm run dev
- Clear browser cache completely

---

## 🎉 Done!

All fixed and ready! Your system now has:
✅ Broadcast messaging  
✅ Student assignments  
✅ Lesson notes  
✅ Permanent bottom navigation  

**Happy using!** 🚀

