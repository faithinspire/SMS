import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * GET /api/teacher/cbt-test-slots
 * List all CBT test slots for a subject/class/term
 * 
 * Query params:
 * - subject_id: UUID
 * - class_arm_combo_id: UUID
 * - term_id: UUID
 * - school_id: UUID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const school_id = searchParams.get('school_id')
    const subject_id = searchParams.get('subject_id')
    const class_arm_combo_id = searchParams.get('class_arm_combo_id')
    const term_id = searchParams.get('term_id')

    if (!school_id || !subject_id || !class_arm_combo_id || !term_id) {
      return NextResponse.json(
        { error: 'Missing required parameters: school_id, subject_id, class_arm_combo_id, term_id' },
        { status: 400 }
      )
    }

    // Fetch all test slots for this subject/class/term
    const { data: slots, error } = await supabase
      .from('cbt_test_slots')
      .select('*')
      .eq('school_id', school_id)
      .eq('subject_id', subject_id)
      .eq('class_arm_combo_id', class_arm_combo_id)
      .eq('term_id', term_id)
      .neq('status', 'DELETED')
      .order('test_number', { ascending: true })

    if (error) {
      console.error('[CBT Test Slots] Fetch error:', error)
      return NextResponse.json(
        { error: `Failed to fetch test slots: ${error.message}` },
        { status: 500 }
      )
    }

    console.log(`[CBT Test Slots] Fetched ${slots?.length || 0} test slots`)

    return NextResponse.json({
      success: true,
      slots: slots || [],
      count: slots?.length || 0,
    })
  } catch (error: any) {
    console.error('[CBT Test Slots] GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/cbt-test-slots
 * Create a new CBT test slot (max 4 per subject per term)
 * 
 * Required:
 * - school_id: UUID
 * - subject_id: UUID
 * - class_arm_combo_id: UUID
 * - term_id: UUID
 * - test_number: 1-4
 * - test_name: string
 * - test_type: 'CBT' | 'MANUAL'
 * - max_score: number
 * - created_by: UUID (teacher)
 * - cbt_exam_id?: UUID (if test_type is CBT)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    const required = [
      'school_id',
      'subject_id',
      'class_arm_combo_id',
      'term_id',
      'test_number',
      'test_name',
      'test_type',
      'max_score',
      'created_by',
    ]

    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate test_number
    if (body.test_number < 1 || body.test_number > 4) {
      return NextResponse.json(
        { error: 'test_number must be between 1 and 4' },
        { status: 400 }
      )
    }

    // Validate test_type
    if (!['CBT', 'MANUAL'].includes(body.test_type)) {
      return NextResponse.json(
        { error: "test_type must be 'CBT' or 'MANUAL'" },
        { status: 400 }
      )
    }

    // Check if test slot already exists for this number
    const { data: existing } = await supabase
      .from('cbt_test_slots')
      .select('id')
      .eq('school_id', body.school_id)
      .eq('subject_id', body.subject_id)
      .eq('class_arm_combo_id', body.class_arm_combo_id)
      .eq('term_id', body.term_id)
      .eq('test_number', body.test_number)
      .neq('status', 'DELETED')
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `Test slot ${body.test_number} already exists for this subject/class/term` },
        { status: 409 }
      )
    }

    // Create test slot
    const { data: slot, error } = await supabase
      .from('cbt_test_slots')
      .insert({
        school_id: body.school_id,
        subject_id: body.subject_id,
        class_arm_combo_id: body.class_arm_combo_id,
        term_id: body.term_id,
        test_number: body.test_number,
        test_name: body.test_name,
        test_type: body.test_type,
        cbt_exam_id: body.cbt_exam_id || null,
        max_score: body.max_score,
        status: 'ACTIVE',
        created_by: body.created_by,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[CBT Test Slots] Create error:', error)
      return NextResponse.json(
        { error: `Failed to create test slot: ${error.message}` },
        { status: 500 }
      )
    }

    console.log(`[CBT Test Slots] âœ… Created test slot: ${slot.id} (Test ${slot.test_number})`)

    return NextResponse.json({
      success: true,
      slot,
    })
  } catch (error: any) {
    console.error('[CBT Test Slots] POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

