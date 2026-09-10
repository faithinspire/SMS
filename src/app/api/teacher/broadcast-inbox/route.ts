import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


/**
 * GET /api/teacher/broadcast-inbox
 * Get teacher's broadcast messages (announcements)
 * 
 * QUERY PARAMS:
 * - school_id: UUID (required)
 * - teacher_id: UUID (required)
 * - unread_only?: boolean (optional, default: false)
 * 
 * RETURNS:
 * {
 *   success: boolean,
 *   count: number,
 *   inbox: Array<{
 *     id: UUID,
 *     title: string,
 *     message: string,
 *     sender: {id, full_name},
 *     created_at: timestamp,
 *     read_at?: timestamp,
 *     read: boolean
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('school_id')
    const teacherId = searchParams.get('teacher_id')
    const unreadOnly = searchParams.get('unread_only') === 'true'

    if (!schoolId || !teacherId) {
      return NextResponse.json(
        { error: 'Missing required query parameters: school_id, teacher_id' },
        { status: 400 }
      )
    }

    // Build query for notifications
    let query = supabase
      .from('notifications')
      .select(
        `
        id,
        title,
        message,
        type,
        read_at,
        created_at,
        announcements (
          id,
          created_by,
          users (id, full_name)
        )
      `
      )
      .eq('school_id', schoolId)
      .eq('user_id', teacherId)
      .eq('type', 'ANNOUNCEMENT')

    // Filter to unread only if requested
    if (unreadOnly) {
      query = query.is('read_at', null)
    }

    const { data: notifications, error } = await query.order('created_at', {
      ascending: false,
    })

    if (error) {
      console.error('Error fetching broadcast inbox:', error)
      return NextResponse.json(
        { error: 'Failed to fetch inbox', details: error.message },
        { status: 500 }
      )
    }

    // Format response
    const formattedInbox = (notifications || []).map((notif: any) => ({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      sender: {
        id: notif.announcements?.[0]?.created_by || 'unknown',
        full_name: notif.announcements?.[0]?.users?.full_name || 'Admin',
      },
      created_at: notif.created_at,
      read_at: notif.read_at,
      read: !!notif.read_at,
    }))

    return NextResponse.json({
      success: true,
      count: formattedInbox.length,
      unread_count: formattedInbox.filter((m) => !m.read).length,
      inbox: formattedInbox,
    })
  } catch (error) {
    console.error('Error in GET /api/teacher/broadcast-inbox:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/teacher/broadcast-inbox
 * Mark notification(s) as read
 * 
 * REQUEST BODY:
 * {
 *   school_id: UUID,
 *   teacher_id: UUID,
 *   notification_id?: UUID (optional - if provided, mark only this one; otherwise mark all),
 *   mark_all_as_read?: boolean
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { school_id, teacher_id, notification_id, mark_all_as_read } = body

    if (!school_id || !teacher_id) {
      return NextResponse.json(
        { error: 'Missing required fields: school_id, teacher_id' },
        { status: 400 }
      )
    }

    const readTime = new Date().toISOString()

    if (notification_id) {
      // Mark specific notification as read
      const { data, error } = await supabase
        .from('notifications')
        .update({ read_at: readTime })
        .eq('id', notification_id)
        .eq('user_id', teacher_id)
        .eq('school_id', school_id)
        .select()

      if (error) {
        console.error('Error marking notification as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark notification as read', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
        updated: data?.length || 0,
      })
    } else if (mark_all_as_read) {
      // Mark all notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readTime })
        .eq('user_id', teacher_id)
        .eq('school_id', school_id)
        .is('read_at', null)

      if (error) {
        console.error('Error marking all as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark all as read', details: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      })
    } else {
      return NextResponse.json(
        { error: 'Either notification_id or mark_all_as_read must be provided' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in PATCH /api/teacher/broadcast-inbox:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}

