import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;

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

    // Fetch student with user details
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
        ),
        class_arm_combos (
          id,
          classes (name),
          arms (name)
        )
      `)
      .eq('id', studentId)
      .single();

    if (error) {
      console.error('[Student Details API] Error:', error);
      throw error;
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

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
      class_name:
        student.class_arm_combos && student.class_arm_combos.length > 0
          ? `${student.class_arm_combos[0].classes?.name || ''} ${student.class_arm_combos[0].arms?.name || ''}`
          : 'Not Assigned',
    };

    return NextResponse.json({
      data: formattedStudent,
    });
  } catch (error: any) {
    console.error('[Student Details API] Error:', error?.message || error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch student details',
      },
      { status: 500 }
    );
  }
}
