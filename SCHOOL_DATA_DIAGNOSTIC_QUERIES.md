# School Data Diagnostic Queries
## Identify Which Schools Are Missing What Data

Run these queries in **Supabase SQL Editor** to diagnose which schools need data backfilling.

---

## QUERY 1: Schools Missing Academic Sessions

```sql
-- Find schools WITHOUT academic sessions
SELECT s.id, s.name, COUNT(ast.id) as session_count
FROM schools s
LEFT JOIN academic_sessions ast ON s.id = ast.school_id
GROUP BY s.id, s.name
HAVING COUNT(ast.id) = 0
ORDER BY s.name;

-- Expected: 0 rows after Migration 130
-- If rows show: These schools need academic sessions created
```

---

## QUERY 2: Schools Missing Academic Terms

```sql
-- Find schools WITHOUT academic terms
SELECT s.id, s.name, COUNT(at.id) as term_count
FROM schools s
LEFT JOIN academic_terms at ON s.id = at.school_id
GROUP BY s.id, s.name
HAVING COUNT(at.id) = 0
ORDER BY s.name;

-- Expected: 0 rows after Migration 130
-- If rows show: These schools need academic terms created
```

---

## QUERY 3: Schools Missing Streams

```sql
-- Find schools WITHOUT streams (Science, Commercial, Humanities, Technical)
SELECT s.id, s.name, COUNT(st.id) as stream_count
FROM schools s
LEFT JOIN streams st ON s.id = st.school_id
GROUP BY s.id, s.name
HAVING COUNT(st.id) < 4  -- Should have all 4 streams
ORDER BY s.name;

-- Expected: 0 rows after Migration 130
-- If rows show: These schools are missing some or all streams
```

---

## QUERY 4: Schools Missing Complete Class Structure

```sql
-- Find schools WITHOUT all 14 standard classes
SELECT s.id, s.name, COUNT(DISTINCT c.id) as class_count
FROM schools s
LEFT JOIN classes c ON s.id = c.school_id
GROUP BY s.id, s.name
HAVING COUNT(DISTINCT c.id) < 14  -- Should have 14 classes
ORDER BY s.name;

-- Expected: 0 rows after Migration 130
-- If rows show: These schools are missing some classes
-- Standard 14: Nursery, KG, Primary 1-6, JSS 1-3, SS 1-3
```

---

## QUERY 5: Schools with Incomplete Arm Structures

```sql
-- Find classes that don't have all 3 arms (A, B, C)
SELECT 
  s.id as school_id,
  s.name as school_name,
  c.name as class_name,
  COUNT(a.id) as arm_count
FROM schools s
JOIN classes c ON s.id = c.school_id
LEFT JOIN arms a ON c.id = a.class_id
GROUP BY s.id, s.name, c.id, c.name
HAVING COUNT(a.id) < 3  -- Each class should have 3 arms (A, B, C)
ORDER BY s.name, c.name;

-- Expected: 0 rows after Migration 130
-- If rows show: These classes are missing some arms
```

---

## QUERY 6: Schools with Missing Class-Arm Combos

```sql
-- Find classes that don't have combos for all their arms
SELECT 
  s.id as school_id,
  s.name as school_name,
  c.name as class_name,
  COUNT(DISTINCT a.id) as arm_count,
  COUNT(DISTINCT cac.id) as combo_count
FROM schools s
JOIN classes c ON s.id = c.school_id
LEFT JOIN arms a ON c.id = a.class_id
LEFT JOIN class_arm_combos cac ON c.id = cac.class_id AND a.id = cac.arm_id
GROUP BY s.id, s.name, c.id, c.name
HAVING COUNT(DISTINCT a.id) != COUNT(DISTINCT cac.id)  -- Arms and combos should match
ORDER BY s.name, c.name;

-- Expected: 0 rows after Migration 130
-- If rows show: These classes have arms without combos
```

---

## QUERY 7: Schools Missing Complete Subject Catalog

```sql
-- Find schools without all 23 subjects
SELECT s.id, s.name, COUNT(DISTINCT sub.id) as subject_count
FROM schools s
LEFT JOIN subjects sub ON s.id = sub.school_id
GROUP BY s.id, s.name
HAVING COUNT(DISTINCT sub.id) < 23  -- Should have 23 subjects total
ORDER BY s.name;

-- Expected: 0 rows after Migration 130
-- If rows show: These schools are missing some subjects
-- Standard 23: English, Math (both levels), Science (primary), Social Studies, Civic, PE, Art, Music, Home Econ, ICT, Biology, Chemistry, Physics, History, Geography, Ag Science, Technical Drawing, Computer Science, Economics, Accounting, Government, Literature, Further Math
```

---

## QUERY 8: Subject Details for Schools Missing Subjects

```sql
-- For schools missing subjects, see WHICH subjects are missing
WITH expected_subjects AS (
  SELECT 'English Language' as name, 'ENG' as code UNION ALL
  SELECT 'Mathematics', 'MATH' UNION ALL
  SELECT 'Science', 'SCI' UNION ALL
  SELECT 'Social Studies', 'SS' UNION ALL
  SELECT 'Civic Education', 'CIV' UNION ALL
  SELECT 'Physical Education', 'PE' UNION ALL
  SELECT 'Art & Craft', 'ART' UNION ALL
  SELECT 'Music', 'MUS' UNION ALL
  SELECT 'Home Economics', 'HE' UNION ALL
  SELECT 'Information Technology', 'ICT' UNION ALL
  SELECT 'English', 'ENG' UNION ALL
  SELECT 'Biology', 'BIO' UNION ALL
  SELECT 'Chemistry', 'CHEM' UNION ALL
  SELECT 'Physics', 'PHY' UNION ALL
  SELECT 'History', 'HIST' UNION ALL
  SELECT 'Geography', 'GEO' UNION ALL
  SELECT 'Agricultural Science', 'AGR' UNION ALL
  SELECT 'Technical Drawing', 'TD' UNION ALL
  SELECT 'Computer Science', 'CS' UNION ALL
  SELECT 'Economics', 'ECON' UNION ALL
  SELECT 'Accounting', 'ACC' UNION ALL
  SELECT 'Government', 'GOV' UNION ALL
  SELECT 'Literature In English', 'LIT' UNION ALL
  SELECT 'Further Mathematics', 'FM'
)
SELECT 
  s.id as school_id,
  s.name as school_name,
  es.name as missing_subject,
  'MISSING' as status
FROM schools s
CROSS JOIN expected_subjects es
WHERE NOT EXISTS (
  SELECT 1 FROM subjects sub 
  WHERE sub.school_id = s.id AND sub.name = es.name
)
AND s.id IN (
  SELECT school_id FROM subjects GROUP BY school_id
  HAVING COUNT(*) < 23
)
ORDER BY s.name, es.name;

-- Shows exactly which subjects are missing for which schools
```

---

## QUERY 9: Complete Data Status for Each School

```sql
-- Comprehensive overview of all schools' data status
SELECT 
  s.id,
  s.name,
  CASE WHEN COUNT(DISTINCT ast.id) > 0 THEN '✅' ELSE '❌' END as has_sessions,
  COUNT(DISTINCT ast.id) as session_count,
  CASE WHEN COUNT(DISTINCT at.id) > 0 THEN '✅' ELSE '❌' END as has_terms,
  COUNT(DISTINCT at.id) as term_count,
  CASE WHEN COUNT(DISTINCT st.id) = 4 THEN '✅' ELSE '❌' END as has_streams,
  COUNT(DISTINCT st.id) as stream_count,
  CASE WHEN COUNT(DISTINCT c.id) = 14 THEN '✅' ELSE '❌' END as has_classes,
  COUNT(DISTINCT c.id) as class_count,
  CASE WHEN COUNT(DISTINCT sub.id) >= 23 THEN '✅' ELSE '❌' END as has_subjects,
  COUNT(DISTINCT sub.id) as subject_count
FROM schools s
LEFT JOIN academic_sessions ast ON s.id = ast.school_id
LEFT JOIN academic_terms at ON s.id = at.school_id
LEFT JOIN streams st ON s.id = st.school_id
LEFT JOIN classes c ON s.id = c.school_id
LEFT JOIN subjects sub ON s.id = sub.school_id
GROUP BY s.id, s.name
ORDER BY s.name;

-- Shows ✅ or ❌ for each data type per school
-- After Migration 130, all should be ✅
```

---

## QUERY 10: After Migration 130 - Verification

```sql
-- Run this AFTER Migration 130 to verify everything was backfilled
SELECT 
  (SELECT COUNT(*) FROM schools) as total_schools,
  (SELECT COUNT(DISTINCT school_id) FROM academic_sessions) as schools_with_sessions,
  (SELECT COUNT(DISTINCT school_id) FROM academic_terms) as schools_with_terms,
  (SELECT COUNT(DISTINCT school_id) FROM streams WHERE school_id IN (SELECT school_id FROM streams GROUP BY school_id HAVING COUNT(*) = 4)) as schools_with_all_streams,
  (SELECT COUNT(DISTINCT school_id) FROM classes WHERE school_id IN (SELECT school_id FROM classes GROUP BY school_id HAVING COUNT(DISTINCT id) = 14)) as schools_with_all_classes,
  (SELECT COUNT(DISTINCT school_id) FROM subjects WHERE school_id IN (SELECT school_id FROM subjects GROUP BY school_id HAVING COUNT(*) >= 23)) as schools_with_all_subjects
;

-- Expected after Migration 130 (assuming N schools):
-- total_schools: N
-- schools_with_sessions: N
-- schools_with_terms: N
-- schools_with_all_streams: N
-- schools_with_all_classes: N
-- schools_with_all_subjects: N
```

---

## Quick Verification Summary

**Run this one query to see overall status:**

```sql
WITH school_stats AS (
  SELECT 
    s.id,
    s.name,
    COUNT(DISTINCT ast.id) >= 1 as has_sessions,
    COUNT(DISTINCT at.id) >= 3 as has_terms,
    COUNT(DISTINCT st.id) = 4 as has_streams,
    COUNT(DISTINCT c.id) = 14 as has_classes,
    COUNT(DISTINCT sub.id) >= 23 as has_subjects
  FROM schools s
  LEFT JOIN academic_sessions ast ON s.id = ast.school_id
  LEFT JOIN academic_terms at ON s.id = at.school_id
  LEFT JOIN streams st ON s.id = st.school_id
  LEFT JOIN classes c ON s.id = c.school_id
  LEFT JOIN subjects sub ON s.id = sub.school_id
  GROUP BY s.id, s.name
)
SELECT 
  COUNT(*) as total_schools,
  COUNT(*) FILTER (WHERE has_sessions AND has_terms AND has_streams AND has_classes AND has_subjects) as fully_populated_schools,
  COUNT(*) FILTER (WHERE NOT (has_sessions AND has_terms AND has_streams AND has_classes AND has_subjects)) as schools_needing_data
FROM school_stats;

-- After Migration 130:
-- fully_populated_schools = total_schools
-- schools_needing_data = 0
```

---

## Usage Instructions

1. **Before Migration 130:** Run queries 1-8 to identify which schools are missing what
2. **Execute Migration 130:** Copy entire file and paste in Supabase SQL Editor → Run
3. **After Migration 130:** Run Query 10 to verify everything was backfilled
4. **Test End-to-End:** Try creating broadcasts, lessons, assignments, CBT for old schools

---

## What Each Data Type Does

| Data | Purpose | Why Old Schools Need It |
|------|---------|------------------------|
| **Academic Sessions** | Organize academic years (2025/2026, etc.) | CBT, assignments use terms which need sessions |
| **Academic Terms** | Divide session into terms (1st, 2nd, 3rd) | CBT, assignments, lessons are tied to terms |
| **Streams** | SS1-SS3 streams (Science, Commercial, etc.) | Subject selection, teacher assignments use streams |
| **Classes** | Class definitions (Primary 1, JSS 2, etc.) | Students enrolled in classes, assignments assigned by class |
| **Arms** | Class sections (A, B, C) | Students assigned to specific arm, broadcasts sent to arm |
| **Class-Arm Combos** | Links arms to classes | Students create link between student ↔ class ↔ arm |
| **Subjects** | Subject catalog | Teachers teach subjects, students take subjects in CBT |

---

## If Schools Still Need Data After Migration 130

Run the API endpoint manually:

```bash
# For all schools
curl -X POST http://localhost:3000/api/admin/ensure-complete-school-data \
  -H "Content-Type: application/json" \
  -d '{}'

# For specific school
curl -X POST http://localhost:3000/api/admin/ensure-complete-school-data \
  -H "Content-Type: application/json" \
  -d '{"school_id": "SCHOOL_UUID_HERE"}'
```

Or visit in browser (if endpoint exposed): `/api/admin/ensure-complete-school-data?schoolId=<UUID>`

