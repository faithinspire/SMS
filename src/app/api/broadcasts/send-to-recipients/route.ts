import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Lazy-load Supabase client to avoid build-time errors
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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
    const supabase = getSupabaseClient()
    const body = await request.json()
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
      return NextResponse.json(
        { error: 'Missing required fields: school_id, message, sender_id' },
        { status: 400 }
      )
    }

    console.log('[BroadcastAPI] Sending broadcast:', {
      schoolId,
      messageLength: message.length,
      senderId,
      specificRecipientIds: recipientIds?.length || 0,
      recipientRoles: recipientRoles || singleRole,
    })

    // STEP 1: Create the broadcast record
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
      console.error('[BroadcastAPI] Error creating broadcast:', broadcastError)
      console.error('[BroadcastAPI] Details:', {
        code: broadcastError.code,
        message: broadcastError.message,
        hint: (broadcastError as any).hint,
      })
      
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

    console.log('[BroadcastAPI] Broadcast created:', broadcast.id)

    // STEP 2: Determine recipient user IDs
    let recipientUserIds: string[] = []

    if (recipientIds && recipientIds.length > 0) {
      // Direct recipient IDs provided
      recipientUserIds = recipientIds
    } else {
      // Determine roles to query
      let rolesToQuery: string[] = []

      if (recipientRoles && recipientRoles.length > 0) {
        rolesToQuery = recipientRoles
      } else if (singleRole) {
        rolesToQuery = singleRole === 'ALL' ? [] : [singleRole]
      }

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
        userQuery = userQuery.in('role', ['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER', 'ACCOUNTANT', 'SCHOOL_ADMIN', 'OTHER_STAFF', 'STAFF'])
      }

      const { data: users, error: userError } = await userQuery

      if (userError) {
        console.warn('[BroadcastAPI] Error querying users by role:', userError)
      } else {
        recipientUserIds = (users || []).map(u => u.id)
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
    const recipientRecords = recipientUserIds.map(userId => ({
      broadcast_id: broadcast.id,
      user_id: userId,
      is_read: false,
    }))

    const { error: recipientError } = await supabase
      .from('broadcast_recipients')
      .insert(recipientRecords)

    if (recipientError) {
      console.error('[BroadcastAPI] Error adding recipients:', recipientError)
      return NextResponse.json(
        { error: 'Failed to add recipients', details: recipientError.message },
        { status: 500 }
      )
    }

    console.log('[BroadcastAPI] ✅ Broadcast sent successfully to', recipientUserIds.length, 'recipients')

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
