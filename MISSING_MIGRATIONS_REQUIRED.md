# Missing Database Migrations - Action Required

The SMS system requires running a missing migration in your Supabase database to enable full functionality.

## Issue
When editing staff profiles from the school admin dashboard, users see the error:
```
column users_employment_date does not exist
```

## Root Cause
The database migration that adds payment and employment fields to the users table has not been applied to your Supabase instance.

## Solution
Run the following SQL in your Supabase SQL Editor:

### Step 1: Go to Supabase Console
1. Open https://supabase.com/dashboard
2. Select your project: `egdreueuspmuxhezdpqm`
3. Go to **SQL Editor**

### Step 2: Run This Migration
Copy and paste the entire SQL block below into the SQL Editor and click "Run":

```sql
-- Add payment and employment details to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS salary_amount NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS employment_date DATE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_salary ON users(school_id, salary_amount);
CREATE INDEX IF NOT EXISTS idx_users_employment_date ON users(school_id, employment_date);
```

### Step 3: Verify Success
After running the migration, you should see:
- "Success" message in Supabase
- No errors in the console

### Step 4: Test Staff Profile Edit
1. Go back to your SMS app
2. Navigate to School Admin → Staff Management
3. Click Edit on any staff member
4. The error should now be gone

## What This Migration Does
- Adds `employment_date` (DATE column) - Records when staff was employed
- Adds `bank_name`, `account_number`, `account_holder_name` - Banking details for salary payments
- Adds `salary_amount` (NUMERIC) - Staff salary amount
- Creates indexes for faster queries on salary and employment date

## If Migration Still Fails
If you get an error like "column already exists", that's fine - it means the migration was already partially applied. The `IF NOT EXISTS` clause handles this gracefully.

## Questions?
If you continue to see errors after running this migration, please check:
1. The SQL ran without errors in Supabase
2. The table still shows the error after refreshing the page
3. Check browser console for any detailed error messages

---

**Last Updated:** September 8, 2026
**Status:** Action Required
