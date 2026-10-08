import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const studentId = request.nextUrl.searchParams.get('studentId');
    const termId = request.nextUrl.searchParams.get('termId');

    if (!studentId || !termId) {
      return NextResponse.json(
        { error: 'studentId and termId are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch score sheet data
    const { data: scoreSheets, error } = await supabase
      .from('score_sheets')
      .select(`
        id,
        student_id,
        term_id,
        subject_id,
        ca1,
        ca2,
        ca3,
        ca4,
        exam,
        total,
        grade,
        remark,
        subjects (
          id,
          name
        )
      `)
      .eq('student_id', studentId)
      .eq('term_id', termId);

    if (error) {
      console.error('[Student Scores API] Error:', error);
      throw error;
    }

    // Format response
    const formattedScores = (scoreSheets || []).map((score: any) => ({
      subject_name: score.subjects?.name || 'Unknown Subject',
      ca1: score.ca1,
      ca2: score.ca2,
      ca3: score.ca3,
      ca4: score.ca4,
      exam: score.exam,
      total: score.total,
      grade: score.grade,
      remark: score.remark,
    }));

    return NextResponse.json({
      data: formattedScores,
      meta: { count: formattedScores.length },
    });
  } catch (error: any) {
    console.error('[Student Scores API] Error:', error?.message || error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch student scores',
      },
      { status: 500 }
    );
  }
}
