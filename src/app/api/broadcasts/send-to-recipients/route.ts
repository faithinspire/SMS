import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0  // Force no cache - broadcast endpoint must always be fresh

/**
 * POST /api/broadcasts/send-to-recipients
 * Sends a broadcast message to specific recipients (by role or school-wide)
 * 
 * REQUEST BODY:
 * {
 *   school_id: UUID (required),
 *   message: string (required),
 *   sender_id: UUID (required),
 *   sender_name: string (required),
 *   recipient_role?: string (optional - e.g., 'TEACHER', 'STUDENT', 'ADMIN' - if not provided, sends to all)
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
    console.log('[Broadcasts/Recipients] ===== START =====')
    
    // Parse request
    const body = await request.json()
    const { school_id: schoolId, message, sender_id: senderId, sender_name: senderName, recipient_role: recipientRole } = body

    // Validate input
    if (!schoolId || !message || !senderId || !senderName) {
      console.log('[Broadcasts/Recipients] ❌ Validation failed:', { 
        schoolId: !!schoolId, 
        message: !!message, 
        senderId: !!senderId,
        senderName: !!senderName
      })
      return NextResponse.json(
        { error: 'Missing required fields: school_id, message, sender_id, sender_name' },
        { status: 400 }
      )
    }

    console.log('[Broadcasts/Recipients] ✅ Input validated')
    console.log('[Broadcasts/Recipients] Data:', { 
      schoolId, 
      messageLen: message.length, 
      senderId,
      senderName,
      recipientRole: recipientRole || 'ALL'
    })

    // Create Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Broadcasts/Recipients] ❌ Missing Supabase env vars')
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('[Broadcasts/Recipients] ✅ Supabase client created')

    // STEP 1: Create broadcast record
    console.log('[Broadcasts/Recipients] STEP 1: Creating broadcast record...')
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .insert({
        school_id: schoolId,
        message,
        sender_id: senderId,
        broadcast_type: recipientRole ? `ROLE_${recipientRole}` : 'GENERAL',
      })
      .select('id')
      .single()

    if (broadcastError) {
      console.error('[Broadcasts/Recipients] ❌ STEP 1 failed - Broadcast insert error')
      console.error('  Error code:', broadcastError.code)
      console.error('  Error message:', broadcastError.message)
      console.error('  Error details:', (broadcastError as any).details)
      return NextResponse.json(
        { error: 'Failed to create broadcast', details: broadcastError.message },
        { status: 500 }
      )
    }

    const broadcastId = broadcast.id
    console.log('[Broadcasts/Recipients] ✅ STEP 1: Broadcast created -', broadcastId)

    // STEP 2: Get target recipients based on role filter
    console.log('[Broadcasts/Recipients] STEP 2: Fetching target recipients...')
    
    let recipientIds: string[] = []

    if (recipientRole) {
      // Get users with specific role in this school
      console.log(`[Broadcasts/Recipients] Filtering by role: ${recipientRole}`)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', schoolId)
        .eq('role', recipientRole)

      if (usersError) {
        console.error('[Broadcasts/Recipients] ❌ STEP 2 failed - Role-based user query error')
        console.error('  Error:', usersError.message)
        return NextResponse.json(
          { error: 'Failed to fetch users by role', details: usersError.message },
          { status: 500 }
        )
      }

      recipientIds = (users || []).map(u => u.id)
      console.log(`[Broadcasts/Recipients] ✅ STEP 2: Found ${recipientIds.length} recipients with role ${recipientRole}`)
    } else {
      // Get all users in school
      console.log('[Broadcasts/Recipients] No role filter - getting all users in school')
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', schoolId)

      if (usersError) {
        console.error('[Broadcasts/Recipients] ❌ STEP 2 failed - User query error')
        console.error('  Error:', usersError.message)
        return NextResponse.json(
          { error: 'Failed to fetch users', details: usersError.message },
          { status: 500 }
        )
      }

      recipientIds = (users || []).map(u => u.id)
      console.log('[Broadcasts/Recipients] ✅ STEP 2: Found', recipientIds.length, 'recipients (all users)')
    }

    if (recipientIds.length === 0) {
      console.warn('[Broadcasts/Recipients] ⚠️ No recipients found')
      return NextResponse.json({
        success: true,
        broadcast_id: broadcastId,
        recipients_count: 0,
        message: 'Broadcast created but no matching recipients found',
      })
    }

    // STEP 3: Insert recipients in batches (to avoid too large INSERT)
    console.log('[Broadcasts/Recipients] STEP 3: Adding recipients in batches...')
    const BATCH_SIZE = 500
    let totalInserted = 0

    for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
      const batch = recipientIds.slice(i, i + BATCH_SIZE)
      const recipientRecords = batch.map(userId => ({
        broadcast_id: broadcastId,
        user_id: userId,
        is_read: false,
      }))

      console.log(`[Broadcasts/Recipients] STEP 3: Inserting batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} records)...`)

      const { error: recipientError } = await supabase
        .from('broadcast_recipients')
        .insert(recipientRecords)

      if (recipientError) {
        console.error('[Broadcasts/Recipients] ❌ STEP 3 failed - Recipient insert error')
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
      console.log(`[Broadcasts/Recipients] ✅ Batch inserted (${totalInserted}/${recipientIds.length})`)
    }

    console.log('[Broadcasts/Recipients] ✅ STEP 3: All recipients added')
    console.log('[Broadcasts/Recipients] ===== SUCCESS =====')

    return NextResponse.json({
      success: true,
      broadcast_id: broadcastId,
      recipients_count: totalInserted,
      message: `Broadcast sent to ${totalInserted} recipient(s)${recipientRole ? ` with role ${recipientRole}` : ''}`,
    })
  } catch (error: any) {
    console.error('[Broadcasts/Recipients] ❌ ===== EXCEPTION =====')
    console.error('[Broadcasts/Recipients] Error type:', error.constructor.name)
    console.error('[Broadcasts/Recipients] Error message:', error.message)
    console.error('[Broadcasts/Recipients] Error stack:', error.stack)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
