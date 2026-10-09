/**
 * School Admin - Staff Registration API
 * 
 * POST /api/school-admin/staff/register
 * 
 * Registers a new staff member (teacher or other staff)
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
    const authResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: trimmedEmail,
        password,
        full_name: `${firstName} ${lastName}`,
        role: staffCategory === 'TEACHER' ? 'TEACHER' : 'STAFF',
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
      role: staffCategory === 'TEACHER' ? 'TEACHER' : 'STAFF',
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
      message: `Staff member ${firstName} ${lastName} registered successfully!`,
    })
  } catch (error: any) {
    console.error('[Staff Reg API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Staff registration failed' },
      { status: 500 }
    )
  }
}
