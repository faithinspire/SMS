import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * DEBUG: Check what scores actually exist in the database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const schoolId = searchParams.get('schoolId')
    const termId = searchParams.get('termId')

    console.log('[DEBUG] Checking scores for:', { studentId, schoolId, termId })

    if (!studentId || !schoolId || !termId) {
      return NextResponse.json(
        {
          error: 'Missing params',
          note: 'Provide ?studentId=xxx&schoolId=xxx&termId=xxx',
        },
        { status: 400 }
      )
    }

    // Direct raw query to see what exists
    const { data: rawScores, error: rawError } = await supabase
      .from('score_sheets')
      .select('*')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .eq('term_id', termId)

    if (rawError) {
      console.error('[DEBUG] Error fetching raw scores:', rawError)
      return NextResponse.json(
        { error: 'Query failed', details: rawError.message },
        { status: 500 }
      )
    }

    console.log('[DEBUG] Raw scores found:', rawScores?.length || 0)

    // Also check student_subjects for enrollment
    const { data: enrollment, error: enrollError } = await supabase
      .from('student_subjects')
      .select('*')
      .eq('student_id', studentId)

    if (enrollError) {
      console.error('[DEBUG] Enrollment error:', enrollError)
    }

    console.log('[DEBUG] Student enrolled in:', enrollment?.length || 0, 'subjects')

    // Return raw data
    return NextResponse.json({
      debug: true,
      studentId,
      schoolId,
      termId,
      scoresFound: rawScores?.length || 0,
      scoresData: rawScores || [],
      enrollmentFound: enrollment?.length || 0,
      enrollmentData: enrollment || [],
      message: `Student has ${rawScores?.length || 0} score records and is enrolled in ${enrollment?.length || 0} subjects`,
    })
  } catch (error: any) {
    console.error('[DEBUG] Exception:', error)
    return NextResponse.json(
      { error: 'Exception', details: error.message },
      { status: 500 }
    )
  }
}
