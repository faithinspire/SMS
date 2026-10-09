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
    if (isTeacher) {
      const { data: classData } = await supabase
        .from('class_arm_combos')
        .select(`
          classes (name),
          arms (name)
        `)
        .eq('class_teacher_id', staffData.user_id)

      if (classData) {
        classAssignments = classData.map(c => ({
          class_name: (c.classes as any)?.name || 'Unknown',
          arm_name: (c.arms as any)?.name || 'Unknown',
        }))
      }
    }

    // Get subject assignments (if teacher)
    let subjectAssignments: any[] = []
    if (isTeacher) {
      const { data: subjectData } = await supabase
        .from('subject_teacher_assignments')
        .select(`
          subjects (name)
        `)
        .eq('teacher_id', staffData.user_id)

      if (subjectData) {
        subjectAssignments = subjectData.map(s => ({
          subject_name: (s.subjects as any)?.name || 'Unknown',
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
