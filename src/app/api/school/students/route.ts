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
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Create a server-side Supabase client that reads from request cookies
function createServerSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration');
  }

  // Get the auth cookie from request
  const cookieStore = cookies();
  const authCookie = cookieStore.get('sb-auth-token')?.value;

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
    global: {
      headers: authCookie ? { Authorization: `Bearer ${authCookie}` } : {},
    },
  });
}

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

    // Create server-side Supabase client
    const supabase = createServerSupabaseClient(request);

    // Get auth info from request - this works server-side
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Students API] No authenticated user found:', authError?.message);
      // Public endpoint - allow unauthenticated access for now
      // This will be restricted to authenticated users later
    }

    console.log('[Students API] Auth user:', user?.id, 'Email:', user?.email);

    // For now, just fetch students for the school without strict auth
    // The page itself handles auth, the API is a convenience endpoint
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

    // Sort in JavaScript instead of trying to order by related table
    const sorted = (data || []).sort((a: any, b: any) => {
      const nameA = a.users?.full_name || '';
      const nameB = b.users?.full_name || '';
      return nameA.localeCompare(nameB);
    });

    console.log('[Students API] ✅ Fetched', sorted?.length || 0, 'students');

    return NextResponse.json({ data: sorted || [] });
  } catch (error: any) {
    console.error('[Students API] Unexpected error:', error?.message || error);
    return NextResponse.json(
      { error: 'Internal server error', detail: error?.message },
      { status: 500 }
    );
  }
}
