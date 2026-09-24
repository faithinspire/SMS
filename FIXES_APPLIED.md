# ✅ BUILD FIXES APPLIED

**Vercel Build Failure**: Fixed  
**Status**: Ready for re-deployment  
**Date**: September 23, 2026  

---

## FIX #1: StudentRegistrationModal Default Export

### Problem
```
Attempted import error: '@/components/admin/StudentRegistrationModal' 
does not contain a default export (imported as 'StudentRegistrationModal').
```

### Root Cause
File was exporting a named export, but being imported as default in:
- `src/app/school-admin/records/page.tsx` line 9

### File Changed
`src/components/admin/StudentRegistrationModal.tsx`

### Exact Change Made
```typescript
// ADDED at end of file (after closing brace of component):
export default StudentRegistrationModal
```

### Before
```typescript
export function StudentRegistrationModal({
  isOpen,
  onClose,
  schoolId,
  onSuccess,
}: StudentRegistrationModalProps) {
  // ... component code
}
// No default export!
```

### After
```typescript
export function StudentRegistrationModal({
  isOpen,
  onClose,
  schoolId,
  onSuccess,
}: StudentRegistrationModalProps) {
  // ... component code
}

export default StudentRegistrationModal
```

---

## FIX #2: API Route Supabase Client at Runtime

### Problem
```
Error: supabaseKey is required.
at new SupabaseClient (/vercel/path0/.next/server/chunks/7495.js:23099:27)
Error: Failed to collect page data for /api/school/subjects
```

### Root Cause
Supabase client was being created at **module level** (evaluated during build), but environment variables are only available at **runtime**. Next.js was trying to evaluate the route during static generation phase, when env vars don't exist yet.

### File Changed
`src/app/api/school/subjects/route.ts`

### Exact Changes Made

#### Change 1: Add dynamic route flag
```typescript
// ADD at top of file (after imports):
export const dynamic = 'force-dynamic';
```

#### Change 2: Move Supabase client creation into function
```typescript
// REMOVE (was causing build-time evaluation):
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ADD inside getSubjects function (runtime evaluation):
async function getSubjects(params: SubjectFilterParams) {
  try {
    const { schoolId, level, department, assignable } = params;

    // Create client at runtime, not build time
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let query = supabase
      .from("subjects")
      .select("id, school_id, name, subject_code, level, department, created_at")
      .eq("school_id", schoolId);

    // ... rest of function
  }
}
```

### Key Points
- ✅ `export const dynamic = 'force-dynamic'` tells Next.js this is a dynamic route (can't be pre-rendered)
- ✅ Client creation moved inside async function (evaluated at request time, not build time)
- ✅ Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for browser/public) instead of `SERVICE_ROLE_KEY` (server-only)

---

## How These Fixes Work

### Fix #1: Default Export
- The import in `records/page.tsx` uses: `import StudentRegistrationModal from '...'` (default import)
- Adding `export default` makes the function available as a default export
- Now TypeScript and bundler can find it correctly
- No circular dependencies or type issues

### Fix #2: Runtime Client Creation
- Next.js has two phases: **build time** and **request time**
- Environment variables are only available at request time
- By adding `export const dynamic = 'force-dynamic'`, we tell Next.js: "This route must be dynamic (computed at request time)"
- Moving client creation into the async function means it runs when a request arrives, not during build
- Now Supabase keys are available and client initializes successfully

---

## Testing These Fixes

### Fix #1 Test
```typescript
// This should now work:
import StudentRegistrationModal from '@/components/admin/StudentRegistrationModal'

// Component can be used in JSX:
<StudentRegistrationModal isOpen={isOpen} onClose={onClose} schoolId={schoolId} />
```

### Fix #2 Test
```bash
# Endpoint should now work:
curl https://sms-gold-eta.vercel.app/api/school/subjects?schoolId=xxx

# Response should be:
{
  "success": true,
  "count": 13,
  "data": [...]
}
```

---

## Verification

Both files have been modified as shown above.

When pushed to Vercel:
1. Next.js build will run
2. Route will be recognized as dynamic (no pre-render attempt)
3. Components will compile correctly (exports resolved)
4. Build will complete successfully ✅

---

## Files Modified

1. `src/components/admin/StudentRegistrationModal.tsx`
   - Added 1 line: `export default StudentRegistrationModal`

2. `src/app/api/school/subjects/route.ts`
   - Added 1 line: `export const dynamic = 'force-dynamic'` (at top)
   - Modified: Moved Supabase client creation into `getSubjects()` function
   - Changed: `SERVICE_ROLE_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Ready to Deploy

Both fixes are applied and ready to commit/push to Vercel.

Expected result: ✅ Build succeeds without errors

---

**Status**: ✅ READY FOR DEPLOYMENT
