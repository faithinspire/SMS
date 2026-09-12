/**
 * PUT/POST /api/admin/register-teacher
 * Register a new teacher with all assignments
 * Expects: userId (from auth), school_id, subjects[], class_arm_combo_id
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
      subjects,
      class_arm_combo_id,
    } = await request.json()

    // Validate required fields
    if (!user_id || !school_id || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, school_id, subjects (non-empty array), class_arm_combo_id' },
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

    // Verify class_arm_combo exists
    if (class_arm_combo_id) {
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
    }

    // Verify all subjects belong to school
    const { data: schoolSubjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id')
      .eq('school_id', school_id)
      .in('id', subjects)

    if (subjectsError || !schoolSubjects || schoolSubjects.length !== subjects.length) {
      return NextResponse.json(
        { error: 'One or more subjects do not belong to this school' },
        { status: 400 }
      )
    }

    // Create subject-teacher assignments
    // NOTE: teacher_id column references users(id), not teachers(id)
    const assignments = subjects.map((subject_id: string) => ({
      teacher_id: user_id,
      subject_id,
      class_arm_combo_id,
      school_id,
      created_at: new Date().toISOString(),
    }))

    const { error: assignmentError } = await supabase
      .from('subject_teacher_assignments')
      .insert(assignments)

    if (assignmentError) {
      console.error('❌ Assignment error:', assignmentError)
      return NextResponse.json(
        { error: `Failed to assign subjects: ${assignmentError.message}` },
        { status: 400 }
      )
    }

    // If a class_arm_combo_id was provided, also update as class teacher
    if (class_arm_combo_id) {
      const { error: classError } = await supabase
        .from('class_arm_combos')
        .update({ class_teacher_id: user_id })
        .eq('id', class_arm_combo_id)

      if (classError) {
        console.warn('⚠️ Warning: Could not set as class teacher:', classError)
        // Non-critical, continue
      }
    }

    console.log('✅ Teacher registered with', subjects.length, 'subjects')

    return NextResponse.json(
      {
        success: true,
        message: 'Teacher registered successfully with all assignments',
        subjects_assigned: subjects.length,
      },
      { status: 200 }
    )
  } catch (err: any) {
    console.error('❌ Exception in register-teacher:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
