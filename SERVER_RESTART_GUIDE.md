# Server Restart Required

## The Problem
The error "no-response: The strategy could not generate a response" is a **Service Worker error**, which means:
- The development server crashed or became unresponsive
- Service Worker can't serve the cached content

## Solution: Restart the Dev Server

### Step 1: Stop the Server
1. Find the terminal/command prompt where you ran `npm run dev`
2. Press **Ctrl + C** (or Cmd + C on Mac)
3. Wait for it to stop (you should see "^C" appear)

### Step 2: Start the Server Again
1. In the same terminal, run:
   ```bash
   npm run dev
   ```

2. Wait for it to finish building (you'll see):
   ```
   ▲ Next.js 14.x.x
   - Local:        http://localhost:3000
   ✓ Ready in 1.2s
   ```

### Step 3: Clear Browser Cache
1. Press **Ctrl + Shift + Delete** (or Cmd + Shift + Delete on Mac)
2. Select "All time"
3. Check:
   - ☑️ Cookies
   - ☑️ Cached images and files
4. Click "Clear data"

### Step 4: Refresh the Page
1. Go to http://localhost:3000 in your browser
2. Press **Ctrl + F5** (or Cmd + Shift + R on Mac) to hard refresh
3. You should now see the login page

### Step 5: Log Back In and Try CBT
1. Log in with your teacher account
2. Navigate to CBT Management
3. Try creating a CBT again

## If It Still Doesn't Work

### Check for Build Errors
After running `npm run dev`, look for any error messages in the terminal that start with:
- `ERROR`
- `Error compiling`
- `Failed to compile`

If you see errors, **copy the entire error message and share it**.

### Clear Next.js Cache
1. Delete the `.next` folder:
   ```bash
   # On Windows (in project directory)
   rmdir /s /q .next
   
   # On Mac/Linux
   rm -rf .next
   ```

2. Run dev server again:
   ```bash
   npm run dev
   ```

### Check Port 3000
If you get "Address already in use":
```bash
# Kill the process using port 3000
# On Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# On Mac/Linux
lsof -i :3000
kill -9 <PID>
```

Then run `npm run dev` again.

## Expected Output After Restart

You should see something like:
```
▲ Next.js 14.0.0

 ✓ Compiled client and server successfully

Ready in 2.3s
GET /teacher/cbt-management 200 in 245ms
GET /api/teacher/cbt/create 200 in 123ms
```

If you see `200` status codes, everything is working!

---

**Try restarting now and let me know if the CBT page loads successfully!**
