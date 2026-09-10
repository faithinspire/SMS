export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * DELETE /api/teacher/cbt-test-slots/[id]
 * Delete a CBT test slot (soft delete + cascade delete scores)
 * 
 * Params:
 * - id: UUID of test slot
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const slot_id = params.id

    if (!slot_id) {
      return NextResponse.json(
        { error: 'Missing slot ID' },
        { status: 400 }
      )
    }

    // First, delete all associated scores (cascade)
    const { error: deleteScoresError } = await supabase
      .from('cbt_test_scores')
      .delete()
      .eq('test_slot_id', slot_id)

    if (deleteScoresError) {
      console.error('[CBT Test Slots] Delete scores error:', deleteScoresError)
      return NextResponse.json(
        { error: `Failed to delete test scores: ${deleteScoresError.message}` },
        { status: 500 }
      )
    }

    // Soft delete the test slot
    const { error: deleteSlotError } = await supabase
      .from('cbt_test_slots')
      .update({
        status: 'DELETED',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', slot_id)

    if (deleteSlotError) {
      console.error('[CBT Test Slots] Delete slot error:', deleteSlotError)
      return NextResponse.json(
        { error: `Failed to delete test slot: ${deleteSlotError.message}` },
        { status: 500 }
      )
    }

    console.log(`[CBT Test Slots] ✅ Deleted test slot: ${slot_id}`)

    return NextResponse.json({
      success: true,
      message: 'Test slot and associated scores deleted successfully',
    })
  } catch (error: any) {
    console.error('[CBT Test Slots] DELETE error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/teacher/cbt-test-slots/[id]
 * Update a CBT test slot
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const slot_id = params.id
    const body = await request.json()

    if (!slot_id) {
      return NextResponse.json(
        { error: 'Missing slot ID' },
        { status: 400 }
      )
    }

    // Allowed fields to update
    const allowedFields = ['test_name', 'max_score', 'cbt_exam_id']
    const updates: any = {}

    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data: slot, error } = await supabase
      .from('cbt_test_slots')
      .update(updates)
      .eq('id', slot_id)
      .select()
      .single()

    if (error) {
      console.error('[CBT Test Slots] Update error:', error)
      return NextResponse.json(
        { error: `Failed to update test slot: ${error.message}` },
        { status: 500 }
      )
    }

    console.log(`[CBT Test Slots] ✅ Updated test slot: ${slot_id}`)

    return NextResponse.json({
      success: true,
      slot,
    })
  } catch (error: any) {
    console.error('[CBT Test Slots] PUT error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
