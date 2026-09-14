# 👉 READ THIS NOW - Fix Your "TERM NOT FOUND" Error

**Problem You're Having**: Creating CBT throws "INVALID TERM ID: TERM NOT FOUND IN EITHER ACADEMIC_TERMS OR TERMS TABLE"

**Reason**: Migration 106 was not executed in Supabase, so terms table is empty

**Time to Fix**: 1-2 minutes

---

## DO THIS RIGHT NOW (Pick One)

### ⚡ OPTION 1: QUICK FIX (Fastest)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. **Copy and paste this SQL:**

```sql
INSERT INTO terms (id, school_id, name, session_year, start_date, end_date, is_current, created_at)
SELECT 
  gen_random_uuid(),
  s.id,
  term_name,
  2023,
  start_d,
  end_d,
  TRUE,
  NOW()
FROM schools s
CROSS JOIN (
  VALUES 
    ('First Term'::text, '2023-09-01'::date, '2023-11-30'::date),
    ('Second Term'::text, '2023-12-01'::date, '2024-02-28'::date),
    ('Third Term'::text, '2024-03-01'::date, '2024-05-31'::date)
) AS t(term_name, start_d, end_d)
WHERE NOT EXISTS (
  SELECT 1 FROM terms 
  WHERE school_id = s.id AND name = t.term_name AND session_year = 2023
)
ON CONFLICT DO NOTHING;

SELECT COUNT(*) as total_terms FROM terms;
```

5. Click the green **Run** button
6. You should see `total_terms: 3` (or more if already existed)

✅ **DONE!** Now refresh your browser and try creating CBT again

---

### 🔧 OPTION 2: COMPLETE FIX (Recommended for long-term)

1. Open file: `database/migrations/106_phase1_critical_fixes.sql`
2. **Copy ALL the content** (entire file)
3. Go to Supabase → SQL Editor → New Query
4. **Paste** the entire migration
5. Click **Run**
6. Verify success message appears

✅ **DONE!** This also sets up auto-triggers and data integrity checks

---

## Verify It Worked

1. Refresh your browser
2. Go to **Teacher → CBT**
3. Click **Create New Exam**
4. In the "Academic Term" dropdown, you should now see:
   - ✅ First Term
   - ✅ Second Term
   - ✅ Third Term

5. If you see them → **Pick one and create the exam!**

---

## What Changed in Code

**File**: `src/services/cbt-management.service.ts`
- Added term validation BEFORE creating exam
- Now gives you a helpful error message if terms don't exist
- All changes already deployed to Vercel

---

## Git Status

✅ All fixes committed and pushed to main
✅ Vercel automatically deploying
✅ Ready for you to execute SQL in Supabase

---

**That's it! Execute Option 1 or 2 above and you're done. 🚀**

For complete troubleshooting, see `CRITICAL_FIX_TERMS_NOT_FOUND.md`
