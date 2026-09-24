// src/app/api/admin/register-student-direct/route.ts
// Direct student creation endpoint (bypasses RLS)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, school_id, admission_number, date_of_birth, selectedSubjects } = body

    // Validate required fields
    if (!user_id || !school_id || !admission_number) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, school_id, admission_number' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role (can bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Step 1: Get user's full_name from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user_id)
      .single()

    if (userError || !userData?.full_name) {
      return NextResponse.json(
        { error: 'User not found or missing full_name' },
        { status: 400 }
      )
    }

    const fullName = userData.full_name

    // Step 2: Get the default class_arm_combo for the school
    // For new students, assign to a default class (e.g., Primary 1 Arm A)
    const { data: classArm, error: classError } = await supabase
      .from('class_arm_combos')
      .select('id, class_id')
      .eq('school_id', school_id)
      .order('created_at')
      .limit(1)
      .single()

    if (classError || !classArm) {
      return NextResponse.json(
        { error: 'No class/arm configuration found for school' },
        { status: 400 }
      )
    }

    // Step 3: Create student record with full_name preserved
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert({
        user_id,
        school_id,
        admission_number,
        date_of_birth: date_of_birth || null,
        class_arm_combo_id: classArm.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (studentError) {
      console.error('Error creating student:', studentError)
      return NextResponse.json(
        { error: `Failed to create student record: ${studentError.message}` },
        { status: 500 }
      )
    }

    // Step 4: Enroll student in selected subjects
    if (selectedSubjects && selectedSubjects.length > 0) {
      const subjectEnrollments = selectedSubjects.map((subject_id: string) => ({
        student_id: student.id,
        subject_id,
        school_id,
        created_at: new Date().toISOString(),
      }))

      const { error: enrollError } = await supabase
        .from('student_subjects')
        .insert(subjectEnrollments)

      if (enrollError) {
        console.error('Error enrolling subjects:', enrollError)
        // Don't fail - student was created, subjects might fail but that's ok
      }
    }

    return NextResponse.json({
      success: true,
      student_id: student.id,
      student,
    })
  } catch (error: any) {
    console.error('Exception in register-student-direct:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
