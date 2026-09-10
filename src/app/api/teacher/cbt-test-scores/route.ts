import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * GET /api/teacher/cbt-test-scores
 * Get test scores for a specific test slot
 * 
 * Query params:
 * - test_slot_id: UUID
 * - class_arm_combo_id: UUID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const test_slot_id = searchParams.get('test_slot_id')
    const class_arm_combo_id = searchParams.get('class_arm_combo_id')

    if (!test_slot_id || !class_arm_combo_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: test_slot_id, class_arm_combo_id' },
        { status: 400 }
      )
    }

    // Get all students in the class
    const { data: students } = await supabase
      .from('students')
      .select('id, admission_number, user_id')
      .eq('class_arm_combo_id', class_arm_combo_id)
      .order('admission_number', { ascending: true })

    if (!students || students.length === 0) {
      return NextResponse.json({
        success: true,
        scores: [],
      })
    }

    // Get scores for all students in this test slot
    const { data: scores } = await supabase
      .from('cbt_test_scores')
      .select('*')
      .eq('test_slot_id', test_slot_id)
      .in(
        'student_id',
        students.map((s) => s.id)
      )

    // Create a map of student scores
    const scoresMap = new Map(scores?.map((s) => [s.student_id, s]) || [])

    // Combine students with their scores (null if no score yet)
    const result = students.map((student) => ({
      student_id: student.id,
      admission_number: student.admission_number,
      user_id: student.user_id,
      score: scoresMap.get(student.id) || null,
    }))

    console.log(`[CBT Test Scores] Fetched ${result.length} student records for test slot ${test_slot_id}`)

    return NextResponse.json({
      success: true,
      scores: result,
      count: result.length,
    })
  } catch (error: any) {
    console.error('[CBT Test Scores] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/cbt-test-scores
 * Create or update a student's test score
 * 
 * Required:
 * - school_id: UUID
 * - student_id: UUID
 * - test_slot_id: UUID
 * - score: number
 * - max_score: number
 * - entered_by: UUID (teacher)
 * - source: 'MANUAL' | 'CBT_AUTO' (default: MANUAL)
 * - cbt_submission_id?: UUID (if source is CBT_AUTO)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const required = ['school_id', 'student_id', 'test_slot_id', 'score', 'max_score', 'entered_by']

    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate score
    if (body.score < 0 || body.score > body.max_score) {
      return NextResponse.json(
        { error: `Score must be between 0 and ${body.max_score}` },
        { status: 400 }
      )
    }

    // Check if score already exists
    const { data: existing } = await supabase
      .from('cbt_test_scores')
      .select('id')
      .eq('student_id', body.student_id)
      .eq('test_slot_id', body.test_slot_id)
      .single()

    let result

    if (existing) {
      // Update existing score
      const { data: updated, error } = await supabase
        .from('cbt_test_scores')
        .update({
          score: body.score,
          max_score: body.max_score,
          source: body.source || 'MANUAL',
          cbt_submission_id: body.cbt_submission_id || null,
          entered_by: body.entered_by,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      result = updated
      console.log(`[CBT Test Scores] ✅ Updated score: ${body.student_id}`)
    } else {
      // Create new score
      const { data: created, error } = await supabase
        .from('cbt_test_scores')
        .insert({
          school_id: body.school_id,
          student_id: body.student_id,
          test_slot_id: body.test_slot_id,
          score: body.score,
          max_score: body.max_score,
          source: body.source || 'MANUAL',
          cbt_submission_id: body.cbt_submission_id || null,
          entered_by: body.entered_by,
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      result = created
      console.log(`[CBT Test Scores] ✅ Created score: ${body.student_id}`)
    }

    return NextResponse.json({
      success: true,
      score: result,
    })
  } catch (error: any) {
    console.error('[CBT Test Scores] POST error:', error)
    return NextResponse.json(
      { error: `Failed to save score: ${error.message}` },
      { status: 500 }
    )
  }
}
