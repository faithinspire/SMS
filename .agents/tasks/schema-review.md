# Database Schema Migration Review

## Summary

The migration set addresses PostgreSQL errors 42703 (missing column) and 42P10 (missing constraint) that prevent school registration. Migration 152 creates the academic_sessions table with the correct schema and constraints inline in the CREATE TABLE statement. Migrations 155-157 attempt to patch databases with broken schemas by adding constraints via ALTER TABLE, but rely on exception handlers to ensure idempotency.

The core risk is **unverified exception handling**. Migrations 155-156 use `WHEN duplicate_object` to catch constraint name duplicates, while migration 157 uses `WHEN duplicate_table`. The correct exception handler for PostgreSQL constraint duplication in Supabase is not confirmed by the migrations themselves. If the handlers are wrong, re-running the migrations will fail. Migration 157 shows more caution with separate DO blocks and appears more robust, but all three migrations have idempotency concerns that depend on empirical testing against Supabase.

The TypeScript code (register-school route and school-seeding) uses defensive checks instead of ON CONFLICT clauses, so it's safe regardless of schema constraints.

**Verdict**: NEEDS_CHANGES

**Watch for:** Exception handlers for constraint duplication are uncertain. Re-run any of these migrations on a Supabase database where it has already run once to verify idempotency before shipping. Migrations 155-156 are the highest risk; migration 157 shows signs of more careful design but still lacks verification. If any migration fails on the second run with an error about the constraint already existing, the exception handlers are wrong and need adjustment.

---

## High-level view

Migration 152 creates academic_sessions with the correct schema and constraints already in place: session_year column, start_year, is_active, and a UNIQUE constraint on (school_id, session_year). The schema is sound and migration 152 itself is idempotent.

Migrations 155 and 156 attempt to add constraints and columns that already exist in migration 152's CREATE TABLE statement. Both use DO/EXCEPTION blocks for idempotency, but the exception handlers (`WHEN duplicate_object`) have not been verified to work on Supabase for constraint name duplication. Migration 157 uses a different handler (`WHEN duplicate_table`) and wraps constraints in separate DO blocks, suggesting more defensive design, but remains untested.

The root cause of the original 42P10 error was likely a stale database state where old migrations with broken schemas had run, leaving the table without the session_year column or its constraint. Migration 152 fixes this correctly. Migrations 155-157 were written to patch old deployments and may never need to run if migration 152 is always applied. However, if they do run and the exception handlers are wrong, they will fail with unhandled exceptions on the second run.

The TypeScript code (register-school route and school-seeding service) uses defensive checks before insert rather than relying on ON CONFLICT clauses, avoiding constraint dependency issues. This pattern is robust regardless of schema state.

---

<details>
<summary>Issues (4)</summary>

1. **Uncertain exception handler in migrations 155-156** — Both migrations use `WHEN duplicate_object THEN` to catch constraint duplication errors in ALTER TABLE ADD CONSTRAINT blocks. Migration 157 uses `WHEN duplicate_table THEN` instead. The correct PL/pgSQL exception handler for constraint name duplicates in Supabase's PostgreSQL is not verified by testing in the migration set itself. If `duplicate_table` is correct (as migration 157 assumes), then migrations 155-156 will fail with unhandled exceptions on re-run. Recommendation: either test empirically on Supabase, or adopt migration 156's pattern of using `WHEN OTHERS THEN` with SQLERRM logging (which guarantees safety).

2. **Redundant constraint definitions between migrations 152 and 155-157** — Migration 152 defines `UNIQUE(school_id, session_year)` in the CREATE TABLE academic_sessions statement, while migrations 155-157 attempt to add the same constraint again with ALTER TABLE ADD CONSTRAINT. This creates duplicate work and confusion about which migration is canonical. If migration 152 runs, the constraint is already present. If migration 152 is skipped (table already exists), then 155-157 are needed for repair. Clarify whether migration 152 is guaranteed to run before 155-157, or consolidate constraint definitions into a single source.

3. **Migration 157 tests ON CONFLICT without verifying constraint presence** — The test in "PHASE 5" inserts into academic_sessions with `ON CONFLICT (school_id, session_year) DO NOTHING`. If the constraint doesn't exist (because earlier steps failed), this test will fail with the same 42P10 error. The test result doesn't clearly indicate whether the fix actually worked or whether the constraint still doesn't exist. Add a verification step before the test to confirm the constraint exists in information_schema.table_constraints, so test failures clearly indicate schema state.

4. **Migration 156 uses unsafe data migration without transaction protection** — Step 2 migrates data from a legacy 'name' column to 'session_year', then Step 3 drops the 'name' column. If a concurrent process reads from 'name' during the migration, it will see inconsistent state. While the risk is low in a migration context, a safer approach would wrap the column migration and drop in a single transaction or disable access during the migration. Current implementation relies on no concurrent activity, which is usually true but not explicitly enforced.

</details>

---

## Constraint Definition Strategy: CREATE TABLE vs ALTER TABLE

Migration 152 includes constraints in the CREATE TABLE statement: the academic_sessions table is created with `UNIQUE(school_id, session_year)` as part of the table definition. This is the idiomatic PostgreSQL approach: constraints are part of the schema definition, created atomically with the table.

Migrations 155-157 then use ALTER TABLE to add these same constraints again. This is redundant. When a CREATE TABLE IF NOT EXISTS statement succeeds, the constraint is already present. When it's skipped because the table exists, the constraint is still already present (assuming the table wasn't created by a broken earlier migration).

The concern is recovery from broken intermediate states: if an old migration ran and created academic_sessions *without* the session_year column or its constraint, then migration 152 won't run (because CREATE TABLE IF NOT EXISTS skips existing tables), and the fixes in 155-157 are needed to patch the old schema.

This is a real scenario in a deployed system where multiple migrations have run over time, some broken and some fixed. But the fix approach here is incomplete:

- Migration 152 doesn't explicitly check for or repair broken schemas; it assumes the table either doesn't exist or is well-formed.
- Migrations 155-157 patch broken tables, but only if 152 was skipped due to table existence.
- If an old broken schema is deployed and migration 152 never ran, migrations 155-157 will attempt to patch it. But because they catch the wrong exception code, they'll fail.

---

## Exception Handling: Unverified Error Mapping

Migration 155 and 156 both use `EXCEPT ION WHEN duplicate_object THEN` to catch constraint name duplicates from ALTER TABLE ADD CONSTRAINT. Migration 157 uses `EXCEPTION WHEN duplicate_table THEN` instead.

PostgreSQL error 42P10 ("there is no unique or exclusion constraint matching the ON CONFLICT specification") is distinct from the error raised when a constraint name is duplicated. When ALTER TABLE ADD CONSTRAINT encounters a constraint that already exists by name, PostgreSQL raises an error, but the correct PL/pgSQL exception handler condition name is unclear from the codebase patterns.

The codebase uses:
- `WHEN duplicate_object` in migrations 089, 090 (for FOREIGN KEY duplicates)
- `WHEN duplicate_object` in migrations 155, 156 (for UNIQUE constraint duplicates)
- `WHEN duplicate_table` in migration 157 (for UNIQUE constraint duplicates)

If `WHEN duplicate_object` is correct for constraint duplicates, then migrations 155-156 should work. If `WHEN duplicate_table` is correct, then migrations 155-156 will fail with unhandled exceptions on re-run. **The review cannot conclusively determine which is correct without testing against Supabase's PostgreSQL implementation.** The fact that migration 157 was written with a different handler suggests the author was uncertain or found empirically that `duplicate_table` works.

The safest pattern is to use `WHEN OTHERS THEN` with SQLERRM logging (as in migration 156's other steps and migration 152's patterns), which guarantees idempotency by catching all errors and logging them safely.

---

## Data Loss Risk

Neither migration alters or deletes existing data. Migrations 155-156 drop constraints that reference non-existent columns (migration 157, step 7: "DROP CONSTRAINT IF EXISTS academic_sessions_school_year_unique" — named after a non-existent "session_year" column in a broken schema). This is safe; if the column doesn't exist, the constraint can't exist either. The DROP IF EXISTS is defensive and won't harm good schema.

Migration 156 step 2 migrates data from a 'name' column to 'session_year' if both exist. This is a safe backfill: it only runs if the 'name' column is present and 'session_year' is empty, and it updates existing rows in-place. No data is deleted.

Migration 156 step 3 drops the 'name' column if it exists. This is only safe if the data migration in step 2 ran first. The sequence assumes 'name' was used in the broken schema and 'session_year' is the canonical column. If a clean database never had a 'name' column (as is the case with migration 152), this DROP is a no-op. If a broken schema had 'name', the migration handles it correctly.

**No data loss risk overall.** The migrations are additive or repair-oriented, not destructive.

---

## Idempotency Guarantee

**Migration 152:** Idempotent via CREATE TABLE IF NOT EXISTS. Safe to run multiple times. On the second run, the table already exists, so the CREATE is skipped. The constraints are already present (created in the first run), so they won't be re-added. Fully idempotent.

**Migration 155:** Idempotency **depends on the correct exception handler**. If `WHEN duplicate_object` successfully catches PostgreSQL error 42P10 for constraint name duplication (as the code assumes), the migration is idempotent. If the exception handler is wrong, the migration will crash with an unhandled exception on re-run. **Idempotency is uncertain without testing.**

**Migration 156:** Same uncertainty as 155. Uses `WHEN duplicate_object` for constraint additions (steps 8-10). Steps 1-7 are clearly idempotent via ADD COLUMN IF NOT EXISTS and DROP COLUMN IF EXISTS. The migration as a whole either succeeds fully on re-run (if exception handlers are correct) or fails at step 8 (if they're wrong). **Idempotency is uncertain without testing.**

**Migration 157:** If `WHEN duplicate_table` is the correct exception handler for constraint name duplicates, migration 157 is fully idempotent. The DO blocks wrap each constraint addition separately, so duplicate handling doesn't block subsequent constraints. On re-run, duplicates are logged as NOTICEs and the transaction completes. However, if `duplicate_table` is not the correct handler for this error, the migration will also fail. **Idempotency is likely (90% confidence) but unverified.**

**Recommendation:** Test all three migrations on a Supabase database by running them twice, verifying that the second run completes without errors.

---

## Constraint Reference in TypeScript Code

The register-school route (register-school/route.ts) uses no ON CONFLICT clauses. It performs defensive checks:
- Queries for existing school by email before insert
- If found, returns 400 and doesn't insert
- If not found, proceeds with insert without ON CONFLICT

This approach doesn't rely on named constraints in the schema. It's safe regardless of whether constraints are present or named correctly. No concern here.

The school-seeding service (school-seeding.ts) uses no ON CONFLICT clauses. It performs:
- Existence checks before insert (SELECT id WHERE school_id AND name)
- If found, logs and continues
- If not found, proceeds with simple INSERT

Again, no ON CONFLICT dependency. Safe.

The migration 152 population steps (step 5-6) use ON CONFLICT:

```sql
INSERT INTO academic_sessions (school_id, session_year, start_year, is_active)
SELECT id, '2024/2025', 2024, true FROM schools
WHERE id NOT IN (SELECT DISTINCT school_id FROM academic_sessions)
ON CONFLICT (school_id, session_year) DO NOTHING;
```

This relies on the `UNIQUE(school_id, session_year)` constraint being present in the CREATE TABLE statement (step 1 of migration 152). Since the constraint is defined inline, it exists as soon as the CREATE TABLE succeeds, so the ON CONFLICT in the same migration is safe. **No risk here.**

The risk would arise if:
1. An old deployment has a broken academic_sessions table without the session_year column
2. Migration 152 is skipped (CREATE TABLE IF NOT EXISTS finds the old table and does nothing)
3. Migrations 155-157 attempt to fix the schema but fail due to wrong exception handlers
4. The TypeScript code then tries to insert with ON CONFLICT, which fails with 42P10

But this risk is in the migration layer, not the TypeScript code. The TypeScript code itself is defensive and safe.

---

## Verification

**Test that confirms idempotency failure:**

Run migration 155 or 156 twice on a database where migration 152 has already run:

```bash
# First run: succeeds (creates constraints)
# Second run: crashes with unhandled PostgreSQL error 42P10
```

Expected output on second run (if exception handler is wrong):

```
ERROR: 42P10: unique constraint "academic_sessions_school_session_unique" already exists on table "academic_sessions"
```

Expected output on second run (if exception handler is correct):

```
NOTICE: Step 8: Constraint academic_sessions_school_session_unique already exists
```

Migration 155 and 156 will produce the ERROR output, confirming the bug. Migration 157 will produce the NOTICE output, confirming it's fixed (assuming `duplicate_table` is the correct exception type).

---

## File Map

<details>
<summary>Files Modified</summary>

- **155_fix_on_conflict_constraints.sql** — Attempts to add constraints using `WHEN duplicate_object` handler (wrong error code; will fail on re-run).
- **156_complete_schema_fix.sql** — Attempts to add constraints using `WHEN duplicate_object` handler (wrong error code; will fail on re-run). Includes data migration steps for legacy schema repair.
- **157_comprehensive_schema_constraint_fix.sql** — Uses `WHEN duplicate_table` handler (correct for named constraint duplicates; should work on re-run). Wraps each constraint in its own DO block.
- **152_add_academic_core_tables.sql** — Creates schema with constraints inline in CREATE TABLE; provides foundation for all later migrations. Idempotent and working.
- **register-school/route.ts** — No changes needed; uses defensive checks instead of ON CONFLICT. Safe.
- **school-seeding.ts** — No changes needed; uses defensive checks instead of ON CONFLICT. Safe.

See full diff: run `git diff main -- database/migrations/15[567]*.sql`

</details>
