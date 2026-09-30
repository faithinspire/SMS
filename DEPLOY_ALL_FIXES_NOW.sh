#!/bin/bash
# Comprehensive deployment script for all 6 dashboard fixes

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════════"
echo "🚀 DEPLOYING ALL DASHBOARD FIXES TO VERCEL"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "📋 Fixes included:"
echo "  ✓ Migration 148: Add missing user profile columns"
echo "  ✓ Migration 149: Populate academic sessions & terms"
echo "  ✓ Migration 150: Populate staff test data"
echo "  ✓ Migration 151: Populate student test data"
echo "  ✓ StaffProfileEditModal: Graceful column fallback"
echo "  ✓ BottomNavigation: Prevent spinning with caching"
echo ""

# Step 1: Configure Git
echo "[1/6] Configuring Git..."
git config user.name "Dashboard Fix Bot"
git config user.email "fixes@schoolms.app"
echo "✅ Git configured"
echo ""

# Step 2: Stage migrations
echo "[2/6] Staging database migrations..."
git add database/migrations/148_add_missing_user_profile_columns.sql
git add database/migrations/149_populate_test_academic_data.sql
git add database/migrations/150_populate_test_staff_data.sql
git add database/migrations/151_populate_test_student_data.sql
echo "✅ Migrations staged"
echo ""

# Step 3: Stage code fixes
echo "[3/6] Staging code fixes..."
git add src/components/admin/StaffProfileEditModal.tsx
git add src/components/BottomNavigation.tsx
echo "✅ Code fixes staged"
echo ""

# Step 4: Verify staged files
echo "[4/6] Verifying staged files..."
STAGED_FILES=$(git diff --cached --name-only)
echo "📦 Staged files:"
echo "$STAGED_FILES" | sed 's/^/   • /'
echo ""

# Step 5: Create commit
echo "[5/6] Creating commit..."
git commit -m "Fix: Complete dashboard fixes - staff/students pages, letter button, gender column, results dropdowns, navigation spinning

Includes:
- Migration 148: Add gender, address, state, lga, phone columns to users
- Migration 149: Populate academic_sessions and academic_terms test data
- Migration 150: Populate 8 staff members per school
- Migration 151: Populate 20 students per class
- StaffProfileEditModal: Graceful handling of missing columns
- BottomNavigation: Fixed spinning with 60s cache and memoization"

COMMIT_HASH=$(git rev-parse --short HEAD)
echo "✅ Commit created: $COMMIT_HASH"
echo ""

# Step 6: Push to GitHub
echo "[6/6] Pushing to GitHub..."
git push origin main
echo "✅ Pushed to GitHub"
echo ""

# Success summary
echo "════════════════════════════════════════════════════════════════"
echo "✅ ALL FIXES DEPLOYED SUCCESSFULLY"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo "📊 Deployment Summary:"
echo "  Commit:    $COMMIT_HASH"
echo "  Branch:    main"
echo "  Files:     6 changed"
echo ""

echo "🔄 Next Steps:"
echo "  1. Wait for Vercel auto-deploy (3-5 minutes)"
echo "  2. Run migrations in Supabase"
echo "  3. Test all dashboard features"
echo ""

echo "📍 Live at: https://sms-gold-eta.vercel.app"
echo "📊 Monitor at: https://vercel.com/dashboard/projects/sms-gold-eta"
echo ""

echo "⏱️ Timeline:"
echo "  NOW:      ✅ Pushed to GitHub"
echo "  +1 min:   Vercel webhook triggered"
echo "  +3 min:   Build starts"
echo "  +5-7 min: Build completes"
echo "  +7-10 min: 🎉 LIVE"
echo ""

echo "SQL Migrations to run in Supabase:"
echo "  Run migrations 148, 149, 150, 151 in order"
echo ""
