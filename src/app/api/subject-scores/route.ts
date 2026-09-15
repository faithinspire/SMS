import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'

/**
 * POST /api/subject-scores
 * 
 * Save subject teacher's manual score entry to CANONICAL score_sheets table
 * 
 * CRITICAL: This endpoint is the SINGLE entry point for all MANUAL score entry
 * All data written here flows to: Class Teacher Results, Student Results Page, Report Cards
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      school_id,
      student_id,
      subject_id,
      term_id,
      test1,
      test2,
      test3,
      test4,
      exam,
      source = 'MANUAL',
    } = body

    console.log('[API] POST /api/subject-scores - Validation Start', {
      school_id,
      student_id,
      subject_id,
      term_id,
      source,
    })

    // ========================================================================
    // STEP 1: VALIDATE REQUIRED FIELDS
    // ========================================================================

    const errors: string[] = []

    if (!school_id || typeof school_id !== 'string') {
      errors.push('school_id is required and must be a valid UUID')
    }
    if (!student_id || typeof student_id !== 'string') {
      errors.push('student_id is required and must be a valid UUID')
    }
    if (!subject_id || typeof subject_id !== 'string') {
      errors.push('subject_id is required and must be a valid UUID')
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
    }

    // ========================================================================
    // STEP 2: VALIDATE SCORE RANGES
    // ========================================================================

    if (test1 !== null && test1 !== undefined && (test1 < 0 || test1 > 10)) {
      errors.push('CA1 (test1) must be 0-10')
    }
    if (test2 !== null && test2 !== undefined && (test2 < 0 || test2 > 10)) {
      errors.push('CA2 (test2) must be 0-10')
    }
    if (test3 !== null && test3 !== undefined && (test3 < 0 || test3 > 10)) {
      errors.push('CA3 (test3) must be 0-10')
    }
    if (test4 !== null && test4 !== undefined && (test4 < 0 || test4 > 10)) {
      errors.push('CA4 (test4) must be 0-10')
    }
    if (exam !== null && exam !== undefined && (exam < 0 || exam > 60)) {
      errors.push('Exam score must be 0-60')
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
    }

    // ========================================================================
    // STEP 3: VERIFY STUDENT EXISTS AND BELONGS TO SCHOOL
    // ========================================================================

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, class_arm_combo_id')
      .eq('id', student_id)
      .eq('school_id', school_id)
      .single()

    if (studentError || !student) {
      console.error('[API] Student validation failed:', studentError)
      return NextResponse.json(
        { error: `Student not found in school ${school_id}` },
        { status: 403 }
      )
    }

    console.log('[API] OK Student verified:', student_id)

    // ========================================================================
    // STEP 4: VERIFY STUDENT IS ENROLLED (SOFT CHECK - WARNING ONLY)
    // ========================================================================
    // NOTE: Soft check - warn but don't block. Teachers may enter scores before
    // enrollment is fully synced from registration system.

    const { data: enrollment } = await supabase
      .from('student_subjects')
      .select('id')
      .eq('student_id', student_id)
      .eq('subject_id', subject_id)
      .eq('school_id', school_id)
      .maybeSingle()

    if (!enrollment) {
      console.warn('[API] WARNING: Student may not be enrolled in subject (continuing):', subject_id)
    } else {
      console.log('[API] OK Student enrollment verified:', subject_id)
    }

    // ========================================================================
    // STEP 5: VERIFY TERM/SESSION
    // ========================================================================

    let currentTermId = term_id

    if (!currentTermId) {
      const { data: activeTerm } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('school_id', school_id)
        .eq('is_active', true)
        .maybeSingle()

      if (activeTerm?.id) {
        currentTermId = activeTerm.id
      } else {
        const { data: allTerms } = await supabase
          .from('academic_terms')
          .select('id')
          .eq('school_id', school_id)
          .limit(1)

        if (!allTerms || allTerms.length === 0) {
          return NextResponse.json(
            { error: 'No term found for this school' },
            { status: 400 }
          )
        }

        currentTermId = allTerms[0].id
      }
    }

    const { data: termData, error: termError } = await supabase
      .from('academic_terms')
      .select('id, session_id')
      .eq('id', currentTermId)
      .eq('school_id', school_id)
      .single()

    if (termError || !termData) {
      console.error('[API] Term validation failed:', termError)
      return NextResponse.json({ error: 'Invalid term' }, { status: 400 })
    }

    console.log('[API] OK Term verified:', currentTermId)

    // ========================================================================
    // STEP 6: GET ACADEMIC SESSION (for multi-year support)
    // ========================================================================

    let academicSessionId = termData.session_id
    let sessionYear = null

    if (academicSessionId) {
      const { data: session } = await supabase
        .from('academic_sessions')
        .select('session_year')
        .eq('id', academicSessionId)
        .single()

      sessionYear = session?.session_year || null
    }

    console.log('[API] OK Academic session resolved:', academicSessionId, sessionYear)

    // ========================================================================
    // STEP 7: CHECK FOR EXISTING SCORE
    // ========================================================================

    const { data: existingScore, error: checkError } = await supabase
      .from('score_sheets')
      .select('id')
      .eq('school_id', school_id)
      .eq('student_id', student_id)
      .eq('subject_id', subject_id)
      .eq('term_id', currentTermId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[API] Error checking existing score:', checkError)
      throw checkError
    }

    console.log('[API] OK Existing score check:', existingScore?.id ? 'FOUND' : 'NEW')

    // ========================================================================
    // STEP 8: PREPARE SCORE DATA FOR UPSERT
    // ========================================================================

    const scoreData = {
      school_id,
      student_id,
      subject_id,
      term_id: currentTermId,
      class_arm_combo_id: student.class_arm_combo_id,
      academic_session_id: academicSessionId,
      session_year: sessionYear,
      test1: test1 ?? null,
      test2: test2 ?? null,
      test3: test3 ?? null,
      test4: test4 ?? null,
      exam: exam ?? null,
      test1_source: test1 !== null && test1 !== undefined ? source : null,
      test2_source: test2 !== null && test2 !== undefined ? source : null,
      test3_source: test3 !== null && test3 !== undefined ? source : null,
      test4_source: test4 !== null && test4 !== undefined ? source : null,
      exam_source: exam !== null && exam !== undefined ? source : null,
      updated_at: new Date().toISOString(),
    }

    console.log('[API] Score data prepared:', {
      student_id,
      subject_id,
      term_id: currentTermId,
      hasTest1: test1 !== null && test1 !== undefined,
      hasTest2: test2 !== null && test2 !== undefined,
      hasTest3: test3 !== null && test3 !== undefined,
      hasTest4: test4 !== null && test4 !== undefined,
      hasExam: exam !== null && exam !== undefined,
    })

    // ========================================================================
    // STEP 9: UPSERT SCORE (INSERT or UPDATE)
    // ========================================================================

    let result
    if (existingScore?.id) {
      console.log('[API] Mode: UPDATE existing score', existingScore.id)

      result = await supabase
        .from('score_sheets')
        .update(scoreData)
        .eq('id', existingScore.id)
        .select()
        .single()

      if (result.error) {
        console.error('[API] Update failed:', result.error)
        throw result.error
      }

      console.log('[API] OK Score updated successfully')
    } else {
      console.log('[API] Mode: INSERT new score')

      result = await supabase
        .from('score_sheets')
        .insert({
          ...scoreData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (result.error) {
        console.error('[API] Insert failed:', result.error)
        throw result.error
      }

      console.log('[API] OK Score created successfully')
    }

    // ========================================================================
    // STEP 10: SUCCESS RESPONSE
    // ========================================================================

    console.log('[API] OK Request completed successfully')

    return NextResponse.json({
      success: true,
      message: existingScore?.id ? 'Score updated' : 'Score created',
      score_sheet: result.data,
    })
  } catch (error: any) {
    console.error('[API] Exception in POST /api/subject-scores:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.details || error.hint,
      },
      { status: 500 }
    )
  }
}
