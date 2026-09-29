/**
 * API Route: Send Letter via Email
 * Handles server-side letter email sending via Resend
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'

const supabase = createClient()

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      request.headers.get('Authorization')?.split(' ')[1] || ''
    )

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { recipientEmail, recipientName, letterType, letterHTML, schoolName, senderEmail } =
      await request.json()

    // Validation
    if (!recipientEmail || !letterHTML || !letterType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const letterTypeLabel = letterType === 'appointment' ? 'Appointment' : 'Admission'

    // Check if Resend API is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email service not configured. Please use the mailto option instead.',
          useMailto: true,
        },
        { status: 200 }
      )
    }

    // Prepare email HTML
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #003366 0%, #004d99 100%); color: white; padding: 40px 20px; text-align: center; }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { font-size: 14px; opacity: 0.9; }
        .content { padding: 40px 20px; }
        .greeting { margin-bottom: 20px; }
        .greeting p { margin: 10px 0; }
        .info-box { background: #f0f7ff; border-left: 4px solid #003366; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .letter-preview { background: #fafafa; border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin: 20px 0; }
        .letter-preview iframe { width: 100%; height: 300px; border: none; }
        .download-link { text-align: center; margin: 20px 0; }
        .button { display: inline-block; background: #003366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-weight: bold; }
        .button:hover { background: #004d99; }
        .footer { background: #f9f9f9; border-top: 1px solid #ddd; padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .footer p { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📄 ${letterTypeLabel} Letter</h1>
            <p>${schoolName}</p>
        </div>

        <div class="content">
            <div class="greeting">
                <p>Dear ${recipientName},</p>
                <p>Your ${letterTypeLabel.toLowerCase()} letter has been generated and is ready for your review.</p>
            </div>

            <div class="info-box">
                <strong>Letter Type:</strong> ${letterTypeLabel}<br>
                <strong>School:</strong> ${schoolName}<br>
                <strong>Generated:</strong> ${new Date().toLocaleDateString()}
            </div>

            <p>Please find your letter below:</p>

            <div class="letter-preview">
                <!-- Letter content preview -->
                <p style="color: #666; font-size: 12px; margin-bottom: 10px;">
                    [Letter preview - open attached file for complete document]
                </p>
            </div>

            <p>If you have any questions or need clarification regarding this letter, please contact the school office directly.</p>

            <div class="download-link">
                <p><strong>💡 Tip:</strong> Save this email for your records.</p>
            </div>

            <p style="margin-top: 30px;">
                <strong>Best regards,</strong><br>
                School Administration<br>
                ${schoolName}
            </p>
        </div>

        <div class="footer">
            <p>This is an automated email from your school management system.</p>
            <p>Please do not reply to this email. Contact the school office for assistance.</p>
            <p>&copy; ${new Date().getFullYear()} ${schoolName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `.trim()

    // Send via Resend
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: senderEmail || process.env.NEXT_PUBLIC_SCHOOL_EMAIL || 'noreply@school.edu',
          to: recipientEmail,
          subject: `${letterTypeLabel} Letter - ${schoolName}`,
          html: emailHTML,
          reply_to: senderEmail || process.env.NEXT_PUBLIC_SCHOOL_EMAIL || 'noreply@school.edu',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Resend error:', error)
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to send email. Please try again.',
            error: error.message,
          },
          { status: 500 }
        )
      }

      const data = await response.json()

      return NextResponse.json(
        {
          success: true,
          message: 'Letter sent successfully via email',
          emailId: data.id,
        },
        { status: 200 }
      )
    } catch (resendError) {
      console.error('Resend API call failed:', resendError)
      return NextResponse.json(
        {
          success: false,
          message: 'Email service unavailable. Please try again later.',
        },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Letter email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
