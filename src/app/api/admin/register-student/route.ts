/**
 * PUT/POST /api/admin/register-student
 * Register a new student with class assignment and subject enrollment
 * Expects: userId (from auth), school_id, class_arm_combo_id, subjects[]
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const {
      user_id,
      school_id,
      class_arm_combo_id,
      subjects,
    } = await request.json()

    // Validate required fields
    if (!user_id || !school_id || !class_arm_combo_id) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, school_id, class_arm_combo_id' },
        { status: 400 }
      )
    }

    // Validate school_id matches user's school
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 })
    }

    if (user.school_id !== school_id || user.role !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Can only register users in your school' },
        { status: 403 }
      )
    }

    // Verify class_arm_combo exists and belongs to school
    const { data: combo, error: comboError } = await supabase
      .from('class_arm_combos')
      .select('id')
      .eq('id', class_arm_combo_id)
      .eq('school_id', school_id)
      .single()

    if (comboError || !combo) {
      return NextResponse.json(
        { error: 'Invalid class_arm_combo_id for this school' },
        { status: 400 }
      )
    }

    // Create student record
    // The class_arm_combo_id links student to their class and arm
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        user_id,
        school_id,
        class_arm_combo_id,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (studentError) {
      console.error('❌ Student creation error:', studentError)
      return NextResponse.json(
        { error: `Failed to create student record: ${studentError.message}` },
        { status: 400 }
      )
    }

    const student_id = student?.id

    // Enroll in subjects if provided
    if (Array.isArray(subjects) && subjects.length > 0) {
      // Verify all subjects belong to school
      const { data: schoolSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id')
        .eq('school_id', school_id)
        .in('id', subjects)

      if (subjectsError || !schoolSubjects || schoolSubjects.length !== subjects.length) {
        console.warn('⚠️ Warning: Some subjects do not belong to this school')
      }

      // Create student-subject enrollments
      const enrollments = subjects.map((subject_id: string) => ({
        student_id,
        subject_id,
        school_id,
        created_at: new Date().toISOString(),
      }))

      const { error: enrollmentError } = await supabase
        .from('student_subjects')
        .insert(enrollments)

      if (enrollmentError) {
        console.warn('⚠️ Warning: Could not enroll all subjects:', enrollmentError)
        // Non-critical, student is already created
      } else {
        console.log('✅ Student enrolled in', subjects.length, 'subjects')
      }
    }

    console.log('✅ Student registered:', student_id)

    return NextResponse.json(
      {
        success: true,
        message: 'Student registered successfully',
        student_id,
        subjects_enrolled: subjects?.length || 0,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('❌ Exception in register-student:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
