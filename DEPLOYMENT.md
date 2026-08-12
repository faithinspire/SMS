# Deployment Guide - School Management System

## Prerequisites

- Vercel account with GitHub connected
- Supabase project
- Node.js 18+
- Supabase CLI installed: `npm install -g supabase`

---

## Step 1: Set Up Supabase Project

### Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Choose region and password
4. Wait for project to initialize

### Get Credentials
1. Go to Project Settings → API
2. Copy:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **Anon Key** (NEXT_PUBLIC_SUPABASE_ANON_KEY)
3. Go to Project Settings → Database
4. Copy connection password (if needed)

### Apply Database Migrations

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install CLI globally (if not already done)
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (from project directory)
supabase link --project-ref your-project-id

# Push migrations to Supabase
supabase db push
```

#### Option B: Manual SQL Execution

1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Copy contents of `database/migrations/001_initial_schema.sql`
4. Paste and execute
5. Verify all tables created successfully

---

## Step 2: Set Up Vercel Project

### Push Code to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Phase 1 implementation"

# Add remote
git remote add origin https://github.com/your-username/school-management-saas.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### Create Vercel Project

1. Go to https://vercel.com
2. Click "Add New..." → Project
3. Select your GitHub repository
4. Click "Import"
5. Framework → Next.js (auto-detected)
6. Click "Deploy"

---

## Step 3: Configure Environment Variables

### In Vercel Dashboard

1. Go to your Vercel project
2. Settings → Environment Variables
3. Add the following variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
JWT_SECRET = your-secure-random-string-here

# External Services (add when ready)
SENDGRID_API_KEY = (leave empty for now)
TWILIO_ACCOUNT_SID = (leave empty for now)
PAYSTACK_PUBLIC_KEY = (leave empty for now)
```

### Generate JWT_SECRET

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

4. Redeploy project after adding variables:
   - Click "Redeploy" or push new commit to trigger redeploy

---

## Step 4: Configure Supabase Storage Buckets

### Create Storage Buckets

In Supabase Dashboard → Storage:

1. Create bucket: `schools`
   - Policy: Public
   - For school logos and general files

2. Create bucket: `users`
   - Policy: Public
   - For user photos

3. Create bucket: `uploads`
   - Policy: Private (default)
   - For student submissions and attachments

### Configure CORS

Supabase → Settings → CORS:

Add your Vercel domain:
```
https://your-project.vercel.app
https://www.your-project.vercel.app
```

---

## Step 5: Configure Row-Level Security (RLS)

### Verify RLS Policies

In Supabase Dashboard → SQL Editor, run:

```sql
-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE rowsecurity = true;
```

### Test RLS Policies

1. Create test user
2. Attempt to query other school's data
3. Should return 0 rows (isolation working)

---

## Step 6: Set Up Email Service (SendGrid)

### Create SendGrid Account

1. Go to https://sendgrid.com
2. Sign up and verify
3. Create API key
4. Set permission: "Restricted Access" → select Mail Send

### Add to Vercel

1. Vercel Dashboard → Environment Variables
2. Add: `SENDGRID_API_KEY = your-key`
3. Redeploy

### Test Email Service

```bash
# Create a test file to verify
npm run test:email
```

---

## Step 7: Set Up WhatsApp Notifications (Optional - Phase 2)

### Create Twilio Account

1. Go to https://twilio.com
2. Sign up and verify phone number
3. Get: Account SID, Auth Token
4. Set up WhatsApp sandbox

### Add to Vercel

```
TWILIO_ACCOUNT_SID = your-sid
TWILIO_AUTH_TOKEN = your-token
TWILIO_WHATSAPP_NUMBER = +1234567890
```

---

## Step 8: Set Up Payment Gateway (Optional - Phase 3)

### For Nigeria (Paystack)

1. Go to https://paystack.com
2. Sign up as merchant
3. Get Public Key and Secret Key
4. Add to Vercel:
   ```
   PAYSTACK_PUBLIC_KEY = pk_live_xxx
   PAYSTACK_SECRET_KEY = sk_live_xxx
   ```

### For Other Regions (Stripe)

1. Go to https://stripe.com
2. Create account
3. Get API keys
4. Add to Vercel:
   ```
   STRIPE_PUBLIC_KEY = pk_live_xxx
   STRIPE_SECRET_KEY = sk_live_xxx
   ```

---

## Step 9: Configure Custom Domain (Optional)

### Add Custom Domain in Vercel

1. Vercel Project → Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions
4. Update SSL certificate (auto via Vercel)

---

## Step 10: Set Up Monitoring & Backups

### Enable Vercel Analytics

1. Vercel Project → Analytics
2. Enable Web Vitals

### Enable Supabase Backups

1. Supabase → Settings → Backups
2. Enable daily automatic backups
3. Set backup retention to 30 days

### Configure Monitoring

1. Optional: Connect to Sentry for error tracking
2. Optional: Set up uptime monitoring

---

## Step 11: Testing Production

### Test Login Flow

```
1. Go to https://your-app.vercel.app
2. Register Super Admin at /auth/super-admin/register
3. Log in with Super Admin credentials
4. Test basic operations
5. Create test school
6. Test School Admin login
```

### Test Data Isolation

```
1. Log in as School A admin
2. Query database for School B data
3. Should return: ERROR - data not accessible
```

### Test Performance

1. Vercel Analytics → Real Experience Monitoring
2. Lighthouse audit
3. Check load times (target: <3s)

---

## Step 12: Set Up CI/CD Pipeline (Optional)

### GitHub Actions for Tests

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm run lint
      - run: npm run test
```

### GitHub Actions for Build

Vercel auto-deploys on push, but you can add custom build checks.

---

## Troubleshooting

### "Cannot find Supabase client"
- Check `.env.local` has correct URL and keys
- Restart dev server: `npm run dev`

### "RLS policy violated"
- Ensure JWT includes `school_id` claim
- Check RLS policies created in database

### "CORS error on file upload"
- Add Vercel domain to Supabase CORS settings
- Use correct bucket name in code

### "Email not sending"
- Verify SendGrid API key in Vercel
- Check SendGrid sender domain verified
- Look at SendGrid Activity feed for bounce reasons

### "Database migration failed"
- Use Supabase CLI: `supabase db pull` to get current state
- Fix conflicts and retry: `supabase db push`
- Or manually execute SQL through dashboard

---

## Production Checklist

- [ ] Database schema migrated
- [ ] RLS policies verified
- [ ] Environment variables configured
- [ ] Storage buckets created
- [ ] CORS configured
- [ ] SendGrid/email service tested
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate valid
- [ ] Backups enabled
- [ ] Monitoring configured
- [ ] Error tracking set up (optional)
- [ ] Smoke tests passed
- [ ] Admin panel accessible
- [ ] User login flows working
- [ ] Data isolation verified

---

## Rollback Procedure

If deployment goes wrong:

```bash
# Option 1: Revert last Vercel deployment
# Vercel Dashboard → Deployments → Select previous → "Promote to Production"

# Option 2: Revert Git commit
git revert HEAD
git push

# Option 3: Restore database backup
# Supabase Dashboard → Settings → Backups → Restore
```

---

## Performance Optimization (Post-Deployment)

1. **Enable Caching**: Vercel → Settings → Caching
2. **Image Optimization**: Enable next/image optimization
3. **CDN Configuration**: Use Vercel Edge Network
4. **Database Indexing**: Verify all indexes created (see schema)
5. **Query Optimization**: Monitor slow queries in Supabase

---

## Support & Monitoring

### Useful Links
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://app.supabase.com
- GitHub Repository: https://github.com/your-repo

### Monitoring Commands
```bash
# Check deployment status
vercel status

# View Supabase logs
supabase logs --project-ref=your-project-id

# Test database connection
psql [Supabase connection string]
```

---

**Deployment complete! Your multi-tenant school management system is live.** 🎉
