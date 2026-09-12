# REBUILD STRATEGY - Building Fixes ONE at a time

## What Just Happened
- Reset Git to 10 commits ago (removed all Phase 1-4 commits)
- This clears any problematic code that was preventing deployment
- Now rebuilding fixes incrementally

## New Strategy: Test After Each Fix

### Phase 1: CBT Dropdowns (ISOLATED FIX)

**Step 1**: Make ONLY the CBT change
- Import CreateCBTForm in page.tsx
- Commit with message: "Phase 1: Add CreateCBTForm import to CBT page"
- Push to Git
- Wait for Vercel deploy
- TEST in app
- If working → Continue to Phase 2
- If NOT working → Fix the issue before proceeding

**Step 2**: If Phase 1 works, do Phase 2

### Phase 2: SuperAdmin Delete (ISOLATED FIX)

**Step 1**: Make ONLY the SuperAdmin changes
- Add auth header in SchoolsList.tsx
- Fix delete route array check
- Commit with message: "Phase 2: Fix SuperAdmin delete endpoint"
- Push to Git
- Wait for Vercel deploy
- TEST delete function
- If working → Continue to Phase 3
- If NOT working → Fix before proceeding

### Phase 3: PRIMARY Subjects (DATABASE ONLY)
- Create migration 105
- Commit and push
- **NOTE**: This won't affect UI, only database

### Phase 4: CBT Auto-Population (DATABASE + SMALL CODE CHANGE)
- Update CBT submit route
- Create migration 106
- Test separately

---

## Why This Works

By testing after EACH fix:
- ✅ Identify EXACTLY which commit breaks things
- ✅ Fix problems immediately
- ✅ Never deploy broken code
- ✅ Each fix is verified before moving to next

---

## Current Status

- ✅ Git reset to clean state
- ⏳ Waiting for you to confirm
- ⏳ Then will rebuild Phase 1 with full testing

**Next: Rebuild Phase 1 only, test it completely, then move to Phase 2**
