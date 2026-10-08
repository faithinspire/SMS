import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    console.log('[Student Details API] Fetching student:', studentId);

    // Fetch student with user details - simplified query
    const { data: student, error } = await supabase
      .from('students')
      .select(`
        id,
        user_id,
        school_id,
        admission_number,
        date_of_birth,
        photo_url,
        status,
        is_locked,
        users (
          id,
          full_name,
          email,
          phone,
          photo_url
        )
      `)
      .eq('id', studentId)
      .single();

    if (error) {
      console.error('[Student Details API] Supabase error:', error.message);
      throw error;
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    console.log('[Student Details API] ✅ Student found:', student.id);

    // Format response
    const formattedStudent = {
      id: student.id,
      full_name: student.users?.full_name || 'Unknown',
      admission_number: student.admission_number,
      email: student.users?.email || '',
      phone: student.users?.phone || '',
      photo_url: student.photo_url || student.users?.photo_url,
      status: student.status,
      is_locked: student.is_locked,
      date_of_birth: student.date_of_birth,
      class_name: 'N/A',
    };

    return NextResponse.json({
      data: formattedStudent,
    });
  } catch (error: any) {
    console.error('[Student Details API] Error:', error?.message || error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch student details',
        details: error?.details || null,
      },
      { status: 500 }
    );
  }
}
