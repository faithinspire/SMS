import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/student/results
 * Get all results for a student organized by term
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - student_id: UUID (required)
 * 
 * RETURNS:
 * - Results organized by term with all subjects and scores
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const studentId = searchParams.get('student_id')

    if (!schoolId || !studentId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, student_id' },
        { status: 400 }
      )
    }

    // Get all score sheets for student
    const { data: scoreSheets, error } = await supabase
      .from('score_sheets')
      .select(
        `
        id,
        subject_id,
        term_id,
        test1,
        test2,
        test3,
        test4,
        exam,
        total,
        grade,
        subjects (id, name, code),
        terms (id, name)
      `
      )
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .order('term_id', { ascending: true })

    if (error) {
      console.error('Error fetching results:', error)
      return NextResponse.json(
        { error: 'Failed to fetch results' },
        { status: 500 }
      )
    }

    // Organize by term
    const resultsByTerm: Record<string, any> = {}

    for (const sheet of scoreSheets || []) {
      const termId = sheet.term_id
      const termName = (sheet.terms as any)?.name || 'Unknown Term'

      if (!resultsByTerm[termId]) {
        resultsByTerm[termId] = {
          id: termId,
          name: termName,
          subjects: [],
        }
      }

      resultsByTerm[termId].subjects.push({
        subject_id: sheet.subject_id,
        subject_name: (sheet.subjects as any)?.name || 'N/A',
        subject_code: (sheet.subjects as any)?.code || 'N/A',
        test1: sheet.test1,
        test2: sheet.test2,
        test3: sheet.test3,
        test4: sheet.test4,
        exam: sheet.exam,
        total: sheet.total,
        grade: sheet.grade,
      })
    }

    const termsArray = Object.values(resultsByTerm)

    return NextResponse.json({
      success: true,
      student_id: studentId,
      term_count: termsArray.length,
      results_by_term: termsArray,
    })
  } catch (error: any) {
    console.error('Exception in student results:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
