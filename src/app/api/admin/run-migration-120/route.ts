import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/run-migration-120
 * 
 * Executes migration 120 to populate academic sessions, terms, and score data
 * This endpoint:
 * 1. Creates academic sessions for all schools (2025/2026)
 * 2. Creates 3 terms for each session
 * 3. Populates score_sheets with test data
 * 4. Calculates totals and grades
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Migration 120] Starting...')

    // ========================================================================
    // STEP 1: Get all schools
    // ========================================================================
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id')
      .is('deleted_at', null)

    if (schoolsError) throw schoolsError
    if (!schools || schools.length === 0) {
      return NextResponse.json(
        { error: 'No schools found' },
        { status: 400 }
      )
    }

    console.log('[Migration 120] Found schools:', schools.length)

    // ========================================================================
    // STEP 2: Create academic sessions for each school
    // ========================================================================
    const sessionIds: Record<string, string> = {}

    for (const school of schools) {
      const { data: existing } = await supabase
        .from('academic_sessions')
        .select('id')
        .eq('school_id', school.id)
        .eq('session_year', '2025/2026')
        .limit(1)

      if (existing && existing.length > 0) {
        sessionIds[school.id] = existing[0].id
        console.log('[Migration 120] Session already exists for school:', school.id)
        continue
      }

      const { data: session, error: sessionError } = await supabase
        .from('academic_sessions')
        .insert({
          school_id: school.id,
          session_year: '2025/2026',
          is_active: true,
        })
        .select('id')
        .single()

      if (sessionError) {
        console.error('[Migration 120] Error creating session:', sessionError)
        throw sessionError
      }

      sessionIds[school.id] = session.id
      console.log('[Migration 120] Created session for school:', school.id)
    }

    // ========================================================================
    // STEP 3: Create terms for each session
    // ========================================================================
    const termData = [
      { term_name: 'First Term', term_number: 1, is_active: true, start_date: '2025-09-01', end_date: '2025-11-30' },
      { term_name: 'Second Term', term_number: 2, is_active: false, start_date: '2025-12-01', end_date: '2026-02-28' },
      { term_name: 'Third Term', term_number: 3, is_active: false, start_date: '2026-03-01', end_date: '2026-05-31' },
    ]

    let termsCreated = 0

    for (const schoolId of Object.keys(sessionIds)) {
      const sessionId = sessionIds[schoolId]

      for (const termInfo of termData) {
        const { data: existing } = await supabase
          .from('academic_terms')
          .select('id')
          .eq('session_id', sessionId)
          .eq('term_name', termInfo.term_name)
          .limit(1)

        if (existing && existing.length > 0) {
          console.log('[Migration 120] Term already exists:', termInfo.term_name)
          continue
        }

        const { error: termError } = await supabase.from('academic_terms').insert({
          session_id: sessionId,
          term_name: termInfo.term_name,
          term_number: termInfo.term_number,
          is_active: termInfo.is_active,
          start_date: termInfo.start_date,
          end_date: termInfo.end_date,
        })

        if (termError) {
          console.error('[Migration 120] Error creating term:', termError)
          throw termError
        }

        termsCreated++
        console.log('[Migration 120] Created term:', termInfo.term_name)
      }
    }

    // ========================================================================
    // STEP 4: Get all students and create score sheets
    // ========================================================================
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, school_id, class_arm_combo_id')
      .is('deleted_at', null)

    if (studentsError) throw studentsError
    if (!students || students.length === 0) {
      return NextResponse.json(
        { error: 'No students found' },
        { status: 400 }
      )
    }

    console.log('[Migration 120] Found students:', students.length)

    // Get all subjects and terms
    const { data: subjects } = await supabase.from('subjects').select('id')
    const { data: terms } = await supabase.from('academic_terms').select('id, session_id')

    if (!subjects || !terms) {
      throw new Error('Failed to fetch subjects or terms')
    }

    let scoresCreated = 0

    // Create score sheets for each student-subject-term combination
    for (const student of students) {
      for (const subject of subjects) {
        for (const term of terms) {
          const { data: existing } = await supabase
            .from('score_sheets')
            .select('id')
            .eq('student_id', student.id)
            .eq('subject_id', subject.id)
            .eq('term_id', term.id)
            .limit(1)

          if (existing && existing.length > 0) {
            continue
          }

          const test1 = Math.ceil(Math.random() * 15 + 5)
          const test2 = Math.ceil(Math.random() * 15 + 5)
          const test3 = Math.ceil(Math.random() * 15 + 5)
          const test4 = Math.ceil(Math.random() * 15 + 5)
          const exam = Math.ceil(Math.random() * 60 + 40)
          const total = test1 + test2 + test3 + test4 + exam

          let grade = 'F'
          if (total >= 90) grade = 'A'
          else if (total >= 80) grade = 'B'
          else if (total >= 70) grade = 'C'
          else if (total >= 60) grade = 'D'
          else if (total >= 50) grade = 'E'

          const { error: scoreError } = await supabase.from('score_sheets').insert({
            student_id: student.id,
            subject_id: subject.id,
            term_id: term.id,
            school_id: student.school_id,
            test1,
            test2,
            test3,
            test4,
            exam,
            total,
            grade,
            test1_source: 'Manual',
            test2_source: 'Manual',
            test3_source: 'Manual',
            test4_source: 'Manual',
            exam_source: 'Manual',
            class_arm_combo_id: student.class_arm_combo_id,
          })

          if (scoreError) {
            console.error('[Migration 120] Error creating score sheet:', scoreError)
            continue
          }

          scoresCreated++
        }
      }

      // Log progress every 10 students
      if (scoresCreated % (10 * subjects.length * terms.length) === 0) {
        console.log('[Migration 120] Scores created:', scoresCreated)
      }
    }

    console.log('[Migration 120] Complete!')
    console.log('[Migration 120] Sessions created:', schools.length)
    console.log('[Migration 120] Terms created:', termsCreated)
    console.log('[Migration 120] Score sheets created:', scoresCreated)

    return NextResponse.json({
      success: true,
      message: 'Migration 120 completed successfully',
      stats: {
        sessions: schools.length,
        terms: termsCreated,
        scores: scoresCreated,
      },
    })
  } catch (error: any) {
    console.error('[Migration 120] Error:', error)
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
