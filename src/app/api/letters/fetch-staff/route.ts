import { createClient } from '@/lib/supabase-client'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const staffId = searchParams.get('staffId')
    const schoolId = searchParams.get('schoolId')

    if (!staffId || !schoolId) {
      return NextResponse.json(
        { success: false, error: 'Missing staffId or schoolId' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Get user record (using staffId as users.id)
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role, status')
      .eq('id', staffId)
      .eq('school_id', schoolId)
      .maybeSingle()

    if (userError || !userRecord) {
      console.error('Error fetching user record:', userError)
      return NextResponse.json(
        { success: false, error: 'Staff not found' },
        { status: 404 }
      )
    }

    // Get staff record
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('id, user_id, position, department, employment_date, salary, bank_name, account_number, account_holder_name')
      .eq('user_id', staffId)
      .eq('school_id', schoolId)
      .maybeSingle()

    // Get class assignment
    const { data: classAssignment } = await supabase
      .from('teacher_class_assignments')
      .select(`
        id,
        class_arm_combo_id,
        is_class_teacher,
        class_arm_combos (
          id,
          class_id,
          arm_id,
          classes (id, name),
          arms (id, name)
        )
      `)
      .eq('teacher_id', staffId)
      .eq('school_id', schoolId)
      .maybeSingle()

    // Get subject assignments
    const { data: subjectAssignments } = await supabase
      .from('subject_teacher_assignments')
      .select(`
        id,
        subject_id,
        subjects (id, name),
        class_arm_combos (
          id,
          classes (id, name),
          arms (id, name)
        )
      `)
      .eq('teacher_id', staffId)
      .eq('school_id', schoolId)

    // Build response with all staff data
    const responseData = {
      id: userRecord.id,
      full_name: userRecord.full_name || '',
      email: userRecord.email || '',
      phone: userRecord.phone || '',
      role: userRecord.role || '',
      position: staffRecord?.position || '',
      department: staffRecord?.department || '',
      employment_date: staffRecord?.employment_date || '',
      salary: staffRecord?.salary || 0,
      salaryFrequency: 'MONTHLY', // Default, not stored yet
      bankName: staffRecord?.bank_name || '',
      accountNumber: staffRecord?.account_number || '',
      accountName: staffRecord?.account_holder_name || '',
      classAssignment: classAssignment ? {
        class_name: classAssignment.class_arm_combos?.classes?.name || '',
        arm_name: classAssignment.class_arm_combos?.arms?.name || '',
        is_class_teacher: classAssignment.is_class_teacher || false,
      } : undefined,
      subjects: subjectAssignments
        ? subjectAssignments.map(sa => ({
            name: sa.subjects?.name || '',
            class: `${sa.class_arm_combos?.classes?.name || ''} ${sa.class_arm_combos?.arms?.name || ''}`.trim(),
          }))
        : [],
    }

    return NextResponse.json(
      { success: true, data: responseData },
      { status: 200 }
    )
  } catch (error) {
    console.error('fetch-staff error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
