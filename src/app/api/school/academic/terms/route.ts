import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const schoolId = request.nextUrl.searchParams.get('schoolId');

    if (!sessionId || !schoolId) {
      console.error('[Terms API] Missing sessionId or schoolId');
      return NextResponse.json(
        { error: 'sessionId and schoolId are required' },
        { status: 400 }
      );
    }

    console.log('[Terms API] Fetching terms for session:', sessionId, 'school:', schoolId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('session_id', sessionId)
      .eq('school_id', schoolId)
      .order('term_order', { ascending: true });

    if (error) {
      console.error('[Terms API] Database error:', error.message);
      throw error;
    }

    console.log('[Terms API] ✅ Found', data?.length || 0, 'terms');

    return NextResponse.json({ 
      data: data || [],
      meta: { count: data?.length || 0 }
    });
  } catch (error: any) {
    console.error('[Terms API] Error:', error?.message || error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch terms',
        detail: error.details || null
      },
      { status: 500 }
    );
  }
}
