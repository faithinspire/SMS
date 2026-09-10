# Rebuild Instructions After tsconfig.json Fix

## What Changed
The `tsconfig.json` was updated to include the missing `@/utils/*` path alias:
```json
"@/utils/*": ["./src/utils/*"]
```

## Why Dev Server Shows 404
The Next.js dev server cached the old build state before the tsconfig change. The compiled chunks weren't regenerated with the new path alias configuration.

## How to Fix

### Option 1: Automatic (Recommended)
Run the included batch script:
```bash
rebuild.bat
```

This will:
1. ✓ Delete `.next` cache folder
2. ✓ Reinstall dependencies
3. ✓ Rebuild the project
4. ✓ Start dev server

### Option 2: Manual Step-by-Step

**Step 1: Open terminal in project root**
```bash
cd c:\Users\OLU\Desktop\SMS
```

**Step 2: Delete cache**
```bash
rmdir /s /q .next
```
(Press `Y` if prompted)

**Step 3: Reinstall dependencies**
```bash
npm install
```

**Step 4: Rebuild**
```bash
npm run build
```

Wait for the build to complete. You should see:
```
✓ Compiled successfully
```

**Step 5: Start dev server**
```bash
npm run dev
```

Wait for the message:
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Step 6: Test**
Navigate to:
- http://localhost:3000/auth/staff/login (should load)
- http://localhost:3000/student/results (should load without module errors)

---

## What to Expect After Rebuild

✅ No more 404 errors on webpack.js, main-app.js, etc.
✅ Login page loads normally
✅ All pages load without module resolution errors
✅ Console shows no "Can't resolve '@/utils/grading'" errors

---

## If Build Still Fails

If you see errors like:
- `Cannot find module '@/utils/grading'`
- `Cannot find module '@/utils/scoring'`

Then:
1. Verify `src/utils/grading.ts` exists: `dir src\utils\grading.ts`
2. Verify `src/utils/scoring.ts` exists: `dir src\utils\scoring.ts`
3. Check `tsconfig.json` has `"@/utils/*": ["./src/utils/*"]` in paths
4. Delete `.next` folder again
5. Run `npm run build` again

---

## How to Verify Fix Worked

After dev server starts, open browser developer console (F12) and check:

**Bad (404 errors):**
```
GET http://localhost:3000/_next/static/chunks/webpack.js 404
GET http://localhost:3000/_next/static/chunks/main-app.js 404
```

**Good (200 status):**
```
GET http://localhost:3000/_next/static/chunks/webpack.js 200
GET http://localhost:3000/_next/static/chunks/main-app.js 200
```

---

## System Architecture

```
tsconfig.json
    ↓ (defines path aliases)
    
@/utils/grading
    ↓ (maps to)
./src/utils/grading.ts
    ↓ (imports from)
result-aggregation.service.ts
    ↓ (used by)
src/app/student/results/page.tsx
src/app/teacher/results-aggregation/page.tsx
```

When tsconfig.json has the mapping, the TypeScript compiler can resolve the imports correctly and Next.js can build the project.

---

## Next Steps After Rebuild

Once dev server is running successfully:

1. **Test module resolution** 
   - Open `/student/results` page
   - Should load without module errors

2. **Test score sheets**
   - Open `/teacher/class-score-sheet` page
   - Open `/teacher/subject-score-sheet` page
   - Should work without errors

3. **Run test scenarios** (Task #15)
   - Subject teacher enters math scores
   - Scores appear in student results automatically
   - Scores appear in class teacher results automatically

4. **Verify 41 requirements** are all met

---

## Summary

| Item | Status |
|------|--------|
| tsconfig.json fix | ✅ Applied |
| Utility files exist | ✅ Verified |
| Path aliases correct | ✅ Verified |
| Dev server running | ❌ Needs rebuild |
| Module resolution | ⏳ Will work after rebuild |

Once you run `rebuild.bat` or follow the manual steps, everything will be working.
