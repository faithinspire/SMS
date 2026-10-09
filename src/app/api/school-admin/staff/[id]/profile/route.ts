/**
 * Get Staff Profile Details
 * 
 * GET /api/school-admin/staff/:id/profile
 * 
 * Returns complete staff profile including:
 * - Personal info
 * - Contact info
 * - Employment info
 * - Teacher-specific data (if applicable)
 * - Class assignments (if teacher)
 * - Subject assignments (if teacher)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const staffId = params.id
    const schoolId = request.nextUrl.searchParams.get('schoolId')

    if (!staffId || !schoolId) {
      return NextResponse.json(
        { error: 'staffId and schoolId are required' },
        { status: 400 }
      )
    }

    console.log('[Staff Profile API] Fetching staff:', staffId)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Get staff basic info
    const { data: staffArray, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .eq('school_id', schoolId)
      .limit(1)

    const staffData = staffArray && staffArray.length > 0 ? staffArray[0] : null

    if (staffError || !staffData) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      )
    }

    console.log('[Staff Profile API] ✅ Staff found')

    // Check if teacher - use limit(1) instead of .single() to avoid 406 error
    const { data: teacherArray } = await supabase
      .from('teachers')
      .select('*')
      .eq('staff_id', staffId)
      .limit(1)

    const teacherData = teacherArray && teacherArray.length > 0 ? teacherArray[0] : null
    const isTeacher = !!teacherData

    // Get user account status - use limit(1) instead of .single()
    const { data: userArray } = await supabase
      .from('users')
      .select('status')
      .eq('id', staffData.user_id)
      .limit(1)

    const userData = userArray && userArray.length > 0 ? userArray[0] : null

    // Get class assignments (if teacher)
    let classAssignments: any[] = []
    if (isTeacher && teacherData) {
      // Get classes where this teacher is the class teacher via teacher_id
      const { data: classData } = await supabase
        .from('teacher_class_assignments')
        .select(`
          class_arm_combos (
            id,
            classes (name),
            arms (name)
          )
        `)
        .eq('teacher_id', staffData.user_id)
        .eq('is_class_teacher', true)

      if (classData && classData.length > 0) {
        classAssignments = classData.map((assignment: any) => ({
          combo_id: assignment.class_arm_combos?.id,
          class_name: assignment.class_arm_combos?.classes?.name || 'Unknown',
          arm_name: assignment.class_arm_combos?.arms?.name || 'Unknown',
        }))
      }

      // Also check class_arm_combos directly for backward compatibility
      if (classAssignments.length === 0) {
        const { data: directClassData } = await supabase
          .from('class_arm_combos')
          .select(`
            id,
            classes (name),
            arms (name)
          `)
          .eq('class_teacher_id', staffData.user_id)

        if (directClassData && directClassData.length > 0) {
          classAssignments = directClassData.map((combo: any) => ({
            combo_id: combo.id,
            class_name: combo.classes?.name || 'Unknown',
            arm_name: combo.arms?.name || 'Unknown',
          }))
        }
      }
    }

    // Get subject assignments (if teacher)
    let subjectAssignments: any[] = []
    if (isTeacher && teacherData) {
      const { data: subjectData } = await supabase
        .from('subject_teacher_assignments')
        .select(`
          id,
          subjects (name, code),
          class_arm_combos (
            classes (name),
            arms (name)
          )
        `)
        .eq('teacher_id', staffData.user_id)

      if (subjectData) {
        subjectAssignments = subjectData.map(s => ({
          subject_name: (s.subjects as any)?.name || 'Unknown',
          subject_code: (s.subjects as any)?.code || '',
          class_name: (s.class_arm_combos as any)?.classes?.name || 'Unknown',
          arm_name: (s.class_arm_combos as any)?.arms?.name || 'Unknown',
        }))
      }
    }

    const profile = {
      ...staffData,
      is_teacher: isTeacher,
      teaching_level: teacherData?.teaching_level,
      bank_name: teacherData?.bank_name,
      account_number: teacherData?.account_number,
      account_name: teacherData?.account_name,
      salary: teacherData?.salary,
      class_assignments: classAssignments,
      subject_assignments: subjectAssignments,
      account_status: userData?.status || 'UNKNOWN',
    }

    console.log('[Staff Profile API] Returning profile')

    return NextResponse.json({
      success: true,
      data: profile,
    })
  } catch (error: any) {
    console.error('[Staff Profile API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch staff profile' },
      { status: 500 }
    )
  }
}
