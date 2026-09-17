# 🚀 DEPLOYMENT ACTION ITEMS - DO THIS NOW

**Commit:** `f7ada6a`  
**Deployed to:** Vercel  
**Status:** Build in progress (2-5 min)

---

## ⚡ CRITICAL ACTION REQUIRED

### Apply Migration 120 to Supabase (Do This First!)

Without this, **CBT scores will NOT auto-populate**.

**Option 1: Using Supabase Dashboard (Easiest)**
1. Go to https://supabase.com → Your Project
2. Click **SQL Editor**
3. Click **New Query**
4. Open this file: `database/migrations/120_cbt_auto_populate_score_sheets.sql`
5. Copy ALL the SQL code
6. Paste it in the SQL Editor
7. Click **Run**
8. You should see success message

**Option 2: Using CLI**
```bash
cd c:\Users\OLU\Desktop\SMS
supabase db push
```

---

## 📋 AFTER DEPLOYMENT CHECKLIST

- [ ] Vercel build completed (check dashboard)
- [ ] Migration 120 applied to Supabase
- [ ] Test manual score entry (still works)
- [ ] Test CBT auto-population (NEW!)
- [ ] Check diagnostic endpoint works
- [ ] Verify term filter shows correct scores

---

## 🧪 QUICK TEST

### Test 1: Manual Score Display
```
1. Go to /teacher/score-sheet
2. Enter CA1=7, CA2=8 for any student/subject
3. Save
4. Go to /teacher/results → click student
5. Should see: CA1=7, CA2=8 in table
```

### Test 2: CBT Auto-Population
```
1. Student completes CBT exam
2. Go to /teacher/results → click student
3. Should see: Exam score appears automatically
4. Source shows: 'CBT'
```

### Test 3: Diagnostic Endpoint
```
Call: /api/admin/diagnostic/scores-audit?schoolId=YOUR_SCHOOL_ID
Should show:
  - totalScoreSheets: number
  - scoresWithValues: number
  - totalCBTResults: number
  - recommendations: array
```

---

## 📊 WHAT'S NEW

**Automatic:**
- CBT scores auto-populate when exam completed
- No teacher action needed
- Result pages update instantly

**Enhanced:**
- Score pages show combined manual + CBT scores
- Can see which score came from which source
- Better error logging for debugging

**New Tools:**
- Diagnostic endpoint to audit score data
- Enhanced logging in browser console
- Source tracking (Manual vs CBT)

---

## 🎯 SUCCESS CRITERIA

✅ Manual scores show on result pages  
✅ CBT scores auto-populate to score_sheets  
✅ Combined scores display correctly  
✅ Overall grade calculated properly  
✅ Term filter shows correct term's scores  
✅ Diagnostic endpoint works  

---

## 📞 TROUBLESHOOTING

### "I don't see CBT scores"
→ Check if migration 120 was applied
→ Call diagnostic endpoint to see actual data

### "Manual scores not showing"
→ Check F12 console for errors
→ Call `/api/admin/diagnostic/scores-audit`

### "Overall score is 0"
→ Check if any scores exist
→ Verify total column is populated in score_sheets

---

## ⏱️ TIMELINE

| When | Action |
|------|--------|
| Now | Code deployed to Vercel |
| +2 min | Vercel build completes |
| +5 min | **Apply migration 120** ⚡ |
| +10 min | Test CBT auto-population |
| +15 min | Verify all scores display |

---

## 📝 NEXT PHASE (Optional)

After verification:
1. Document CBT workflow for teachers
2. Train staff on new system
3. Monitor error logs
4. Gather feedback

---

**ACTION:** Apply migration 120 to Supabase after Vercel deploys  
**Reference:** See `CBT_AND_SCORES_DEPLOYMENT_COMPLETE.md` for full details

**Current Status:** ✅ Code deployed | ⏳ Awaiting migration
