import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const schoolId = request.nextUrl.searchParams.get('schoolId');

    if (!sessionId || !schoolId) {
      return NextResponse.json(
        { error: 'sessionId and schoolId are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('academic_terms')
      .select('id, session_id, term_name, term_order, is_active')
      .eq('session_id', sessionId)
      .eq('school_id', schoolId)
      .order('term_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data: data || [] });
  } catch (error: any) {
    console.error('[Terms API]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch terms' },
      { status: 500 }
    );
  }
}
