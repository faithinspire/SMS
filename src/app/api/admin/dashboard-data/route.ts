import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { school_id } = await request.json()

    if (!school_id) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 })
    }

    // Create Supabase client at RUNTIME (not build time)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    console.log('[API] Environment check:', {
      urlExists: !!supabaseUrl,
      urlLength: supabaseUrl?.length,
      keyExists: !!supabaseKey,
      keyLength: supabaseKey?.length,
    })

    if (!supabaseUrl) {
      console.error('[API] NEXT_PUBLIC_SUPABASE_URL is missing')
      return NextResponse.json(
        { error: 'Missing NEXT_PUBLIC_SUPABASE_URL' },
        { status: 500 }
      )
    }

    if (!supabaseKey) {
      console.error('[API] SUPABASE_SERVICE_ROLE_KEY is missing')
      console.error('[API] Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('supabase')))
      return NextResponse.json(
        { error: 'Missing SUPABASE_SERVICE_ROLE_KEY - check Vercel environment variables' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('[API] Dashboard data request for school:', school_id)

    // STEP 1: Get all staff
    const { data: staffData, error: staffError } = await supabase
      .from('users')
      .select('*')
      .eq('school_id', school_id)
      .in('role', ['TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'HEAD_TEACHER', 'STAFF'])
      .order('created_at', { ascending: false })

    if (staffError) {
      console.error('[API] Staff error:', staffError)
      return NextResponse.json({ error: 'Failed to fetch staff', details: staffError.message }, { status: 500 })
    }

    console.log('[API] Staff count:', staffData?.length || 0)

    // STEP 2: Get all students - WITHOUT the join, get just student data first
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, user_id, admission_number, class_arm_combo_id, department, school_id')
      .eq('school_id', school_id)
      .order('created_at', { ascending: false })

    if (studentError) {
      console.error('[API] Students error:', studentError)
      return NextResponse.json({ error: 'Failed to fetch students', details: studentError.message }, { status: 500 })
    }

    console.log('[API] Students base count:', studentData?.length || 0)

    // Get user data for these students separately
    const userIds = (studentData || []).map(s => s.user_id).filter(Boolean)
    
    let studentUsers: any[] = []
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, photo_url, status')
        .in('id', userIds)

      if (usersError) {
        console.error('[API] Users lookup error:', usersError)
        // Continue anyway - return students without user data
        studentUsers = []
      } else {
        studentUsers = users || []
      }
    }

    console.log('[API] Associated users found:', studentUsers?.length || 0)

    // Map students with user data
    const students = (studentData || [])
      .map((student: any) => {
        const userData = studentUsers.find(u => u.id === student.user_id)
        return {
          id: student.id,
          user_id: student.user_id,
          email: userData?.email || 'N/A',
          full_name: userData?.full_name || 'Unknown',
          photo_url: userData?.photo_url,
          admission_number: student.admission_number,
          class_arm_combo_id: student.class_arm_combo_id,
          department: student.department,
          status: userData?.status,
        }
      })
      .filter(s => s.id)

    console.log('[API] Final students count:', students?.length || 0)

    return NextResponse.json({
      success: true,
      staff: staffData || [],
      students: students || [],
      staffCount: staffData?.length || 0,
      studentCount: students?.length || 0,
    })
  } catch (error: any) {
    console.error('[API] Exception:', error)
    return NextResponse.json({ error: 'Internal error', details: error.message }, { status: 500 })
  }
}
