import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/results/validate-scores
 * Validates scores against business rules
 * 
 * BODY:
 * - scores: Array of {subject_id, subject_name, test1, test2, test3, test4, exam}
 * 
 * RETURNS:
 * - valid: boolean
 * - errors: Array of validation errors
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scores } = body

    if (!Array.isArray(scores)) {
      return NextResponse.json(
        { error: 'Scores must be an array' },
        { status: 400 }
      )
    }

    const errors: any[] = []

    // Validate each score
    scores.forEach((score: any) => {
      const { subject_id, subject_name, test1, test2, test3, test4, exam } = score

      // Validate test scores
      if (test1 !== null && test1 !== undefined) {
        if (isNaN(test1) || test1 < 0 || test1 > 10) {
          errors.push({
            subject_id,
            subject_name,
            field: 'test1',
            message: 'Must be between 0-10',
            value: test1,
          })
        }
      }

      if (test2 !== null && test2 !== undefined) {
        if (isNaN(test2) || test2 < 0 || test2 > 10) {
          errors.push({
            subject_id,
            subject_name,
            field: 'test2',
            message: 'Must be between 0-10',
            value: test2,
          })
        }
      }

      if (test3 !== null && test3 !== undefined) {
        if (isNaN(test3) || test3 < 0 || test3 > 10) {
          errors.push({
            subject_id,
            subject_name,
            field: 'test3',
            message: 'Must be between 0-10',
            value: test3,
          })
        }
      }

      if (test4 !== null && test4 !== undefined) {
        if (isNaN(test4) || test4 < 0 || test4 > 10) {
          errors.push({
            subject_id,
            subject_name,
            field: 'test4',
            message: 'Must be between 0-10',
            value: test4,
          })
        }
      }

      // Validate exam score
      if (exam !== null && exam !== undefined) {
        if (isNaN(exam) || exam < 0 || exam > 60) {
          errors.push({
            subject_id,
            subject_name,
            field: 'exam',
            message: 'Must be between 0-60',
            value: exam,
          })
        }
      }
    })

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'All scores are valid' : `Found ${errors.length} validation errors`,
    })
  } catch (error: any) {
    console.error('Error in POST /api/results/validate-scores:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error', valid: false, errors: [] },
      { status: 500 }
    )
  }
}
