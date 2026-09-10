# 🚨 FIX: Create Teachers Table - Copy & Paste Solution

**Error**: `Could not find the table 'public.teachers'`  
**Time**: 1 minute  
**Difficulty**: Copy & Paste (super easy)

---

## ✅ Step 1: Copy This SQL

```sql
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  salary DECIMAL(12, 2),
  teaching_level VARCHAR(50),
  qualification TEXT,
  experience_years INT,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, email),
  UNIQUE(school_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
```

---

## ✅ Step 2: Paste into Supabase

1. Go to **https://app.supabase.com**
2. Select your project
3. Click **SQL Editor** (left menu)
4. Click **New query**
5. **Paste the SQL above** (Ctrl+V)
6. Click **Run** button (or Ctrl+Enter)

---

## ✅ Step 3: Verify Success

You should see:
```
✓ Success
```

---

## ✅ Step 4: Test

Go back to your app and try:
- Registering a teacher
- Should work now! ✅

---

## What This Fixes

✅ Teacher registration now works  
✅ Teacher records saved to database  
✅ Subjects can be assigned  
✅ Classes can be assigned  

---

## That's It!

You're done. Teachers can now register successfully.

---

**🎯 DO THIS NOW → Copy SQL above, go to Supabase SQL Editor, paste, run**
