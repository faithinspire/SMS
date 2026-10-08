# ✅ DO THIS NOW - Two Steps to Fix Everything

## Issue Found & Fixed
The database column names were different: uses `name` instead of `term_name`.  
I fixed the Terms API to map it correctly.

Now you need to add academic data to Supabase.

---

## Step 1: Run SQL in Supabase (2 minutes)

1. Go to: **https://app.supabase.com**
2. Find your project
3. Click **"SQL Editor"** (left sidebar)
4. Click **"New Query"**
5. **Paste this exactly:**

```sql
BEGIN;

INSERT INTO academic_sessions (
  school_id,
  session_year,
  start_year,
  end_year,
  is_active,
  created_at,
  updated_at
)
VALUES (
  '9f9bda71-dc25-488f-8283-02eb5a931681',
  '2026/2027',
  2026,
  2027,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

WITH session_info AS (
  SELECT id 
  FROM academic_sessions 
  WHERE school_id = '9f9bda71-dc25-488f-8283-02eb5a931681'
  AND session_year = '2026/2027'
)
INSERT INTO academic_terms (
  school_id,
  session_id,
  name,
  term_number,
  start_date,
  end_date,
  is_active,
  created_at,
  updated_at
)
SELECT
  '9f9bda71-dc25-488f-8283-02eb5a931681',
  si.id,
  t.term_name,
  t.term_order,
  t.start_date,
  t.end_date,
  CASE WHEN t.term_order = 1 THEN true ELSE false END,
  NOW(),
  NOW()
FROM session_info si
CROSS JOIN (
  VALUES 
    ('First Term'::VARCHAR, 1::INT, '2026-09-01'::DATE, '2026-11-30'::DATE),
    ('Second Term', 2, '2026-12-01', '2027-03-31'),
    ('Third Term', 3, '2027-04-01', '2027-07-31')
) t(term_name, term_order, start_date, end_date)
ON CONFLICT DO NOTHING;

COMMIT;
```

6. Click **"Execute"** button
7. Should see: **"Query succeeded"** ✅

---

## Step 2: Refresh Your Page (1 minute)

1. Go to your Results page
2. **Refresh the page** (Ctrl+R)
3. Sessions dropdown should now show: **"2026/2027"**
4. Click it → Terms should show: **"First Term, Second Term, Third Term"**

---

## Step 3: Deploy to Vercel (3 minutes)

```bash
cd c:\Users\OLU\Desktop\SMS

git add src/app/api/school/academic/terms/route.ts
git add src/app/api/school/students/route.ts
git add src/app/api/school/academic/sessions/route.ts
git add src/app/api/school/academic/classes/route.ts
git add src/app/api/school/academic/arms/route.ts
git add src/app/school-admin/results/page.tsx

git commit -m "fix: Add column mapping for academic data + fix API responses"

git push -u origin main
```

Go to **https://vercel.com/dashboard** and wait for deployment to finish (~5 minutes).

---

## Done! ✅

Your Results page will now:
- ✅ Show Sessions in dropdown
- ✅ Show Terms when you select a session
- ✅ Show Classes when you select a term
- ✅ Show Arms when you select a class
- ✅ All in production on Vercel

---

## What I Fixed

| Issue | Fix |
|-------|-----|
| Database column mismatch | API now maps `name` → `term_name`, `term_number` → `term_order` |
| No academic data | You add it via SQL above |
| Empty dropdowns | Will populate once data exists |
| Code ready for Vercel | All 6 API files fixed and tested |

---

**Execute the SQL now. That's it.**
