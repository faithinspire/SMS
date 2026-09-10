import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/teacher/my-subjects
 * 
 * Fetch all subjects taught by a SUBJECT TEACHER with their classes
 * 
 * QUERY PARAMS (Required):
 * - school_id: UUID
 * - teacher_id: UUID
 * 
 * RETURNS:
 * - Array of subjects with their class assignments
 * 
 * CANONICAL FLOW:
 * Uses subject_teacher_assignments to get teacher's subject-class combos
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const teacherId = searchParams.get('teacher_id')

    if (!schoolId || !teacherId) {
      return NextResponse.json(
        {
          error: 'Missing required query parameters',
          required: ['school_id', 'teacher_id'],
        },
        { status: 400 }
      )
    }

    console.log('[API] GET /teacher/my-subjects', { schoolId, teacherId })

    // ========================================================================
    // STEP 1: GET ALL SUBJECT-CLASS ASSIGNMENTS FOR THIS TEACHER
    // ========================================================================

    const { data: assignments, error: assignmentError } = await supabase
      .from('subject_teacher_assignments')
      .select(
        `
        id,
        subject_id,
        class_arm_combo_id,
        subjects (
          id,
          name,
          code
        ),
        class_arm_combos (
          id,
          classes (id, name, level, type),
          arms (id, name)
        )
      `
      )
      .eq('school_id', schoolId)
      .eq('teacher_id', teacherId)

    if (assignmentError) {
      console.error('[API] Error fetching assignments:', assignmentError)
      return NextResponse.json(
        { error: 'Failed to fetch subject assignments', details: assignmentError.message },
        { status: 500 }
      )
    }

    if (!assignments || assignments.length === 0) {
      console.log('[API] No subject assignments found for teacher')
      return NextResponse.json(
        {
          success: true,
          count: 0,
          subjects: [],
          message: 'Teacher has no subject assignments',
        },
        { status: 200 }
      )
    }

    console.log('[API] Found', assignments.length, 'subject-class assignments')

    // ========================================================================
    // STEP 2: GROUP BY SUBJECT AND COLLECT CLASSES
    // ========================================================================

    const subjectMap = new Map<
      string,
      {
        id: string
        name: string
        code: string
        classes: Array<{ id: string; name: string; arm: string }>
      }
    >()

    assignments.forEach((assignment: any) => {
      const subject = assignment.subjects as any
      const classInfo = assignment.class_arm_combos as any

      if (!subject || !classInfo) return

      const subjectId = subject.id
      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          id: subjectId,
          name: subject.name,
          code: subject.code,
          classes: [],
        })
      }

      const subjectEntry = subjectMap.get(subjectId)!
      subjectEntry.classes.push({
        id: classInfo.id,
        name: `${classInfo.classes?.name || 'Unknown'} - ${classInfo.arms?.name || 'Unknown'}`,
        arm: classInfo.arms?.name || 'Unknown',
      })
    })

    // ========================================================================
    // STEP 3: CONVERT TO ARRAY AND SORT
    // ========================================================================

    const subjects = Array.from(subjectMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    console.log('[API] Returning', subjects.length, 'subjects')

    return NextResponse.json({
      success: true,
      count: subjects.length,
      subjects,
    })
  } catch (error: any) {
    console.error('[API] Exception in GET /teacher/my-subjects:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error', details: error.stack },
      { status: 500 }
    )
  }
}
