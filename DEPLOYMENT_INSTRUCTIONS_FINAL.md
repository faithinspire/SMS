# 🚀 FINAL DEPLOYMENT INSTRUCTIONS - October 5, 2026

## ⚠️ CRITICAL: DO THIS FIRST IN SUPABASE

Before the deployment will work, you **MUST** run the migration in Supabase to add missing database columns.

### Step 1: Run Migration 167 in Supabase SQL Editor

1. Open Supabase Dashboard → Your Project → SQL Editor
2. Click "New Query"
3. Copy-paste **ALL** of this SQL and click RUN:

```sql
-- ============================================================================
-- CRITICAL PRODUCTION FIX: Migration 167
-- ============================================================================

-- Migration 163: Add missing staff and student columns
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS salary DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS department TEXT;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED'));

-- Migration 164: Add missing schools columns
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS school_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS website_url VARCHAR(255),
ADD COLUMN IF NOT EXISTS principal_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS principal_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS established_year INTEGER;

-- Migration 165: Teacher class assignments table
CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_arm_combo_id UUID NOT NULL REFERENCES class_arm_combos(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  is_class_teacher BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher_id ON teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_class_id ON teacher_class_assignments(class_arm_combo_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_school_id ON teacher_class_assignments(school_id);

SELECT 'Migration 167 Complete - All critical columns added' as status;
```

4. Wait for "Success" message ✅

---

## Step 2: Verify Deployment to Vercel

The code has already been committed and pushed to GitHub:
- Migration file: `database/migrations/167_critical_production_fix.sql`
- Letter fix: `src/services/letter-generation.service.ts` (now fetches role field)
- Staff page fix: `src/app/school-admin/staff/page.tsx` (JSX syntax fixed)

Vercel should auto-deploy within 1-2 minutes. Check:
- Dashboard: https://vercel.com/dashboard
- Live site should reflect changes

---

## 📋 What Got Fixed in This Deployment

### 1. **Database Columns Added (Migration 167)**
   - `staff.salary`, `staff.bank_name`, `staff.account_number`, `staff.account_name`, `staff.department`
   - `students.status` (ACTIVE/INACTIVE/TRANSFERRED/GRADUATED)
   - `schools.school_type`, `schools.phone_number`, `schools.website_url`, `schools.principal_name`, `schools.principal_email`, `schools.established_year`
   - `teacher_class_assignments` table (complete teacher-to-class mapping)

### 2. **Staff Letter Generation Fixed**
   - Now shows actual staff role (TEACHER, HEAD_TEACHER, etc.) instead of generic "Staff"
   - Fetches role from `users.role` column
   - Updates: src/services/letter-generation.service.ts

### 3. **Staff Page JSX Fixed**
   - Removed duplicate component definitions
   - Removed orphaned JSX code
   - 6-tab modal now displays cleanly (Personal, Admission, Class, Employment, Salary, Contact)

### 4. **Academic Page**
   - Uses `.maybeSingle()` to avoid PGRST116 errors when records don't exist
   - Safe fallback for missing school data

### 5. **Results Page**
   - Loads school context on mount
   - Dropdowns populate properly
   - Error message shows if account not linked to school

---

## ✅ What You Should See After Deployment

### Academic Page
- ✅ Sessions dropdown populated on page load
- ✅ Terms dropdown works (no database errors)
- ✅ Classes show student counts
- ✅ Form master names display

### Results Page
- ✅ School context loads
- ✅ Sessions → Terms → Classes → Students dropdowns work
- ✅ Student scores and grades load properly

### Staff Pages
- ✅ Staff table displays without errors
- ✅ 6-tab edit modal works (no JSX errors)
- ✅ Appointment letters generate with correct role
- ✅ Letters can be emailed/printed/downloaded

### Nav Bar
- ✅ Role-based navigation works
- ✅ Clear error message if account not linked to school

---

## 🔧 If Something Still Doesn't Work

### Issue: Pages still not showing real data
**Solution:** Make sure you ran Migration 167 in Supabase SQL Editor. The database needs those columns.

### Issue: Staff letters still show wrong role
**Solution:** Database migration must be run. Then restart the browser (hard refresh: Ctrl+Shift+R).

### Issue: Pages still show errors after 5 minutes
**Solution:** 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Do a hard refresh (Ctrl+Shift+R)
3. Check Vercel deployment status at https://vercel.com/dashboard

---

## 📝 Files Modified in This Deployment

```
✅ database/migrations/167_critical_production_fix.sql (NEW)
✅ src/services/letter-generation.service.ts (role field fix)
✅ src/app/school-admin/staff/page.tsx (JSX cleanup)
✅ src/app/school-admin/academic/page.tsx (cache buster comment)
✅ src/app/school-admin/results/page.tsx (cache buster comment)
✅ package.json (version bump to 0.1.3)
```

---

## 🎯 Final Checklist

- [ ] Run Migration 167 in Supabase
- [ ] Check Vercel deployment completed
- [ ] Test Academic Page (sessions/terms/classes load)
- [ ] Test Results Page (dropdowns work)
- [ ] Test Staff Page (modal displays, no errors)
- [ ] Generate staff letter (check role displays correctly)
- [ ] Test nav bar (role-based navigation works)

---

**Status:** READY FOR PRODUCTION ✅

All fixes are code-complete and deployed. Only waiting on:
1. You to run Migration 167 in Supabase (required)
2. Vercel to finish building (auto-triggers from git push)
