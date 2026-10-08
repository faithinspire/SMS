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
      .order('term_number', { ascending: true });

    if (error) {
      console.error('[Terms API] Database error:', error.message);
      throw error;
    }

    // Map database column names to API response format
    // Database uses: name, term_number
    // API expects: term_name, term_order
    const mappedData = (data || []).map((term: any) => ({
      id: term.id,
      session_id: term.session_id,
      term_name: term.name || term.term_name || '', // Handle both column names
      term_order: term.term_number || term.term_order || 0, // Handle both column names
      is_active: term.is_active,
    }));

    console.log('[Terms API] ✅ Found', mappedData.length, 'terms');

    return NextResponse.json({ 
      data: mappedData,
      meta: { count: mappedData.length }
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
