# 🚀 EXECUTE DEPLOYMENT NOW

All critical fixes are ready. Execute ONE of these to deploy:

---

## **OPTION 1: Use Vercel CLI (Easiest)**

### Step 1: Open Terminal
```bash
cd c:\Users\OLU\Desktop\SMS
```

### Step 2: Deploy with Vercel CLI
```bash
vercel deploy --prod
```

That's it! Vercel will deploy immediately.

---

## **OPTION 2: Manual Curl Command**

### Step 1: Get your OIDC Token
Open `.env.local` and find: `VERCEL_OIDC_TOKEN=eyJhbGciOiJ...`

### Step 2: Execute Deployment
```bash
curl -X POST https://api.vercel.com/v13/deployments \
  -H "Authorization: Bearer <YOUR_TOKEN_HERE>" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"sms\",\"gitSource\":{\"type\":\"github\",\"ref\":\"main\",\"org\":\"faithinspire\",\"repo\":\"SMS\"},\"target\":\"production\"}"
```

---

## **OPTION 3: Run Node Script**

```bash
cd c:\Users\OLU\Desktop\SMS
node DEPLOY_NOW.js
```

---

## **OPTION 4: Run Batch Script**

```bash
c:\Users\OLU\Desktop\SMS\DEPLOY_VERCEL.bat
```

---

## **OPTION 5: Via GitHub Actions (Already Running)**

Push changes to `main` branch:
```bash
git add -A
git commit -m "HOTFIX: Critical production fixes"
git push origin main
```

Vercel auto-deploys on push to main.

---

## ✅ WHAT'S BEING DEPLOYED

### Code Changes (3 files):
1. `src/services/teacher-data.service.ts` - Accept STAFF + TEACHER roles
2. `src/app/api/admin/dashboard-data/route.ts` - Fix column queries
3. `src/services/letter-generation.service.ts` - Fix staff/student queries

### Database Migration (1 file):
1. `database/migrations/163_add_missing_staff_student_columns.sql` - Add status & department

---

## ⏱️ DEPLOYMENT TIMELINE

- **NOW**: Deploy to Vercel
- **+30 sec**: Build starts
- **+3-5 min**: Build completes
- **+5-7 min**: Live in production ✅

---

## 🧪 AFTER DEPLOYMENT - TEST THESE

- [ ] Register teacher → Login succeeds (not "User is not a teacher")
- [ ] Staff page → Shows realtime staff list
- [ ] Student page → Shows realtime student list
- [ ] Generate staff letter → Succeeds (no column errors)
- [ ] Generate student letter → Succeeds (no column errors)
- [ ] Results page → Shows all sessions (not just "Active")

---

## 🗄️ FINAL STEP: Run Migration in Supabase

After Vercel deployment completes:

1. Go to https://supabase.com → Select your project
2. **SQL Editor** → **New Query**
3. Copy this:

```sql
ALTER TABLE students
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE' 
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'GRADUATED'));

ALTER TABLE staff
ADD COLUMN IF NOT EXISTS department TEXT;

COMMENT ON COLUMN students.status IS 'Student status: ACTIVE, INACTIVE, TRANSFERRED, GRADUATED';
COMMENT ON COLUMN staff.department IS 'Department or unit where staff member works';
```

4. Click **Run** ✅

---

## 📊 VERCEL DASHBOARD

Monitor deployment at:
- https://vercel.com/faithtech-s-projects/sms
- https://sms-gold-eta.vercel.app

---

**Pick ONE option above and execute immediately. The fixes are ready!**

