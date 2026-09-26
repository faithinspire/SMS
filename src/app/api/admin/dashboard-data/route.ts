import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { school_id } = await request.json()

    if (!school_id) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 })
    }

    // Create Supabase client at RUNTIME
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[API] Missing Supabase configuration')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // ==== STAFF QUERY ====
    const { data: staffData, error: staffError } = await supabase
      .from('users')
      .select('id, full_name, email, role, status, created_at')
      .eq('school_id', school_id)
      .in('role', ['TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'HEAD_TEACHER', 'STAFF'])
      .order('created_at', { ascending: false })

    if (staffError) {
      console.error('[API] Staff query failed:', staffError.message)
      return NextResponse.json({ error: 'Failed to load staff', details: staffError.message }, { status: 500 })
    }

    const staffCount = (staffData || []).length
    console.log(`[API] Loaded ${staffCount} staff members`)

    // ==== STUDENTS QUERY ====
    // Step 1: Get student records ONLY (no joins)
    const { data: studentRecords, error: recordsError } = await supabase
      .from('students')
      .select('id, user_id, admission_number, department')
      .eq('school_id', school_id)

    if (recordsError) {
      console.error('[API] Student records query failed:', recordsError.message)
      return NextResponse.json({ error: 'Failed to load students', details: recordsError.message }, { status: 500 })
    }

    console.log(`[API] Found ${(studentRecords || []).length} student records`)

    // Step 2: Get user data for these students (separate query)
    let studentUsers: Record<string, any> = {}
    const userIds = (studentRecords || []).map(s => s.user_id).filter(Boolean)

    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, photo_url, status')
        .in('id', userIds)

      if (!usersError && usersData) {
        studentUsers = Object.fromEntries(usersData.map(u => [u.id, u]))
      }
    }

    // Step 3: Combine student records with user data
    const students = (studentRecords || [])
      .map((student: any) => {
        const user = studentUsers[student.user_id] || {}
        return {
          id: student.id,
          user_id: student.user_id,
          full_name: user.full_name || 'Unknown',
          email: user.email || 'N/A',
          photo_url: user.photo_url || null,
          admission_number: student.admission_number,
          department: student.department,
          status: user.status || 'ACTIVE',
        }
      })
      .filter(s => s.id)

    const studentCount = students.length
    console.log(`[API] Loaded ${studentCount} students with user data`)

    // ==== RESULTS QUERY ====
    const { data: resultsData, error: resultsError } = await supabase
      .from('results')
      .select('id, student_id, subject, score, grade, created_at')
      .eq('school_id', school_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (resultsError) {
      console.error('[API] Results query error:', resultsError.message)
      // Continue - results are optional
    }

    const resultsCount = (resultsData || []).length
    console.log(`[API] Loaded ${resultsCount} results`)

    // ==== TRANSACTIONS QUERY ====
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('id, student_id, type, amount, status, created_at')
      .eq('school_id', school_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (transactionsError) {
      console.error('[API] Transactions query error:', transactionsError.message)
      // Continue - transactions are optional
    }

    const transactionsCount = (transactionsData || []).length
    console.log(`[API] Loaded ${transactionsCount} transactions`)

    return NextResponse.json({
      success: true,
      staff: staffData || [],
      students: students,
      results: resultsData || [],
      transactions: transactionsData || [],
      staffCount: staffCount,
      studentCount: studentCount,
      resultsCount: resultsCount,
      transactionsCount: transactionsCount,
    })
  } catch (error: any) {
    console.error('[API] Fatal exception:', error.message)
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
