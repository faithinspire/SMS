import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/broadcasts/get-inbox
 * Get user's broadcast messages and mark status
 *
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - user_id: UUID (required)
 * - unread_only?: boolean (optional, default: false)
 *
 * RETURNS:
 * {
 *   success: boolean,
 *   count: number,
 *   unread_count: number,
 *   inbox: Array<{
 *     id: UUID,
 *     message: string,
 *     sender_name: string,
 *     created_at: timestamp,
 *     is_read: boolean,
 *     read_at?: timestamp
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const userId = searchParams.get('user_id')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    if (!schoolId || !userId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, user_id' },
        { status: 400 }
      )
    }

    // Query broadcasts where user is in recipients
    let query = supabase
      .from('broadcasts')
      .select(
        `
        id,
        message,
        sender_id,
        sender_name,
        created_at,
        broadcast_recipients!inner(id, user_id, is_read, read_at)
      `
      )
      .eq('school_id', schoolId)
      .eq('broadcast_recipients.user_id', userId)

    // Filter to unread only if requested
    if (unreadOnly) {
      query = query.eq('broadcast_recipients.is_read', false)
    }

    const { data: broadcasts, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      console.error('[BroadcastInbox] Error fetching broadcasts:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inbox', details: error.message },
        { status: 500 }
      )
    }

    // Format response
    const formattedInbox = (broadcasts || []).map((broadcast: any) => ({
      id: broadcast.id,
      message: broadcast.message,
      sender_name: broadcast.sender_name || 'School Admin',
      created_at: broadcast.created_at,
      is_read: broadcast.broadcast_recipients?.[0]?.is_read || false,
      read_at: broadcast.broadcast_recipients?.[0]?.read_at,
    }))

    return NextResponse.json({
      success: true,
      count: formattedInbox.length,
      unread_count: formattedInbox.filter((m) => !m.is_read).length,
      inbox: formattedInbox,
    })
  } catch (error) {
    console.error('[BroadcastInbox] Error in GET /api/broadcasts/get-inbox:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/broadcasts/get-inbox
 * Mark broadcast(s) as read
 *
 * REQUEST BODY:
 * {
 *   school_id: UUID,
 *   user_id: UUID,
 *   broadcast_recipient_id?: UUID (optional - if provided, mark only this one; otherwise mark all)
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { school_id, user_id, broadcast_recipient_id, mark_all_as_read } = body

    if (!school_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, user_id' },
        { status: 400 }
      )
    }

    const readTime = new Date().toISOString()

    if (broadcast_recipient_id) {
      // Mark specific broadcast recipient as read
      const { data, error } = await supabase
        .from('broadcast_recipients')
        .update({ is_read: true, read_at: readTime })
        .eq('id', broadcast_recipient_id)
        .eq('user_id', user_id)
        .select()

      if (error) {
        console.error('[BroadcastInbox] Error marking as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark broadcast as read', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Broadcast marked as read',
        updated: data?.length || 0,
      })
    } else if (mark_all_as_read) {
      // Mark all broadcasts as read for this user
      const { error } = await supabase
        .from('broadcast_recipients')
        .update({ is_read: true, read_at: readTime })
        .eq('user_id', user_id)
        .eq('is_read', false)

      if (error) {
        console.error('[BroadcastInbox] Error marking all as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark all as read', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'All broadcasts marked as read',
      })
    } else {
      return NextResponse.json(
        { error: 'Either broadcast_recipient_id or mark_all_as_read must be provided' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[BroadcastInbox] Error in PATCH /api/broadcasts/get-inbox:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
