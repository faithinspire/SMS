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
      .select('id, session_year, start_year, end_year, is_active, created_at')
      .eq('school_id', schoolId)
      .order('start_year', { ascending: false });

    if (error) {
      console.error('[Sessions API] Database error:', error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('[Sessions API] ⚠️ No sessions found for school:', schoolId);
    }

    // Transform data to ensure consistent format
    const transformedData = (data || []).map((session: any) => ({
      id: session.id,
      session_year: session.session_year || `${session.start_year}/${session.end_year}`,
      start_year: session.start_year,
      end_year: session.end_year,
      is_active: session.is_active || false,
      created_at: session.created_at,
    }));

    console.log('[Sessions API] ✅ Found', transformedData.length, 'sessions');

    return NextResponse.json({ 
      data: transformedData,
      meta: { count: transformedData.length }
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
