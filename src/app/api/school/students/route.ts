import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId');

    if (!schoolId) {
      console.error('[Students API] Missing schoolId');
      return NextResponse.json(
        { error: 'schoolId parameter is required' },
        { status: 400 }
      );
    }

    console.log('[Students API] Fetching students for school:', schoolId);

    // Use anonymous Supabase client (no auth cookie dependencies)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch students with defensive error handling
    // Try full relations first, fall back to basic query if that fails
    let data = null;
    let error = null;

    // Attempt 1: Try with full relations
    const { data: fullData, error: fullError } = await supabase
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
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (fullError) {
      console.warn('[Students API] Full relation query failed, trying basic query:', fullError.message);
      
      // Attempt 2: Fall back to basic query without relations
      const { data: basicData, error: basicError } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (basicError) {
        console.error('[Students API] Even basic query failed:', basicError.message);
        data = null;
        error = basicError;
      } else {
        console.log('[Students API] Basic query succeeded, returning simple data');
        data = basicData;
        error = null;
      }
    } else {
      data = fullData;
      error = fullError;
    }

    if (error) {
      console.error('[Students API] Database error:', error.message);
      throw error;
    }

    console.log('[Students API] ✅ Fetched', data?.length || 0, 'students');

    return NextResponse.json({ 
      data: data || [],
      meta: { count: data?.length || 0 }
    });
  } catch (error: any) {
    console.error('[Students API] Error:', error?.message || error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch students',
        detail: error.details || null
      },
      { status: 500 }
    );
  }
}
