# QUICK FIX - RUN THIS NOW

## The Error
```
404 errors for static files (main-app.js, app-pages-internals.js, fonts)
```

## The Fix (Choose One)

### OPTION A: Fastest (PowerShell)
```powershell
# 1. Open PowerShell in project folder
# 2. Run this:
.\rebuild.ps1

# 3. Then run:
npm run dev

# 4. Open: http://localhost:3000
```

### OPTION B: Fastest (Command Prompt)
```cmd
# 1. Open Command Prompt in project folder
# 2. Run this:
rebuild.bat

# 3. Then run:
npm run dev

# 4. Open: http://localhost:3000
```

### OPTION C: Manual (If scripts don't work)
```bash
# 1. Stop dev server (Ctrl+C)

# 2. Open PowerShell and run:
rm -r .next
npm run build
npm run dev

# 3. Open: http://localhost:3000
```

### OPTION D: Maximum Clean
```bash
# 1. Stop dev server (Ctrl+C)

# 2. Open PowerShell and run:
taskkill /F /IM node.exe
rm -r .next
rm -r node_modules
npm install
npm run build
npm run dev

# 3. Open: http://localhost:3000

# 4. Browser: Press Ctrl+Shift+Delete to clear cache

# 5. Refresh: Ctrl+F5
```

---

## If Still Not Working

### Check 1: Does .next folder exist?
```bash
# Should show folders: standalone, static, etc.
ls -la .next
```

### Check 2: Did build succeed?
```bash
# Should show: ✓ Compiled in X.XXs
npm run build
```

### Check 3: Check browser console
```
Press F12 → Console tab
Should be clean (no red errors about 404)
```

### Check 4: Nuclear option
```bash
rm -r .next node_modules
npm install
npm run build
npm start
```

---

## What You'll See When Fixed

### Terminal Output
```
✓ Compiled successfully!
ready - started server on 0.0.0.0:3000
```

### Browser
- No 404 errors in console
- No red X on network requests
- Page loads fully
- Dashboard accessible

---

## Expected Results After Fix

✅ You can now:
- Register students (with School Level dropdown)
- Register teachers (with Teaching Level dropdown)
- See classes dropdown populated
- See subjects dropdown populated
- All modals work
- No build errors

---

**Choose an option above and run it. Should take 2-5 minutes.**
