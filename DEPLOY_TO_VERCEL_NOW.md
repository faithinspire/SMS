# 🚀 Deploy to Vercel - Step by Step

Your project is already connected to Vercel. Here's how to deploy:

## Option 1: Deploy via GitHub (Recommended)

1. **Push your code to GitHub**
```bash
git add .
git commit -m "Complete School Admin System - All 12 tasks done"
git push origin main
```

2. **Vercel will auto-deploy**
   - Vercel automatically watches your GitHub repo
   - When you push to main, it deploys automatically
   - Check your deployment at: https://vercel.com/dashboard

3. **Monitor the deployment**
   - Go to https://vercel.com
   - Click on "sms" project
   - Watch the build progress
   - Once complete, you'll get a live URL

---

## Option 2: Deploy via CLI (Right Now)

1. **Install Vercel CLI** (if you don't have it)
```bash
npm install -g vercel
```

2. **Deploy immediately**
```bash
vercel --prod
```

This will:
- Build your project
- Deploy to production
- Give you a live URL

---

## Option 3: Quick Deploy Using NPM Script

I'll add a deploy script to make it super easy:

```bash
npm run deploy
```

---

## Setting Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Click on your "sms" project
3. Go to **Settings → Environment Variables**
4. Add these variables:

```
NEXT_PUBLIC_SUPABASE_URL = [your supabase url]
NEXT_PUBLIC_SUPABASE_ANON_KEY = [your supabase key]
RESEND_API_KEY = [optional - for email]
NEXT_PUBLIC_APP_URL = https://your-vercel-domain.vercel.app
JWT_SECRET = [your jwt secret]
```

---

## Check Your Deployment Status

1. Open terminal and run:
```bash
vercel logs --prod
```

2. Or visit your Vercel dashboard:
   - https://vercel.com/dashboard
   - Click "sms" project
   - You'll see deployment history and live URL

---

## Your Project Details

- **Project Name**: sms
- **Project ID**: prj_aEoHqwFq43E4vkedEcQ3IfrVlYmY
- **Organization**: team_TL6yFOaJymXvXyXzVF1UmAzo

---

## Quick Start Right Now

Choose ONE of these:

### Deploy Immediately with CLI
```bash
npm install -g vercel
vercel --prod
```

### Or Push to GitHub and Auto-Deploy
```bash
git add .
git commit -m "Complete implementation ready"
git push origin main
```

### Or Use the Web Dashboard
1. Go to https://vercel.com
2. Find "sms" project
3. Click "Redeploy"

---

## Verify Deployment

Once deployed, test these URLs:
- `/school-admin/students` - Student management
- `/school-admin/staff` - Staff management
- `/school-admin/academic` - Academic pages
- `/school-admin/school-fees` - School fees

---

## Need Help?

**Check build status:**
```bash
vercel logs --prod
```

**Check recent deployments:**
```bash
vercel list
```

**Rollback to previous:**
```bash
vercel rollback
```

---

**Ready to go live? Choose an option above and run it! 🚀**
