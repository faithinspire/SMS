import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/diagnostic/scores-audit
 * 
 * COMPREHENSIVE DIAGNOSTIC: Check all score data in system
 * Shows:
 * - Total score_sheets records
 * - Score_sheets with actual values
 * - CBT results (exam scores)
 * - Student enrollments
 * - Any mismatches or missing data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')
    const studentId = searchParams.get('studentId')
    const termId = searchParams.get('termId')

    const report: any = {
      timestamp: new Date().toISOString(),
      filters: { schoolId, studentId, termId },
      summary: {},
      data: {},
      issues: [],
    }

    // ========================================================================
    // 1. CHECK SCORE_SHEETS TABLE
    // ========================================================================

    let scoresQuery = supabase.from('score_sheets').select('*')
    if (schoolId) scoresQuery = scoresQuery.eq('school_id', schoolId)
    if (studentId) scoresQuery = scoresQuery.eq('student_id', studentId)
    if (termId) scoresQuery = scoresQuery.eq('term_id', termId)

    const { data: allScores, error: scoresError } = await scoresQuery

    if (scoresError) {
      report.issues.push(`Error fetching score_sheets: ${scoresError.message}`)
    }

    const scoresWithValues = (allScores || []).filter(
      (s: any) =>
        s.test1 || s.test2 || s.test3 || s.test4 || s.exam
    )

    report.summary.totalScoreSheets = allScores?.length || 0
    report.summary.scoresWithValues = scoresWithValues.length
    report.data.scoreSheetsSample = (allScores || []).slice(0, 3)

    // ========================================================================
    // 2. CHECK CBT RESULTS
    // ========================================================================

    let cbtQuery = supabase
      .from('cbt_results')
      .select('id, student_id, exam_id, score_obtained, created_at')

    if (studentId) cbtQuery = cbtQuery.eq('student_id', studentId)

    const { data: cbtResults, error: cbtError } = await cbtQuery

    if (cbtError) {
      report.issues.push(`Error fetching CBT results: ${cbtError.message}`)
    }

    report.summary.totalCBTResults = cbtResults?.length || 0
    report.data.cbtResultsSample = (cbtResults || []).slice(0, 3)

    // ========================================================================
    // 3. CHECK STUDENT ENROLLMENTS
    // ========================================================================

    let enrollQuery = supabase
      .from('student_subjects')
      .select('student_id, subject_id, created_at')

    if (studentId) enrollQuery = enrollQuery.eq('student_id', studentId)

    const { data: enrollments, error: enrollError } = await enrollQuery

    if (enrollError) {
      report.issues.push(`Error fetching enrollments: ${enrollError.message}`)
    }

    report.summary.totalEnrollments = enrollments?.length || 0
    report.data.enrollmentsSample = (enrollments || []).slice(0, 3)

    // ========================================================================
    // 4. CHECK SPECIFIC STUDENT (if provided)
    // ========================================================================

    if (studentId && termId && schoolId) {
      const { data: studentScores } = await supabase
        .from('score_sheets')
        .select('*')
        .eq('school_id', schoolId)
        .eq('student_id', studentId)
        .eq('term_id', termId)

      const { data: studentCBT } = await supabase
        .from('cbt_results')
        .select('*')
        .eq('student_id', studentId)

      const { data: studentEnroll } = await supabase
        .from('student_subjects')
        .select('*')
        .eq('student_id', studentId)

      report.data.studentDetail = {
        scoreSheets: studentScores || [],
        cbtResults: studentCBT || [],
        enrollments: studentEnroll || [],
      }

      // Check for mismatches
      const enrolledSubjectIds = new Set((studentEnroll || []).map((e: any) => e.subject_id))
      const scoreSheetSubjectIds = new Set((studentScores || []).map((s: any) => s.subject_id))

      const missingScores = Array.from(enrolledSubjectIds).filter(
        (id: any) => !scoreSheetSubjectIds.has(id)
      )

      if (missingScores.length > 0) {
        report.issues.push(
          `Student enrolled in ${missingScores.length} subjects but no score_sheets exist for them`
        )
      }
    }

    // ========================================================================
    // 5. CHECK DATA QUALITY
    // ========================================================================

    // Check for orphaned scores (scores without enrollments)
    const { data: scoresWithoutEnroll } = await supabase
      .from('score_sheets')
      .select(
        `
        id,
        student_id,
        subject_id,
        student_subjects!left (id)
      `
      )
      .limit(10)

    const orphanedScores = (scoresWithoutEnroll || []).filter(
      (s: any) => !s.student_subjects || s.student_subjects.length === 0
    )

    if (orphanedScores.length > 0) {
      report.issues.push(
        `Found ${orphanedScores.length} score records with no corresponding enrollment`
      )
    }

    // ========================================================================
    // 6. RECOMMENDATIONS
    // ========================================================================

    report.recommendations = []

    if (report.summary.totalScoreSheets === 0) {
      report.recommendations.push(
        'No scores found in database. Check if scores have been entered via scoresheet or CBT exams.'
      )
    }

    if (report.summary.scoresWithValues === 0) {
      report.recommendations.push(
        'Score_sheets table exists but no actual score values are populated. Check if teachers entered scores in score entry form.'
      )
    }

    if (report.summary.totalCBTResults > 0 && report.summary.totalScoreSheets === 0) {
      report.recommendations.push(
        'CBT exams were completed but scores not in score_sheets. Check if migration 120 was applied to Supabase.'
      )
    }

    report.recommendations.push(
      'To view detailed scores for a student: add ?studentId=xxx&termId=xxx&schoolId=xxx to this URL'
    )

    return NextResponse.json({
      success: true,
      ...report,
    })
  } catch (error: any) {
    console.error('[ScoresAudit] Exception:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
