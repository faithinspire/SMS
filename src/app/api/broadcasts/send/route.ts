import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


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
    // NOTE: Stored procedure signature is: send_broadcast_to_staff(p_school_id, p_sender_id, p_message, p_broadcast_type)
    // Do NOT send p_title or p_recipient_type - they are not parameters in the procedure
    const { data, error: procError } = await supabase.rpc('send_broadcast_to_staff', {
      p_school_id: userData.school_id,
      p_sender_id: authUser.id,
      p_message: message,
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

    if (countError) {
      console.error('[Broadcast] Error checking recipient count:', countError)
      return NextResponse.json(
        { success: false, error: 'Failed to verify broadcast delivery' },
        { status: 500 }
      )
    }

    // ✅ FIX: Return error if no recipients found
    if (!recipientCount || recipientCount === 0) {
      console.warn('[Broadcast] No recipients found for broadcast:', data)
      return NextResponse.json(
        {
          success: false,
          error: 'No recipients found for this school. Ensure staff/teachers exist and have correct roles.',
          broadcast_id: data,
          recipients_count: 0,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      broadcast_id: data,
      recipients_count: recipientCount,
      message: `Broadcast sent successfully to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`,
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

