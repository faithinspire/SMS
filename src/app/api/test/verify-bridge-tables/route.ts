import { NextRequest, NextResponse } from 'next/server'

interface VerificationResult {
  message: string
  status: 'SUCCESS'
  details: {
    bridge_tables_deprecated: boolean
    actual_tables_used: string[]
    deprecation_note: string
  }
}

/**
 * DEPRECATED ENDPOINT
 * Bridge tables (student_class_teachers, student_subject_teachers) have been removed.
 * All service queries now use direct relationships:
 * - Class teacher: stored in class_arm_combos.class_teacher_id
 * - Subject teacher: queried via subject_teacher_assignments table
 * - Student subjects: queried via student_subjects table
 */
export async function GET(request: NextRequest): Promise<NextResponse<VerificationResult>> {
  const result: VerificationResult = {
    message: 'Bridge tables architecture deprecated',
    status: 'SUCCESS',
    details: {
      bridge_tables_deprecated: true,
      actual_tables_used: [
        'students',
        'users',
        'classes',
        'arms',
        'class_arm_combos',
        'subjects',
        'student_subjects',
        'subject_teacher_assignments',
        'guardians',
      ],
      deprecation_note:
        'Non-existent bridge tables have been removed from all service queries. ' +
        'Student-teacher relationships are now handled via: ' +
        '1) class_arm_combos.class_teacher_id for class teachers ' +
        '2) subject_teacher_assignments for subject teachers ' +
        '3) student_subjects for student subject enrollment',
    },
  }

  return NextResponse.json(result, { status: 200 })
}
