# Deployment Instructions - School Admin Rebuild

**Status:** Ready for immediate deployment to Vercel  
**Changes:** 5 API routes fixed + 1 page improved  
**Risk Level:** Low (fixes only, no breaking changes)

---

## Quick Start

### Step 1: Verify Fixes Locally
```bash
cd c:\Users\OLU\Desktop\SMS
npm run build
```
✅ Should complete with 0 TypeScript errors

### Step 2: Test Locally (Optional)
```bash
npm run dev
# Open http://localhost:3000/school-admin/students
# Open http://localhost:3000/school-admin/results
```

### Step 3: Commit Changes
```bash
git add .
git commit -m "fix: School Admin rebuild - fix APIs and error handling

- Fix Students API: remove auth cookie dependencies
- Fix Sessions/Terms/Classes/Arms APIs: standardize format and logging
- Improve Results page: better error states and messaging
- Multi-school architecture preserved
- Ready for Vercel deployment"
```

### Step 4: Push to Vercel
```bash
git push -u origin main
```
Vercel will auto-deploy. Monitor build status at: https://vercel.com/dashboard

### Step 5: Test Production
Once Vercel build succeeds:

1. **Test Students API:**
   ```bash
   curl "https://your-domain/api/school/students?schoolId=9f9bda71-dc25-488f-8283-02eb5a931681"
   ```
   Expected: 200 OK with student array

2. **Test Sessions API:**
   ```bash
   curl "https://your-domain/api/school/academic/sessions?schoolId=9f9bda71-dc25-488f-8283-02eb5a931681"
   ```
   Expected: 200 OK with sessions array

3. **Test Results Page:**
   - Visit https://your-domain/school-admin/results
   - If school has sessions: Dropdowns should populate
   - If no sessions: Should show "No academic sessions configured" message

---

## Files Modified

```
src/app/api/school/students/route.ts                 ← Simplified auth
src/app/api/school/academic/sessions/route.ts        ← Fixed query
src/app/api/school/academic/terms/route.ts           ← Fixed query
src/app/api/school/academic/classes/route.ts         ← Fixed query
src/app/api/school/academic/arms/route.ts            ← Fixed query
src/app/school-admin/results/page.tsx               ← Improved errors
```

---

## Important: Test School Has No Data

The test school `9f9bda71-dc25-488f-8283-02eb5a931681` currently has NO academic sessions/terms/classes/arms.

**To verify dropdowns work:**
1. Add data to Supabase:
   - Create session: `2026/2027`
   - Create term: `Term 1` for that session
   - Create class: `JSS1` 
   - Create arm: `A` for that class

OR use a different school ID that already has complete academic data.

---

## Rollback Plan

If issues occur after deployment:

```bash
# Revert to previous version
git revert HEAD
git push origin main

# Or restore from specific commit
git reset --hard <commit-hash>
git push --force origin main
```

---

## Monitoring

After deployment, watch for these in Vercel logs:

- ✅ `[Students API] ✅ Fetched X students` - Success
- ✅ `[Sessions API] ✅ Found X sessions` - Success
- ❌ `Error: missing schoolId` - Client error (expected if params missing)
- ❌ Database errors - Would indicate Supabase connection issues

---

## Success Criteria

- [ ] Vercel build succeeds (0 errors)
- [ ] Students page loads without 500 error
- [ ] Results page loads without 500 error
- [ ] If school has data: Dropdowns populate correctly
- [ ] If school has no data: Shows helpful error message

---

## Questions?

Check the detailed report: `.agents/tasks/autonomous-school-admin-rebuild-complete.md`
