-- ============================================================================
-- Migration 021: Add School Admin Credentials to Schools Table
-- ============================================================================
-- Purpose: Store school admin email and password for fallback authentication
-- when Supabase Auth is unavailable or for direct school admin login
-- ============================================================================

-- Add columns to schools table
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS admin_password TEXT,
ADD CONSTRAINT unique_admin_email_per_school UNIQUE(admin_email);

-- Create index for faster lookups during login
CREATE INDEX IF NOT EXISTS idx_schools_admin_email ON schools(admin_email) WHERE admin_email IS NOT NULL;

-- ============================================================================
-- This migration enables:
-- 1. Storing school admin credentials during registration
-- 2. Fallback authentication when Supabase Auth fails
-- 3. Direct school admin login using credentials stored in schools table
-- ============================================================================

