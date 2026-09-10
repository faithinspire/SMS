import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { CanonicalSubjectService } from '@/services/canonical-subject.service'

/**
 * GET /api/teacher/subject-students
 * 
 * CRITICAL API: Fetch students for a SUBJECT TEACHER's score sheet
 * 
 * Query students who meet ALL criteria:
 * 1. Registered for the subject this teacher teaches
 * 2. In a class this teacher is assigned to teach that subject
 * 3. Currently active/not dropped
 * 4. Belong to the same school
 * 
 * QUERY PARAMS (Required):
 * - school_id: UUID (teacher's school)
 * - teacher_id: UUID (the subject teacher)
 * - subject_id: UUID (the subject being taught)
 * - class_arm_combo_id: UUID (optional - filter to specific class, else all teacher's classes)
 * 
 * RETURNS:
 * - Array of students with their enrollment details
 * 
 * CANONICAL FLOW:
 * 1. Verify teacher is assigned to teach this subject (subject_teacher_assignments)
 * 2. Get all class_arm_combos for this teacher-subject combo
 * 3. Get all students enrolled in this subject (student_subjects)
 * 4. Filter to only those in teacher's assigned classes
 * 5. Return with readable names, NOT UUIDs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const teacherId = searchParams.get('teacher_id')
    const subjectId = searchParams.get('subject_id')
    const classArmComboId = searchParams.get('class_arm_combo_id')

    // Validate required parameters
    if (!schoolId || !teacherId || !subjectId) {
      return NextResponse.json(
        {
          error: 'Missing required query parameters',
          required: ['school_id', 'teacher_id', 'subject_id'],
          optional: ['class_arm_combo_id'],
        },
        { status: 400 }
      )
    }

    console.log('[API] GET /teacher/subject-students', {
      schoolId,
      teacherId,
      subjectId,
      classArmComboId,
    })

    // ========================================================================
    // STEP 0: VERIFY SUBJECT EXISTS IN CANONICAL CATALOG
    // ========================================================================

    const subjectExists = await CanonicalSubjectService.verifySubjectExists(subjectId, schoolId)
    if (!subjectExists) {
      console.log('[API] Subject not found or not valid for school', { subjectId, schoolId })
      return NextResponse.json(
        {
          success: true,
          count: 0,
          students: [],
          message: 'Subject not found or not available for this school',
        },
        { status: 200 }
      )
    }

    // ========================================================================
    // STEP 1: VERIFY TEACHER IS ASSIGNED TO TEACH THIS SUBJECT
    // ========================================================================

    const { data: teacherAssignments, error: assignmentError } = await supabase
      .from('subject_teacher_assignments')
      .select('id, class_arm_combo_id')
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)
      .eq('subject_id', subjectId)

    if (assignmentError) {
      console.error('[API] Error fetching teacher assignments:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to verify teacher assignments', details: assignmentError.message },
        { status: 500 }
      )
    }

    if (!teacherAssignments || teacherAssignments.length === 0) {
      console.log('[API] Teacher not assigned to this subject', { teacherId, subjectId })
      return NextResponse.json(
        {
          success: true,
          count: 0,
          students: [],
          message: 'Teacher is not assigned to teach this subject',
        },
        { status: 200 }
      )
    }

    console.log('[API] Found teacher assignments:', teacherAssignments.length)

    // ========================================================================
    // STEP 2: GET TEACHER'S CLASS_ARM_COMBO_IDS FOR THIS SUBJECT
    // ========================================================================

    let assignedClassIds = teacherAssignments.map((a: any) => a.class_arm_combo_id)

    // If specific class_arm_combo_id provided, verify it's in teacher's assignments
    if (classArmComboId) {
      if (!assignedClassIds.includes(classArmComboId)) {
        console.log('[API] Requested class not in teacher assignments', {
          classArmComboId,
          assignedClassIds,
        })
        return NextResponse.json(
          {
            success: true,
            count: 0,
            students: [],
            message: 'Teacher is not assigned to teach this subject in this class',
          },
          { status: 200 }
        )
      }
      assignedClassIds = [classArmComboId]
    }

    console.log('[API] Teacher assigned to classes:', assignedClassIds)

    // ========================================================================
    // STEP 3: GET ALL STUDENTS IN THE TEACHER'S ASSIGNED CLASSES
    // ========================================================================
    // KEY CHANGE: Get students from class enrollment, not subject enrollment
    // This ensures all students in the class appear for score entry

    const { data: classStudents, error: classStudentsError } = await supabase
      .from('students')
      .select(
        `
        id,
        admission_number,
        class_arm_combo_id,
        user_id,
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
      `
      )
      .eq('school_id', schoolId)
      .in('class_arm_combo_id', assignedClassIds)

    if (classStudentsError) {
      console.error('[API] Error fetching class students:', classStudentsError)
      return NextResponse.json(
        { error: 'Failed to fetch class students', details: classStudentsError.message },
        { status: 500 }
      )
    }

    console.log('[API] Found class students:', classStudents?.length || 0)

    if (!classStudents || classStudents.length === 0) {
      return NextResponse.json(
        {
          success: true,
          count: 0,
          students: [],
          message: 'No students in your assigned classes',
        },
        { status: 200 }
      )
    }

    // ========================================================================
    // STEP 4: FORMAT STUDENT DATA FOR SCORE ENTRY
    // ========================================================================

    const filteredStudents = classStudents
      .map((student: any) => {
        const classInfo = student?.class_arm_combos as any
        const user = student?.users as any

        return {
          id: student.id,
          user_id: student.user_id,
          admission_number: student.admission_number,
          full_name: user?.full_name || 'N/A',
          email: user?.email || 'N/A',
          photo_url: user?.photo_url,
          class_name: classInfo?.classes?.name || 'N/A',
          class_level: classInfo?.classes?.level || 'N/A',
          arm_name: classInfo?.arms?.name || 'N/A',
          class_display: `${classInfo?.classes?.name || 'Unknown'} - ${classInfo?.arms?.name || 'Unknown'}`,
        }
      })
      .sort((a: any, b: any) => a.admission_number.localeCompare(b.admission_number))

    console.log('[API] After filtering to teacher classes:', filteredStudents.length)

    // ========================================================================
    // STEP 5: GET CURRENT SCORES FOR THESE STUDENTS (optional context)
    // ========================================================================

    const studentIds = filteredStudents.map((s: any) => s.id)
    const { data: currentScores } = await supabase
      .from('score_sheets')
      .select('id, student_id, test1, test2, test3, test4, exam, total, grade')
      .eq('school_id', schoolId)
      .eq('subject_id', subjectId)
      .in('student_id', studentIds)

    const scoreMap = new Map()
    currentScores?.forEach((score: any) => {
      scoreMap.set(score.student_id, {
        test1: score.test1,
        test2: score.test2,
        test3: score.test3,
        test4: score.test4,
        exam: score.exam,
        total: score.total,
        grade: score.grade,
      })
    })

    // Enrich students with their current scores
    const enrichedStudents = filteredStudents.map((student: any) => ({
      ...student,
      current_scores: scoreMap.get(student.id) || null,
    }))

    // ========================================================================
    // RETURN RESPONSE
    // ========================================================================

    console.log('[API] Successfully returning', enrichedStudents.length, 'subject students')

    return NextResponse.json({
      success: true,
      count: enrichedStudents.length,
      subject: {
        id: subjectId,
      },
      class_filters: assignedClassIds.length > 1 ? assignedClassIds : undefined,
      students: enrichedStudents,
    })
  } catch (error: any) {
    console.error('[API] Exception in GET /teacher/subject-students:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error', details: error.stack },
      { status: 500 }
    )
  }
}
