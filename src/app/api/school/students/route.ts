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
      return NextResponse.json(
        { error: 'schoolId parameter is required' },
        { status: 400 }
      );
    }

    // Verify requester is authenticated and belongs to this school
    const user = await AuthService.getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user belongs to the school and has permission
    if (user.role !== 'SCHOOL_ADMIN' && user.role !== 'PRINCIPAL' && user.role !== 'HEAD_TEACHER') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (user.school_id !== schoolId) {
      return NextResponse.json(
        { error: 'Cannot access students from different school' },
        { status: 403 }
      );
    }

    // Fetch all students for the school with related data
    // Use nested select for relationships to avoid Supabase ordering issues
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
      console.error('[Students API] Error fetching students:', error.message);
      return NextResponse.json(
        { 
          error: 'Failed to fetch students',
          detail: error.message 
        },
        { status: 500 }
      );
    }

    // Sort in memory by user full_name to avoid Supabase ordering issues
    const sortedData = (data || []).sort((a: any, b: any) => {
      const nameA = a.users?.full_name || '';
      const nameB = b.users?.full_name || '';
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json({ data: sortedData });
  } catch (error) {
    console.error('[Students API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
