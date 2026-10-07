import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const classId = request.nextUrl.searchParams.get('classId');
    const schoolId = request.nextUrl.searchParams.get('schoolId');

    if (!classId || !schoolId) {
      return NextResponse.json(
        { error: 'classId and schoolId are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('class_arm_combos')
      .select('id, class_id, arms(id, name)')
      .eq('class_id', classId)
      .eq('school_id', schoolId)
      .order('arms(name)', { ascending: true });

    if (error) throw error;

    const mapped = (data || []).map((combo: any) => ({
      id: combo.id,
      class_id: combo.class_id,
      name: combo.arms?.name || 'Unknown Arm',
    }));

    return NextResponse.json({ data: mapped });
  } catch (error: any) {
    console.error('[Arms API]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch arms' },
      { status: 500 }
    );
  }
}
