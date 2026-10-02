import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json({ error: 'schoolId is required' }, { status: 400 })
    }

    console.log(`[DEBUG] Checking data for school: ${schoolId}`)

    // Check staff/users with staff roles
    const { data: staffUsers, error: staffError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, school_id, status')
      .eq('school_id', schoolId)
      .in('role', ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF'])

    if (staffError) {
      console.error('Error fetching staff users:', staffError)
    }

    // Check students
    const { data: students, error: studentError } = await supabaseAdmin
      .from('students')
      .select('id, user_id, admission_number, school_id')
      .eq('school_id', schoolId)
      .limit(10)

    if (studentError) {
      console.error('Error fetching students:', studentError)
    }

    // Check staff records
    const { data: staffRecords, error: staffRecordError } = await supabaseAdmin
      .from('staff')
      .select('id, user_id, school_id, position')
      .eq('school_id', schoolId)
      .limit(10)

    if (staffRecordError) {
      console.error('Error fetching staff records:', staffRecordError)
    }

    // Check academic data
    const { data: sessions, error: sessionError } = await supabaseAdmin
      .from('academic_sessions')
      .select('id, session_year, is_active')
      .eq('school_id', schoolId)

    if (sessionError) {
      console.error('Error fetching sessions:', sessionError)
    }

    const { data: terms, error: termError } = await supabaseAdmin
      .from('academic_terms')
      .select('id, term_number, name, session_id, is_active')
      .eq('school_id', schoolId)

    if (termError) {
      console.error('Error fetching terms:', termError)
    }

    return NextResponse.json({
      school_id: schoolId,
      staff_users: {
        count: staffUsers?.length || 0,
        data: staffUsers || [],
        error: staffError?.message,
      },
      students: {
        count: students?.length || 0,
        data: students || [],
        error: studentError?.message,
      },
      staff_records: {
        count: staffRecords?.length || 0,
        data: staffRecords || [],
        error: staffRecordError?.message,
      },
      academic_sessions: {
        count: sessions?.length || 0,
        data: sessions || [],
        error: sessionError?.message,
      },
      academic_terms: {
        count: terms?.length || 0,
        data: terms || [],
        error: termError?.message,
      },
    })
  } catch (error: any) {
    console.error('[DEBUG] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
