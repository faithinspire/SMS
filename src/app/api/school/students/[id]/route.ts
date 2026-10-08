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

    // Fetch student basic info only (no relations to avoid RLS issues)
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, user_id, school_id, admission_number, date_of_birth, photo_url, status, is_locked')
      .eq('id', studentId)
      .single();

    if (studentError) {
      console.error('[Student Details API] Student query error:', studentError.message);
      throw studentError;
    }

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    console.log('[Student Details API] Student found, fetching user details for:', student.user_id);

    // Fetch user details separately
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email, phone, photo_url')
      .eq('id', student.user_id)
      .single();

    if (userError) {
      console.warn('[Student Details API] User not found, continuing with student data only');
    }

    console.log('[Student Details API] ✅ Data loaded successfully');

    // Format response
    const formattedStudent = {
      id: student.id,
      full_name: user?.full_name || 'Unknown',
      admission_number: student.admission_number,
      email: user?.email || '',
      phone: user?.phone || '',
      photo_url: student.photo_url || user?.photo_url,
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
