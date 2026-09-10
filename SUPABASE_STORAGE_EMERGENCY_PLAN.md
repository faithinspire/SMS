# SUPABASE STORAGE EMERGENCY PLAN
**Status:** Database disk FULL - ERROR 53100  
**Created:** 2026-09-06

---

## 🚨 IMMEDIATE ACTION REQUIRED

Your Supabase database has **zero free space**. This blocks:
- All migrations with INSERT/CREATE operations
- Index creation
- Any operation needing temporary files

### ⚡ QUICKEST FIX (5 minutes)

1. **Go to:** https://supabase.com → Your Project → Settings → Database
2. **Look at:** "Database Usage" section
3. **DO ONE:**
   - **A) Upgrade plan** (instant, costs money) → More storage immediately
   - **B) Manual cleanup** (free, takes 10 min) → Delete old data (see below)
   - **C) Contact support** (free, takes 24h) → Ask for emergency cleanup

---

## 🧹 MANUAL CLEANUP (IF NOT UPGRADING)

Run these queries in **Supabase SQL Editor** to identify bloat:

```sql
-- Check what's using space
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

### Things SAFE to delete:
- **Test/duplicate records** in any table starting with `test_`
- **Old audit logs** (if you have an `audit_logs` table)
- **Orphaned storage files** in `storage.objects` 
- **Migration logs** from failed attempts

### Things DO NOT delete:
- `schools`, `students`, `teachers`, `classes`, `subjects`
- `student_subjects`, `subject_teacher_assignments`
- `score_sheets`, `cbt_results`, `transactions`

---

## 🔧 AFTER FREEING SPACE

Once you've freed at least **500MB-1GB**, run this:

```sql
-- Optimize database
VACUUM FULL ANALYZE;
```

Then run the migration in Supabase:

```sql
-- Migration 079: ZERO-STORAGE FIX (safe to run now)
-- Copy from: database/migrations/079_ZERO_STORAGE_EMERGENCY_FIX.sql
```

---

## 📋 VERIFICATION CHECKLIST

After cleanup + migration:

- [ ] Supabase shows at least 500MB free space
- [ ] VACUUM FULL ANALYZE completed
- [ ] Migration 079 ran successfully
- [ ] Test: Load http://localhost:3001/teacher/score-sheet
- [ ] Test: Students appear in score sheet
- [ ] Test: PWA installs on phone
- [ ] Test: Bottom nav shows on phone

---

## 🎯 NEXT STEPS (Once space freed)

1. **Run migration 079** (zero-storage, safe)
2. **Deploy code** (all UI fixes already done)
3. **Test on phone:**
   - Score sheet loads students ✓
   - Bottom nav visible ✓
   - PWA installs ✓

---

## 📞 IF STILL STUCK

1. **Supabase Status:** https://status.supabase.com
2. **Support:** support@supabase.com
3. **Include:** Project URL + "ERROR 53100" + "cannot run migrations"

---

## 🔐 PRODUCTION CHECKLIST

- [ ] Storage at least 30% free (not 100% full)
- [ ] VACUUM FULL completed
- [ ] All migrations 079+ successful
- [ ] Phone testing passed
- [ ] Code deployed to production
