import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    console.log('[API] Fetching subjects for student:', studentId);

    // Fetch student_subjects joined with subjects
    const { data, error } = await supabase
      .from('student_subjects')
      .select('id, subjects(id, name, code, subject_type)')
      .eq('student_id', studentId);

    if (error) {
      console.error('[API] Supabase error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('[API] No subjects found for student:', studentId);
      return NextResponse.json({
        data: [],
        message: 'No subjects enrolled',
      });
    }

    // Transform the response to flatten subjects
    const subjects = data
      .map((item: any) => ({
        id: item.subjects.id,
        name: item.subjects.name,
        code: item.subjects.code,
        subject_type: item.subjects.subject_type,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    console.log('[API] ✅ Subjects loaded:', subjects.length);

    return NextResponse.json({
      data: subjects,
      count: subjects.length,
    });
  } catch (error: any) {
    console.error('[API] Error fetching subjects:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch subjects',
        details: error.details || '',
      },
      { status: 500 }
    );
  }
}
