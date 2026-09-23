import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * POST /api/broadcasts/send
 * Sends a broadcast message to all staff and students in a school
 * 
 * REQUEST BODY:
 * {
 *   school_id: UUID (required),
 *   message: string (required),
 *   sender_id: UUID (required)
 * }
 * 
 * RETURNS:
 * {
 *   success: boolean,
 *   broadcast_id: UUID,
 *   recipients_count: number,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Broadcasts] ===== START =====')
    
    // Parse request
    const body = await request.json()
    const { school_id: schoolId, message, sender_id: senderId } = body

    // Validate input
    if (!schoolId || !message || !senderId) {
      console.log('[Broadcasts] ❌ Validation failed:', { schoolId: !!schoolId, message: !!message, senderId: !!senderId })
      return NextResponse.json(
        { error: 'Missing required fields: school_id, message, sender_id' },
        { status: 400 }
      )
    }

    console.log('[Broadcasts] ✅ Input validated')
    console.log('[Broadcasts] Data:', { schoolId, messageLen: message.length, senderId })

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Broadcasts] ❌ Missing Supabase env vars')
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('[Broadcasts] ✅ Supabase client created')

    // STEP 1: Create broadcast record
    console.log('[Broadcasts] STEP 1: Creating broadcast record...')
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .insert({
        school_id: schoolId,
        message,
        sender_id: senderId,
        broadcast_type: 'GENERAL',
      })
      .select('id')
      .single()

    if (broadcastError) {
      console.error('[Broadcasts] ❌ STEP 1 failed - Broadcast insert error')
      console.error('  Error code:', broadcastError.code)
      console.error('  Error message:', broadcastError.message)
      console.error('  Error details:', (broadcastError as any).details)
      return NextResponse.json(
        { error: 'Failed to create broadcast', details: broadcastError.message },
        { status: 500 }
      )
    }

    const broadcastId = broadcast.id
    console.log('[Broadcasts] ✅ STEP 1: Broadcast created -', broadcastId)

    // STEP 2: Get all users in school (staff AND students)
    console.log('[Broadcasts] STEP 2: Fetching all users (staff + students)...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .eq('school_id', schoolId)

    if (usersError) {
      console.error('[Broadcasts] ❌ STEP 2 failed - User query error')
      console.error('  Error:', usersError.message)
      return NextResponse.json(
        { error: 'Failed to fetch users', details: usersError.message },
        { status: 500 }
      )
    }

    const recipientIds = (users || []).map(u => u.id)
    console.log('[Broadcasts] ✅ STEP 2: Found', recipientIds.length, 'recipients')

    if (recipientIds.length === 0) {
      console.warn('[Broadcasts] ⚠️ No recipients found in school')
      return NextResponse.json({
        success: true,
        broadcast_id: broadcastId,
        recipients_count: 0,
        message: 'Broadcast created but no recipients found in this school',
      })
    }

    // STEP 3: Insert recipients in batches (to avoid too large INSERT)
    console.log('[Broadcasts] STEP 3: Adding recipients in batches...')
    const BATCH_SIZE = 500
    let totalInserted = 0

    for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
      const batch = recipientIds.slice(i, i + BATCH_SIZE)
      const recipientRecords = batch.map(userId => ({
        broadcast_id: broadcastId,
        user_id: userId,
        is_read: false,
      }))

      console.log(`[Broadcasts] STEP 3: Inserting batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)...`)

      const { error: recipientError } = await supabase
        .from('broadcast_recipients')
        .insert(recipientRecords)

      if (recipientError) {
        console.error('[Broadcasts] ❌ STEP 3 failed - Recipient insert error')
        console.error('  Batch:', Math.floor(i / BATCH_SIZE) + 1)
        console.error('  Error code:', recipientError.code)
        console.error('  Error message:', recipientError.message)
        console.error('  Error details:', (recipientError as any).details)
        return NextResponse.json(
          { error: 'Failed to add recipients', details: recipientError.message },
          { status: 500 }
        )
      }

      totalInserted += batch.length
      console.log(`[Broadcasts] ✅ Batch inserted (${totalInserted}/${recipientIds.length})`)
    }

    console.log('[Broadcasts] ✅ STEP 3: All recipients added')
    console.log('[Broadcasts] ===== SUCCESS =====')

    return NextResponse.json({
      success: true,
      broadcast_id: broadcastId,
      recipients_count: totalInserted,
      message: `Broadcast sent to ${totalInserted} recipients`,
    })
  } catch (error: any) {
    console.error('[Broadcasts] ❌ ===== EXCEPTION =====')
    console.error('[Broadcasts] Error type:', error.constructor.name)
    console.error('[Broadcasts] Error message:', error.message)
    console.error('[Broadcasts] Error stack:', error.stack)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
