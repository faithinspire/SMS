/**
 * POST /api/admin/register-student-direct
 * HARD FIX: Direct student registration that bypasses schema constraints
 * Uses RLS bypass to insert student with class_arm_combo_id = null
 */

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const {
      user_id,
      school_id,
      admission_number,
      date_of_birth,
      selectedSubjects,
    } = await request.json()

    // Validate required fields
    if (!user_id || !school_id || !admission_number) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, school_id, admission_number' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create service role client (admin access, bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    console.log(`📝 DIRECT: Creating student for user_id: ${user_id}`)

    // Direct insert with explicit NULL for class_arm_combo_id
    // This works once the column is made nullable (see APPLY_THIS_IN_SUPABASE_NOW.sql)
    const { data: student, error: insertError } = await supabaseAdmin
      .from('students')
      .insert({
        user_id,
        school_id,
        admission_number,
        date_of_birth: date_of_birth || null,
        class_arm_combo_id: null, // Column must be nullable (see forensic fix SQL)
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('❌ Student insert failed:', insertError.message)
      console.error('⚠️ CRITICAL: Ensure migration has been applied - class_arm_combo_id must be nullable')
      console.error('⚠️ Run: APPLY_THIS_IN_SUPABASE_NOW.sql in Supabase SQL editor')
      throw new Error(`Failed to create student: ${insertError.message}`)
    }

    const studentId = student?.id
    console.log(`✅ Student created: ${studentId}`)

    // Enroll in subjects if provided (CRITICAL FIX)
    if (selectedSubjects && selectedSubjects.length > 0) {
      console.log(`📚 Enrolling student in ${selectedSubjects.length} subjects...`)
      
      const enrollments = selectedSubjects.map((subjectId: string) => ({
        student_id: studentId,
        subject_id: subjectId,
        school_id,
        created_at: new Date().toISOString(),
      }))

      const { data: enrollData, error: enrollError } = await supabaseAdmin
        .from('student_subjects')
        .insert(enrollments)
        .select('id')

      if (enrollError) {
        console.error('❌ Subject enrollment FAILED:', enrollError.message)
        console.error('❌ Subjects to enroll:', selectedSubjects)
        console.error('❌ Enrollment payload:', enrollments)
        throw new Error(`Failed to enroll subjects: ${enrollError.message}`)
      }

      console.log(`✅ Enrolled in ${enrollData?.length || selectedSubjects.length} subjects`)
    } else {
      console.warn('⚠️ No subjects provided during registration')
    }

    return NextResponse.json({ 
      student_id: studentId,
      subjects_enrolled: selectedSubjects?.length || 0,
    }, { status: 200 })
  } catch (err: any) {
    console.error('❌ Exception in register-student-direct:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
