/**
 * POST /api/cbt/create
 * Teacher creates new CBT exam
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

    // Get request body
    const {
      school_id,
      subject_id,
      class_arm_combo_id,
      term_id,
      title,
      description,
      exam_type,
      test_number,
      total_marks,
      passing_percentage,
      duration_minutes,
      allow_review,
      randomize_questions,
      randomize_options,
      start_time,
      end_time,
    } = await request.json()

    // Validate required fields
    if (!school_id || !subject_id || !class_arm_combo_id || !term_id || !title || !exam_type) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: school_id, subject_id, class_arm_combo_id, term_id, title, exam_type',
        },
        { status: 400 }
      )
    }

    // Verify teacher belongs to school
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('id', session.user.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 403 })
    }

    if (user.school_id !== school_id || user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Unauthorized: Only teachers can create exams' },
        { status: 403 }
      )
    }

    // Create exam
    const examId = await CBTManagementService.createExam({
      school_id,
      subject_id,
      class_arm_combo_id,
      created_by: session.user.id,
      term_id,
      title,
      description,
      exam_type,
      test_number,
      total_marks: total_marks || 100,
      passing_percentage: passing_percentage || 50,
      duration_minutes: duration_minutes || 60,
      allow_review: allow_review !== false,
      randomize_questions: randomize_questions === true,
      randomize_options: randomize_options === true,
      start_time,
      end_time,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Exam created successfully',
        exam_id: examId,
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('❌ Exception in CBT create:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
