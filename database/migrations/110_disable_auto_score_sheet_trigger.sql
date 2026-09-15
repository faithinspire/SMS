-- Migration 110: Disable problematic auto-create score sheet trigger
-- The trigger tries to create score_sheets when students enroll but fails
-- if no current academic term is set, causing enrollment to fail
-- Solution: Disable the trigger and create score sheets on-demand instead

BEGIN;

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS auto_create_score_sheet_on_student_subject ON student_subjects;

-- Drop the function (keeping for reference but not used)
DROP FUNCTION IF EXISTS fn_auto_create_score_sheet();

-- Score sheets will now be created:
-- 1. When academic terms are created
-- 2. On-demand when teachers first access a subject
-- 3. Via admin interface for bulk enrollment

COMMIT;
