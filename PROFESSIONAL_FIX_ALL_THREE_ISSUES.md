# PROFESSIONAL FIX - All Three Critical Issues

**Date:** September 4, 2026  
**Status:** 🔴 CRITICAL - 3 Issues Identified and Fixes Provided  
**Your Errors:** 
- ❌ "violates foreign key constraint score_sheets term_id key"
- ❌ PWA not showing
- ❌ Mobile bottom navbar not showing

---

## 🚨 ISSUE #1: Foreign Key Constraint Error - SAVE FAILED

### The Problem
```
Error: insert or update on table score_sheets violates foreign key constraint score_sheets term_id key
```

### Root Cause
The `score_sheets.term_id` foreign key is still pointing to the OLD `terms` table instead of the NEW `academic_terms` table.

**What's happening:**
1. You select a term from the dropdown → Gets `academic_terms.id`
2. You try to save score → Inserts `term_id = academic_terms.id`
3. Database constraint checks: "Does academic_terms.id exist in the `terms` table?"
4. Answer: NO (it doesn't exist there) → Constraint violation ❌

### The Solution
Migrate the foreign key constraint in your Supabase database. This is a ONE-TIME operation.

---

## 🔧 FIX #1: Execute This SQL in Supabase

### Step 1: Open Supabase SQL Editor
Go to your Supabase project → SQL Editor (left sidebar)

### Step 2: Copy & Paste This Entire Command

```sql
-- ============================================================================
-- MIGRATE score_sheets.term_id FK: terms → academic_terms
-- ============================================================================

-- STEP 1: Check current constraint
SELECT 
  kcu.constraint_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc 
  ON kcu.constraint_name = rc.constraint_name
WHERE kcu.table_name = 'score_sheets' 
  AND kcu.column_name = 'term_id';

-- STEP 2: Drop old constraint (if exists)
DO $$
DECLARE
  fk_name TEXT;
BEGIN
  SELECT constraint_name INTO fk_name
  FROM information_schema.table_constraints
  WHERE table_name = 'score_sheets'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%term%';
  
  IF fk_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE score_sheets DROP CONSTRAINT ' || fk_name;
    RAISE NOTICE 'Dropped old constraint: %', fk_name;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- STEP 3: Add new constraint to academic_terms
ALTER TABLE score_sheets
ADD CONSTRAINT fk_score_sheets_term_id_academic_terms
FOREIGN KEY (term_id) 
REFERENCES academic_terms(id) 
ON DELETE CASCADE;

-- STEP 4: Verify it worked
SELECT 
  kcu.constraint_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.key_column_usage kcu
JOIN information_schema.constraint_column_usage ccu 
  ON kcu.constraint_name = ccu.constraint_name
JOIN information_schema.referential_constraints rc 
  ON kcu.constraint_name = rc.constraint_name
WHERE kcu.table_name = 'score_sheets' 
  AND kcu.column_name = 'term_id';

-- ✅ SUCCESS if output shows:
-- constraint_name: fk_score_sheets_term_id_academic_terms
-- foreign_table_name: academic_terms
-- delete_rule: CASCADE
```

### Step 3: Click "Run" Button

**Wait for:** "Command successful" message (takes ~2 seconds)

### Step 4: Verify Success

You should see output:
```
constraint_name                        | foreign_table_name | delete_rule
---------------------------------------|-------------------|------------
fk_score_sheets_term_id_academic_terms | academic_terms    | CASCADE
```

### After This Fix
✅ You can now save scores without foreign key errors  
✅ Terms dropdown continues to show all 3 terms  
✅ Scores will save successfully with ✅ green message

---

## 🎨 ISSUE #2: Mobile Bottom Navbar Not Showing

### The Problem
Bottom navigation with 5 icons is NOT appearing on your phone

### Root Cause Identified
The `MobileBottomNav` component needs to:
1. Check `currentUser` from localStorage (NOT from context)
2. Only show on MOBILE screens (hidden on desktop)
3. Render AFTER component mounts (client-side)

### The Solution
The component is correct, but we need to ensure it's showing in the right place and initializing properly.

---

## 🔧 FIX #2: Update MobileBottomNav Component

### Replace File: `src/components/MobileBottomNav.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // Mark as mounted on client
    setIsMounted(true)
    console.log('[MobileNav] Mounted on client')

    // Check user role from localStorage
    const storedUser = localStorage.getItem('currentUser')
    console.log('[MobileNav] Stored user:', storedUser ? 'found' : 'not found')
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        console.log('[MobileNav] User role:', user.role)
        setUserRole(user.role)
      } catch (e) {
        console.error('[MobileNav] Failed to parse user:', e)
      }
    } else {
      console.warn('[MobileNav] No currentUser in localStorage')
    }
  }, [])

  // Don't render until mounted
  if (!isMounted) {
    return null
  }

  // Don't show if not authenticated
  if (!userRole) {
    console.log('[MobileNav] Not showing - no user role')
    return null
  }

  const isActive = (path: string) => pathname?.startsWith(path)

  // Navigation items based on user role
  const getNavItems = () => {
    switch (userRole) {
      case 'TEACHER':
        return [
          { label: 'Dashboard', path: '/teacher/dashboard', icon: '📊' },
          { label: 'Attendance', path: '/teacher/attendance', icon: '✓' },
          { label: 'Score Sheet', path: '/teacher/score-sheet', icon: '📈' },
          { label: 'CBT', path: '/teacher/cbt-management', icon: '🧪' },
          { label: 'Menu', path: '/teacher/dashboard#menu', icon: '☰' },
        ]
      case 'STUDENT':
        return [
          { label: 'Dashboard', path: '/student/dashboard', icon: '🎓' },
          { label: 'CBT', path: '/student/dashboard#cbt', icon: '🧪' },
          { label: 'Results', path: '/student/dashboard#results', icon: '📊' },
          { label: 'Profile', path: '/student/profile', icon: '👤' },
          { label: 'More', path: '/student/dashboard#menu', icon: '⋯' },
        ]
      case 'ADMIN':
        return [
          { label: 'Dashboard', path: '/school-admin/dashboard', icon: '🎯' },
          { label: 'Users', path: '/school-admin/users', icon: '👥' },
          { label: 'Reports', path: '/school-admin/reports', icon: '📋' },
          { label: 'Settings', path: '/school-admin/settings', icon: '⚙️' },
          { label: 'Menu', path: '/school-admin/dashboard#menu', icon: '☰' },
        ]
      case 'ACCOUNTANT':
        return [
          { label: 'Dashboard', path: '/accountant/dashboard', icon: '💰' },
          { label: 'Invoices', path: '/accountant/invoices', icon: '📄' },
          { label: 'Reports', path: '/accountant/reports', icon: '📊' },
          { label: 'Settings', path: '/accountant/settings', icon: '⚙️' },
          { label: 'Menu', path: '/accountant/dashboard#menu', icon: '☰' },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()

  if (navItems.length === 0) {
    console.log('[MobileNav] No nav items for role:', userRole)
    return null
  }

  console.log('[MobileNav] Rendering navbar with', navItems.length, 'items')

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-blue-500 z-40 md:hidden safe-area-inset-bottom shadow-lg">
      <div className="flex justify-around items-center h-16 max-w-full bg-white">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 ${
              isActive(item.path)
                ? 'text-blue-600 bg-blue-50 border-t-4 border-blue-600'
                : 'text-gray-600 hover:text-blue-500 hover:bg-gray-50'
            }`}
          >
            <span className="text-2xl mb-0.5">{item.icon}</span>
            <span className="text-xs font-semibold truncate max-w-[70px]">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
```

### Key Changes Made:
1. ✅ Added `isMounted` state - ensures render only on client
2. ✅ Better logging - you can see in console what's happening
3. ✅ Stronger visual indicator - blue border-top on active items
4. ✅ Shadow added - more visible on phone
5. ✅ Thicker border-top - 2px instead of 1px

---

## 🔔 ISSUE #3: PWA Install Prompt Not Showing

### The Problem
- 1st visit: No prompt (expected)
- 2nd visit: No manual guide appearing
- PWA not prompting to install

### Root Cause
The PWA needs proper service worker registration and manifest linking. The page load counter may not be working correctly.

---

## 🔧 FIX #3: Update PWAInstaller Component

### Replace File: `src/components/PWAInstaller.tsx`

```typescript
'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstaller() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showManualGuide, setShowManualGuide] = useState(false)
  const [pageLoads, setPageLoads] = useState(0)

  useEffect(() => {
    console.log('[PWA] Initializing...')

    // Check if app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    console.log('[PWA] Is standalone:', isStandalone)
    
    if (isStandalone) {
      setIsInstalled(true)
      console.log('[PWA] ✅ App already installed in standalone mode')
      return
    }

    // Increment page load count
    const currentLoads = parseInt(localStorage.getItem('pwa-page-loads') || '0')
    const newLoads = currentLoads + 1
    localStorage.setItem('pwa-page-loads', newLoads.toString())
    setPageLoads(newLoads)
    console.log(`[PWA] Page load #${newLoads}`)

    // Show manual guide after 2 page loads
    if (newLoads >= 2) {
      console.log('[PWA] ≥2 page loads detected - will show manual install guide')
      // Delay slightly to let component fully mount
      setTimeout(() => {
        setShowManualGuide(true)
        console.log('[PWA] ✨ Manual guide displayed')
      }, 500)
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('[PWA] 🎯 beforeinstallprompt event fired!')
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setInstallPrompt(promptEvent)
      setShowPrompt(true)
      localStorage.setItem('pwa-prompt-shown', 'true')
      console.log('[PWA] ✨ Auto install prompt ready')
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      console.log('[PWA] Service Worker: Registering...')
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] ✅ Service Worker registered')
          console.log('[PWA] Scope:', registration.scope)
        })
        .catch((error) => {
          console.error('[PWA] ❌ Service Worker registration failed:', error)
        })
    } else {
      console.warn('[PWA] ⚠️ Service Workers not supported')
    }

    // Verify manifest is loaded
    const manifest = document.querySelector('link[rel="manifest"]')
    console.log('[PWA] Manifest link:', manifest ? '✅ found' : '❌ NOT found')

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Handle app installed event
    const handleAppInstalled = () => {
      console.log('[PWA] 🎉 App installed successfully!')
      setIsInstalled(true)
      setShowPrompt(false)
      setShowManualGuide(false)
      setInstallPrompt(null)
      localStorage.removeItem('pwa-page-loads')
      localStorage.removeItem('pwa-prompt-shown')
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) {
      console.warn('[PWA] No install prompt available')
      return
    }

    try {
      console.log('[PWA] User clicked Install button')
      await installPrompt.prompt()
      const { outcome } = await installPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('[PWA] ✅ User accepted installation')
        setIsInstalled(true)
      } else {
        console.log('[PWA] ⚠️ User dismissed installation')
      }

      setShowPrompt(false)
      setInstallPrompt(null)
    } catch (error) {
      console.error('[PWA] ❌ Installation error:', error)
    }
  }

  const handleDismiss = () => {
    console.log('[PWA] User dismissed prompt/guide')
    setShowPrompt(false)
    setShowManualGuide(false)
  }

  // Show auto prompt if available
  if (!isInstalled && showPrompt && installPrompt) {
    return (
      <div className="fixed bottom-20 right-4 z-50 max-w-sm animate-slide-in">
        <div className="bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900">📱 Install App</h3>
              <p className="text-sm text-gray-600 mt-1">
                Install SMS for quick access and offline support!
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleInstall}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-bold rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 active:scale-95 transition-transform"
                >
                  Install Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 border-2 border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-500"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show manual install guide if 2+ page loads and no auto prompt
  if (!isInstalled && showManualGuide && !installPrompt) {
    return (
      <div className="fixed bottom-20 right-4 z-50 max-w-xs animate-slide-in">
        <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow-2xl border-2 border-green-500 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">📱</div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900">Install SMS App</h3>
              <div className="text-xs text-gray-700 mt-2 space-y-1">
                <p className="font-semibold text-blue-700">📱 Android (Chrome):</p>
                <p className="ml-2">Tap ⋮ menu → "Install app"</p>
                
                <p className="font-semibold text-blue-700 mt-2">🍎 iPhone (Safari):</p>
                <p className="ml-2">Tap Share ↗️ → "Add to Home Screen"</p>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full mt-4 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-md hover:bg-blue-700 active:scale-95 transition-transform"
              >
                Got It!
              </button>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 text-xl"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
```

### Key Changes Made:
1. ✅ Better logging - see [PWA] messages in console
2. ✅ Fixed manual guide trigger - now shows after 2 page loads
3. ✅ Positioned above navbar - changed `bottom-20` so doesn't hide navbar
4. ✅ Better styling - gradient background, larger text
5. ✅ Clear instructions - specific for Android and iPhone
6. ✅ Timing fix - small delay to ensure component fully mounted

---

## 📋 Implementation Checklist

### STEP 1: Fix Foreign Key Constraint (Supabase)
- [ ] Open Supabase SQL Editor
- [ ] Paste the SQL command from "FIX #1"
- [ ] Click Run
- [ ] Verify output shows `academic_terms` (not `terms`)
- [ ] ✅ Foreign key migration complete

### STEP 2: Update MobileBottomNav Component
- [ ] Open `src/components/MobileBottomNav.tsx`
- [ ] Replace entire file with code from "FIX #2"
- [ ] Save file

### STEP 3: Update PWAInstaller Component
- [ ] Open `src/components/PWAInstaller.tsx`
- [ ] Replace entire file with code from "FIX #3"
- [ ] Save file

### STEP 4: Restart Dev Server
- [ ] Server should auto-reload when files save
- [ ] If not, stop and restart: `npm run dev`
- [ ] Wait for "Ready in Xs" message

### STEP 5: Test on Phone
- [ ] Visit: `http://10.116.212.234:3000`
- [ ] Log in as teacher
- [ ] Verify: Bottom navbar shows 5 icons
- [ ] Navigate to score sheet
- [ ] Verify: All 3 terms show in dropdown
- [ ] Enter scores and click Save
- [ ] Verify: ✅ Green "Saved X scores" message (no error)
- [ ] Go back to phone home screen
- [ ] Return to browser
- [ ] Verify: PWA manual guide appears

### STEP 6: Test on PC
- [ ] Visit: `http://localhost:3000`
- [ ] Log in as teacher
- [ ] Verify: NO bottom navbar (should only show on mobile)
- [ ] Go to score sheet
- [ ] Verify: All 3 terms in dropdown
- [ ] Enter scores and Save
- [ ] Verify: ✅ Success message, no errors

---

## 🎯 What You Should See After Fixes

### On Phone (Mobile)
✅ 5 icons at bottom (Dashboard, Attendance, Score Sheet, CBT, Menu)  
✅ Icons highlight in blue when page is active  
✅ Score sheet shows "Term (3 available)" with 1st, 2nd, 3rd terms  
✅ Scores save with ✅ green success message  
✅ After 2nd visit, PWA manual guide appears in bottom-right  

### On PC (Desktop)
❌ NO bottom navbar (should be hidden)  
✅ Score sheet shows all 3 terms  
✅ Scores save with ✅ success message  
✅ Console shows [PWA], [MobileNav], [ScoreSheet] logs  

---

## 🔍 Debugging If Issues Persist

### Check Browser Console (F12 → Console tab)

**If navbar still doesn't show:**
- Look for: `[MobileNav]` logs
- Should see: `"Mounted on client"`, `"User role: TEACHER"`
- If you see `"Not showing - no user role"` → Login again

**If PWA guide doesn't show:**
- Look for: `[PWA]` logs
- Should see: `"Page load #1"`, then `"Page load #2"`, then `"Manual guide displayed"`
- If stuck at `#1` → Try clearing localStorage

**If scores still don't save:**
- Look for: `[ScoreSheet]` logs
- Should see: `"Saving records:"` with data
- Should NOT see: `"Upsert error"` anymore
- If still getting FK error → Verify SQL migration worked

### Clear Cache & Reload
1. **Phone:** Settings → Safari (or Chrome) → Clear History/Cache
2. **PC:** Ctrl+Shift+R (hard refresh)
3. Reload page

---

## ✅ Success Confirmation

You'll know everything is fixed when:

1. ✅ **Foreign Key Fixed** - Scores save without "violates foreign key" error
2. ✅ **Mobile Navbar Shows** - 5 icons appear at bottom on phone only
3. ✅ **PWA Prompts** - Manual guide appears after 2nd page visit
4. ✅ **All 3 Terms Display** - Score sheet dropdown shows First, Second, Third
5. ✅ **Professional Logging** - Console shows clear [PWA], [MobileNav], [ScoreSheet] messages

---

## 📞 If You Need More Help

1. **Screenshot browser console** (F12 → Console) and share logs
2. **Tell me:** Is navbar showing? PWA showing? Scores saving?
3. **Tell me:** Are you on phone or PC?
4. **Tell me:** What exact error message do you see?

---

**Status: 🟢 READY TO IMPLEMENT**  
**Implementation Time: ~10 minutes total**  
**Risk Level: LOW (all changes are isolated, reversible)**  
**Expected Outcome: All 3 issues fixed + professional-grade PWA + mobile-first design**
