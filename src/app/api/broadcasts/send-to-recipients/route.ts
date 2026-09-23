import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/broadcasts/send-to-recipients
 *
 * Sends a broadcast message to specific recipients and tracks delivery
 * Creates broadcast record and adds entries to broadcast_recipients table
 *
 * REQUEST BODY:
 * {
 *   school_id: UUID (required),
 *   message: string (required),
 *   sender_id: UUID (optional, defaults to 'SYSTEM'),
 *   sender_name: string (optional, defaults to 'School Admin'),
 *   recipient_ids?: UUID[] (optional - specific user IDs),
 *   recipient_roles?: string[] (optional - roles like TEACHER, PRINCIPAL, etc),
 *   recipient_role?: string (optional - single role for backward compatibility)
 * }
 *
 * RETURNS:
 * {
 *   success: boolean,
 *   broadcast_id: UUID,
 *   recipients_added: number,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[BroadcastAPI] === REQUEST START ===')
    
    const body = await request.json()
    console.log('[BroadcastAPI] Request body received:', {
      has_school_id: !!body.school_id,
      has_message: !!body.message,
      has_sender_id: !!body.sender_id,
      keys: Object.keys(body),
    })

    const {
      school_id: schoolId,
      message,
      sender_id: senderId,
      sender_name: senderName,
      recipient_ids: recipientIds,
      recipient_roles: recipientRoles,
      recipient_role: singleRole, // backward compatibility
    } = body

    if (!schoolId || !message || !senderId) {
      console.log('[BroadcastAPI] ❌ VALIDATION FAILED', {
        schoolId: !!schoolId,
        message: !!message,
        senderId: !!senderId,
      })
      return NextResponse.json(
        { error: 'Missing required fields: school_id, message, sender_id' },
        { status: 400 }
      )
    }

    console.log('[BroadcastAPI] ✅ Validation passed')
    console.log('[BroadcastAPI] Sending broadcast:', {
      schoolId,
      messageLength: message.length,
      senderId,
      specificRecipientIds: recipientIds?.length || 0,
      recipientRoles: recipientRoles || singleRole,
    })

    // STEP 1: Create the broadcast record
    console.log('[BroadcastAPI] STEP 1: Creating broadcast record...')
    const broadcastData = {
      school_id: schoolId,
      message,
      sender_id: senderId,
      broadcast_type: 'GENERAL',
    }
    console.log('[BroadcastAPI] Inserting broadcast with data:', {
      school_id: broadcastData.school_id,
      message_length: broadcastData.message.length,
      sender_id: broadcastData.sender_id,
      broadcast_type: broadcastData.broadcast_type,
    })

    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .insert(broadcastData)
      .select('id')
      .single()

    if (broadcastError) {
      console.error('[BroadcastAPI] ❌ STEP 1 FAILED - Broadcast insert error:')
      console.error('  Code:', broadcastError.code)
      console.error('  Message:', broadcastError.message)
      console.error('  Details:', (broadcastError as any).details)
      console.error('  Hint:', (broadcastError as any).hint)
      console.error('  Status:', (broadcastError as any).status)
      console.error('  Full error:', JSON.stringify(broadcastError, null, 2))
      
      // Check if error is RLS policy related
      if (broadcastError.code === 'PGRST201' || broadcastError.message.includes('permission')) {
        return NextResponse.json(
          { 
            error: 'Permission denied: Your role may not be authorized to send broadcasts',
            code: 'RLS_POLICY_VIOLATION',
            details: broadcastError.message 
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create broadcast', details: broadcastError.message },
        { status: 500 }
      )
    }

    console.log('[BroadcastAPI] ✅ STEP 1 SUCCESS - Broadcast created:', broadcast.id)

    // STEP 2: Determine recipient user IDs
    console.log('[BroadcastAPI] STEP 2: Determining recipient user IDs...')
    let recipientUserIds: string[] = []

    if (recipientIds && recipientIds.length > 0) {
      // Direct recipient IDs provided
      console.log('[BroadcastAPI] Using direct recipient IDs:', recipientIds.length)
      recipientUserIds = recipientIds
    } else {
      // Determine roles to query
      let rolesToQuery: string[] = []

      if (recipientRoles && recipientRoles.length > 0) {
        rolesToQuery = recipientRoles
      } else if (singleRole) {
        rolesToQuery = singleRole === 'ALL' ? [] : [singleRole]
      }

      console.log('[BroadcastAPI] Querying users by role:', rolesToQuery)

      // Query for users matching the recipient roles
      let userQuery = supabase
        .from('users')
        .select('id')
        .eq('school_id', schoolId)

      if (rolesToQuery.length > 0) {
        userQuery = userQuery.in('role', rolesToQuery)
      } else if (singleRole === 'ALL') {
        // Send to all staff roles (exclude students)
        // ✅ CRITICAL: Use correct role names matching Migration 070
        console.log('[BroadcastAPI] Broadcasting to ALL staff roles')
        userQuery = userQuery.in('role', ['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER', 'ACCOUNTANT', 'SCHOOL_ADMIN', 'OTHER_STAFF', 'STAFF'])
      }

      console.log('[BroadcastAPI] Executing user query...')
      const { data: users, error: userError } = await userQuery

      if (userError) {
        console.error('[BroadcastAPI] ❌ STEP 2 ERROR - User query failed:', userError)
        console.error('  Code:', userError.code)
        console.error('  Message:', userError.message)
      } else {
        recipientUserIds = (users || []).map(u => u.id)
        console.log('[BroadcastAPI] ✅ User query succeeded, found:', recipientUserIds.length, 'users')
      }
    }

    console.log('[BroadcastAPI] Found recipient user IDs:', recipientUserIds.length)

    if (recipientUserIds.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found matching criteria' },
        { status: 404 }
      )
    }

    // STEP 3: Add broadcast recipients
    console.log('[BroadcastAPI] STEP 3: Adding broadcast recipients...')
    const recipientRecords = recipientUserIds.map(userId => ({
      broadcast_id: broadcast.id,
      user_id: userId,
      is_read: false,
    }))

    console.log('[BroadcastAPI] Inserting', recipientRecords.length, 'recipient records')
    console.log('[BroadcastAPI] First recipient sample:', recipientRecords[0])

    const { error: recipientError } = await supabase
      .from('broadcast_recipients')
      .insert(recipientRecords)

    if (recipientError) {
      console.error('[BroadcastAPI] ❌ STEP 3 FAILED - Recipient insert error:')
      console.error('  Code:', recipientError.code)
      console.error('  Message:', recipientError.message)
      console.error('  Details:', (recipientError as any).details)
      console.error('  Hint:', (recipientError as any).hint)
      console.error('  Full error:', JSON.stringify(recipientError, null, 2))
      return NextResponse.json(
        { error: 'Failed to add recipients', details: recipientError.message },
        { status: 500 }
      )
    }

    console.log('[BroadcastAPI] ✅ STEP 3 SUCCESS - Recipients added')

    console.log('[BroadcastAPI] === REQUEST SUCCESS ===')
    return NextResponse.json({
      success: true,
      broadcast_id: broadcast.id,
      recipients_added: recipientUserIds.length,
      message: `Broadcast sent to ${recipientUserIds.length} recipients`,
    })
  } catch (error: any) {
    console.error('[BroadcastAPI] === EXCEPTION CAUGHT ===')
    console.error('[BroadcastAPI] Error type:', error.constructor.name)
    console.error('[BroadcastAPI] Error message:', error.message)
    console.error('[BroadcastAPI] Error stack:', error.stack)
    console.error('[BroadcastAPI] Full error:', JSON.stringify(error, null, 2))
    
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        type: error.constructor.name,
      },
      { status: 500 }
    )
  }
}
