# ⚡ Quick Fix Guide - Photos Not Showing

## The Issue
✅ Student uploads photo successfully  
❌ Photo shows broken image icon

## The Fix (Copy-Paste Instructions)

### 1. Open Supabase Dashboard
- Go to: https://app.supabase.com
- Click your project: **egdreueuspmuxhezdpqm**
- Click **Storage** (left sidebar)

### 2. Fix student-documents bucket
```
1. Find: student-documents
2. Click Edit (or click the bucket)
3. Find the SETTINGS section
4. Set: Public = ON ✅
5. Set: Row Level Security = OFF ❌
6. Click Save
```

### 3. Fix school-logos bucket  
```
Repeat step 2 for: school-logos
```

### 4. Fix lesson-notes bucket
```
Repeat step 2 for: lesson-notes
```

### 5. Test
- Go to: http://localhost:3000/student/dashboard
- Click "Choose Photo"
- Select an image file
- See it display (not broken!) ✅

Done! ✨

---

## Visual Checklist

After each bucket, verify:
- [ ] Public: **✅ ON** (green toggle)
- [ ] RLS: **❌ OFF** (gray toggle)  
- [ ] Settings saved

---

## If You Get Stuck

**Problem**: Can't find Edit button
- Try: Right-click the bucket name → Edit

**Problem**: Can't find Public/RLS settings
- Try: Refresh page (F5)
- Try: Look for a Policies tab

**Problem**: Still broken after fixing
- Try: Go to http://localhost:3000/admin/system/storage-setup
- Look at: "Current Bucket Status"
- Follow any recommendations shown

**Problem**: Don't have Supabase access
- Need: https://app.supabase.com login
- Need: Project access to egdreueuspmuxhezdpqm

---

## After Fix Works

Once photos display:
- ✅ Broadcasts ready to test
- ✅ Logos show on dashboards  
- ✅ CBT exams show student photos

Test broadcast:
1. Go to: http://localhost:3000/admin/dashboard
2. Find: Send Broadcast button
3. Send test message to Teachers
4. Login as teacher
5. See inbox icon with notification ✅

---

That's it! Literally 5 minutes. 🚀
