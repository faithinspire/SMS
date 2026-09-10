# ⚡ SCORE SHEET - QUICK START (2 MINUTES)

## 🎯 Goal
Add test data so Score Sheet page shows classes and students

## ✅ Solution: Copy-Paste SQL into Supabase

### Step 1: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Find your project
3. Click it to open

### Step 2: Open SQL Editor
1. Left sidebar → Click **"SQL Editor"**
2. Click **"+ New Query"** button

### Step 3: Copy-Paste the SQL
1. Open file: `EXECUTE_THIS_IN_SUPABASE.sql`
2. **Copy ALL the content** (select all, Ctrl+A, Ctrl+C)
3. **Paste into Supabase** SQL editor (Ctrl+V)

### Step 4: Run It
1. Click **"Run"** button (top right of SQL editor)
2. Wait for success message
3. Scroll down to see verification queries

### Step 5: Refresh Score Sheet
1. Go to: http://localhost:3000/teacher/score-sheet
2. **Refresh page** (Ctrl+R or F5)
3. ✅ You should now see:
   - **Classes dropdown** populated
   - **Student cards** showing students in class
   - **[ENTER SCORES] button** on each student

---

## 🧪 Testing the Score Sheet

### Test 1: Click [ENTER SCORES]
1. Click [ENTER SCORES] on any student
2. **Modal opens** with:
   - Student name/class info
   - Subjects as rows (Math, English, Physics, etc.)
   - CA1-4 and Exam input fields

### Test 2: Enter Scores
1. Type scores:
   - **CA1:** 8
   - **CA2:** 9
   - **CA3:** 7
   - **CA4:** 9
   - **Exam:** 52

2. **Watch calculations update in real-time:**
   - CA Total: 33/40 ✓
   - Total: 85/100 ✓
   - Grade: B ✓
   - %: 85% ✓

### Test 3: Add Comment (Optional)
1. In textarea: "Excellent work!"
2. Click **[✅ Save Scores]**
3. **Toast shows:** "✅ Scores saved successfully!"

### Test 4: View in Student Results
1. Log in as **STUDENT**
2. Go to: http://localhost:3000/student/view-results
3. Click **Term** dropdown → Select "First Term"
4. **You should see:**
   - Subject: 85/100, Grade B
   - Attendance: Present 54/60 (90%)
   - Teacher comment: "Excellent work!"

---

## ❌ If It Still Doesn't Work

**Check these:**

### 1. Are there teachers?
Run in Supabase SQL Editor:
```sql
SELECT COUNT(*) as teachers FROM users WHERE role = 'TEACHER';
```
- If result is **0**: Create a teacher account via `http://localhost:3000/auth/staff/register`
- If result is **> 0**: Proceed to next step

### 2. Are there classes?
```sql
SELECT COUNT(*) as classes FROM class_arm_combos;
```
- If result is **0**: Need to create classes via school admin
- If result is **> 0**: Proceed to next step

### 3. Are there students?
```sql
SELECT COUNT(*) as students FROM students;
```
- If result is **0**: Need to enroll students via school admin
- If result is **> 0**: Proceed to next step

### 4. Open Browser Console
1. Press **F12** (or right-click → Inspect)
2. Go to **Console** tab
3. Look for red error messages
4. Copy the error and check what's wrong

---

##  Troubleshooting Checklist

| Issue | Check | Solution |
|-------|-------|----------|
| Classes dropdown empty | Run the SQL query | Make sure you clicked Run in Supabase |
| No students appear | Check teacher_assignments table | Run `SELECT COUNT(*) FROM teacher_assignments;` |
| Error when saving | Check browser console | Press F12, see error message |
| Calculations wrong | Check GRADING_SCALE | Verify CA max is 10, Exam max is 60 |
| Student Results empty | Check student logged in | Make sure logged in as STUDENT not TEACHER |

---

## 🚀 You're Ready!

Once you run the SQL script in Supabase:
- ✅ Score Sheet shows classes
- ✅ Classes show students
- ✅ Students can enter scores
- ✅ Scores auto-calculate
- ✅ Students see results

**Questions?** Check browser console (F12) for detailed error messages.
