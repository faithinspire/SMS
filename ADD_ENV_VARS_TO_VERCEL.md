# ✅ ADD THESE ENVIRONMENT VARIABLES TO VERCEL

**CRITICAL:** These 3 variables must be added to Vercel for the dashboard to work.

---

## Step-by-Step Instructions

### Step 1: Go to Vercel Dashboard
https://vercel.com/dashboard

### Step 2: Select SMS Project
Click on the **SMS** project

### Step 3: Go to Settings
Click the **Settings** tab at the top

### Step 4: Environment Variables
In the left sidebar, click **Environment Variables**

### Step 5: Add Three Variables

Copy and paste each one exactly as shown below:

---

### Variable 1: NEXT_PUBLIC_SUPABASE_URL

| Field | Value |
|-------|-------|
| **Name** | `NEXT_PUBLIC_SUPABASE_URL` |
| **Value** | `https://egdreueuspmuxhezdpqm.supabase.co` |
| **Environments** | Check all (Production, Preview, Development) |

Click **Save**

---

### Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY

| Field | Value |
|-------|-------|
| **Name** | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Value** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NjA0MzksImV4cCI6MjA5NzUzNjQzOX0.egM1RzKJ6ThUy6xrz_Os3OYsy_p5Oyyr0RxL9N1tbGI` |
| **Environments** | Check all (Production, Preview, Development) |

Click **Save**

---

### Variable 3: SUPABASE_SERVICE_ROLE_KEY

| Field | Value |
|-------|-------|
| **Name** | `SUPABASE_SERVICE_ROLE_KEY` |
| **Value** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2MDQzOSwiZXhwIjoyMDk3NTM2NDM9fQ.Ae9n1r6m_hkvQNqACjIoe--bNcTfJ9AMzSW2VcRxMZk` |
| **Environments** | Check all (Production, Preview, Development) |

Click **Save**

---

## Step 6: Redeploy

After adding all 3 variables:

1. Go back to **Deployments** tab
2. Find the latest deployment
3. Click the **three dots menu** (•••)
4. Click **Redeploy**

---

## After Redeployment

Once Vercel finishes building (2-3 minutes):

1. Open: https://sms-gold-eta.vercel.app/school-admin/dashboard
2. You should see **Staff** and **Students** loading
3. **Broadcast** tab should work

---

## Troubleshooting

**Still not working?**
- Clear browser cache: `Ctrl+Shift+Delete` and clear all
- Hard refresh: `Ctrl+Shift+R`
- Wait 5 minutes for Vercel cache to clear
- Check Vercel Function logs for errors

---

## What These Variables Do

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public, safe to expose) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend read-only key (public, safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend full-access key (**SECRET** - never expose) |

The **service role key** allows the backend API to bypass RLS and fetch all staff/students data.

---

## Security Note

The service role key is a **SECRET** - never commit it to GitHub or expose it in code. Only store it in:
- ✅ Vercel Environment Variables (secret)
- ✅ `.env.local` (local development only, not committed)
- ❌ Version control
- ❌ Public URLs
- ❌ Client-side code

---

## Done!

After redeployment, the dashboard will load staff, students, and broadcast will work. ✅
