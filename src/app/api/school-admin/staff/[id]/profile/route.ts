/**
 * Get Staff Profile Details
 * GET /api/school-admin/staff/:id/profile?schoolId=<uuid>
 * 
 * Returns complete staff profile with all assignments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now()
  const staffId = params.id
  const schoolId = request.nextUrl.searchParams.get('schoolId')

  try {
    // Validate inputs
    if (!staffId || !schoolId) {
      console.error('[Staff Profile API] Missing parameters:', { staffId, schoolId })
      return NextResponse.json(
        { error: 'staffId and schoolId are required', success: false },
        { status: 400 }
      )
    }

    console.log('[Staff Profile API] Fetching staff:', { staffId, schoolId })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Step 1: Get staff basic info
    // The staffId could be either:
    // 1. A staff.id (if staff record was created)
    // 2. A user.id (if staff record was not created)
    console.log('[Staff Profile API] Step 1: Fetching staff record...')
    let staffData = null
    let userId: string | null = null

    // First, try to find by staff.id
    const { data: staffArray, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', staffId)
      .eq('school_id', schoolId)
      .limit(1)

    if (staffError) {
      console.error('[Staff Profile API] Staff query error:', staffError)
      throw new Error(`Failed to query staff: ${staffError.message}`)
    }

    if (staffArray && staffArray.length > 0) {
      // Found by staff.id
      staffData = staffArray[0]
      userId = staffData.user_id
      console.log('[Staff Profile API] ✅ Staff found by staff.id, user_id:', userId)
    } else {
      // Not found by staff.id; staffId might be a user.id
      // Try to find user first, then their staff record
      console.log('[Staff Profile API] Staff.id not found; trying as user.id...')
      const { data: userArray, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email, phone, status, role, school_id')
        .eq('id', staffId)
        .eq('school_id', schoolId)
        .limit(1)

      if (userError) {
        console.error('[Staff Profile API] User query error:', userError)
        throw new Error(`Failed to query user: ${userError.message}`)
      }

      if (!userArray || userArray.length === 0) {
        console.warn('[Staff Profile API] Neither staff nor user found:', { staffId, schoolId })
        return NextResponse.json(
          { error: 'Staff member not found', success: false },
          { status: 404 }
        )
      }

      // User found; try to get their staff record
      userId = userArray[0].id
      const { data: staffRecords, error: staffRecordError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', userId)
        .eq('school_id', schoolId)
        .limit(1)

      if (staffRecordError) {
        console.warn('[Staff Profile API] Staff record query error:', staffRecordError.message)
      }

      if (staffRecords && staffRecords.length > 0) {
        staffData = staffRecords[0]
        console.log('[Staff Profile API] ✅ Found staff record for user_id:', userId)
      } else {
        // No staff record created yet; create a minimal one from user data
        console.warn('[Staff Profile API] No staff record found for user; creating minimal entry')
        const user = userArray[0]
        staffData = {
          id: user.id, // Use user.id as staff.id fallback
          user_id: userId,
          school_id: schoolId,
          first_name: user.full_name?.split(' ')[0] || 'Unknown',
          last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
          email: user.email,
          phone: user.phone,
          position: user.role || 'STAFF',
          employment_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
        }
      }
    }

    // Step 2: Check if teacher
    console.log('[Staff Profile API] Step 2: Checking if teacher...')
    const { data: teacherArray, error: teacherError } = await supabase
      .from('teachers')
      .select('*')
      .eq('staff_id', staffData.id)
      .limit(1)

    if (teacherError) {
      console.warn('[Staff Profile API] Teacher query error:', teacherError.message)
    }

    const teacherData = teacherArray && teacherArray.length > 0 ? teacherArray[0] : null
    const isTeacher = !!teacherData

    console.log('[Staff Profile API] Is teacher?', isTeacher)

    // Step 3: Get user account status
    console.log('[Staff Profile API] Step 3: Fetching user status...')
    const { data: userArray, error: userError } = await supabase
      .from('users')
      .select('status')
      .eq('id', userId)
      .limit(1)

    if (userError) {
      console.warn('[Staff Profile API] User query error:', userError.message)
    }

    const userData = userArray && userArray.length > 0 ? userArray[0] : null

    // Step 4: Get class assignments (if teacher)
    let classAssignments: any[] = []
    if (isTeacher && teacherData) {
      console.log('[Staff Profile API] Step 4: Fetching class assignments...')
      try {
        const { data: classData, error: classError } = await supabase
          .from('class_arm_combos')
          .select(`
            id,
            classes!inner(name, school_level),
            arms!inner(name)
          `)
          .eq('class_teacher_id', userId)

        if (classError) {
          console.warn('[Staff Profile API] Class query error:', classError.message)
        } else if (classData && classData.length > 0) {
          classAssignments = classData.map((combo: any) => {
            const classObj = Array.isArray(combo.classes) ? combo.classes[0] : combo.classes
            const armObj = Array.isArray(combo.arms) ? combo.arms[0] : combo.arms
            return {
              combo_id: combo.id,
              class_name: classObj?.name || 'Unknown',
              arm_name: armObj?.name || 'Unknown',
            }
          })
          console.log('[Staff Profile API] ✅ Found', classAssignments.length, 'class assignments')
        }
      } catch (e: any) {
        console.warn('[Staff Profile API] Exception in class query:', e.message)
      }
    }

    // Step 5: Get subject assignments (if teacher)
    let subjectAssignments: any[] = []
    if (isTeacher && teacherData) {
      console.log('[Staff Profile API] Step 5: Fetching subject assignments...')
      try {
        const { data: subjectData, error: subjectError } = await supabase
          .from('subject_teacher_assignments')
          .select(`
            id,
            subject_id,
            class_arm_combo_id,
            subjects(name, code),
            class_arm_combos(
              id,
              classes(name),
              arms(name)
            )
          `)
          .eq('teacher_id', userId)

        if (subjectError) {
          console.warn('[Staff Profile API] Subject query error:', subjectError.message)
        } else if (subjectData && subjectData.length > 0) {
          subjectAssignments = subjectData.map((assignment: any) => {
            const subjectObj = Array.isArray(assignment.subjects)
              ? assignment.subjects[0]
              : assignment.subjects
            const comboObj = Array.isArray(assignment.class_arm_combos)
              ? assignment.class_arm_combos[0]
              : assignment.class_arm_combos
            const classObj = comboObj?.classes
              ? Array.isArray(comboObj.classes)
                ? comboObj.classes[0]
                : comboObj.classes
              : null
            const armObj = comboObj?.arms
              ? Array.isArray(comboObj.arms)
                ? comboObj.arms[0]
                : comboObj.arms
              : null

            return {
              assignment_id: assignment.id,
              subject_id: assignment.subject_id,
              subject_name: subjectObj?.name || 'Unknown',
              subject_code: subjectObj?.code || '',
              class_arm_combo_id: assignment.class_arm_combo_id,
              class_name: classObj?.name || 'Unknown',
              arm_name: armObj?.name || 'Unknown',
            }
          })
          console.log('[Staff Profile API] ✅ Found', subjectAssignments.length, 'subject assignments')
        }
      } catch (e: any) {
        console.warn('[Staff Profile API] Exception in subject query:', e.message)
      }
    }

    // Compile response
    const profile = {
      ...staffData,
      is_teacher: isTeacher,
      teaching_level: teacherData?.teaching_level || null,
      bank_name: teacherData?.bank_name || null,
      account_number: teacherData?.account_number || null,
      account_name: teacherData?.account_name || null,
      salary: teacherData?.salary || null,
      class_assignments: classAssignments,
      subject_assignments: subjectAssignments,
      account_status: userData?.status || 'UNKNOWN',
      user_id: userId,
    }

    const elapsed = Date.now() - startTime
    console.log(
      `[Staff Profile API] ✅ Complete success in ${elapsed}ms:`,
      `${profile.first_name || 'Unknown'} ${profile.last_name || ''}`
    )

    return NextResponse.json(
      {
        success: true,
        data: profile,
      },
      { status: 200 }
    )
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`[Staff Profile API] ❌ Error after ${elapsed}ms:`, {
      message: error.message,
      code: error.code,
      stack: error.stack?.substring(0, 300),
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch staff profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
