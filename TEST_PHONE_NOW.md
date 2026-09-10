# 📱 TEST ON PHONE - Check Bottom Nav & PWA

**Status:** Foreign key is FIXED ✅ (First two SQL commands ran successfully)

**Now Test:** Bottom navbar + PWA prompt on phone

---

## 🧹 STEP 1: Clear Phone Cache (Important!)

This ensures you see the latest code changes.

### Android Chrome:
1. Open Chrome
2. Tap ⋮ (three dots, top right)
3. Settings
4. Privacy
5. Clear browsing data
6. Select "All time"
7. Check "Cookies and cached images"
8. Tap "Clear data"

### iPhone Safari:
1. Settings
2. Safari
3. Clear History and Website Data
4. Tap "Clear History and Data"

---

## 📱 STEP 2: Open App on Phone

1. **Make sure you're on the SAME WiFi as your PC**
2. **Open any browser** (Chrome, Firefox, Edge, etc.)
3. **Go to:** `http://10.116.212.234:3000`
4. **Log in as teacher**

---

## ✅ STEP 3: Check Mobile Bottom Navbar

**What to look for:**
- 5 icons should appear at the BOTTOM of the screen
- Icons: 📊 (Dashboard), ✓ (Attendance), 📈 (Score Sheet), 🧪 (CBT), ☰ (Menu)
- Icons should have BLUE background/text for the current page
- Navbar should be STICKY at the bottom (stays visible when scrolling)

**Status:**
- ✅ Navbar appears? → Great!
- ❌ Navbar NOT appearing? → Tell me

---

## 🎯 STEP 4: Navigate to Score Sheet

1. Tap the **📈 Score Sheet** icon at the bottom
2. **Wait for page to load**
3. **Check the Term dropdown:**
   - Should say: "Term (3 available)"
   - Should show THREE options:
     - First Term
     - Second Term
     - Third Term

**Status:**
- ✅ All 3 terms showing? → Perfect!
- ❌ Still showing only 1 term? → Tell me

---

## 💾 STEP 5: Try Saving Scores

1. **Select Class** → Subject → **Any Term** (e.g., First Term)
2. **Enter a score** in any test field (e.g., 5)
3. **Scroll down** and tap **"Save X Scores"** button
4. **Wait for response**

**What should happen:**
- ✅ Green message appears: "✅ Saved X scores successfully!"
- ❌ Red error message: Still getting error? → Tell me

---

## 📲 STEP 6: Check PWA Installation Prompt

**IMPORTANT: Do this TWICE to trigger the PWA prompt**

1. **First visit:** You're on the app → No prompt (normal)
2. **Leave the app:**
   - Tap home button
   - Minimize browser
   - Do something else for 10 seconds
3. **Come back to the app:**
   - Reopen browser
   - It should remember the URL
   - OR manually type `http://10.116.212.234:3000` again

**On this 2nd visit, you should see:**
- A box in the **bottom-right corner** with:
  - Title: "📱 Install SMS App"
  - Instructions for Android: "Tap ⋮ menu → Install app"
  - Instructions for iPhone: "Tap Share ↗️ → Add to Home Screen"
  - A "Got It!" button

**Status:**
- ✅ PWA prompt appears? → Perfect!
- ❌ PWA prompt NOT appearing? → Check browser console (see below)

---

## 🔍 STEP 7: Check Browser Console (For Debugging)

If anything doesn't appear, check the console to see what's happening:

### Open Console:
**Chrome/Edge:** Press `F12` → Click "Console" tab  
**Safari:** Settings → Advanced → Web Inspector → Open on any page, click "Console"

### Look for these logs:

**Mobile Navbar:**
```
[MobileNav] Mounted on client
[MobileNav] User role: TEACHER
[MobileNav] Rendering navbar with 5 items
```

**PWA:**
```
[PWA] Page load #1
[PWA] Page load #2
[PWA] ≥2 page loads detected
[PWA] ✨ Manual guide displayed
```

**Score Sheet:**
```
[ScoreSheet] Fetched terms: 3
[ScoreSheet] ✅ Successfully saved scores
```

---

## ✅ EXPECTED RESULTS

### Mobile Navbar:
```
┌──────────────────────────────┐
│     Score Sheet Page         │
│  [Content goes here]         │
│                              │
├──────────────────────────────┤
│📊  ✓  📈  🧪  ☰              │  ← 5 icons at bottom
└──────────────────────────────┘
```

### PWA Prompt (After 2nd Visit):
```
          ┌─────────────────────┐
          │ 📱 Install SMS App  │
          │ Android: Menu→App   │
          │ iPhone: Share→Scr   │
          │ [Got It!]    [X]    │
          └─────────────────────┘
```

### Score Sheet:
- Term shows: "(3 available)"
- Saves with: "✅ Saved X scores successfully!"

---

## 📋 Report Back

Tell me:
1. **Is the mobile navbar showing?** (Yes/No)
2. **Are all 3 terms visible?** (Yes/No)
3. **Do scores save without error?** (Yes/No)
4. **Does PWA prompt appear after 2nd visit?** (Yes/No)
5. **Any console errors?** (Copy/paste if yes)

---

## 🚀 If Everything is Working

Once you confirm:
- ✅ Mobile navbar showing
- ✅ All 3 terms visible
- ✅ Scores saving
- ✅ PWA prompt appearing

**Then you're all done!** 🎉

Everything is professionally fixed and ready to go.

---

## ❌ If Something Isn't Working

Tell me:
1. **What's NOT working?** (navbar/terms/save/PWA)
2. **What's the exact error?** (if any)
3. **What do you see in console?** (copy the [MobileNav]/[PWA]/[ScoreSheet] logs)

I'll fix it immediately.
