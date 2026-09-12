# MANUAL DEPLOYMENT INSTRUCTIONS - FORCE VERCEL REBUILD

## Current Status
✅ Code changes DONE:
- `src/app/teacher/cbt/page.tsx` - Completely rebuilt with CreateCBTForm component
- `package.json` - Version bumped to 0.1.1 (forces Vercel to rebuild)
- `VERCEL_FORCE_REDEPLOY.txt` - Created to trigger deployment

❌ Git push NOT completed (terminal shell issues)

## What You Need To Do NOW

### Step 1: Push Changes to GitHub
**In your Terminal or Git Bash:**

```bash
cd c:\Users\OLU\Desktop\SMS
git status
```

Expected output: Should show modified files (package.json, VERCEL_FORCE_REDEPLOY.txt, src/app/teacher/cbt/page.tsx)

If files are not staged, run:
```bash
git add -A
git commit -m "FORCE REBUILD: CBT page complete rewrite with CreateCBTForm, version bump to 0.1.1"
git push origin main
```

### Step 2: Verify Push to GitHub
Go to: https://github.com/faithinspire/SMS
- Check that latest commit has the message about "FORCE REBUILD"
- Verify the timestamp is VERY RECENT (within last 5 minutes)

### Step 3: Wait for Vercel Deployment
Go to: https://vercel.com/dashboard
- Find your SMS project
- You should see a NEW deployment starting (status: Building)
- Wait 5-10 minutes for it to complete
- Look for ✅ "Production" with a green checkmark

### Step 4: Test the Fix
In your browser:
1. **Hard Refresh** the app: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. **Go to Teacher Dashboard**
3. **Click CBT Management**
4. **Click "Create New Exam"**
5. **Look for these TWO dropdowns:**
   - ✅ "Academic Term *" dropdown
   - ✅ "Assessment Type *" dropdown

### Step 5: Report Back
Tell me:
- ✅ YES - The Term and Assessment Type dropdowns NOW appear (PROBLEM FIXED)
- ❌ NO - Still the same, no new dropdowns (we have bigger issue)

---

## What These Changes Do

**CBT Page Rebuild (`page.tsx`)**:
- Removed all old inline form code (was 300+ lines)
- Imports and uses `CreateCBTForm` component ONLY
- CreateCBTForm has:
  - Academic Term dropdown (queries `academic_terms` table)
  - Assessment Type dropdown (CA1/CA2/CA3/CA4/EXAM)
  - Full Supabase integration
  - Question builder
  - Automatic score sheet creation

**Version Bump (`package.json` 0.1.0 → 0.1.1`)**:
- Signals Vercel that something changed
- Forces a fresh build without using stale cache
- Breaks through the "green deployment with old code" problem

---

## If This STILL Doesn't Work

Then we have a deeper Vercel/GitHub integration issue:
1. The webhook that triggers deployments might be disconnected
2. Vercel might not be pulling latest commits
3. Build might be failing silently

**In that case:**
- Go to Vercel Project Settings → Integrations
- Disconnect GitHub
- Reconnect GitHub
- Manually trigger a redeploy from the dashboard

---

## Timeline
⏱️ You need to do this within the next 10 minutes for fastest testing
⏱️ Once pushed, wait 5-10 minutes for Vercel build
⏱️ Then test and report back

**This is the critical path to unblocking all other fixes (PHASE 2/3/4).**
