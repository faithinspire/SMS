import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * POST /api/results/sync-score-sheet
 * Synchronizes score sheet entries with report card
 * Ensures one source of truth between teacher score entry and student report
 * 
 * BODY:
 * - school_id: UUID (required)
 * - student_id: UUID (required)
 * - term_id: UUID (optional)
 * 
 * RETURNS:
 * - Synchronized report card data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { school_id, student_id, term_id } = body

    if (!school_id || !student_id) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, student_id' },
        { status: 400 }
      )
    }

    // Fetch all scores for the student (use canonical score_sheets table)
    let scoreQuery = supabase
      .from('score_sheets')
      .select('*')
      .eq('school_id', school_id)
      .eq('student_id', student_id)

    if (term_id) {
      scoreQuery = scoreQuery.eq('term_id', term_id)
    }

    const { data: scores, error: scoreError } = await scoreQuery

    if (scoreError) {
      console.error('Error fetching scores:', scoreError)
      throw scoreError
    }

    // Calculate synchronized statistics
    let totalScores = 0
    let totalSubjects = 0
    let passedSubjects = 0
    let failedSubjects = 0

    const syncedScores = (scores || []).map(score => {
      totalScores += score.total || 0
      totalSubjects += 1

      if (score.grade && score.grade !== 'F') {
        passedSubjects += 1
      } else {
        failedSubjects += 1
      }

      return {
        subject_id: score.subject_id,
        total_score: score.total,
        grade: score.grade,
        test_total: (score.test1 || 0) + (score.test2 || 0) + (score.test3 || 0) + (score.test4 || 0),
        exam_score: score.exam,
        updated_at: score.updated_at,
      }
    })

    const overallPercentage = totalSubjects > 0 ? (totalScores / (totalSubjects * 100)) * 100 : 0

    return NextResponse.json({
      success: true,
      synced: true,
      data: {
        student_id,
        school_id,
        term_id: term_id || null,
        total_subjects: totalSubjects,
        passed_subjects: passedSubjects,
        failed_subjects: failedSubjects,
        total_score: totalScores,
        average_score: totalSubjects > 0 ? totalScores / totalSubjects : 0,
        overall_percentage: overallPercentage,
        scores: syncedScores,
        synced_at: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Error in POST /api/results/sync-score-sheet:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/results/sync-score-sheet
 * Retrieves the latest synchronized report card data
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - student_id: UUID (required)
 * - term_id: UUID (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const studentId = searchParams.get('student_id')
    const termId = searchParams.get('term_id')

    if (!schoolId || !studentId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, student_id' },
        { status: 400 }
      )
    }

    // Fetch latest scores (use canonical score_sheets table)
    let scoreQuery = supabase
      .from('score_sheets')
      .select('*')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .order('updated_at', { ascending: false })

    if (termId) {
      scoreQuery = scoreQuery.eq('term_id', termId)
    }

    const { data: scores } = await scoreQuery

    if (!scores || scores.length === 0) {
      return NextResponse.json({
        success: true,
        synced: false,
        message: 'No scores found for this student',
        data: {
          student_id: studentId,
          school_id: schoolId,
          term_id: termId,
          total_subjects: 0,
          scores: [],
        },
      })
    }

    // Calculate statistics
    let totalScores = 0
    let passedSubjects = 0

    scores.forEach(score => {
      totalScores += score.total_score || 0
      if (score.grade && score.grade !== 'F') {
        passedSubjects += 1
      }
    })

    const overallPercentage = scores.length > 0 ? (totalScores / (scores.length * 100)) * 100 : 0

    return NextResponse.json({
      success: true,
      synced: true,
      data: {
        student_id: studentId,
        school_id: schoolId,
        term_id: termId,
        total_subjects: scores.length,
        passed_subjects: passedSubjects,
        total_score: totalScores,
        average_score: scores.length > 0 ? totalScores / scores.length : 0,
        overall_percentage: overallPercentage,
        scores: scores.map(s => ({
          subject_id: s.subject_id,
          total_score: s.total_score,
          grade: s.grade,
          updated_at: s.updated_at,
        })),
        last_synced: scores[0]?.updated_at,
      },
    })
  } catch (error: any) {
    console.error('Error in GET /api/results/sync-score-sheet:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
