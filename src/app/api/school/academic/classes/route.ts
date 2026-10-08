import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('schoolId');

    if (!schoolId) {
      console.error('[Classes API] Missing schoolId');
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      );
    }

    console.log('[Classes API] Fetching classes for school:', schoolId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });

    if (error) {
      console.error('[Classes API] Database error:', error.message);
      throw error;
    }

    console.log('[Classes API] ✅ Found', data?.length || 0, 'classes');

    return NextResponse.json({ 
      data: data || [],
      meta: { count: data?.length || 0 }
    });
  } catch (error: any) {
    console.error('[Classes API] Error:', error?.message || error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch classes',
        detail: error.details || null
      },
      { status: 500 }
    );
  }
}
