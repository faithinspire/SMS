# 🔧 COPY & PASTE THIS SQL INTO SUPABASE

## ⚠️ IMPORTANT: Use Migration 090, NOT 089

The previous migration (089) had a syntax error. Use this one instead.

---

## Instructions:

1. **Open Supabase** → https://supabase.com
2. **Go to:** SQL Editor
3. **Click:** New Query
4. **Copy everything below** (from `ALTER` to the last `;`)
5. **Paste into Supabase**
6. **Click:** Execute (▶ button)
7. **Wait for:** ✅ Success message

---

## Copy This Entire SQL Block:

```sql
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'SUBMITTED';
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS reviewer_comments TEXT;
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE lesson_notes ADD COLUMN IF NOT EXISTS content TEXT;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_marks NUMERIC(5,2);
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  submission_text TEXT,
  submission_files JSONB,
  file_path TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_late BOOLEAN DEFAULT FALSE,
  marks_awarded NUMERIC(5,2),
  feedback TEXT,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_notes_status ON lesson_notes(status);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_reviewed_by ON lesson_notes(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_lesson_notes_submitted_at ON lesson_notes(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_created_by ON assignments(created_by);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_school_id ON assignment_submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_submitted_at ON assignment_submissions(submitted_at DESC);

UPDATE lesson_notes SET created_at = NOW() WHERE created_at IS NULL;
UPDATE assignments SET created_at = NOW() WHERE created_at IS NULL;
UPDATE lesson_notes SET status = 'SUBMITTED' WHERE status IS NULL;
UPDATE assignments SET status = 'ACTIVE' WHERE status IS NULL;

DO $$ 
BEGIN
  ALTER TABLE lesson_notes ADD CONSTRAINT fk_lesson_notes_reviewed_by 
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;
```

---

## Expected Result:

✅ **Query successful** (no errors)

If you see that message, the schema is fixed!

---

## Next Steps After Execution:

1. Close Supabase
2. Go to terminal
3. Run:
```bash
taskkill /F /IM node.exe
npm run dev
```

4. Test:
   - Go to http://localhost:3001/teacher/lesson-notes
   - Forms should work ✅

---

**That's it! The database is now fixed.**
