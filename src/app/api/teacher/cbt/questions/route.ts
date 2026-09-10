import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * POST /api/teacher/cbt/questions
 * Add questions to a CBT exam
 * 
 * REQUIRED FIELDS:
 * - school_id: UUID
 * - cbt_exam_id: UUID
 * - questions: Array of question objects
 *   - question_text: string
 *   - question_type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'THEORY'
 *   - marks: number
 *   - options?: Array of { text: string, isCorrect: boolean } (for MCQ/TF)
 *   - correct_answer?: string (for theory)
 *   - display_order?: number
 * 
 * RETURNS:
 * - Success message with question count
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { school_id, cbt_exam_id, questions } = body

    if (!school_id || !cbt_exam_id || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, cbt_exam_id, questions' },
        { status: 400 }
      )
    }

    // Verify exam exists and belongs to school
    const { data: exam, error: examError } = await supabase
      .from('cbt_exams')
      .select('id')
      .eq('id', cbt_exam_id)
      .eq('school_id', school_id)
      .single()

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found or does not belong to this school' },
        { status: 404 }
      )
    }

    let createdCount = 0
    const errors: string[] = []

    // Process each question
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]

      // Validate MCQ/TF questions have exactly 4 options
      if ((q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE')) {
        if (!q.options || q.options.length !== 4) {
          const msg = `Question ${i + 1} (${q.question_type}): Must have exactly 4 options, got ${q.options?.length || 0}`
          console.error(msg)
          errors.push(msg)
          continue
        }

        // Validate exactly one correct answer
        const correctCount = q.options.filter((opt: any) => opt.isCorrect).length
        if (correctCount !== 1) {
          const msg = `Question ${i + 1} (${q.question_type}): Must have exactly 1 correct answer, got ${correctCount}`
          console.error(msg)
          errors.push(msg)
          continue
        }
      }

      // Insert question
      const { data: question, error: qError } = await supabase
        .from('cbt_questions')
        .insert({
          school_id,
          cbt_exam_id,
          question_text: q.question_text,
          question_type: q.question_type,
          marks: q.marks,
          display_order: q.display_order || i + 1,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (qError) {
        const msg = `Error creating question ${i + 1}: ${qError.message}`
        console.error(msg)
        errors.push(msg)
        continue
      }

      // Insert options if MCQ or TRUE_FALSE
      if ((q.question_type === 'MULTIPLE_CHOICE' || q.question_type === 'TRUE_FALSE') && q.options) {
        const options = q.options.map((opt: any, idx: number) => ({
          question_id: question.id,
          option_text: opt.text,
          is_correct: opt.isCorrect || false,
          display_order: idx,
          option_key: String.fromCharCode(65 + idx), // A, B, C, D
        }))

        const { error: optError } = await supabase
          .from('cbt_options')
          .insert(options)

        if (optError) {
          const msg = `Error creating options for question ${i + 1}: ${optError.message}`
          console.error(msg)
          errors.push(msg)
          // Don't continue - question was created, options failed
        }
      }

      createdCount++
    }

    // Update exam status if all questions added
    if (createdCount === questions.length) {
      await supabase
        .from('cbt_exams')
        .update({ status: 'ACTIVE' })
        .eq('id', cbtExamId)
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `Successfully added ${createdCount}/${questions.length} questions to exam`,
      questions_added: createdCount,
      validation_errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Exception in CBT questions POST:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/teacher/cbt/questions
 * Get all questions for an exam
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - cbt_exam_id: UUID (required)
 * 
 * RETURNS:
 * - Array of questions with options
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const cbtExamId = searchParams.get('cbt_exam_id')

    if (!schoolId || !cbtExamId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, cbt_exam_id' },
        { status: 400 }
      )
    }

    // Get questions
    const { data: questions, error } = await supabase
      .from('cbt_questions')
      .select(
        `
        id,
        question_text,
        question_type,
        marks,
        display_order,
        created_at,
        cbt_options (
          id,
          option_text,
          is_correct,
          display_order
        )
      `
      )
      .eq('school_id', schoolId)
      .eq('cbt_exam_id', cbtExamId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching questions:', error)
      return NextResponse.json(
        { error: `Failed to fetch questions: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      count: questions?.length || 0,
      questions: questions || [],
    })
  } catch (error: any) {
    console.error('Exception in CBT questions GET:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
