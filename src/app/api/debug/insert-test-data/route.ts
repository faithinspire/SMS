import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * DEBUG: Populate score_sheets table with test data for student results
 * This allows students to view their results in the Student Results page
 * 
 * GET: Check current score data
 * POST: Generate and insert test scores
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    console.log('[DEBUG] Checking score_sheets data')

    // Get statistics
    const { data: stats, error: statsError } = await supabase
      .from('score_sheets')
      .select('id', { count: 'exact', head: true })

    if (statsError) {
      console.error('[DEBUG] Error fetching stats:', statsError)
      return NextResponse.json(
        { error: 'Query failed', details: statsError.message },
        { status: 500 }
      )
    }

    // Get sample data
    const { data: samples, error: samplesError } = await supabase
      .from('score_sheets')
      .select('id, school_id, student_id, subject_id, term_id, test1, test2, exam')
      .limit(5)

    if (samplesError) {
      console.error('[DEBUG] Error fetching samples:', samplesError)
    }

    return NextResponse.json({
      debug: true,
      totalScoreRecords: stats?.length || 0,
      sampleData: samples || [],
      message: `Database has ${stats?.length || 0} score records`,
    })
  } catch (error: any) {
    console.error('[DEBUG] Exception:', error)
    return NextResponse.json(
      { error: 'Exception', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action = 'populate' } = body

    console.log('[DEBUG] Processing score data population...')

    if (action === 'populate') {
      return await populateScoreSheets()
    } else if (action === 'clear') {
      return await clearScoreSheets()
    }

    return NextResponse.json(
      { error: 'Unknown action', actions: ['populate', 'clear'] },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[DEBUG] Exception:', error)
    return NextResponse.json(
      { error: 'Exception', details: error.message },
      { status: 500 }
    )
  }
}

async function populateScoreSheets() {
  try {
    // Step 1: Get active school
    const { data: schools, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('status', 'ACTIVE')
      .limit(1)

    if (schoolError || !schools?.length) {
      return NextResponse.json(
        { error: 'No active schools found' },
        { status: 400 }
      )
    }

    const schoolId = schools[0].id
    console.log(`[DEBUG] Using school: ${schools[0].name} (${schoolId})`)

    // Step 2: Get students
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, admission_number')
      .eq('school_id', schoolId)
      .eq('status', 'ACTIVE')
      .limit(10)

    if (studentError || !students?.length) {
      return NextResponse.json(
        { error: 'No active students found', details: studentError?.message },
        { status: 400 }
      )
    }

    console.log(`[DEBUG] Found ${students.length} students`)

    // Step 3: Get terms
    const { data: terms, error: termError } = await supabase
      .from('academic_terms')
      .select('id, name, term_number')
      .eq('school_id', schoolId)
      .limit(3)

    if (termError || !terms?.length) {
      return NextResponse.json(
        { error: 'No terms found', details: termError?.message },
        { status: 400 }
      )
    }

    console.log(`[DEBUG] Found ${terms.length} terms`)

    // Step 4: Get subjects via student enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('student_subjects')
      .select('subject_id')
      .in('student_id', students.map((s: any) => s.id))
      .limit(50)

    if (enrollmentError) {
      console.warn('[DEBUG] Enrollment warning:', enrollmentError.message)
    }

    const subjectIds = [...new Set((enrollment || []).map((e: any) => e.subject_id))].slice(0, 10)

    if (!subjectIds.length) {
      return NextResponse.json(
        { error: 'No subject enrollments found', details: 'Students not enrolled in subjects' },
        { status: 400 }
      )
    }

    console.log(`[DEBUG] Found ${subjectIds.length} unique subjects`)

    // Step 5: Generate score records
    const scoreRecords: any[] = []
    let recordCount = 0

    for (const student of students) {
      for (const term of terms) {
        for (const subjectId of subjectIds) {
          scoreRecords.push({
            school_id: schoolId,
            student_id: student.id,
            subject_id: subjectId,
            term_id: term.id,
            test1: parseFloat((Math.random() * 10).toFixed(2)),
            test2: parseFloat((Math.random() * 10).toFixed(2)),
            test3: parseFloat((Math.random() * 10).toFixed(2)),
            test4: parseFloat((Math.random() * 10).toFixed(2)),
            exam: parseFloat((Math.random() * 60).toFixed(2)),
            test1_source: 'TEACHER_ENTRY',
            test2_source: 'TEACHER_ENTRY',
            test3_source: 'TEACHER_ENTRY',
            test4_source: 'TEACHER_ENTRY',
            exam_source: 'TEACHER_ENTRY',
          })
          recordCount++
        }
      }
    }

    console.log(`[DEBUG] Generated ${recordCount} score records`)

    // Step 6: Batch insert (Supabase has limits, so insert in chunks)
    const chunkSize = 50
    let insertedCount = 0

    for (let i = 0; i < scoreRecords.length; i += chunkSize) {
      const chunk = scoreRecords.slice(i, i + chunkSize)
      const { data: inserted, error: insertError } = await supabase
        .from('score_sheets')
        .upsert(chunk, {
          onConflict: 'school_id,student_id,subject_id,term_id',
        })

      if (insertError) {
        console.error(`[DEBUG] Upsert error on chunk ${i}:`, insertError)
        // Continue with other chunks
      } else {
        insertedCount += chunk.length
      }
    }

    console.log(`[DEBUG] Inserted ${insertedCount} score records`)

    // Step 7: Verify
    const { data: verifyCount, error: verifyError } = await supabase
      .from('score_sheets')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', schoolId)

    return NextResponse.json({
      success: true,
      message: 'Score data populated successfully',
      school: schools[0].name,
      studentsProcessed: students.length,
      termsProcessed: terms.length,
      subjectsPerStudent: subjectIds.length,
      recordsGenerated: recordCount,
      recordsInDatabase: verifyCount?.length || 0,
    })
  } catch (error: any) {
    console.error('[DEBUG] Populate error:', error)
    return NextResponse.json(
      { error: 'Populate failed', details: error.message },
      { status: 500 }
    )
  }
}

async function clearScoreSheets() {
  try {
    const { error } = await supabase.from('score_sheets').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      console.error('[DEBUG] Delete error:', error)
      return NextResponse.json(
        { error: 'Clear failed', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'All score records cleared',
    })
  } catch (error: any) {
    console.error('[DEBUG] Clear error:', error)
    return NextResponse.json(
      { error: 'Clear failed', details: error.message },
      { status: 500 }
    )
  }
}
