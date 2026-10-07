/**
 * GET /api/school/students?schoolId=...
 * 
 * Fetches all students for a school with their lock status and details.
 * Used by School Admin Students page to display student list.
 * 
 * Query Parameters:
 * - schoolId (required): The school ID
 * 
 * Returns: Array of students with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { AuthService } from '@/services/auth.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId');

    if (!schoolId) {
      console.error('[Students API] Missing schoolId parameter');
      return NextResponse.json(
        { error: 'schoolId parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Students API] Request for schoolId:', schoolId);

    // Verify requester is authenticated and belongs to this school
    const user = await AuthService.getCurrentUser();

    if (!user) {
      console.error('[Students API] No authenticated user found');
      return NextResponse.json(
        { error: 'Unauthorized - User not authenticated' },
        { status: 401 }
      );
    }

    console.log('[Students API] Authenticated user:', user.id, 'school:', user.school_id, 'role:', user.role);

    // Verify user belongs to the school and has permission
    if (user.role !== 'SCHOOL_ADMIN' && user.role !== 'PRINCIPAL' && user.role !== 'HEAD_TEACHER') {
      console.error('[Students API] User role not authorized:', user.role);
      return NextResponse.json(
        { error: `Not authorized - Role: ${user.role}` },
        { status: 403 }
      );
    }

    if (user.school_id !== schoolId) {
      console.error('[Students API] School mismatch - user school:', user.school_id, 'requested:', schoolId);
      return NextResponse.json(
        { error: 'Cannot access students from different school' },
        { status: 403 }
      );
    }

    console.log('[Students API] Authorization passed, fetching students...');

    // Fetch all students for the school with related data
    const { data, error } = await supabase
      .from('students')
      .select(
        `
        id,
        user_id,
        school_id,
        admission_number,
        date_of_birth,
        photo_url,
        status,
        is_locked,
        locked_at,
        locked_by_user_id,
        lock_reason,
        class_arm_combo_id,
        users (
          id,
          full_name,
          email,
          photo_url,
          status,
          phone
        ),
        class_arm_combos (
          id,
          classes (
            id,
            name
          ),
          arms (
            id,
            name
          )
        )
      `
      )
      .eq('school_id', schoolId);

    if (error) {
      console.error('[Students API] Database error:', error.message);
      return NextResponse.json(
        { 
          error: 'Failed to fetch students',
          detail: error.message 
        },
        { status: 500 }
      );
    }

    console.log('[Students API] ✅ Fetched', data?.length || 0, 'students');

    // Sort in memory by user full_name to avoid Supabase ordering issues
    const sortedData = (data || []).sort((a: any, b: any) => {
      const nameA = a.users?.full_name || '';
      const nameB = b.users?.full_name || '';
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json({ data: sortedData });
  } catch (error: any) {
    console.error('[Students API] Unexpected error:', error?.message || error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error?.message },
      { status: 500 }
    );
  }
}
