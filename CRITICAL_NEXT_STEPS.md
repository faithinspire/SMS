# 🚨 CRITICAL NEXT STEPS - DO THIS NOW

## Issue Found & Fixed
Migration SQL had a bug: `SELECT DISTINCT school_id FROM schools` → Fixed to `SELECT id FROM schools`

**Fixed file:** `database/migrations/046_add_academic_session_to_scores.sql`

---

## ⚠️ YOUR IMMEDIATE ACTION REQUIRED

### Step 1: Execute Fixed Migration on Supabase

**YOU MUST DO THIS FIRST - Server won't work without it**

1. Open **Supabase Dashboard** → Go to **SQL Editor**
2. Click "New Query"
3. Copy **ENTIRE** content from this file:
   ```
   database/migrations/046_add_academic_session_to_scores.sql
   ```
4. Paste into Supabase SQL Editor
5. Click **RUN** button
6. **Wait for completion** - should see ✅ with no errors

**Expected output:**
```
CREATE TABLE IF NOT EXISTS
ALTER TABLE
ALTER TABLE
COMMIT
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
```

---

### Step 2: Verify Migration Succeeded

Run this in Supabase SQL Editor to verify:

```sql
-- Check academic_sessions table created
SELECT COUNT(*) as session_count FROM academic_sessions;

-- Check score_sheets linked to sessions
SELECT COUNT(*) as linked_scores 
FROM score_sheets 
WHERE academic_session_id IS NOT NULL;

-- Check indices created
SELECT COUNT(*) as index_count 
FROM pg_indexes 
WHERE tablename = 'academic_sessions' OR tablename = 'score_sheets';
```

**You should see:**
- `session_count`: at least 1 per school (auto-created)
- `linked_scores`: should be > 0 if you have existing scores
- `index_count`: should be 4+ indices

---

### Step 3: Restart Dev Server

Once migration is done, restart the server:

1. Go back to terminal running `npm run dev`
2. Press **Ctrl+C** to stop it
3. Run again:
   ```bash
   npm run dev
   ```

**Server should start on:** http://localhost:3001

---

### Step 4: Test Score Entry Flow

**DO NOT SKIP THIS - Verify it actually works**

1. Open browser → http://localhost:3001
2. Login as **TEACHER**
3. Navigate to **Score Sheet**
4. **Check:** 
   - [ ] Academic Session dropdown appears (top left)
   - [ ] Sessions show real data (e.g., "2026/2027")
   - [ ] Current session marked with "(Current)" badge
   - [ ] Term dropdown appears (far right)
   - [ ] Terms show real data

5. **If dropdowns are empty:**
   - Check browser console (F12 → Console tab)
   - Look for red errors
   - Check Network tab: 
     - `GET /api/teacher/academic-sessions?school_id=...` should return 200
     - Response should have `"success": true`

6. **Select values and enter scores:**
   - Select: Session, Subject, Class, Term
   - Click student → ENTER SCORES button
   - Enter test scores (0-10) and exam (0-60)
   - Click "✅ Save Scores"

7. **CRITICAL CHECK:**
   - Browser Network tab (F12 → Network)
   - Find: `POST /api/teacher/student-scores`
   - Response should show: `"success": true`
   - **NOT** 400 or 500 error
   - If it shows error, check the error message

8. **Verify persistence:**
   - Press F5 to refresh page
   - Navigate back to Score Sheet
   - Scores should still be there

---

## 🐛 If Migration Fails

**Error: "column 'school_id' does not exist"**
- Already fixed in the file
- Make sure you copied the LATEST version of `046_add_academic_session_to_scores.sql`

**Error: "permission denied for schema public"**
- This is a Supabase RLS issue
- Try running this first in SQL Editor:
  ```sql
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ```

**Error: "table 'academic_sessions' already exists"**
- That's OK - means it was created in a previous attempt
- The migration uses `CREATE TABLE IF NOT EXISTS`
- Just run the verification queries above to confirm

---

## 🎯 Expected Result After All Steps

✅ Database has `academic_sessions` table  
✅ Database has `academic_session_id` column in `score_sheets`  
✅ Server starts without build errors  
✅ Score sheet page loads  
✅ Session & Term dropdowns populated  
✅ Can enter scores  
✅ POST returns 200 (success)  
✅ Scores persist after refresh  

---

## 📋 Summary of What Was Fixed

**Migration issue:** Column name typo in PL/pgSQL loop
- **Before:** `FOR school_record IN SELECT DISTINCT school_id FROM schools`
- **After:** `FOR school_record IN SELECT id FROM schools`
- Reason: `schools` table has column named `id`, not `school_id`

**Code changes:**
- ✅ Academic session frontend dropdown implemented
- ✅ Session + term both mandatory before save
- ✅ POST endpoint validates both are present and are UUIDs
- ✅ Database migration creates session tracking structure

---

## ⏱️ Timeline

1. **Migration on Supabase:** ~30 seconds
2. **Verification queries:** ~5 seconds
3. **Dev server restart:** ~30-60 seconds
4. **Test flow:** ~2 minutes

**Total time:** ~3 minutes if migration succeeds first try

---

## 🆘 If Still Not Working

1. **Screenshot the error** - take a picture of the red error message
2. **Check Network tab** - F12 → Network → find the failed request
3. **Share these details:**
   - Error message text
   - API endpoint that failed
   - Response status code
   - Response body

Then I can diagnose further.

---

**NEXT ACTION:** Go execute the migration in Supabase right now! ⏱️

