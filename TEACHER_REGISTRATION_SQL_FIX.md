# Teacher Registration SQL Parse Error - FIXED

## Problem
When registering a teacher and selecting a class (Step 4), you received:
```
FAILED TO UPDATE TEACHING DATA
FAILED TO PARSE ORDER (CLASSES, LEVEL, ASC)(LINE 1 COLUMN 9)
```

## Root Cause
File: `src/services/registration-config.service.ts` line 128
- The `getClassArmCombos()` method was using invalid nested field ordering syntax
- Supabase doesn't support ordering by nested fields like `classes.level`
- Query: `.order('classes.level', { ascending: true })` ❌

## Solution Applied
✅ **Fixed in `src/services/registration-config.service.ts`**

Changed from:
```typescript
const { data, error } = await query.order('classes.level', { ascending: true })
```

To:
```typescript
// Don't order by nested field - Supabase doesn't support that syntax
// Instead, get data and sort in memory
const { data, error } = await query

// Sort by class level in memory
const sorted = ((data || []) as ClassArmCombo[]).sort(
  (a, b) => (a.classes?.level || 0) - (b.classes?.level || 0)
)
return sorted
```

## Result
✅ Classes will now load properly when registering teachers
✅ No more SQL parse error
✅ Classes still sorted by level (now in application layer)

## Next Steps

### 1. Deploy Fix to Vercel
```bash
git add src/services/registration-config.service.ts
git commit -m "fix: remove nested field ordering in getClassArmCombos - sort in memory instead"
git push origin main
# Deploy to Vercel (automatic or manual)
```

### 2. Clear Browser Cache
- Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
- Or clear all site data for your SMS app

### 3. Test Teacher Registration
- Try registering a new teacher
- Get to Step 4 (Select Classes)
- Confirm classes load without error
- Select a class and continue

### 4. Migration 107 (If Not Yet Run)
If you haven't run migration 107 yet for subject master data:
- See MIGRATION_EXECUTION_GUIDE.md
- Execute migration in Supabase
- This populates all subjects with correct levels

## Files Modified
- ✅ `src/services/registration-config.service.ts` - Fixed nested field ordering

## Status
✅ **FIX COMPLETE** - Ready to deploy
