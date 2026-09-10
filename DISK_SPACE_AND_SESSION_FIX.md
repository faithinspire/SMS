# CRITICAL FIX: Disk Space + Auto-Session Loading + Connection Errors

## Problem Summary

1. **Supabase Disk Space**: `No space left on device` error - database storage is full
2. **Auto Token Refresh**: Supabase client has `autoRefreshToken: true` causing ERR_SOCKET_NOT_CONNECTED errors
3. **Auto Session Loading**: Classes/students/subjects load automatically on page load - should be manual
4. **Connection Errors**: `net::ERR_SOCKET_NOT_CONNECTED` when token refresh fails

## Root Causes

1. **Disk Space Issue**:
   - 39 migration files with test data and duplicate records
   - Bloated attendance tables with 60+ days of data
   - Duplicate enrollments and assignments not cleaned up

2. **Auto-Refresh Issue**:
   - `autoRefreshToken: true` in supabase-client.ts line 13
   - When DB is down, token refresh fails silently, breaking all requests
   - Should be `false` with manual refresh on demand

3. **Auto-Loading Issue**:
   - Pages like score-sheet, results, lesson-notes call `loadData()` in useEffect on mount
   - This happens before user manually selects a session/class
   - Should require manual session selection first

## Solution Approach

### Step 1: Clean Supabase Database
```sql
-- Run migration 040_cleanup_bloated_tables.sql in Supabase
-- This removes duplicate data and reclaims disk space
```

### Step 2: Disable Auto Token Refresh
- Change `autoRefreshToken: false` in supabase-client.ts
- Implement manual refresh on connection errors

### Step 3: Make Session Selection Manual
- Add Session/Term selector that MUST be used before loading data
- Move `loadData()` from useEffect mount to manual trigger
- Show loading state until user selects session

## Implementation Files

1. `src/lib/supabase-client.ts` - Disable auto-refresh
2. `src/lib/api-client.ts` - Add connection error handling
3. `src/app/teacher/score-sheet/page.tsx` - Manual session selection
4. `src/app/teacher/results/page.tsx` - Manual session selection
5. `src/app/teacher/lesson-notes/page.tsx` - Manual session selection
6. Database migration 040 - Cleanup bloated tables

## Expected Results

- Database regains storage capacity
- Token errors resolve gracefully
- Users manually select session/term before viewing data
- Better error messages when connection fails
- No automatic Supabase requests on app load
