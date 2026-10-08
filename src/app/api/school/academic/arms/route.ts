import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const classId = request.nextUrl.searchParams.get('classId');
    const schoolId = request.nextUrl.searchParams.get('schoolId');

    if (!classId || !schoolId) {
      console.error('[Arms API] Missing classId or schoolId');
      return NextResponse.json(
        { error: 'classId and schoolId are required' },
        { status: 400 }
      );
    }

    console.log('[Arms API] Fetching arms for class:', classId, 'school:', schoolId);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get class_arm_combos with related arms data
    const { data, error } = await supabase
      .from('class_arm_combos')
      .select(`
        id,
        class_id,
        arm_id,
        arms (
          id,
          name
        )
      `)
      .eq('class_id', classId)
      .eq('school_id', schoolId);

    if (error) {
      console.error('[Arms API] Database error:', error.message);
      throw error;
    }

    // Map to expected format
    const mapped = (data || []).map((combo: any) => ({
      id: combo.id,
      class_id: combo.class_id,
      arm_id: combo.arm_id,
      name: combo.arms?.name || 'Unknown Arm',
    }));

    console.log('[Arms API] ✅ Found', mapped.length, 'arms for class');

    return NextResponse.json({ 
      data: mapped,
      meta: { count: mapped.length }
    });
  } catch (error: any) {
    console.error('[Arms API] Error:', error?.message || error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to fetch arms',
        detail: error.details || null
      },
      { status: 500 }
    );
  }
}
