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

    console.log('[API] POST /auth/register-student-complete START', {
      email,
      full_name,
      school_id,
      class_arm_combo_id,
      admission_number,
      subject_count: subject_ids?.length || 0,
    })

    // Validate required fields
    if (!email || !full_name || !school_id || !class_arm_combo_id || !admission_number) {
      console.error('âŒ Missing required fields:', {
        email: !!email,
        full_name: !!full_name,
        school_id: !!school_id,
        class_arm_combo_id: !!class_arm_combo_id,
        admission_number: !!admission_number,
      })

      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: ['email', 'full_name', 'school_id', 'class_arm_combo_id', 'admission_number'],
        },
        { status: 400 }
      )
    }

    // âœ… FIX: Call UserRegistrationService which handles:
    // 1. User record creation
    // 2. Student record creation with class_arm_combo_id â† CRITICAL
    // 3. Student-subject linking with teacher_id population (BLOCKER 1 FIX)
    // 4. Academic session tracking (BLOCKER 2 FIX)

    console.log('[API] Calling UserRegistrationService.registerStudent...')
    const result = await UserRegistrationService.registerStudent({
      email,
      full_name,
      password: password || 'temp-password',
      school_id,
      class_arm_combo_id, // âœ… CRITICAL: Passing class ID (this must reach the service)
      admission_number,
      subject_ids,
      date_of_birth,
      department,
    })

    console.log('[API] âœ… UserRegistrationService completed successfully')
    console.log('[API] Result:', {
      student_id: result.id,
      email: result.email,
    })

    // âœ… NEW: VERIFY that the student was actually created with class_arm_combo_id
    // This is critical for diagnosing if the registration service is working
    const { data: verifyStudent, error: verifyError } = await supabase
      .from('students')
      .select('id, class_arm_combo_id, admission_number')
      .eq('user_id', result.id)
      .single()

    if (verifyError) {
      console.warn('[API] Warning: Could not verify student record:', verifyError)
    } else {
      console.log('[API] âœ… VERIFIED student record:', {
        student_id: verifyStudent?.id,
        class_arm_combo_id: verifyStudent?.class_arm_combo_id,
        admission_number: verifyStudent?.admission_number,
      })

      if (!verifyStudent?.class_arm_combo_id) {
        console.error('[API] âŒ CRITICAL: class_arm_combo_id was NOT saved! Value is NULL')
        return NextResponse.json(
          {
            success: false,
            error: 'Student created but class assignment failed',
            details: 'class_arm_combo_id was not saved to database',
            student_id: result.id,
          },
          { status: 201 } // Still 201 because auth succeeded, but flag the issue
        )
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Student registered successfully with class and subjects',
        student_id: result.id,
        email: result.email,
        verified: {
          class_arm_combo_id_saved: !!verifyStudent?.class_arm_combo_id,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('âŒ Error in register-student-complete:', {
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

