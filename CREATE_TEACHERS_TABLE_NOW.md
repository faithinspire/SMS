# 🚨 URGENT: Create Teachers Table in Supabase

**Error**: `Could not find the table 'public.teachers'`  
**Fix**: Run SQL in Supabase editor (1 minute)

---

## How to Fix (Now)

### 1. Open Supabase Console
- Go to https://app.supabase.com
- Select your project
- Go to **SQL Editor**
- Click **New query**

### 2. Copy This SQL
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

### 3. Click Run
- Press Ctrl+Enter or click Run button
- Wait for ✓ Success

### 4. Test
- Go back to app
- Try registering a teacher
- Should work now ✅

---

## Done!

Teacher registration should now work smoothly.

All features:
- ✅ Password field
- ✅ Email trimming
- ✅ Auto-retry
- ✅ Teacher record creation ← FIXED
- ✅ Subjects assignment
- ✅ Class assignment

---

**Time**: 1 minute  
**Risk**: None  
**Do It Now** → Copy SQL above, run in Supabase SQL Editor
