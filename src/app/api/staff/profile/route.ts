import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/staff/profile
 * Get staff member's profile with salary and appointment information
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - staff_id: UUID (required)
 * 
 * RETURNS:
 * {
 *   success: boolean,
 *   profile: {
 *     id: UUID,
 *     user_id: UUID,
 *     full_name: string,
 *     email: string,
 *     photo_url: string,
 *     position: string,
 *     employment_date: date,
 *     subjects: Array<{id, name, code}>,
 *     classes: Array<{class_name, arm_name}>,
 *     salary_info: {
 *       current_salary: number,
 *       currency: string,
 *       last_paid: date,
 *       payment_status: string
 *     },
 *     appointment_info: {
 *       position: string,
 *       appointment_date: date,
 *       department: string,
 *       qualifications: string
 *     }
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const staffId = searchParams.get('staff_id')

    if (!schoolId || !staffId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, staff_id' },
        { status: 400 }
      )
    }

    // Step 1: Get staff basic information
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select(
        `
        id,
        user_id,
        school_id,
        position,
        employment_date,
        created_at,
        users (
          id,
          full_name,
          email,
          photo_url,
          role
        )
      `
      )
      .eq('id', staffId)
      .eq('school_id', schoolId)
      .single()

    if (staffError || !staffData) {
      console.error('Error fetching staff:', staffError)
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Step 2: Get subject assignments
    const { data: assignments, error: assignmentError } = await supabase
      .from('subject_teacher_assignments')
      .select(
        `
        subject_id,
        subjects (
          id,
          name,
          code
        ),
        class_arm_combos (
          classes (name),
          arms (name)
        )
      `
      )
      .eq('school_id', schoolId)
      .eq('teacher_id', staffData.user_id)

    if (assignmentError) {
      console.error('Error fetching assignments:', assignmentError)
    }

    // Step 3: Get salary information
    const { data: salaries, error: salaryError } = await supabase
      .from('salaries')
      .select('id, amount, term_id, payment_status, due_date, paid_date')
      .eq('school_id', schoolId)
      .eq('staff_id', staffId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (salaryError) {
      console.error('Error fetching salary:', salaryError)
    }

    // Step 4: Format response
    const profile = {
      id: staffData.id,
      user_id: staffData.user_id,
      full_name: staffData.users?.full_name || 'Unknown',
      email: staffData.users?.email || '',
      photo_url: staffData.users?.photo_url || null,
      role: staffData.users?.role || 'STAFF',
      position: staffData.position || 'Not specified',
      employment_date: staffData.employment_date || null,
      created_at: staffData.created_at,

      // Subject assignments
      subjects: (assignments || [])
        .map((a: any) => ({
          id: a.subject_id,
          name: a.subjects?.name || 'Unknown',
          code: a.subjects?.code || '',
        }))
        .filter((s) => s.id), // Remove duplicates

      // Class assignments
      classes: (assignments || [])
        .map((a: any) => ({
          class_name: a.class_arm_combos?.classes?.name || 'Unknown',
          arm_name: a.class_arm_combos?.arms?.name || '',
        }))
        .filter((c) => c.class_name), // Remove duplicates

      // Salary information
      salary_info: {
        current_salary: salaries?.[0]?.amount || 0,
        currency: 'NGN', // Default to Nigerian Naira
        last_paid: salaries?.[0]?.paid_date || null,
        payment_status: salaries?.[0]?.payment_status || 'PENDING',
        due_date: salaries?.[0]?.due_date || null,
      },

      // Appointment information
      appointment_info: {
        position: staffData.position || 'Not specified',
        appointment_date: staffData.employment_date || null,
        department: 'Not specified', // Could be extended to staff table
        qualifications: 'Not specified', // Could be extended to staff table
      },
    }

    return NextResponse.json({
      success: true,
      profile,
    })
  } catch (error) {
    console.error('Error in GET /api/staff/profile:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
