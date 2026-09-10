import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function GET(request: NextRequest) {
  try {
    // Get the teacher ID and school ID from headers or query params
    const teacherId = request.headers.get('x-teacher-id')
    const schoolId = request.headers.get('x-school-id')

    if (!teacherId || !schoolId) {
      return NextResponse.json(
        { error: 'Missing teacherId or schoolId' },
        { status: 400 }
      )
    }

    // Get class assignment for this teacher
    const { data: managedClasses, error: classError } = await supabase
      .from('class_arm_combos')
      .select(
        `
        id,
        class_id,
        arm_id,
        classes (id, name, level, type),
        arms (id, name)
      `
      )
      .eq('class_teacher_id', teacherId)
      .eq('school_id', schoolId)

    if (classError) throw classError

    // Get subjects taught by this teacher
    const { data: taughtSubjects, error: subjectError } = await supabase
      .from('subject_teacher_assignments')
      .select(
        `
        id,
        subject_id,
        class_arm_combo_id,
        subjects (id, name, code),
        class_arm_combos (
          id,
          classes (id, name, level, type),
          arms (id, name)
        )
      `
      )
      .eq('teacher_id', teacherId)
      .eq('school_id', schoolId)

    if (subjectError) {
      console.error('[Dashboard API] Error fetching taught subjects:', subjectError)
      throw subjectError
    }

    console.log('[Dashboard API] Subject assignments for teacher:', taughtSubjects?.length || 0)

    // Get students in managed classes
    let classStudents: any[] = []
    if (managedClasses && managedClasses.length > 0) {
      const classComboIds = managedClasses.map(c => c.id)

      const { data: students, error: studentError } = await supabase
        .from('students')
        .select(
          `
          id,
          user_id,
          admission_number,
          class_arm_combo_id,
          users!students_user_id_fkey (
            id,
            full_name,
            email,
            photo_url
          ),
          student_subjects (
            id,
            subject_id,
            subjects (id, name, code)
          )
        `
        )
        .in('class_arm_combo_id', classComboIds)
        .eq('school_id', schoolId)

      if (!studentError && students) {
        classStudents = students
      }
    }

    // Get students taking subjects taught by this teacher
    // CORRECT PATTERN: Query student_subjects to get students enrolled in subjects this teacher teaches
    let subjectStudents: any[] = []
    if (taughtSubjects && taughtSubjects.length > 0) {
      const taughtSubjectIds = [...new Set(taughtSubjects.map(s => s.subject_id))]
      const classComboIds = taughtSubjects.map(s => s.class_arm_combo_id)

      console.log('[Dashboard API] Taught subjects found:', taughtSubjects.length)
      console.log('[Dashboard API] Subject IDs:', taughtSubjectIds)
      console.log('[Dashboard API] Class IDs for subject teaching:', classComboIds)

      // CORRECT: Query student_subjects to find students enrolled in these subjects
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('student_subjects')
        .select(
          `
          id,
          student_id,
          subject_id,
          students (
            id,
            user_id,
            admission_number,
            class_arm_combo_id,
            users!students_user_id_fkey (
              id,
              full_name,
              email,
              photo_url
            ),
            class_arm_combos (
              id,
              classes (id, name, level, type),
              arms (id, name)
            )
          )
        `
        )
        .in('subject_id', taughtSubjectIds)
        .eq('school_id', schoolId)

      if (enrollmentError) {
        console.error('[Dashboard API] Error fetching student enrollments:', enrollmentError)
      } else {
        console.log('[Dashboard API] Student enrollments found:', enrollments?.length || 0)
        
        // Filter to only students in classes where teacher teaches that subject
        if (enrollments && enrollments.length > 0) {
          subjectStudents = enrollments
            .filter((enrollment: any) => {
              const student = enrollment.students
              // Check if this student's class is in the teacher's teaching assignments
              return student && classComboIds.includes(student.class_arm_combo_id)
            })
            .map((enrollment: any) => enrollment.students)
            .filter(Boolean) // Remove nulls
        }
        
        console.log('[Dashboard API] Filtered subject students for teacher classes:', subjectStudents.length)
      }
    } else {
      console.log('[Dashboard API] No taught subjects found for teacher:', teacherId)
    }

    // Calculate stats
    const classesManaged = managedClasses?.length || 0
    const subjectsTaught = new Set((taughtSubjects || []).map((s: any) => s.subject_id)).size
    const classStudentCount = classStudents.length
    const subjectStudentCount = subjectStudents.length
    const totalStudents = new Set([
      ...classStudents.map(s => s.id),
      ...subjectStudents.map(s => s.students?.id).filter(Boolean)
    ]).size

    return NextResponse.json({
      managedClasses: managedClasses || [],
      taughtSubjects: taughtSubjects || [],
      classStudents: classStudents || [],
      subjectStudents: subjectStudents || [],
      stats: {
        classStudentCount,
        subjectStudentCount,
        totalStudents,
        classesManaged,
        subjectsTaught,
      },
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to load dashboard data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
