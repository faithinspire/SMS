import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * POST /api/announcements/broadcast
 * Admin/Principal broadcasts a message to school/class/role
 * 
 * REQUEST BODY:
 * {
 *   school_id: UUID,
 *   created_by: UUID (admin or principal),
 *   title: string,
 *   message: string,
 *   scope: 'SCHOOL_WIDE' | 'CLASS' | 'ROLE',
 *   target_class_id?: UUID (required if scope='CLASS'),
 *   target_role?: string (required if scope='ROLE' - e.g., 'TEACHER', 'STUDENT')
 * }
 * 
 * RETURNS:
 * {
 *   success: boolean,
 *   announcement_id: UUID,
 *   notifications_created: number,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { school_id, created_by, title, message, scope, target_class_id, target_role } = body

    // Validation
    if (!school_id || !created_by || !title || !message || !scope) {
      return NextResponse.json(
        {
          error: 'Missing required fields: school_id, created_by, title, message, scope',
        },
        { status: 400 }
      )
    }

    if (scope === 'CLASS' && !target_class_id) {
      return NextResponse.json(
        { error: 'target_class_id is required when scope is CLASS' },
        { status: 400 }
      )
    }

    if (scope === 'ROLE' && !target_role) {
      return NextResponse.json(
        { error: 'target_role is required when scope is ROLE' },
        { status: 400 }
      )
    }

    // Step 1: Create announcement record
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .insert({
        school_id,
        created_by,
        title,
        message,
        scope,
        target_class_id: scope === 'CLASS' ? target_class_id : null,
        target_role: scope === 'ROLE' ? target_role : null,
      })
      .select()

    if (announcementError) {
      console.error('Error creating announcement:', announcementError)
      return NextResponse.json(
        { error: 'Failed to create announcement', details: announcementError.message },
        { status: 500 }
      )
    }

    if (!announcement || announcement.length === 0) {
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 })
    }

    const announcementId = announcement[0].id

    // Step 2: Determine target users based on scope
    let targetUsers: any[] = []

    if (scope === 'SCHOOL_WIDE') {
      // Get all users in school except the sender
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', school_id)
        .neq('id', created_by)

      if (!error && data) {
        targetUsers = data.map((u) => u.id)
      }
    } else if (scope === 'CLASS') {
      // Get all students in the class
      const { data, error } = await supabase
        .from('students')
        .select('user_id')
        .eq('school_id', school_id)
        .eq('class_arm_combo_id', target_class_id)

      if (!error && data) {
        targetUsers = data.map((s) => s.user_id)
      }
    } else if (scope === 'ROLE') {
      // Get all users with target role in school
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('school_id', school_id)
        .eq('role', target_role)
        .neq('id', created_by)

      if (!error && data) {
        targetUsers = data.map((u) => u.id)
      }
    }

    // Step 3: Create notification records for each target user
    if (targetUsers.length > 0) {
      const notifications = targetUsers.map((userId) => ({
        school_id,
        user_id: userId,
        title: title,
        message: message,
        type: 'ANNOUNCEMENT',
        related_entity_id: announcementId,
      }))

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notificationError) {
        console.error('Error creating notifications:', notificationError)
        // Don't fail here - announcement was created, notifications just failed
        return NextResponse.json({
          success: true,
          announcement_id: announcementId,
          notifications_created: 0,
          warning: 'Announcement created but failed to create some notifications',
        })
      }
    }

    return NextResponse.json({
      success: true,
      announcement_id: announcementId,
      notifications_created: targetUsers.length,
      message: `Broadcast message sent to ${targetUsers.length} recipient(s)`,
    })
  } catch (error) {
    console.error('Error in POST /api/announcements/broadcast:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
