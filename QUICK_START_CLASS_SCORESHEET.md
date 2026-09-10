# Quick Start: Class Score Sheet

## 🚀 Start Here (5 minutes)

### Step 1: Open the Application
Go to: **`http://localhost:3001/teacher/class-scoresheet`**

> If you get 404, make sure the dev server is running on **port 3001** (not 3000)

### Step 2: Select Your Term
- Click the **Term dropdown** at the top
- Choose your term (e.g., "Term 1 (Current)")
- Page loads with all students in your class

### Step 3: Enter Scores
The page shows a table with:
- **Student names** and admission numbers
- **All subjects** each student is taking
- **Score input fields** for each test and exam

Enter scores by clicking in each field:
- **T1, T2, T3, T4**: Enter 0-10
- **Exam**: Enter 0-60
- **Total & Grade**: Calculate automatically ✨

### Step 4: Save Everything
When you're done:
1. Click the **"✅ Save"** button (bottom right)
2. See success message: "✅ X scores saved successfully"
3. Data is now in the database ✅

---

## 📊 What You'll See

```
CLASS SCORE SHEET | Leadway College • SS1 Alpha

Select Term: [Term 1 (Current) ▼]

┌─────────────────────────────────────────────────────────────────────┐
│ Student    │ Admission │ Subject      │ T1 │ T2 │ T3 │ T4 │ Ex │ Tot │ Grade │
├─────────────────────────────────────────────────────────────────────┤
│ Ade Ibrahim│ LW001    │ English      │ 8  │ 7  │ 9  │ 8  │ 45 │77  │ B   │
│            │         │ Mathematics  │ 9  │ 9  │ 8  │ 9  │ 50 │85  │ A   │
│ Bola Adey. │ LW002   │ English      │ 7  │ 6  │ 7  │ 6  │ 40 │66  │ B   │
│            │         │ Biology      │ 8  │ 8  │ 9  │ 8  │ 48 │81  │ A   │
└─────────────────────────────────────────────────────────────────────┘

3 changes pending                    [✅ Save (3)]
```

---

## ✅ Common Tasks

### Enter One Student's Scores
1. Find student in table
2. Click first score field under T1
3. Type score (0-10)
4. Press Tab to move to next field
5. Repeat for all tests and exam
6. Total and grade auto-calculate

### Enter Scores for All Students
1. Go row by row
2. Enter all scores for each student
3. When done, scroll down and click "✅ Save"
4. All scores batch-save at once

### Correct a Mistake
1. Click the field with wrong score
2. Clear it and re-enter correct value
3. Total/grade update automatically
4. Click Save to update

---

## ⚠️ Important Rules

| Rule | Why |
|------|-----|
| Select term first | Scores need to know which term they're for |
| T1-T4 must be 0-10 | School policy (continuous assessment) |
| Exam must be 0-60 | School policy (exam score range) |
| Save before leaving | Changes are only stored when you click Save |
| All students enrolled? | System only shows students enrolled in that class |

---

## 🎯 Your First Run (Step by Step)

### Scenario: You're Mr. Okafor, SS1A class teacher

```
1. Go to: http://localhost:3001/teacher/class-scoresheet

2. You see: "Loading students and subjects..."

3. After loading, page shows:
   - Header: "📊 Class Score Sheet"
   - Subheader: "Leadway College • SS1A Alpha"
   - Term dropdown: "Select term..."

4. Click term dropdown

5. Available terms show:
   ✓ Term 1 (Current)
     Term 2
     Term 3

6. Click "Term 1 (Current)"

7. Page loads table with all SS1A students:
   - Ade Ibrahim (LW001) - English, Math, Physics
   - Bola Adeyemi (LW002) - English, Biology, Chemistry
   - Chidi Okafor (LW003) - English, Math, Physics
   ... (all students)

8. Click Ade's English T1 field → Type "8"

9. Click T2 field → Type "7.5"

10. Click T3 field → Type "9"

11. Click T4 field → Type "8"

12. Click Exam field → Type "45"

13. See: Total = 77.5, Grade = B ✨

14. Continue for all subjects and students

15. When done, click "✅ Save (15)" button

16. See: "✅ 15 scores saved successfully"

17. Done! ✅ All scores are now in the system
```

---

## 🔧 Troubleshooting

### "Getting 404 error"
- Server running on port 3001? 
- Try: `http://localhost:3001` (not 3000)

### "No students showing"
- Did you select a term?
- Are students enrolled in this class?
- Check school admin → class enrollment

### "Can't type in score field"
- Score outside valid range?
- T1-T4: Must be 0-10
- Exam: Must be 0-60
- Try a value within range

### "Can't find Save button"
- Scroll down to see it
- Shows only when you have unsaved changes
- Grayed out? = No changes to save

### "Score didn't save"
- Did you click the "Save" button?
- Did you see success message?
- Check internet connection
- Refresh page to verify

---

## 📞 Quick Tips

💡 **Tip 1**: Use keyboard Tab to move between fields quickly

💡 **Tip 2**: Decimal values work (e.g., 7.5, 8.25)

💡 **Tip 3**: Empty fields = no score (treated as 0 for display)

💡 **Tip 4**: Total and grade auto-calculate - don't enter manually

💡 **Tip 5**: Save all changes at once (don't save individual scores)

---

## 📱 Support

- **Dark Mode**: Settings → Theme (toggle)
- **Logout**: Top right corner
- **Go Back**: Teacher dashboard button
- **Error Help**: Check browser console (F12)

---

**Ready to enter scores?** Go to `http://localhost:3001/teacher/class-scoresheet` 🎯
