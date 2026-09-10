import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { school_id, message, recipient_role, sent_by, sent_by_name } = body

    if (!school_id || !message || !recipient_role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fallback for sender name - get from database if null
    let senderName = sent_by_name || 'Administrator'
    
    if (!sent_by_name && sent_by) {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', sent_by)
          .single()
        
        senderName = userData?.full_name || 'Administrator'
      } catch (err) {
        console.warn('[Broadcast] Could not fetch sender name from DB')
        senderName = 'Administrator'
      }
    }

    console.log('[Broadcast] Sending to:', recipient_role, 'in school:', school_id)

    // Get all users with the specified role in this school
    let query = supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('school_id', school_id)

    if (recipient_role !== 'ALL') {
      query = query.eq('role', recipient_role)
    } else {
      // Exclude students, send to all staff roles
      query = query.in('role', ['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER', 'ACCOUNTANT', 'OTHER_STAFF'])
    }

    const { data: recipients, error: fetchError } = await query

    if (fetchError) {
      console.error('[Broadcast] Fetch error:', fetchError)
      throw fetchError
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'No recipients found for this role' },
        { status: 404 }
      )
    }

    console.log(`[Broadcast] Found ${recipients.length} recipients`)

    // Create broadcast message record
    const { data: broadcastData, error: insertError } = await supabase
      .from('broadcasts')
      .insert([
        {
          school_id,
          sender_id: sent_by,
          sender_name: senderName,
          recipient_role,
          message,
          recipient_count: recipients.length,
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    if (insertError) {
      console.error('[Broadcast] Insert error:', insertError)
      throw insertError
    }

    const broadcastId = broadcastData?.[0]?.id

    // Create notification records for each recipient
    const notifications = recipients.map((recipient: any) => ({
      broadcast_id: broadcastId,
      user_id: recipient.id,
      school_id,
      recipient_email: recipient.email,
      recipient_name: recipient.full_name,
      recipient_role: recipient.role,
      message,
      sender_name: senderName,
      read: false,
      created_at: new Date().toISOString(),
    }))

    const { error: notifError } = await supabase
      .from('broadcast_notifications')
      .insert(notifications)

    if (notifError) {
      console.error('[Broadcast] Notification insert error:', notifError)
      throw notifError
    }

    console.log(`[Broadcast] ✅ Successfully sent to ${recipients.length} recipients`)

    return NextResponse.json({
      success: true,
      message: `Broadcast sent to ${recipients.length} staff members`,
      recipientCount: recipients.length,
    })
  } catch (error: any) {
    console.error('[Broadcast] API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send broadcast' },
      { status: 500 }
    )
  }
}
