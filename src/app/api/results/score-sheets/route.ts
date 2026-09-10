import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/results/score-sheets
 * Get score sheets for teacher/student
 * 
 * QUERY PARAMS (Teacher):
 * - school_id: UUID (required)
 * - teacher_id: UUID (required)
 * - term_id: UUID (optional)
 * - subject_id: UUID (optional)
 * - class_arm_combo_id: UUID (optional)
 * - student_id: UUID (optional)
 * 
 * QUERY PARAMS (Student):
 * - school_id: UUID (required)
 * - student_id: UUID (required)
 * - term_id: UUID (optional)
 * 
 * RETURNS:
 * - Array of score sheets with calculated totals and grades
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const teacherId = searchParams.get('teacher_id')
    const studentId = searchParams.get('student_id')
    const termId = searchParams.get('term_id')
    const subjectId = searchParams.get('subject_id')
    const classArmComboId = searchParams.get('class_arm_combo_id')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: school_id' },
        { status: 400 }
      )
    }

    // Build query based on context
    let query = supabase
      .from('score_sheets')
      .select(
        `
        id,
        school_id,
        student_id,
        subject_id,
        term_id,
        test1,
        test2,
        test3,
        test4,
        exam,
        total,
        grade,
        teacher_comment,
        hm_comment,
        test1_source,
        test2_source,
        test3_source,
        test4_source,
        exam_source,
        test1_cbt_source,
        test2_cbt_source,
        test3_cbt_source,
        test4_cbt_source,
        exam_cbt_source,
        updated_at,
        students (
          id,
          admission_number,
          users (full_name)
        ),
        subjects (name, code),
        terms (name),
        class_arm_combos (
          classes (name),
          arms (name)
        )
      `
      )
      .eq('school_id', schoolId)

    // Teacher view
    if (teacherId && !studentId) {
      // Get all classes managed by teacher
      const { data: managedClasses } = await supabase
        .from('class_arm_combos')
        .select('id')
        .eq('class_teacher_id', teacherId)

      const classIds = managedClasses?.map((c) => c.id) || []

      // Also get classes where teacher teaches subjects
      const { data: subjectAssignments } = await supabase
        .from('subject_teacher_assignments')
        .select('class_arm_combo_id')
        .eq('teacher_id', teacherId)
        .eq('school_id', schoolId)

      const subjectClassIds = subjectAssignments?.map((sa) => sa.class_arm_combo_id) || []
      const allClassIds = [...new Set([...classIds, ...subjectClassIds])]

      if (allClassIds.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          score_sheets: [],
          message: 'Teacher does not manage any classes or teach any subjects',
        })
      }

      // Get students in these classes
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId)
        .in('class_arm_combo_id', allClassIds)

      const studentIds = classStudents?.map((s) => s.id) || []

      if (studentIds.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          score_sheets: [],
        })
      }

      query = query.in('student_id', studentIds)

      if (subjectId) {
        query = query.eq('subject_id', subjectId)
      }
      if (classArmComboId) {
        query = query.in('student_id', studentIds).in(
          'id',
          (await supabase.from('students').select('id').eq('class_arm_combo_id', classArmComboId))
            .data?.map((s) => s.id) || []
        )
      }
    }

    // Student view
    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    if (termId) {
      query = query.eq('term_id', termId)
    }

    const { data: scoreSheets, error } = await query.order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching score sheets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch score sheets' },
        { status: 500 }
      )
    }

    // Format response
    const formatted = (scoreSheets || []).map((sheet: any) => ({
      id: sheet.id,
      student: {
        id: sheet.student_id,
        name: sheet.students?.users?.full_name || 'N/A',
        admission_number: sheet.students?.admission_number || 'N/A',
      },
      subject: {
        id: sheet.subject_id,
        name: sheet.subjects?.name || 'N/A',
        code: sheet.subjects?.code || 'N/A',
      },
      term: {
        id: sheet.term_id,
        name: sheet.terms?.name || 'N/A',
      },
      class: {
        name: sheet.class_arm_combos?.classes?.name || 'N/A',
        arm: sheet.class_arm_combos?.arms?.name || 'N/A',
      },
      scores: {
        test1: sheet.test1,
        test2: sheet.test2,
        test3: sheet.test3,
        test4: sheet.test4,
        exam: sheet.exam,
        total: sheet.total,
        grade: sheet.grade,
      },
      sources: {
        test1: sheet.test1_source,
        test2: sheet.test2_source,
        test3: sheet.test3_source,
        test4: sheet.test4_source,
        exam: sheet.exam_source,
      },
      cbt_sources: {
        test1: sheet.test1_cbt_source,
        test2: sheet.test2_cbt_source,
        test3: sheet.test3_cbt_source,
        test4: sheet.test4_cbt_source,
        exam: sheet.exam_cbt_source,
      },
      comments: {
        teacher: sheet.teacher_comment,
        head_master: sheet.hm_comment,
      },
      updated_at: sheet.updated_at,
    }))

    return NextResponse.json({
      success: true,
      count: formatted.length,
      score_sheets: formatted,
    })
  } catch (error: any) {
    console.error('Exception in score sheets GET:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/results/score-sheets
 * Create or update a score sheet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      school_id,
      student_id,
      subject_id,
      term_id,
      class_arm_combo_id,
      test1,
      test2,
      test3,
      test4,
      exam,
      teacher_comment,
    } = body

    if (!school_id || !student_id || !subject_id || !term_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate totals and grade
    const total = (test1 || 0) + (test2 || 0) + (test3 || 0) + (test4 || 0) + (exam || 0)
    let grade = 'F'
    if (total >= 90) grade = 'A'
    else if (total >= 80) grade = 'B'
    else if (total >= 70) grade = 'C'
    else if (total >= 60) grade = 'D'
    else if (total >= 50) grade = 'E'

    // Try to find existing score sheet
    const { data: existing } = await supabase
      .from('score_sheets')
      .select('id')
      .eq('school_id', school_id)
      .eq('student_id', student_id)
      .eq('subject_id', subject_id)
      .eq('term_id', term_id)
      .single()

    const scoreData = {
      school_id,
      student_id,
      subject_id,
      term_id,
      class_arm_combo_id,
      test1: test1 || null,
      test2: test2 || null,
      test3: test3 || null,
      test4: test4 || null,
      exam: exam || null,
      total,
      grade,
      teacher_comment: teacher_comment || null,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { data, error } = await supabase
        .from('score_sheets')
        .update(scoreData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, score_sheet: data })
    } else {
      const { data, error } = await supabase
        .from('score_sheets')
        .insert({
          ...scoreData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, score_sheet: data }, { status: 201 })
    }
  } catch (error: any) {
    console.error('Exception in score sheets POST:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
