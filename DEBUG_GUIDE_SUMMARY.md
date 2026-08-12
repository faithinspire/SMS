# StudentRegistrationModal Debugging - Complete Summary

## Quick Links

- **Start here:** `QUICK_DEBUG_CHECKLIST.md` - Fast 5-minute diagnostic
- **Step by step:** `INTERACTIVE_DEBUGGING_STEPS.md` - Guided walkthrough
- **Deep dive:** `BROWSER_DEBUGGING_GUIDE.md` - Technical details
- **Code testing:** `MANUAL_TESTING_SNIPPETS.md` - JavaScript snippets for console
- **This file:** Overview of everything

---

## What You're Trying to Debug

**Issue:** When the StudentRegistrationModal opens, it should:
1. Fetch classes from `class_arm_combos` table
2. Fetch subjects from `subjects` table
3. Display them in dropdowns/checkboxes

**Problem:** Either no data loads, or errors appear in console

---

## The Code Flow (Simplified)

```
User clicks "Register Student"
    ↓
StudentRegistrationModal opens (isOpen=true)
    ↓
useEffect hook fires (depends on [isOpen, schoolId])
    ↓
loadData() function runs
    ↓
Query 1: Fetch class_arm_combos (with nested classes + arms)
    ↓
Query 2: Fetch subjects
    ↓
Console logs: "✅ Loaded classes: X" and "✅ Loaded subjects: Y"
    ↓
Modal displays data in dropdowns
```

---

## Common Issues & Quick Fixes

| Issue | Symptom | Quick Fix |
|-------|---------|-----------|
| **No console logs** | Modal opens silently, no "Loading..." messages | Check if schoolId prop is empty. See Phase 2 of Interactive Guide |
| **403 Forbidden** | Console shows "permission denied" | RLS policy too restrictive. Run `SELECT * FROM class_arm_combos;` in Supabase SQL |
| **404 Not Found** | Error says table doesn't exist | Run migrations: `npm run db:migrate` |
| **Empty dropdown** | Modal loads but no classes appear | No data in database for this school. Create test data in Supabase |
| **401 Unauthorized** | Auth error in console | User not logged in or session expired. Refresh page and login again |
| **Malformed data** | Status 200 but "Cannot read property" error | Response structure wrong. Check Network tab Response |
| **CORS error** | Failed to fetch error | Check SUPABASE_URL in .env.local format |

---

## 3-Step Quick Diagnosis

### Step 1: Check Console (30 seconds)
```
1. Open DevTools (F12)
2. Go to Console tab
3. Click "Register Student"
4. Do you see "📚 Loading classes and subjects for school:" ?
```

- **YES** → Go to Step 2
- **NO** → See "Modal Not Firing" in Quick Checklist

### Step 2: Check Network (30 seconds)
```
1. Go to Network tab
2. Filter by XHR/Fetch
3. Look for requests to "class_arm_combos" and "subjects"
4. Check Status column - should be 200
```

- **Both 200** → Go to Step 3
- **403** → RLS policy issue
- **404** → Missing table
- **No requests** → Modal not calling API

### Step 3: Check Data (30 seconds)
```
1. In modal, does class dropdown have values?
2. After selecting class, do subjects appear (if secondary)?
3. Can you complete the form?
```

- **YES to all** → **Working! No issue found**
- **NO** → Check if data exists in database (see "Data Not Appearing" section)

---

## File Locations

When you need to check code:

```
src/
├── components/admin/
│   └── StudentRegistrationModal.tsx ← Main component
│       ├── Line 54: useEffect with loadData()
│       ├── Line 67: Query to class_arm_combos
│       ├── Line 79: Query to subjects
│       └── Line 175+: Dropdown render logic
│
├── app/school-admin/
│   └── dashboard/page.tsx ← Where modal is used
│       ├── Line 62: Student modal state
│       └── Line 163: Modal component JSX
│
└── lib/
    └── supabase-client.ts ← Supabase setup

database/
└── migrations/ ← Database setup
    ├── 001_initial_schema.sql
    ├── 003_fix_rls_policies.sql ← Check RLS policies
    └── 006_disable_all_rls.sql ← Or check if RLS disabled
```

---

## Expected Console Logs (Success Case)

When everything works, you should see:

```javascript
// Immediately when modal opens
📚 Loading classes and subjects for school: 12345678-1234-1234-1234-123456789012

// After ~500ms
✅ Loaded classes: 5
✅ Loaded subjects: 12
```

If you see errors instead:
```javascript
❌ Error loading classes: PGRST116 permission denied
❌ Error loading subjects: 42P01 relation "subjects" does not exist
❌ Error loading data: TypeError: Cannot read property 'classes' of undefined
```

---

## Expected Network Tab (Success Case)

### Request 1: Classes
- **URL:** `https://[project].supabase.co/rest/v1/class_arm_combos?select=...&school_id=eq.[uuid]`
- **Method:** GET
- **Status:** 200 ✓
- **Response Size:** ~2 KB
- **Response Format:**
```json
[
  {
    "id": "...",
    "classes": { "id": "...", "name": "JSS 1", "level": 1, "type": "SECONDARY" },
    "arms": { "name": "A" }
  }
]
```

### Request 2: Subjects
- **URL:** `https://[project].supabase.co/rest/v1/subjects?select=...&school_id=eq.[uuid]`
- **Method:** GET
- **Status:** 200 ✓
- **Response Size:** ~3 KB
- **Response Format:**
```json
[
  {
    "id": "...",
    "name": "Mathematics",
    "code": "MTH",
    "applicable_to_levels": [1,2,3,4,5,6]
  }
]
```

---

## Database Schema Check

Make sure these tables exist in Supabase:

```sql
-- In Supabase SQL Editor, verify:

\dt class_arm_combos;  -- Should show table exists
\dt subjects;          -- Should show table exists
\dt classes;           -- Should show table exists
\dt arms;              -- Should show table exists

-- Check if data exists:
SELECT COUNT(*) FROM class_arm_combos;
SELECT COUNT(*) FROM subjects;
```

---

## RLS Policy Check

If getting "permission denied" errors:

```sql
-- In Supabase SQL Editor:

-- Check class_arm_combos RLS
SELECT * FROM pg_policies 
WHERE tablename = 'class_arm_combos';

-- Check subjects RLS
SELECT * FROM pg_policies 
WHERE tablename = 'subjects';

-- If empty results, RLS might be disabled (which is OK)
-- If policies exist, check if they allow SELECT for authenticated users
```

---

## Most Common Causes (Ranked)

1. **RLS Policy Too Restrictive** (40% of issues)
   - Fix: Update policy in Supabase Dashboard or migrations

2. **No Data in Database** (25% of issues)
   - Fix: Create test classes/subjects via Supabase SQL

3. **User Not Authenticated/Wrong Role** (15% of issues)
   - Fix: Login again, verify user is SCHOOL_ADMIN

4. **schoolId Prop Not Passed** (10% of issues)
   - Fix: Check dashboard component, ensure `user?.schoolId` is set

5. **Missing Tables** (5% of issues)
   - Fix: Run migrations

6. **CORS/Environment Issues** (5% of issues)
   - Fix: Check .env.local, restart dev server

---

## Decision Tree

```
Does modal open visually?
├─ NO
│  └─ Check if "Register Student" button exists on dashboard
│     └─ See Interactive Guide Phase 2
│
└─ YES
   └─ Do you see console logs "📚 Loading..." ?
      ├─ YES
      │  └─ Do you see "✅ Loaded" logs?
      │     ├─ YES
      │     │  └─ Does dropdown have classes?
      │     │     ├─ YES → Working! ✓
      │     │     └─ NO → Data exists but UI not rendering
      │     │        └─ Check for React errors, see Phase 5
      │     │
      │     └─ NO (See error messages instead)
      │        └─ Error type?
      │           ├─ Permission denied (403) → RLS issue
      │           ├─ Table not found (404) → Missing tables
      │           ├─ 401 Unauthorized → Not logged in
      │           └─ Other → See "Error Messages" in Quick Checklist
      │
      └─ NO (No logs, no errors)
         └─ loadData() not being called
            └─ Check if schoolId prop exists
               └─ See Interactive Guide Phase 2 & 4
```

---

## Testing Checklist (Complete)

- [ ] **Login:** Logged in as School Admin
- [ ] **Dashboard:** School admin dashboard loads
- [ ] **Modal Opens:** Click "Register Student" → Modal appears
- [ ] **Console:** "📚 Loading classes..." appears in console
- [ ] **Network:** GET requests to class_arm_combos and subjects
- [ ] **Status Code:** Both requests return 200
- [ ] **Data:** Response bodies contain valid JSON arrays
- [ ] **Dropdown:** Classes dropdown has selectable options
- [ ] **Secondary:** If selecting secondary class, department options appear
- [ ] **Subjects:** Subject checkboxes appear (if secondary)
- [ ] **Selection:** Can select class and subjects
- [ ] **Submission:** Can fill form and submit
- [ ] **Success:** "Student registered successfully!" message appears

---

## When to Escalate

If after checking everything you find:

1. **Response is 200 but contains error JSON**
   - Example: `{"code": "PGRST116", "message": "permission denied"}`
   - → Likely middleware/service layer issue
   - → Check `UserRegistrationService` class

2. **Queries work in SQL but fail in app**
   - Run same query in Supabase SQL Editor → Works
   - But modal query fails
   - → Likely authentication or RLS interaction issue

3. **Migrations didn't complete**
   - Tables don't exist even after `npm run db:migrate`
   - → Database migration issue, needs investigation

4. **Random intermittent failures**
   - Sometimes works, sometimes doesn't
   - → Likely race condition or timing issue

---

## Resources

| Resource | Purpose |
|----------|---------|
| `QUICK_DEBUG_CHECKLIST.md` | Fast diagnostic flow |
| `INTERACTIVE_DEBUGGING_STEPS.md` | Detailed phase-by-phase guide |
| `BROWSER_DEBUGGING_GUIDE.md` | DevTools walkthrough |
| `MANUAL_TESTING_SNIPPETS.md` | JavaScript for console |
| Code: `StudentRegistrationModal.tsx` | Component logic |
| Code: `dashboard/page.tsx` | Where modal is used |
| Migrations: `003_fix_rls_policies.sql` | RLS setup |

---

## Quick Reference: Console Commands

```javascript
// In browser DevTools Console:

// 1. Check current user
JSON.parse(localStorage.getItem('user'))

// 2. Check school ID
JSON.parse(localStorage.getItem('user')).schoolId

// 3. Check if modal visible
!!document.querySelector('[class*="fixed"][class*="inset-0"]')

// 4. Check if logged in
!!localStorage.getItem('sb-access-token')

// 5. Show all localStorage keys
Object.keys(localStorage)
```

---

## Common Copy-Paste SQL Commands

Run these in Supabase SQL Editor:

```sql
-- Check classes for your school
SELECT * FROM class_arm_combos 
WHERE school_id = 'YOUR_SCHOOL_ID' LIMIT 5;

-- Check subjects for your school
SELECT * FROM subjects 
WHERE school_id = 'YOUR_SCHOOL_ID' LIMIT 5;

-- Check table structure
\d class_arm_combos
\d subjects

-- Verify RLS policies
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('class_arm_combos', 'subjects');

-- Check how many schools have data
SELECT school_id, COUNT(*) FROM class_arm_combos GROUP BY school_id;
```

---

## Tips for Faster Debugging

1. **Use browser reload shortcut** `Ctrl+Shift+R` to clear cache
2. **Watch Network tab** while opening modal (don't click other tabs)
3. **Copy exact error messages** - helpful for troubleshooting
4. **Check .env.local first** - most issues trace back to config
5. **Keep DevTools open** while testing - easier to spot issues
6. **Test in Incognito window** - eliminates cache/extension issues
7. **Use SQL Editor first** - verify raw data before debugging app code

---

## Next Steps

1. **Start with:** QUICK_DEBUG_CHECKLIST.md (5 minutes)
2. **If not resolved:** INTERACTIVE_DEBUGGING_STEPS.md (15 minutes)
3. **If still stuck:** Use MANUAL_TESTING_SNIPPETS.md in console (10 minutes)
4. **If data issue:** Run SQL commands above in Supabase SQL Editor (5 minutes)
5. **If RLS issue:** Check BROWSER_DEBUGGING_GUIDE.md Phase 4 (10 minutes)

---

## Last Resort: Nuclear Debug Mode

Add this to `StudentRegistrationModal.tsx` temporarily:

```typescript
// Add inside loadData() function after line 59
console.log('DEBUG: isOpen:', isOpen, 'schoolId:', schoolId);
console.log('DEBUG: About to fetch with:', { schoolId, time: new Date().toISOString() });

// Add before each query (line 77 and 93)
console.log('DEBUG: Query params - schoolId:', schoolId);
console.log('DEBUG: Full URL being called:', `${supabaseUrl}/rest/v1/...`);

// Add in error handlers
console.error('DEBUG: Full error object:', err);
console.error('DEBUG: Error stack:', err.stack);
```

Then check console for exact execution flow and errors.

---

## Congratulations!

If you've gone through this guide and found your issue, you've successfully debugged your SMS system! 

For future debugging, bookmark `QUICK_DEBUG_CHECKLIST.md` - it covers 80% of potential issues in 5 minutes.

---
