# Apply Migration 033 - Add Lesson Notes Status Columns

## ⚠️ CRITICAL FIX FOR PRINCIPAL DASHBOARD

The Principal Dashboard is currently broken because the `lesson_notes` table is missing the following columns that the code tries to access:
- `status` - tracking lesson note status (SUBMITTED, UNDER_REVIEW, APPROVED, RETURNED)
- `reviewed_by` - the user who reviewed the lesson note
- `reviewed_at` - when it was reviewed
- `reviewer_comments` - feedback from the reviewer

## 🚀 How to Apply

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project: https://app.supabase.com
2. Navigate to the **SQL Editor**
3. Create a new query
4. Copy and paste the SQL below
5. Click "Run"

### Option 2: Using Supabase CLI
```bash
supabase db push
```

## 📝 SQL to Execute

```sql
-- Add missing columns to lesson_notes table for review workflow
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'SUBMITTED' 
  CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'RETURNED'));

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lesson_notes_school_id ON lesson_notes(school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_created_by ON lesson_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_school_status ON lesson_notes(school_id, status);

-- Ensure RLS is enabled
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

-- Create policy if not exists
DROP POLICY IF EXISTS "Allow all access to lesson_notes" ON lesson_notes;
CREATE POLICY "Allow all access to lesson_notes" ON lesson_notes FOR ALL USING (true);
```

## ✅ What This Fixes

After applying this migration:

1. ✅ The error `column lesson_notes.status does not exist` will be resolved
2. ✅ Principal Dashboard will load without 400 errors
3. ✅ Lesson note review workflow will function properly
4. ✅ Teachers can submit lesson notes
5. ✅ Principals can review, approve, or return lesson notes
6. ✅ Dashboard statistics will display correctly

## 📊 Database Changes

### New Columns Added:
| Column | Type | Purpose |
|--------|------|---------|
| `status` | TEXT | Tracks the status of the lesson note (SUBMITTED, UNDER_REVIEW, APPROVED, RETURNED) |
| `reviewed_by` | UUID | References the user (principal) who reviewed it |
| `reviewed_at` | TIMESTAMP | When the lesson note was reviewed |
| `reviewer_comments` | TEXT | Feedback/comments from the reviewer |

### Indexes Created:
- `idx_lesson_notes_school_id` - Speed up school-based queries
- `idx_lesson_notes_status` - Speed up status filtering
- `idx_lesson_notes_created_by` - Speed up teacher-based queries
- `idx_lesson_notes_school_status` - Speed up combined school + status queries

## 🔐 RLS Policies

A permissive RLS policy has been created to allow all access (as per your existing database design).

## 🎯 After Migration

The Principal Dashboard will now:
- ✅ Load all statistics correctly
- ✅ Display pending lesson notes
- ✅ Allow reviewing lesson notes
- ✅ Track approval status
- ✅ Show reviewer comments

## 📋 Verification

After applying the migration, verify by checking the table structure in Supabase:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'lesson_notes' 
ORDER BY ordinal_position;
```

You should see these new columns in the results.
