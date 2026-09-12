/**
 * POST /api/cbt/questions
 * Add question to CBT exam
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { CBTManagementService } from '@/services/cbt-management.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies })

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { exam_id, school_id, question_type, question_text, marks, display_order, options } =
      await request.json()

    if (!exam_id || !school_id || !question_type || !question_text || marks === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify teacher owns this exam
    const { data: exam, error: examError } = await supabase
      .from('cbt_exams')
      .select('id, created_by')
      .eq('id', exam_id)
      .eq('school_id', school_id)
      .single()

    if (examError || !exam || exam.created_by !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot add questions to this exam' },
        { status: 403 }
      )
    }

    // Create question
    const questionId = await CBTManagementService.addQuestion({
      cbt_exam_id: exam_id,
      school_id,
      question_type,
      question_text,
      marks,
      display_order: display_order || 1,
    })

    // Add options if provided
    let optionIds: string[] = []
    if (Array.isArray(options) && options.length > 0) {
      for (const option of options) {
        const optionId = await CBTManagementService.addOption({
          question_id: questionId,
          option_text: option.option_text,
          is_correct: option.is_correct === true,
          option_key: option.option_key,
          display_order: option.display_order || 1,
        })
        optionIds.push(optionId)
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Question added successfully',
        question_id: questionId,
        options: optionIds,
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('❌ Exception in add question:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
