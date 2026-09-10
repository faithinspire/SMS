import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
import { CanonicalSubjectService } from '@/services/canonical-subject.service'
export const dynamic = 'force-dynamic'


/**
 * GET /api/teacher/student-scores
 * 
 * Fetch scores for a specific student's subjects from CANONICAL source
 * 
 * â­ Reads from: score_sheets table (single source of truth)
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - student_id: UUID (required)
 * - subject_id: UUID (optional) - if provided, only fetch scores for this subject
 * - academic_session_id: UUID (optional)
 * - term_id: UUID (optional)
 * 
 * RETURNS:
 * - Array of student subject scores with source tracking (MANUAL/CBT)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const studentId = searchParams.get('student_id')
    const subjectId = searchParams.get('subject_id')
    const academicSessionId = searchParams.get('academic_session_id')
    const termId = searchParams.get('term_id')

    if (!schoolId || !studentId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, student_id' },
        { status: 400 }
      )
    }

    // Fetch student's enrolled subjects
    let subjectQuery = supabase
      .from('student_subjects')
      .select(`
        id,
        student_id,
        subject_id,
        subjects (
          id,
          name,
          code
        )
      `)
      .eq('student_id', studentId)
      .eq('school_id', schoolId)

    // If subject_id provided, filter to only that subject
    if (subjectId) {
      subjectQuery = subjectQuery.eq('subject_id', subjectId)
    }

    const { data: studentSubjects, error: subjectError } = await subjectQuery

    if (subjectError) {
      console.error('Error fetching student subjects:', subjectError)
      throw subjectError
    }

    if (!studentSubjects || studentSubjects.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        scores: [],
        message: 'Student has no enrolled subjects',
      })
    }

    // Fetch scores from CANONICAL score_sheets table
    let scoreQuery = supabase
      .from('score_sheets')
      .select(`
        id,
        student_id,
        subject_id,
        test1,
        test2,
        test3,
        test4,
        exam,
        total,
        grade,
        teacher_comment,
        updated_at,
        test1_source,
        test2_source,
        test3_source,
        test4_source,
        exam_source,
        subjects (
          id,
          name,
          code
        )
      `)
      .eq('student_id', studentId)
      .eq('school_id', schoolId)

    if (academicSessionId) {
      scoreQuery = scoreQuery.eq('academic_session_id', academicSessionId)
    }

    if (termId) {
      // Filter by term if provided
      scoreQuery = scoreQuery.eq('term_id', termId)
    }

    const { data: scores, error: scoreError } = await scoreQuery

    if (scoreError) {
      console.error('Error fetching scores:', scoreError)
      throw scoreError
    }

    // Build score map
    const scoreMap = new Map()
    ;(scores || []).forEach((score: any) => {
      scoreMap.set(score.subject_id, score)
    })

    // Combine subject and score data
    const subjectScores = (studentSubjects || []).map((enrollment: any) => {
      const score = scoreMap.get(enrollment.subject_id)
      return {
        subject_id: enrollment.subject_id,
        subject_name: enrollment.subjects?.name || 'Unknown',
        subject_code: enrollment.subjects?.code || '',
        test1: score?.test1 || null,
        test2: score?.test2 || null,
        test3: score?.test3 || null,
        test4: score?.test4 || null,
        test_total: (score?.test1 || 0) + (score?.test2 || 0) + (score?.test3 || 0) + (score?.test4 || 0),
        exam: score?.exam || null,
        total: score?.total || 0,
        grade: score?.grade || '-',
        teacher_comment: score?.teacher_comment || '',
        updated_at: score?.updated_at || null,
        test1_source: score?.test1_source,
        test2_source: score?.test2_source,
        test3_source: score?.test3_source,
        test4_source: score?.test4_source,
        exam_source: score?.exam_source,
      }
    })

    return NextResponse.json({
      success: true,
      count: subjectScores.length,
      scores: subjectScores,
    })
  } catch (error: any) {
    console.error('Error in GET /api/teacher/student-scores:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/student-scores
 * 
 * Save scores for a student's subjects into CANONICAL score_sheets table
 * 
 * â­ Writes to: score_sheets (single source of truth)
 * - Sets source='MANUAL' for manual teacher entry
 * - Handles both INSERT and UPDATE operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      school_id,
      student_id,
      subject_id,
      test1_score,
      test2_score,
      test3_score,
      test4_score,
      exam_score,
      teacher_comment,
      academic_session_id,
      term_id,
      class_arm_combo_id,
      teacher_id,
    } = body

    // Validate required fields (NOW INCLUDES academic_session_id)
    if (!school_id || !student_id || !subject_id || !term_id || !academic_session_id) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, student_id, subject_id, term_id, academic_session_id' },
        { status: 400 }
      )
    }

    // Validate term_id is a UUID (not a string like "First Term")
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(term_id)) {
      return NextResponse.json(
        { error: `Invalid term_id format. Received: "${term_id}". Must be a UUID.` },
        { status: 400 }
      )
    }

    // Validate academic_session_id is a UUID
    if (!uuidRegex.test(academic_session_id)) {
      return NextResponse.json(
        { error: `Invalid academic_session_id format. Received: "${academic_session_id}". Must be a UUID.` },
        { status: 400 }
      )
    }

    // Verify subject exists in canonical catalog
    const subjectExists = await CanonicalSubjectService.verifySubjectExists(subject_id, school_id)
    if (!subjectExists) {
      return NextResponse.json(
        { error: 'Subject not found or not available for this school' },
        { status: 400 }
      )
    }

    // Validate score ranges
    if (test1_score !== null && (test1_score < 0 || test1_score > 10)) {
      return NextResponse.json(
        { error: 'Test 1 score must be between 0-10' },
        { status: 400 }
      )
    }
    if (test2_score !== null && (test2_score < 0 || test2_score > 10)) {
      return NextResponse.json(
        { error: 'Test 2 score must be between 0-10' },
        { status: 400 }
      )
    }
    if (test3_score !== null && (test3_score < 0 || test3_score > 10)) {
      return NextResponse.json(
        { error: 'Test 3 score must be between 0-10' },
        { status: 400 }
      )
    }
    if (test4_score !== null && (test4_score < 0 || test4_score > 10)) {
      return NextResponse.json(
        { error: 'Test 4 score must be between 0-10' },
        { status: 400 }
      )
    }
    if (exam_score !== null && (exam_score < 0 || exam_score > 60)) {
      return NextResponse.json(
        { error: 'Exam score must be between 0-60' },
        { status: 400 }
      )
    }

    // Check if score already exists in CANONICAL score_sheets table
    let query = supabase
      .from('score_sheets')
      .select('id')
      .eq('school_id', school_id)
      .eq('student_id', student_id)
      .eq('subject_id', subject_id)
      .eq('academic_session_id', academic_session_id)
      .eq('term_id', term_id)

    const { data: existingScore, error: checkError } = await query.maybeSingle()

    const scoreData = {
      school_id,
      student_id,
      subject_id,
      academic_session_id,
      term_id,
      test1: test1_score ?? null,
      test2: test2_score ?? null,
      test3: test3_score ?? null,
      test4: test4_score ?? null,
      exam: exam_score ?? null,
      test1_source: test1_score !== null && test1_score !== undefined ? 'MANUAL' : null,
      test2_source: test2_score !== null && test2_score !== undefined ? 'MANUAL' : null,
      test3_source: test3_score !== null && test3_score !== undefined ? 'MANUAL' : null,
      test4_source: test4_score !== null && test4_score !== undefined ? 'MANUAL' : null,
      exam_source: exam_score !== null && exam_score !== undefined ? 'MANUAL' : null,
      teacher_comment: teacher_comment || null,
      class_arm_combo_id: class_arm_combo_id || null,
      teacher_id: teacher_id || null,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existingScore?.id) {
      // Update existing score_sheets entry
      result = await supabase
        .from('score_sheets')
        .update(scoreData)
        .eq('id', existingScore.id)
        .select()
    } else {
      // Insert new score_sheets entry
      result = await supabase
        .from('score_sheets')
        .insert({
          ...scoreData,
          created_at: new Date().toISOString(),
        })
        .select()
    }

    if (result.error) {
      console.error('Error saving score:', result.error)
      throw result.error
    }

    return NextResponse.json({
      success: true,
      message: existingScore?.id ? 'Score updated' : 'Score created',
      data: result.data?.[0],
    })
  } catch (error: any) {
    console.error('Error in POST /api/teacher/student-scores:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

