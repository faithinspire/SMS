# Windows Development Troubleshooting Guide

## Issue 1: npm scripts not finding 'next' command

### Symptoms
```
'next' is not recognized as an internal or external command
```

### Root Cause
Windows cmd doesn't automatically add node_modules/.bin to PATH like some systems do.

### Solutions (Try in order)

#### Solution 1A: Use npx (Recommended)
```cmd
cd C:\Users\OLU\Desktop\SMS
npx next dev
```

#### Solution 1B: Use full path directly
```cmd
cd C:\Users\OLU\Desktop\SMS
node node_modules/next/dist/bin/next.js dev
```

#### Solution 1C: Fix npm PATH issue
```cmd
npm install -g npm@latest
npm cache clean --force
npm install
npm run dev
```

#### Solution 1D: Use .cmd shim
```cmd
cd C:\Users\OLU\Desktop\SMS
.\node_modules\.bin\next.cmd dev
```

---

## Issue 2: Port 3000 already in use

### Symptoms
```
Error: listen EADDRINUSE: address already in use :::3000
```

### Solution 1: Kill existing process
```cmd
netstat -ano | findstr :3000
```
This shows the PID. Then:
```cmd
taskkill /PID [PID_NUMBER] /F
```
Then restart:
```cmd
npm run dev
```

### Solution 2: Use different port
```cmd
PORT=3001 npm run dev
```
Then visit: http://localhost:3001

### Solution 3: PowerShell approach
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
npm run dev
```

---

## Issue 3: npm install hangs or takes forever

### Symptoms
- Stuck on downloading packages
- Spinner keeps spinning for >10 minutes
- Progress bar not moving

### Solutions

#### Solution 3A: Clear cache and retry
```cmd
npm cache clean --force
npm install --no-audit
```

#### Solution 3B: Use legacy peer deps
```cmd
npm install --legacy-peer-deps
```

#### Solution 3C: Increase timeout
```cmd
npm install --prefer-offline --no-audit --fetch-timeout=120000
```

#### Solution 3D: Use yarn (if installed)
```cmd
yarn install
```

#### Solution 3E: Remove node_modules and try again
```cmd
rmdir /s /q node_modules
npm install
```

---

## Issue 4: Module not found errors

### Symptoms
```
Error: Cannot find module '@/services/...'
```

### Solutions

#### Solution 4A: Rebuild binaries
```cmd
npm rebuild
```

#### Solution 4B: Clear Next.js cache
```cmd
del /s /q .next
npm run dev
```

#### Solution 4C: Ensure all dependencies installed
```cmd
npm install
npm install --legacy-peer-deps
npm rebuild
npm run dev
```

---

## Issue 5: Database connection failed

### Symptoms
```
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: Supabase connection failed
```

### Solutions

#### Solution 5A: Verify environment variables
Check `.env.local` exists and contains:
```
NEXT_PUBLIC_SUPABASE_URL=https://egdreueuspmuxhezdpqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
```

#### Solution 5B: Check internet connection
```cmd
ping google.com
```
If fails, you need internet to connect to Supabase cloud.

#### Solution 5C: Verify Supabase project is active
1. Go to https://supabase.com
2. Login to your account
3. Check project status is "Active"
4. Verify API keys are correct

#### Solution 5D: Test connection
```cmd
cd C:\Users\OLU\Desktop\SMS
npm run build
```
If build succeeds, database connection is working.

---

## Issue 6: TypeScript compilation errors

### Symptoms
```
Type 'undefined' is not assignable to type 'string'
Cannot find type definition file for 'node'
```

### Solutions

#### Solution 6A: Reinstall type definitions
```cmd
npm install --save-dev @types/node @types/react @types/react-dom typescript
npm run build
```

#### Solution 6B: Clear TypeScript cache
```cmd
del /s /q .next
npm run build
```

#### Solution 6C: Check tsconfig.json
Ensure it has:
```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "esModuleInterop": true
  }
}
```

---

## Issue 7: Tailwind CSS not loading

### Symptoms
- Styles not applied
- Pages look unstyled
- Colors not showing

### Solutions

#### Solution 7A: Rebuild Tailwind cache
```cmd
del /s /q .next
npm run dev
```

#### Solution 7B: Verify Tailwind installation
```cmd
npm install -D tailwindcss postcss autoprefixer
npm run dev
```

#### Solution 7C: Check CSS import
Ensure `src/app/layout.tsx` has:
```typescript
import '@/styles/globals.css'
```

---

## Issue 8: Can't connect to http://localhost:3000

### Symptoms
- Browser shows "Cannot reach localhost"
- Connection refused
- Timeout error

### Solutions

#### Solution 8A: Verify server started
Check terminal output shows:
```
> next dev
> Listening on http://localhost:3000
```

#### Solution 8B: Try different address
Try in browser:
```
http://127.0.0.1:3000
```

#### Solution 8C: Check Windows Firewall
1. Windows Defender Firewall → Allow apps through firewall
2. Look for Node.js
3. Check both "Private" and "Public" boxes
4. Restart dev server

#### Solution 8D: Wait for compilation
First start takes 20-30 seconds. Wait for:
```
ready - started server on 0.0.0.0:3000
```

---

## Issue 9: "Cannot find browser" error

### Symptoms
```
Error: Failed to launch browser instance
Browser is not available
```

### Solutions
- This is not a blocker - server still runs
- Just means Next.js can't open browser
- Manually open: http://localhost:3000

---

## Issue 10: Permission Denied errors

### Symptoms
```
EACCES: permission denied
Error: EACCES
```

### Solutions

#### Solution 10A: Run as Administrator
1. Open Command Prompt as Administrator
2. Navigate to project
3. Run: `npm install && npm run dev`

#### Solution 10B: Fix npm permissions
```cmd
mkdir %appdata%\npm-global
npm config set prefix "%appdata%\npm-global"
```

---

## Quick Fix Script

Create file `C:\Users\OLU\Desktop\SMS\quick-fix.cmd`:

```cmd
@echo off
echo Cleaning up...
rmdir /s /q .next
del /s /q node_modules
echo Reinstalling...
npm cache clean --force
npm install --legacy-peer-deps
echo Rebuilding...
npm rebuild
echo Starting server...
npm run dev
```

Then run:
```cmd
quick-fix.cmd
```

---

## Alternative: Use VS Code Terminal

### Why it helps
- VS Code PowerShell has better npm integration
- Built-in terminal debugger
- Better error formatting

### How to use
1. Open VS Code
2. Press `Ctrl + ~` (backtick)
3. Run: `npm run dev`
4. Visit: http://localhost:3000

---

## Performance Tips

### Make npm faster
```cmd
npm install --prefer-offline --no-audit
```

### Speed up dev server
```cmd
npm run dev -- --experimental-app-dir
```

### Skip linting during dev
Edit package.json script:
```json
"dev": "next dev --no-lint",
```

---

## Environment Setup Verification

Create file `verify-setup.cmd`:

```cmd
@echo off
echo Checking setup...
echo.
echo Node version:
node --version
echo.
echo npm version:
npm --version
echo.
echo Project exists:
if exist package.json (echo OK - package.json found) else (echo ERROR - package.json not found)
echo.
echo .env.local exists:
if exist .env.local (echo OK - .env.local found) else (echo ERROR - .env.local not found)
echo.
echo node_modules exists:
if exist node_modules (echo OK - node_modules found) else (echo ERROR - node_modules not found)
echo.
echo All checks passed!
```

Run it:
```cmd
verify-setup.cmd
```

---

## Debugging Mode

To see detailed logs:

```cmd
set DEBUG=next:*
npm run dev
```

Or in PowerShell:
```powershell
$env:DEBUG = "next:*"
npm run dev
```

---

## Key Files to Check

If you get stuck, verify these files exist:

- ✅ `package.json` - Dependency list
- ✅ `.env.local` - Environment config
- ✅ `tsconfig.json` - TypeScript config
- ✅ `next.config.js` - Next.js config
- ✅ `tailwind.config.ts` - Tailwind config
- ✅ `postcss.config.js` - PostCSS config
- ✅ `src/app/layout.tsx` - Root layout
- ✅ `src/styles/globals.css` - Global styles
- ✅ `src/lib/supabase-client.ts` - DB client

All should be present.

---

## Getting Help

If none of these work:

1. **Check Kiro logs**: See error messages in console
2. **Check file permissions**: Ensure write access to project folder
3. **Check disk space**: Ensure >2GB free
4. **Check Node version**: Use `node --version` (v14+ needed)
5. **Try different terminal**: PowerShell vs cmd vs Git Bash
6. **Restart computer**: Sometimes Windows gets confused
7. **Reinstall Node**: From https://nodejs.org

---

## Success Indicators

When everything works, you should see:

```
> school-management-saas@0.1.0 dev
> next dev

▲ Next.js 14.0.0
- Local:        http://localhost:3000
- Environments: .env.local

✓ Ready in 2.5s
```

Then opening http://localhost:3000 shows the login page. ✅

---

*Last Updated: August 10, 2026*
