import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

/**
 * POST /api/broadcasts/send
 * Send a broadcast message to staff/teachers
 * 
 * AUTHENTICATION: Only SCHOOL_ADMIN, PRINCIPAL, HEAD_TEACHER can send
 * 
 * BODY:
 * {
 *   title: string (required)
 *   message: string (required)
 *   recipient_type: 'STAFF' | 'TEACHERS' | 'ALL_STAFF' (required)
 *   broadcast_type: 'GENERAL' | 'URGENT' | 'HOLIDAY' (optional, default: GENERAL)
 * }
 * 
 * RETURNS:
 * {
 *   success: boolean
 *   broadcast_id: string
 *   recipients_count: number
 *   message: string
 * }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, message, recipient_type = 'STAFF', broadcast_type = 'GENERAL' } = body

    // Validate required fields
    if (!title || !message || !recipient_type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: title, message, recipient_type',
        },
        { status: 400 }
      )
    }

    // Get current user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Not authenticated' },
        { status: 401 }
      )
    }

    // Get user details and verify they're admin/principal
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, school_id, role')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, error: 'User record not found' },
        { status: 404 }
      )
    }

    // Verify authorization
    if (!['SCHOOL_ADMIN', 'PRINCIPAL', 'HEAD_TEACHER'].includes(userData.role)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unauthorized: ${userData.role} cannot send broadcasts`,
        },
        { status: 403 }
      )
    }

    // Call the stored procedure to create broadcast and recipients
    const { data, error: procError } = await supabase.rpc('send_broadcast_to_staff', {
      p_school_id: userData.school_id,
      p_sender_id: authUser.id,
      p_title: title,
      p_message: message,
      p_recipient_type: recipient_type,
      p_broadcast_type: broadcast_type,
    })

    if (procError) {
      console.error('Stored procedure error:', procError)
      return NextResponse.json(
        { success: false, error: `Failed to send broadcast: ${procError.message}` },
        { status: 500 }
      )
    }

    // Get recipient count
    const { count: recipientCount, error: countError } = await supabase
      .from('broadcast_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('broadcast_id', data)

    return NextResponse.json({
      success: true,
      broadcast_id: data,
      recipients_count: recipientCount || 0,
      message: `Broadcast sent successfully to ${recipientCount || 0} recipients`,
    })
  } catch (error: any) {
    console.error('Error sending broadcast:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send broadcast',
      },
      { status: 500 }
    )
  }
}
