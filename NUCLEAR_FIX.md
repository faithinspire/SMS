# NUCLEAR FIX - COMPLETE SYSTEM REBUILD

## The Problem
Build is completely broken due to corrupted files.

## The Solution

### STEP 1: Stop Everything
```
Kill all Node.js processes:
1. Open Task Manager (Ctrl+Shift+Esc)
2. Find "node.exe"
3. Right-click → End Task
4. Confirm
```

### STEP 2: Delete Problematic Folders
```powershell
cd c:\Users\OLU\Desktop\SMS

# Delete build artifacts
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force out
Remove-Item -Recurse -Force dist

# Delete dependencies
Remove-Item -Recurse -Force node_modules

# Delete cache
Remove-Item -Force package-lock.json
```

### STEP 3: Complete Fresh Install
```powershell
# From c:\Users\OLU\Desktop\SMS

npm cache clean --force
npm install
```

### STEP 4: Build
```powershell
npm run build
```

If build fails, run:
```powershell
npm run build -- --debug 2>&1 | Out-File build-error.log
```

### STEP 5: Start Development
```powershell
npm run dev
```

### STEP 6: Test
Open browser: http://localhost:3000/school-admin/dashboard

## If Still Broken

### Nuclear Option A: Restore from Git
```powershell
git reset --hard HEAD
npm install
npm run build
npm run dev
```

### Nuclear Option B: Complete Fresh Clone
```powershell
# Backup current folder
Copy-Item -Recurse SMS SMS-backup

# Delete current
Remove-Item -Recurse -Force SMS

# Clone fresh
git clone <repo-url> SMS
cd SMS
npm install
npm run build
npm run dev
```

## Expected Output
```
✓ Compiled successfully
ready - started server on 0.0.0.0:3000
```

## If Compilation Still Fails

Check for these issues:

1. **Corrupt node_modules**
   ```
   rm -r node_modules
   npm install
   ```

2. **Corrupt Next.js cache**
   ```
   rm -r .next
   npm run build
   ```

3. **Memory issues**
   ```
   # Increase Node heap size
   NODE_OPTIONS=--max-old-space-size=4096 npm run build
   ```

4. **Disk space issues**
   - Check free disk space
   - Delete temp files
   - Run Disk Cleanup

---

## FINAL ATTEMPT

If absolutely nothing works:

```powershell
# 1. Complete system clean
cd c:\Users\OLU\Desktop\SMS
taskkill /F /IM node.exe
taskkill /F /IM npm.exe

# 2. Delete everything except src and public
Remove-Item -Recurse -Force .next
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# 3. Fresh install
npm install --prefer-offline --no-audit

# 4. Build
npm run build 2>&1 | Tee build.log

# 5. If error, check build.log
# Share error from build.log for help

# 6. Start
npm run dev
```

---

**This should resolve the build issue 99% of the time.**

**If you reach here and still have issues, share the output of `npm run build` in the build error file.**
