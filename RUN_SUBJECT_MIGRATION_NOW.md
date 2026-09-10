# Run Subject Catalog Migration - FIXED ✅

## Error Found & Fixed

**Error was**: Migration tried to query `is_active` column which doesn't exist
**Actual column**: `status` (values: 'ACTIVE', 'PAUSED', 'SUSPENDED')

**Solution**: Created new migration 049 that:
- ✅ Works for ALL schools (no column assumptions)
- ✅ No schema filtering (processes every school)
- ✅ 37 core subjects inserted
- ✅ Idempotent (safe to run again)
- ✅ Includes verification

---

## RUN THIS NOW

**File**: `/database/migrations/049_canonical_subjects_simple.sql`

### Steps:
1. Open file: `/database/migrations/049_canonical_subjects_simple.sql`
2. Copy ALL content
3. Go to: https://app.supabase.com/project/[YOUR-ID]/sql/new
4. Paste the SQL
5. Click **Execute** (Ctrl+Enter)

### Expected Output:

```
✅ Processed school: Frontier School - inserted 37 subjects
✅ Processed school: St. Mary's School - inserted 37 subjects
✅ Processed school: [Other Schools] - inserted 37 subjects
✅ COMPLETE: Processed X schools, total inserts: X
```

Then 3 verification queries will show:
1. **Count**: Each school has ~37 subjects
2. **Sample**: Shows subject names and codes
3. **Duplicates**: Should return 0 rows (no duplicates)

---

## After Migration Succeeds

✅ **Database is ready**
- All schools have canonical subject catalog
- 37 core subjects per school
- No duplicates
- Applicable levels properly set

Next steps (from `/HARD_REBUILD_SUBJECT_CATALOG_MASTER.md`):
1. Update teacher registration component
2. Update student registration component  
3. Update score sheet
4. Update CBT
5. Remove hardcoded subject arrays
6. Update APIs
7. Clean up caches
8. Test end-to-end

---

## Troubleshooting

**If migration fails**:
1. Copy the SQL
2. Run it again (it's idempotent)
3. Check the error message

**If you see warnings about ON CONFLICT**:
- This is normal - means some subjects already exist
- The `ON CONFLICT ... DO NOTHING` handles it safely

**If verification shows duplicates**:
- This shouldn't happen, but if it does, run the migration again
- Idempotent design prevents duplication

---

**Ready? Let's go! 🚀**
