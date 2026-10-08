import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId');

    if (!schoolId) {
      console.error('[Sessions API] Missing schoolId');
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      );
    }

    console.log('[Sessions API] Fetching sessions for school:', schoolId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('academic_sessions')
      .select('*')
      .eq('school_id', schoolId)
      .order('start_year', { ascending: false });

    if (error) {
      console.error('[Sessions API] Database error:', error.message);
      throw error;
    }

    console.log('[Sessions API] ✅ Found', data?.length || 0, 'sessions');

    return NextResponse.json({ 
      data: data || [],
      meta: { count: data?.length || 0 }
    });
  } catch (error: any) {
    console.error('[Sessions API] Error:', error?.message || error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch sessions',
        detail: error.details || null
      },
      { status: 500 }
    );
  }
}
