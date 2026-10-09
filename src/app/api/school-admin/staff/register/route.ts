/**
 * School Admin - Staff Registration API
 * 
 * POST /api/school-admin/staff/register
 * 
 * Registers new staff members:
 * - Teachers: with class/arm/subject assignments
 * - Principal, Head Teacher, Accountant: role-specific fields
 * - Support Staff: basic staff record
 * 
 * All staff are registered as Supabase Auth users with appropriate roles.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Map staff categories to actual user roles
const roleMap: Record<string, string> = {
  TEACHER: 'TEACHER',
  PRINCIPAL: 'PRINCIPAL',
  HEAD_TEACHER: 'HEAD_TEACHER',
  ACCOUNTANT: 'ACCOUNTANT',
  ADMINISTRATOR: 'STAFF',
  SUPPORT_STAFF: 'STAFF',
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

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
      console.error('[Staff Reg API] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields', success: false },
        { status: 400 }
      )
    }

    console.log('[Staff Reg API] Registering staff:', {
      firstName,
      lastName,
      staffCategory,
      email,
      schoolId,
    })

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!, // Use service key for admin operations
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const userRole = roleMap[staffCategory] || 'STAFF'
    const trimmedEmail = email.trim().toLowerCase()

    // Step 1: Create Supabase Auth user
    console.log('[Staff Reg API] Step 1: Creating Supabase auth user...')
    let authUser
    try {
      const { data, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password,
        email_confirm: true, // Auto-confirm email for staff
        user_metadata: {
          full_name: `${firstName} ${lastName}`,
          school_id: schoolId,
          role: userRole,
        },
      })

      if (signUpError) throw signUpError
      authUser = data.user
      if (!authUser?.id) throw new Error('Failed to get user ID from auth response')
      console.log('[Staff Reg API] ✅ Auth user created:', authUser.id)
    } catch (authErr: any) {
      console.error('[Staff Reg API] Auth error:', authErr.message)
      throw new Error(`Failed to create auth user: ${authErr.message}`)
    }

    const userId = authUser.id

    // Step 2: Create user record in database
    console.log('[Staff Reg API] Step 2: Creating database user record...')
    const { error: userDbError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        school_id: schoolId,
        email: trimmedEmail,
        full_name: `${firstName} ${lastName}`,
        role: userRole,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      })
      .single()

    if (userDbError) {
      console.warn('[Staff Reg API] User record error (may already exist):', userDbError.message)
      // Continue - user record might already exist
    } else {
      console.log('[Staff Reg API] ✅ User record created')
    }

    // Step 3: Create staff record
    console.log('[Staff Reg API] Step 3: Creating staff record...')
    const { data: staffInsertData, error: staffError } = await supabaseAdmin
      .from('staff')
      .insert({
        school_id: schoolId,
        user_id: userId,
        position,
        employment_date: new Date().toISOString().split('T')[0], // Today's date
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (staffError) {
      console.error('[Staff Reg API] Staff creation error:', staffError.message)
      throw new Error(`Failed to create staff record: ${staffError.message}`)
    }

    const staffId = staffInsertData?.id
    console.log('[Staff Reg API] ✅ Staff record created:', staffId)

    // Step 4: If teacher, create teacher profile and assignments
    if (staffCategory === 'TEACHER') {
      console.log('[Staff Reg API] Step 4: Teacher-specific registration...')

      if (!teachingLevel) {
        throw new Error('Teaching level is required for teachers')
      }

      // Create teacher profile
      console.log('[Staff Reg API] Creating teacher profile...')
      const { data: teacherData, error: teacherError } = await supabaseAdmin
        .from('teachers')
        .insert({
          school_id: schoolId,
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          email: trimmedEmail,
          phone: phone || null,
          teaching_level: teachingLevel,
          bank_name: bankName || null,
          account_number: accountNumber || null,
          account_name: accountName || null,
          salary: salary ? parseFloat(String(salary)) : null,
        })
        .select()
        .single()

      if (teacherError) {
        console.error('[Staff Reg API] Teacher profile error:', teacherError.message)
        throw new Error(`Failed to create teacher profile: ${teacherError.message}`)
      }

      console.log('[Staff Reg API] ✅ Teacher profile created')

      // Assign class if provided
      if (classArmComboId) {
        console.log('[Staff Reg API] Assigning class to teacher...')
        const { error: classError } = await supabaseAdmin
          .from('class_arm_combos')
          .update({ class_teacher_id: userId })
          .eq('id', classArmComboId)
          .eq('school_id', schoolId)

        if (classError) {
          console.warn('[Staff Reg API] Class assignment warning:', classError.message)
        } else {
          console.log('[Staff Reg API] ✅ Class assigned')
        }
      }

      // Assign subjects if provided
      if (subjectIds && Array.isArray(subjectIds) && subjectIds.length > 0) {
        console.log('[Staff Reg API] Assigning subjects...')
        const subjectAssignments = subjectIds.map((subjectId: string) => ({
          teacher_id: userId,
          subject_id: subjectId,
          class_arm_combo_id: classArmComboId || null,
          school_id: schoolId,
          created_at: new Date().toISOString(),
        }))

        const { error: subjectError } = await supabaseAdmin
          .from('subject_teacher_assignments')
          .insert(subjectAssignments)

        if (subjectError) {
          console.warn('[Staff Reg API] Subject assignment warning:', subjectError.message)
        } else {
          console.log('[Staff Reg API] ✅ Subjects assigned:', subjectIds.length)
        }
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`[Staff Reg API] ✅ Registration complete in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        userId,
        staffId,
        email: trimmedEmail,
        firstName,
        lastName,
        role: userRole,
        staffCategory,
        position,
        isTeacher: staffCategory === 'TEACHER',
      },
      message: `${staffCategory} ${firstName} ${lastName} registered successfully!`,
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`[Staff Reg API] ❌ Error after ${elapsed}ms:`, {
      message: error.message,
      stack: error.stack?.substring(0, 300),
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Staff registration failed',
      },
      { status: 500 }
    )
  }
}
