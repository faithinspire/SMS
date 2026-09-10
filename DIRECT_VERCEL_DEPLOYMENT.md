# Direct Vercel Deployment - Step-by-Step Guide

## 🎯 Two Ways to Deploy to Vercel

### **Option 1: Web Dashboard (Easiest - No Terminal Required)**

#### Step 1: Prepare Your GitHub Repository
1. Open Git Bash or PowerShell in your project folder
2. Commit your changes:
   ```bash
   git add .
   git commit -m "fix: mobile UI and add navigation links"
   git push -u origin main
   ```

#### Step 2: Go to Vercel
1. Visit **https://vercel.com**
2. Click **Sign Up** (or Sign In if you have an account)
3. Choose: GitHub, GitLab, or Bitbucket
4. Authorize Vercel to access your repositories

#### Step 3: Import Your Project
1. After signing in, click **"Add New..."** button
2. Select **"Project"**
3. Find your **"SMS"** or **"school-management-saas"** repository
4. Click **"Import"**

#### Step 4: Configure Project Settings
The page will show default settings. Click **"Continue"** to proceed.

#### Step 5: Set Environment Variables
You'll see a section called "Environment Variables". Add these:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://egdreueuspmuxhezdpqm.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NjA0MzksImV4cCI6MjA5NzUzNjQzOX0.egM1RzKJ6ThUy6xrz_Os3OYsy_p5Oyyr0RxL9N1tbGI` |
| `NEXT_PUBLIC_SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2MDQzOSwiZXhwIjoyMDk3NTM2NDM5fQ.Ae9n1r6m_hkvQNqACjIoe--bNcTfJ9AMzSW2VcRxMZk` |
| `SUPABASE_SERVICE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2MDQzOSwiZXhwIjoyMDk3NTM2NDM5fQ.Ae9n1r6m_hkvQNqACjIoe--bNcTfJ9AMzSW2VcRxMZk` |
| `JWT_SECRET` | `Y4BadSPlcSc2XS/7QSWs57PW0SlZDMO517OaleR6I9csGI4kNmJA/pSQcmGSctilU48Elh/lg0Zab3vQ7LUReA==` |
| `JWT_REFRESH_SECRET` | `RefreshSecret123456789012345678901234567890` |
| `TOKEN_EXPIRY` | `24h` |
| `REFRESH_TOKEN_EXPIRY` | `7d` |
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app-name.vercel.app` |

**How to add them:**
1. Click on "Add" next to Environment Variables
2. Enter the key and value
3. Click "Add Secret" or "Add"
4. Repeat for each variable

#### Step 6: Deploy
1. Click the **"Deploy"** button
2. Wait for the build to complete (usually 2-3 minutes)
3. You'll see a success message with your live URL

**🎉 Your app is now live!**

---

### **Option 2: Vercel CLI (For Advanced Users)**

#### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

#### Step 2: Login to Vercel
```bash
vercel login
```
This will open a browser to authenticate. Click "Confirm" when prompted.

#### Step 3: Deploy
Navigate to your project folder and run:
```bash
cd "c:\Users\OLU\Desktop\SMS"
vercel --prod
```

#### Step 4: Answer Prompts
- **Which scope?** → Select your account
- **Link to existing project?** → No (first time)
- **Project name?** → Enter a name (e.g., `ftech-sms`)
- **Directory?** → Press Enter (default is `.`)

#### Step 5: Set Environment Variables
After initial deploy:
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Paste: https://egdreueuspmuxhezdpqm.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Paste your anon key

# ... repeat for other variables
```

Then redeploy:
```bash
vercel --prod
```

---

## 🔧 Quick Reference

### What Gets Deployed?
- Your Next.js app (`src/app/`, `src/components/`, `public/`)
- All API routes (`src/app/api/`)
- Tailwind CSS & styling
- Environment variables (but NOT .env.local)

### What Does NOT Get Deployed?
- `.env.local` file (you add these manually in Vercel)
- `node_modules/` folder
- `.git/` folder
- Database files
- Local logs

### Build Details
- **Framework**: Next.js 14
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Output Directory**: `.next`

---

## ✅ After Deployment

### Test Your Live URLs
Replace `your-app-name` with your actual Vercel domain:

**Principal Dashboard:**
- https://your-app-name.vercel.app/principal/dashboard

**Results Pages:**
- https://your-app-name.vercel.app/principal/results
- https://your-app-name.vercel.app/school-admin/results
- https://your-app-name.vercel.app/headteacher/results

**School Fees Pages:**
- https://your-app-name.vercel.app/principal/school-fees
- https://your-app-name.vercel.app/school-admin/school-fees
- https://your-app-name.vercel.app/headteacher/school-fees

### Mobile Testing
Test on mobile browser or use Chrome DevTools:
1. Press F12 to open DevTools
2. Click the phone icon to toggle device toolbar
3. Set size to 375px width
4. Verify notification bell shows fully on screen

---

## 🚨 Troubleshooting

### Build Fails During Deployment

**Error: "Cannot find module"**
- Solution: Delete `node_modules` and `package-lock.json` locally, then push to Git

**Error: "Build timed out"**
- Solution: Check for large files or infinite loops in your code

**Error: "Supabase connection failed"**
- Solution: Verify environment variables are set correctly in Vercel dashboard

### Deployment Success but Pages Show Errors

**Blank page or 500 error:**
1. Go to Vercel dashboard → Your project → Deployments
2. Click "Logs" to see error details
3. Check if environment variables are properly set

**Can't access Supabase:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Verify NEXT_PUBLIC_SUPABASE_URL is correct

---

## 📊 Vercel Dashboard Navigation

Once deployed, you can:

1. **View Deployments**: See all versions of your app
2. **Check Logs**: Click "Logs" to debug issues
3. **Add Environment Variables**: Settings → Environment Variables
4. **Monitor Performance**: Analytics tab
5. **Configure Domain**: Settings → Domains
6. **Add Custom Domain**: Buy or connect your own domain

---

## 🎯 Your Deployment Checklist

- [ ] GitHub repository pushed with all changes
- [ ] Created Vercel account at vercel.com
- [ ] Imported project from GitHub
- [ ] Added all 9 environment variables
- [ ] Clicked Deploy
- [ ] Waited for build to complete (green checkmark)
- [ ] Tested principal/results page
- [ ] Tested principal/school-fees page
- [ ] Tested mobile responsive (375px)
- [ ] Shared URL with your team

---

## 💡 Pro Tips

1. **Auto-deployments**: Every time you push to `main` branch on GitHub, Vercel automatically deploys
2. **Preview URLs**: Each pull request gets its own preview URL for testing
3. **Rollback**: If something breaks, you can instantly revert to previous deployment
4. **Custom Domain**: Point your own domain (schoolmgmt.com) to Vercel
5. **Free Plan**: Vercel free tier supports unlimited deployments

---

## 📝 Example Vercel Domain Names

After deploying, your URL will be something like:
- `ftech-sms.vercel.app`
- `school-management-saas.vercel.app`
- `sms.your-username.vercel.app`

You can customize the name in Vercel dashboard under Project Settings.

---

## 🎉 You're Done!

Your FTECH School Management System is now live on the internet! 🚀

Share your Vercel URL with:
- School principal
- Teachers
- Students
- Admin staff

Everyone can now access it from any device with internet!

