import { NextRequest, NextResponse } from 'next/server'
import { UserRegistrationService } from '@/services/user-registration.service'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * POST /api/auth/register-student-complete
 * 
 * Complete student registration with full class and subject linking
 * This is called AFTER basic auth registration to create the student record
 * with all relationships
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      full_name,
      school_id,
      class_arm_combo_id,
      admission_number,
      subject_ids = [],
      date_of_birth,
      department,
      password,
    } = body

    // CRITICAL FIX: Auto-generate admission_number if not provided
    let finalAdmissionNumber = admission_number
    if (!finalAdmissionNumber) {
      console.log('[API] admission_number not provided, auto-generating...')
      
      // Get class info
      const { data: classCombo, error: classError } = await supabase
        .from('class_arm_combos')
        .select('classes(name)')
        .eq('id', class_arm_combo_id)
        .single()

      if (!classError && classCombo) {
        const year = new Date().getFullYear()
        const classPrefix = (classCombo.classes as any)?.name?.substring(0, 3).toUpperCase().replace(/\s+/g, '') || 'STU'
        
        // Get count of existing students in this school
        const { data: existingStudents, error: countError } = await supabase
          .from('students')
          .select('id', { count: 'exact' })
          .eq('school_id', school_id)

        if (!countError) {
          const sequence = ((existingStudents?.length || 0) + 1).toString().padStart(4, '0')
          finalAdmissionNumber = `${year}-${classPrefix}-${sequence}`
        } else {
          const timestamp = Date.now().toString().slice(-6)
          finalAdmissionNumber = `${classPrefix}-${timestamp}`
        }
      } else {
        const timestamp = Date.now().toString().slice(-6)
        finalAdmissionNumber = `STU-${timestamp}`
      }

      console.log(`[API] Generated admission_number: ${finalAdmissionNumber}`)
    }

    console.log('[API] POST /auth/register-student-complete START', {
      email,
      full_name,
      school_id,
      class_arm_combo_id,
      admission_number: finalAdmissionNumber,
      subject_count: subject_ids?.length || 0,
    })

    // Validate required fields (now admission_number is guaranteed to exist)
    if (!email || !full_name || !school_id || !class_arm_combo_id || !finalAdmissionNumber) {
      console.error('ERROR: Missing required fields:', {
        email: !!email,
        full_name: !!full_name,
        school_id: !!school_id,
        class_arm_combo_id: !!class_arm_combo_id,
        admission_number: !!finalAdmissionNumber,
      })

      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['email', 'full_name', 'school_id', 'class_arm_combo_id', 'admission_number'],
        },
        { status: 400 }
      )
    }

    // Call UserRegistrationService which handles:
    // 1. User record creation
    // 2. Student record creation with class_arm_combo_id
    // 3. Student-subject linking with teacher_id population
    // 4. Admission number is guaranteed to be set

    console.log('[API] Calling UserRegistrationService.registerStudent...')
    const result = await UserRegistrationService.registerStudent({
      email,
      full_name,
      password: password || 'temp-password',
      school_id,
      class_arm_combo_id,
      admission_number: finalAdmissionNumber,  // GUARANTEED TO BE SET
      subject_ids,
      date_of_birth,
      department,
    })

    console.log('[API] SUCCESS: UserRegistrationService completed successfully')
    console.log('[API] Result:', {
      student_id: result.id,
      email: result.email,
    })

    // Verify that the student was actually created with class_arm_combo_id and admission_number
    const { data: verifyStudent, error: verifyError } = await supabase
      .from('students')
      .select('id, class_arm_combo_id, admission_number')
      .eq('user_id', result.id)
      .single()

    if (verifyError) {
      console.warn('[API] Warning: Could not verify student record:', verifyError)
    } else {
      console.log('[API] SUCCESS: VERIFIED student record:', {
        student_id: verifyStudent?.id,
        class_arm_combo_id: verifyStudent?.class_arm_combo_id,
        admission_number: verifyStudent?.admission_number,
      })

      if (!verifyStudent?.class_arm_combo_id) {
        console.error('[API] ERROR: class_arm_combo_id was NOT saved! Value is NULL')
        return NextResponse.json(
          {
            success: false,
            error: 'Student created but class assignment failed',
            details: 'class_arm_combo_id was not saved to database',
            student_id: result.id,
          },
          { status: 201 }
        )
      }

      if (!verifyStudent?.admission_number) {
        console.error('[API] ERROR: admission_number was NOT saved! Value is NULL')
        return NextResponse.json(
          {
            success: false,
            error: 'Student created but admission number was not saved',
            details: 'admission_number is NULL in database',
            student_id: result.id,
          },
          { status: 201 }
        )
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Student registered successfully with class and subjects',
        student_id: result.id,
        email: result.email,
        admission_number: finalAdmissionNumber,
        verified: {
          class_arm_combo_id_saved: !!verifyStudent?.class_arm_combo_id,
          admission_number_saved: !!verifyStudent?.admission_number,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('ERROR in register-student-complete:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    })
    return NextResponse.json(
      {
        error: error.message || 'Failed to complete student registration',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}

