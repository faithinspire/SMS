/**
 * School Admin - Student Registration API
 * 
 * POST /api/school-admin/students/register
 * 
 * Registers a new student for a school admin
 * Requires: schoolId, firstName, lastName, email, phone, password, etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      schoolId,
      firstName,
      lastName,
      gender,
      dateOfBirth,
      email,
      phone,
      password,
      classArmComboId,
      admissionNumber,
      admissionDate,
      guardianName,
      guardianPhone,
      guardianEmail,
    } = body

    // Validate required fields
    if (!schoolId || !firstName || !lastName || !email || !password || !classArmComboId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log('[Student Registration API] Registering student:', {
      firstName,
      lastName,
      email,
      schoolId,
    })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Step 1: Create auth user via backend API
    console.log('[Student Reg API] Creating auth user...')
    const trimmedEmail = email.trim().toLowerCase()
    const authResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: trimmedEmail,
        password,
        full_name: `${firstName} ${lastName}`,
        role: 'STUDENT',
        school_id: schoolId,
        user_type: 'STUDENT',
      }),
    })

    if (!authResponse.ok) {
      const errorData = await authResponse.json()
      throw new Error(errorData.error || 'Failed to create auth user')
    }

    const authData = await authResponse.json()
    const userId = authData.user?.id
    if (!userId) throw new Error('Failed to create auth user')

    console.log('[Student Reg API] ✅ Auth user created:', userId)

    // Step 2: Create user record in database
    console.log('[Student Reg API] Creating user record...')
    const { error: userDbError } = await supabase.from('users').insert({
      id: userId,
      school_id: schoolId,
      email: trimmedEmail,
      full_name: `${firstName} ${lastName}`,
      role: 'STUDENT',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (userDbError && userDbError.code !== '23505') {
      throw new Error(`Failed to create user record: ${userDbError.message}`)
    }

    console.log('[Student Reg API] ✅ User record created')

    // Step 3: Create student record
    console.log('[Student Reg API] Creating student record...')
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({
        school_id: schoolId,
        user_id: userId,
        class_arm_combo_id: classArmComboId,
        admission_number: admissionNumber,
        gender: gender || 'MALE',
        date_of_birth: dateOfBirth || null,
        phone: phone || null,
        status: 'ACTIVE',
        is_locked: false,
      })
      .select()

    if (studentError) {
      throw new Error(`Failed to create student record: ${studentError.message}`)
    }

    const studentId = studentData?.[0]?.id
    console.log('[Student Reg API] ✅ Student record created:', studentId)

    // Step 4: Create guardian record (if provided)
    if (guardianName) {
      console.log('[Student Reg API] Creating guardian record...')
      const { error: guardianError } = await supabase.from('guardians').insert({
        student_id: studentId,
        full_name: guardianName,
        phone: guardianPhone || null,
        email: guardianEmail || null,
        relationship: 'Parent',
      })

      if (guardianError) {
        console.warn('[Student Reg API] ⚠️ Failed to create guardian record:', guardianError.message)
      } else {
        console.log('[Student Reg API] ✅ Guardian record created')
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        studentId,
        userId,
        email: trimmedEmail,
        firstName,
        lastName,
        admissionNumber,
      },
      message: `Student ${firstName} ${lastName} registered successfully!`,
    })
  } catch (error: any) {
    console.error('[Student Reg API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Student registration failed' },
      { status: 500 }
    )
  }
}
