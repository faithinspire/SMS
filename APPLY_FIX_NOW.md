# ⚡ APPLY FIX NOW - Principal Dashboard (30 seconds)

## The Error You're Seeing

```
GET https://egdreueuspmuxhezdpqm.supabase.co/rest/v1/lesson_notes?select=status 400 (Bad Request)
Error: column lesson_notes.status does not exist
```

## 🚀 Quick Fix (Copy-Paste Method)

### Step 1: Open Supabase
Go to: https://app.supabase.com

### Step 2: SQL Editor
- Click **SQL Editor** in left sidebar
- Click **New Query**

### Step 3: Copy This SQL

```sql
-- Add missing lesson_notes columns
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'SUBMITTED' 
  CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RETURNED'));

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lesson_notes_school_id ON lesson_notes(school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_created_by ON lesson_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_school_status ON lesson_notes(school_id, status);

-- Enable RLS
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Allow all access to lesson_notes" ON lesson_notes;
CREATE POLICY "Allow all access to lesson_notes" ON lesson_notes FOR ALL USING (true);
```

### Step 4: Click Run
Click the **Run** button or press **Ctrl+Enter**

### Step 5: Done! ✅
- Wait for success message
- Refresh your dashboard: http://localhost:3000/principal/dashboard
- All errors should be gone!

---

## ✅ Verify It Worked

### Check 1: Dashboard Loads
Visit: http://localhost:3000/principal/dashboard
- Should load without 400 errors ✅
- Should show statistics ✅

### Check 2: No Console Errors
Press F12 in browser
- Click Console tab
- Should see NO 400 Bad Request errors ✅

### Check 3: SQL Verification (Optional)
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'lesson_notes' 
ORDER BY ordinal_position;
```
Should show: status, reviewed_by, reviewed_at, reviewer_comments ✅

---

## 🎉 What's Fixed

| Before | After |
|--------|-------|
| ❌ 400 Bad Request | ✅ Dashboard loads |
| ❌ No statistics | ✅ Real data shows |
| ❌ Lesson notes error | ✅ Lesson notes work |
| ❌ Can't review | ✅ Can review & approve |

---

## 📁 Need More Details?

- **Complete Guide:** `PRINCIPAL_DASHBOARD_FIX_GUIDE.md`
- **Migration File:** `database/migrations/033_add_lesson_notes_status_columns.sql`
- **Summary:** `FIX_SUMMARY.md`

---

**Time to apply:** ⏱️ 30 seconds
**Difficulty:** 🟢 Easy
**Status:** 🟢 Ready Now

👉 **GO TO SUPABASE AND PASTE THE SQL ABOVE** 👈
