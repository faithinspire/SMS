# Storage RLS Fix - Super Simple Guide

## Problem
Photo uploads fail with: `StorageApiError: new row violates row-level security policy`

## Solution (Pick ONE)

---

## ✅ EASIEST: Use Dashboard

1. Open https://app.supabase.com
2. Click **Storage** (left menu)
3. Click `student-documents` bucket
4. Click **Policies** tab
5. For each policy shown, click **...** → **Delete**
6. Go back (click Storage)
7. Click **...** on `student-documents`
8. Click **Edit bucket**
9. Toggle **Public bucket** ON (should be blue)
10. Toggle **Row Level Security** OFF (should be grey)
11. Click **Save**
12. ✅ Done!

**Repeat steps 3-11 for:** `student-photos`, `teacher-photos`, `school-logos`, `documents`

---

## 🔧 ALTERNATIVE: Use SQL

1. Open https://app.supabase.com
2. Click **SQL Editor** (left menu)
3. Click **New Query**
4. Open this file: `database/migrations/061_final_storage_rls_complete_fix.sql`
5. Copy ALL the text
6. Paste in Supabase SQL editor
7. Click **Run**
8. ✅ Done!

---

## Verify It Works

1. Go to http://localhost:3000
2. Log in as student
3. Go to Dashboard
4. Click "📤 Choose Photo"
5. Pick an image
6. Should see: "✅ Photo uploaded successfully!"

---

## That's It!

Pick dashboard method if unsure. It's visual and easier.
