/**
 * School Admin - Staff Registration API
 * 
 * POST /api/school-admin/staff/register
 * 
 * Registers a new staff member (teacher, principal, headteacher, accountant, or support staff)
 * Handles multi-step registration and teacher-specific assignments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      schoolId,
      staffCategory,
      firstName,
      lastName,
      email,
      phone,
      password,
      position,
      department,
      staffNumber,
      // Teacher-specific fields
      teachingLevel,
      bankName,
      accountNumber,
      accountName,
      salary,
      classArmComboId,
      subjectIds,
    } = body

    // Validate required fields
    if (!schoolId || !staffCategory || !firstName || !lastName || !email || !password || !position || !department) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[Staff Registration API] Registering staff:', {
      firstName,
      lastName,
      staffCategory,
      email,
      schoolId,
    })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Step 1: Create auth user via backend API
    console.log('[Staff Reg API] Creating auth user...')
    const trimmedEmail = email.trim().toLowerCase()
    
    // Map staff categories to appropriate roles
    const roleMap: Record<string, string> = {
      TEACHER: 'TEACHER',
      PRINCIPAL: 'PRINCIPAL',
      HEAD_TEACHER: 'HEAD_TEACHER',
      ACCOUNTANT: 'ACCOUNTANT',
      ADMINISTRATOR: 'STAFF',
      SUPPORT_STAFF: 'STAFF',
    }
    
    const authRole = roleMap[staffCategory] || 'STAFF'

    const authResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: trimmedEmail,
        password,
        full_name: `${firstName} ${lastName}`,
        role: authRole,
        school_id: schoolId,
        user_type: 'STAFF',
      }),
    })

    if (!authResponse.ok) {
      const errorData = await authResponse.json()
      throw new Error(errorData.error || 'Failed to create auth user')
    }

    const authData = await authResponse.json()
    const userId = authData.user?.id
    if (!userId) throw new Error('Failed to create auth user')

    console.log('[Staff Reg API] ✅ Auth user created:', userId)

    // Step 2: Create user record in database
    console.log('[Staff Reg API] Creating user record...')
    const { error: userDbError } = await supabase.from('users').insert({
      id: userId,
      school_id: schoolId,
      email: trimmedEmail,
      full_name: `${firstName} ${lastName}`,
      role: authRole,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (userDbError && userDbError.code !== '23505') {
      throw new Error(`Failed to create user record: ${userDbError.message}`)
    }

    console.log('[Staff Reg API] ✅ User record created')

    // Step 3: Create staff record
    console.log('[Staff Reg API] Creating staff record...')
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .insert({
        school_id: schoolId,
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        email: trimmedEmail,
        phone: phone || null,
        position,
        department,
        staff_number: staffNumber || null,
      })
      .select()

    if (staffError) {
      throw new Error(`Failed to create staff record: ${staffError.message}`)
    }

    const staffId = staffData?.[0]?.id
    console.log('[Staff Reg API] ✅ Staff record created:', staffId)

    // Step 4: If teacher, create teacher record
    if (staffCategory === 'TEACHER') {
      console.log('[Staff Reg API] Creating teacher record...')

      if (!teachingLevel) {
        throw new Error('Teaching level is required for teachers')
      }

      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .insert({
          staff_id: staffId,
          teaching_level: teachingLevel,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          account_name: accountName || null,
          salary: salary ? parseFloat(salary) : null,
        })
        .select()

      if (teacherError) {
        throw new Error(`Failed to create teacher record: ${teacherError.message}`)
      }

      console.log('[Staff Reg API] ✅ Teacher record created')

      // Step 5: Assign class to teacher
      if (classArmComboId) {
        console.log('[Staff Reg API] Assigning class to teacher...')
        const { error: classError } = await supabase
          .from('class_arm_combos')
          .update({ class_teacher_id: userId })
          .eq('id', classArmComboId)

        if (!classError) {
          console.log('[Staff Reg API] ✅ Class assigned')
        }
      }

      // Step 6: Assign subjects to teacher
      if (subjectIds && subjectIds.length > 0) {
        console.log('[Staff Reg API] Assigning subjects to teacher...')
        const subjectAssignments = subjectIds.map((subjectId: string) => ({
          teacher_id: userId,
          subject_id: subjectId,
          class_arm_combo_id: classArmComboId,
          school_id: schoolId,
        }))

        const { error: subjectError } = await supabase
          .from('subject_teacher_assignments')
          .insert(subjectAssignments)

        if (subjectError) {
          console.error('[Staff Reg API] Warning: Failed to assign subjects:', subjectError.message)
        } else {
          console.log('[Staff Reg API] ✅ Subjects assigned')
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        staffId,
        userId,
        email: trimmedEmail,
        firstName,
        lastName,
        staffCategory,
        position,
        isTeacher: staffCategory === 'TEACHER',
      },
      message: `${staffCategory} ${firstName} ${lastName} registered successfully!`,
    })
  } catch (error: any) {
    console.error('[Staff Reg API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Staff registration failed' },
      { status: 500 }
    )
  }
}
