/**
 * Email Service
 * Handles sending emails via Resend with fallback to mailto
 */

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export class EmailService {
  private static readonly DEFAULT_FROM = process.env.NEXT_PUBLIC_SCHOOL_EMAIL || 'noreply@school.edu'

  /**
   * Send email via Resend API or fallback to mailto
   */
  static async sendEmail(options: EmailOptions): Promise<{ success: boolean; message: string }> {
    try {
      // Check if Resend API key is configured
      if (process.env.RESEND_API_KEY) {
        return await this.sendViaResend(options)
      }

      // Fallback to mailto
      return this.sendViaMailto(options)
    } catch (error) {
      console.error('Email service error:', error)
      return {
        success: false,
        message: 'Failed to send email. Please try again.',
      }
    }
  }

  /**
   * Send email via Resend API
   */
  private static async sendViaResend(options: EmailOptions): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || this.DEFAULT_FROM,
          to: options.to,
          subject: options.subject,
          html: options.html,
          reply_to: options.replyTo,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send email via Resend')
      }

      const data = await response.json()
      console.log('Email sent via Resend:', data.id)

      return {
        success: true,
        message: 'Email sent successfully',
      }
    } catch (error) {
      console.error('Resend API error:', error)
      throw error
    }
  }

  /**
   * Send email via mailto (client-side fallback)
   */
  private static sendViaMailto(options: EmailOptions): { success: boolean; message: string } {
    try {
      const mailtoUrl = `mailto:${encodeURIComponent(options.to)}?subject=${encodeURIComponent(options.subject)}&body=${encodeURIComponent('Letter is attached. Please check your email client for formatting.')}`

      // On client side
      if (typeof window !== 'undefined') {
        window.location.href = mailtoUrl
      }

      return {
        success: true,
        message: 'Email client opened. Please complete sending the email.',
      }
    } catch (error) {
      console.error('Mailto error:', error)
      return {
        success: false,
        message: 'Could not open email client',
      }
    }
  }

  /**
   * Send letter via email with HTML attachment
   */
  static async sendLetterEmail(options: {
    recipientEmail: string
    recipientName: string
    letterType: 'appointment' | 'admission'
    letterHTML: string
    schoolName: string
    senderEmail?: string
  }): Promise<{ success: boolean; message: string }> {
    const letterTypeLabel = options.letterType === 'appointment' ? 'Appointment' : 'Admission'

    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #003366 0%, #004d99 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #003366; }
        .footer { text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px; }
        .button { display: inline-block; background: #003366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${letterTypeLabel} Letter</h1>
            <p>From: ${options.schoolName}</p>
        </div>

        <div class="content">
            <p>Dear ${options.recipientName},</p>
            <p>Your ${letterTypeLabel.toLowerCase()} letter has been generated and is ready. Please find the complete document below in the attached file or view it in the link provided.</p>
            <p>If you have any questions or need clarification, please don't hesitate to contact the school office.</p>
            <p><strong>Best regards,</strong><br>School Administration</p>
        </div>

        <div style="background: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 20px; max-height: 400px; overflow-y: auto;">
            <!-- Letter Preview -->
            <iframe
                srcDoc="${options.letterHTML.replace(/"/g, '&quot;')}"
                style="width: 100%; height: 400px; border: none; border-radius: 4px;"
                title="Letter Preview"
            />
        </div>

        <div class="footer">
            <p>This is an automated email. Please do not reply directly to this email.</p>
            <p>${options.schoolName} - ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return this.sendEmail({
      to: options.recipientEmail,
      subject: `${letterTypeLabel} Letter - ${options.schoolName}`,
      html: emailHTML,
      from: options.senderEmail,
      replyTo: options.senderEmail || this.DEFAULT_FROM,
    })
  }

  /**
   * Generate shareable letter link (would require backend storage)
   * For now, returns a placeholder for future implementation
   */
  static async generateShareableLink(options: {
    letterHTML: string
    letterType: 'appointment' | 'admission'
    recipientId: string
    expiresIn?: number // hours
  }): Promise<string> {
    // This would integrate with a backend service to store the letter
    // and generate a shareable link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3001'
    const token = Buffer.from(options.recipientId).toString('base64')
    return `${baseUrl}/share/letter/${token}`
  }
}
