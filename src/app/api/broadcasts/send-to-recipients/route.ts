import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * POST /api/broadcasts/send-to-recipients
 * 
 * Sends a broadcast message to specific recipients and tracks delivery
 * Creates broadcast record and adds entries to broadcast_recipients table
 */
export async function POST(request: NextRequest) {
  try {
    const { schoolId, message, senderName, recipientIds, recipientTypes } = await request.json()

    if (!schoolId || !message || (!recipientIds?.length && !recipientTypes?.length)) {
      return NextResponse.json(
        { error: 'Missing required fields: schoolId, message, and (recipientIds or recipientTypes)' },
        { status: 400 }
      )
    }

    console.log('[BroadcastAPI] Sending broadcast:', {
      schoolId,
      messageLength: message.length,
      recipientIds: recipientIds?.length || 0,
      recipientTypes: recipientTypes || [],
    })

    // STEP 1: Create the broadcast record
    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .insert({
        school_id: schoolId,
        message,
        sender_id: 'SYSTEM',
        sender_name: senderName || 'School Admin',
      })
      .select('id')
      .single()

    if (broadcastError) {
      console.error('[BroadcastAPI] Error creating broadcast:', broadcastError)
      return NextResponse.json(
        { error: 'Failed to create broadcast', details: broadcastError.message },
        { status: 500 }
      )
    }

    console.log('[BroadcastAPI] Broadcast created:', broadcast.id)

    // STEP 2: Determine recipient user IDs
    let recipientUserIds: string[] = []

    if (recipientIds && recipientIds.length > 0) {
      recipientUserIds = recipientIds
    } else if (recipientTypes && recipientTypes.length > 0) {
      // Query for users matching the recipient types
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', schoolId)
        .in('role', recipientTypes)

      if (userError) {
        console.warn('[BroadcastAPI] Error querying users by type:', userError)
      } else {
        recipientUserIds = (users || []).map(u => u.id)
      }
    }

    console.log('[BroadcastAPI] Recipient user IDs:', recipientUserIds.length)

    // STEP 3: Add broadcast recipients
    if (recipientUserIds.length > 0) {
      const recipientRecords = recipientUserIds.map(userId => ({
        broadcast_id: broadcast.id,
        user_id: userId,
        school_id: schoolId,
        is_read: false,
      }))

      const { error: recipientError } = await supabase
        .from('broadcast_recipients')
        .insert(recipientRecords)

      if (recipientError) {
        console.warn('[BroadcastAPI] Warning adding recipients:', recipientError)
        // Don't fail - broadcast is created, just recipients might not be tracked
      } else {
        console.log('[BroadcastAPI] Added', recipientUserIds.length, 'recipients')
      }
    }

    return NextResponse.json({
      success: true,
      broadcast_id: broadcast.id,
      recipients_added: recipientUserIds.length,
      message: `Broadcast sent to ${recipientUserIds.length} recipients`,
    })
  } catch (error: any) {
    console.error('[BroadcastAPI] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
