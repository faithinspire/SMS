# Fix: Score Sheet 404 Error - Clear Browser Cache

## Problem
Score sheet page shows 404 errors when trying to load:
```
GET http://localhost:3001/teacher/score-sheet 404 (Not Found)
```

This is caused by a cached service worker trying to fetch pages from the network.

## Solution - Clear Everything (Browser Level)

### Chrome/Chromium/Edge
1. Open DevTools: **F12**
2. Go to **Application** tab
3. In left sidebar, click **Storage**
4. Click **Clear site data** (or use the button)
5. Select ALL checkboxes:
   - ☑ Cookies
   - ☑ Cache Storage
   - ☑ Databases
   - ☑ File System
   - ☑ Local Storage
   - ☑ Session Storage
   - ☑ Service Workers
   - ☑ WebSQL
6. Click **Clear**
7. Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)

### Firefox
1. Open DevTools: **F12**
2. Go to **Storage** tab
3. Under **Local Storage**, right-click and **Delete All**
4. Under **Cookies**, right-click and **Delete All**
5. Go to **Application** → **Service Workers** → Unregister all
6. Hard refresh: **Ctrl+Shift+R**

### Safari
1. Open Safari Preferences: **Cmd+,**
2. Go to **Privacy** tab
3. Click **Manage Website Data**
4. Search for **localhost**
5. Select it and click **Remove**
6. Hard refresh: **Cmd+Shift+R**

---

## Technical Fix (Done)

Updated `next.config.js` to:
- ✅ Never cache localhost pages during development
- ✅ Use NetworkOnly handler for localhost routes
- ✅ Service worker will now fetch fresh pages every time

---

## After Clearing Cache

1. Close the browser completely
2. Reopen the app: http://localhost:3001
3. Login as teacher
4. Navigate to Score Sheet
5. **Should now load without 404 errors** ✅

---

## If Still Getting 404s

Try this nuclear option:
1. **Close the dev server** (Ctrl+C)
2. **Clear .next folder**:
   ```bash
   rmdir /s /q .next
   ```
3. **Restart dev server**:
   ```bash
   npm run dev
   ```
4. Clear browser cache again (steps above)
5. Hard refresh the page

---

## Why This Happened

- Service worker was caching **all** requests
- When page code changed, cached service worker tried to fetch stale version
- No new API endpoint existed, so it returned 404
- Browser served the 404 from cache indefinitely

**The fix ensures development pages are never cached.**

