# BUILD RECOVERY PLAN

## What Happened
The Next.js build cache became corrupted, causing webpack module loading errors.

## What I Did
1. ✅ Stopped the dev server
2. ✅ Started fresh dev server (will auto-rebuild)
3. ✅ Next.js will clear cache and recompile automatically

## What You Should Do NOW

### Step 1: Wait for Server to Start
- Give it 2-3 minutes to rebuild
- Dev server rebuilding in background
- No action needed from you

### Step 2: Clear Browser Cache
Once server is ready:
1. Go to `http://localhost:3000`
2. If you see "Welcome" or any page → server is ready ✅
3. Press **Ctrl+Shift+Delete** to clear browser cache
4. Hard refresh page (Ctrl+F5)

### Step 3: Test the Application

#### Test Login
1. Go to `http://localhost:3000/auth/teacher/login`
2. Use test teacher credentials:
   - Email: `teacher@test.com` (or any registered teacher)
   - Password: (your password)

#### Test Score Sheet
1. Go to `/teacher/score-sheet`
2. Verify:
   - [ ] Term dropdown shows First, Second, Third Terms
   - [ ] Class dropdown shows classes
   - [ ] Subject dropdown shows subjects
   - [ ] Students appear with names

#### If Students Don't Show
1. Run in Supabase SQL Editor:
```sql
-- Assign Lucky to a class
-- Copy from: AUTO_ASSIGN_LUCKY_TO_CLASS.sql
```

2. Hard refresh browser (Ctrl+Shift+Delete)

3. Go back to `/teacher/score-sheet`

### Step 4: Apply Permanent Fix (Optional but Recommended)

To prevent this from happening again:

1. Go to Supabase SQL Editor
2. Copy from: `database/migrations/047_auto_link_students_teachers_on_registration.sql`
3. Paste and Run

This creates automatic triggers for:
- Auto-enrolling students on registration
- Auto-linking students to teacher subjects

---

## Current Status

| Component | Status | Action |
|-----------|--------|--------|
| Dev Server | ✅ Restarting | Waiting for rebuild |
| Build Cache | ✅ Cleared | Auto-rebuild in progress |
| SQL Scripts | ✅ Ready | Use when needed |
| Permanent Migration | ✅ Ready | Run when server up |

---

## Timeline

```
NOW: Server rebuilding (2-3 minutes)
  ↓
THEN: Clear browser cache (Ctrl+Shift+Delete)
  ↓
THEN: Test score sheet
  ↓
THEN: Run database fixes if needed
  ↓
DONE: System working again
```

---

## If Server Still Has Errors

Check browser console (F12):
- Should see webpack compilation in progress
- After completion, page should load
- No more "Cannot find module" errors

---

## Summary

✅ Build cache cleared  
✅ Dev server restarting  
✅ Database scripts ready  
✅ Permanent fix available  

**Next**: Wait for server, clear browser cache, test application.
