/**
 * WhatsApp Service
 * Handles sharing documents via WhatsApp with proper URL encoding and PDF generation
 */

export interface WhatsAppShareOptions {
  phoneNumber: string
  message: string
  documentName?: string
  documentUrl?: string
}

export class WhatsAppService {
  /**
   * Format phone number to WhatsApp format
   * Removes all non-digits and ensures proper formatting
   */
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '')

    // If it doesn't start with country code, assume it's Nigeria (+234)
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
      return '234' + cleaned.substring(1)
    }

    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return '234' + cleaned.substring(1)
    }

    // If already has country code
    if (cleaned.length >= 12) {
      return cleaned
    }

    // For 10-11 digit numbers without leading 0, assume Nigeria
    if (cleaned.length === 10 || cleaned.length === 11) {
      return '234' + cleaned
    }

    return cleaned
  }

  /**
   * Share letter via WhatsApp Web
   */
  static shareViaWhatsApp(options: WhatsAppShareOptions): { success: boolean; message: string } {
    try {
      const formattedPhone = this.formatPhoneNumber(options.phoneNumber)
      const encodedMessage = encodeURIComponent(options.message)

      // Construct WhatsApp URL
      const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`

      // Open in new window
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer')

      return {
        success: true,
        message: 'WhatsApp opened. Share your letter document.',
      }
    } catch (error) {
      console.error('WhatsApp share error:', error)
      return {
        success: false,
        message: 'Failed to open WhatsApp. Please ensure WhatsApp is installed.',
      }
    }
  }

  /**
   * Generate WhatsApp-friendly message with document link
   */
  static generateShareMessage(options: {
    recipientName: string
    letterType: 'appointment' | 'admission'
    schoolName: string
    documentUrl?: string
  }): string {
    const letterTypeLabel = options.letterType === 'appointment' ? 'Appointment' : 'Admission'

    let message = `Hello ${options.recipientName},\n\n`
    message += `Your ${letterTypeLabel.toLowerCase()} letter from ${options.schoolName} is ready!\n\n`

    if (options.documentUrl) {
      message += `📄 View or download here: ${options.documentUrl}\n\n`
    }

    message += `Please check your email for the complete document.\n\n`
    message += `If you have any questions, contact the school office.\n\n`
    message += `Best regards,\n${options.schoolName} Administration`

    return message
  }

  /**
   * Share letter via WhatsApp with document link
   */
  static async shareLetterViaWhatsApp(options: {
    recipientPhone: string
    recipientName: string
    letterType: 'appointment' | 'admission'
    schoolName: string
    documentUrl?: string
  }): Promise<{ success: boolean; message: string }> {
    try {
      const message = this.generateShareMessage({
        recipientName: options.recipientName,
        letterType: options.letterType,
        schoolName: options.schoolName,
        documentUrl: options.documentUrl,
      })

      return this.shareViaWhatsApp({
        phoneNumber: options.recipientPhone,
        message,
        documentName: `${options.letterType}_letter.html`,
      })
    } catch (error) {
      console.error('WhatsApp letter share error:', error)
      return {
        success: false,
        message: 'Failed to share via WhatsApp',
      }
    }
  }

  /**
   * Generate downloadable HTML file for sharing
   */
  static generateDownloadableHTML(options: {
    letterHTML: string
    letterType: 'appointment' | 'admission'
    recipientName: string
    schoolName: string
  }): Blob {
    // Wrap the letter HTML with additional metadata
    const wrappedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.letterType === 'appointment' ? 'Appointment' : 'Admission'} Letter</title>
    <style>
        @media print {
            body { margin: 0; padding: 0; }
        }
    </style>
</head>
<body>
    ${options.letterHTML}
</body>
</html>
    `.trim()

    return new Blob([wrappedHTML], { type: 'text/html;charset=utf-8' })
  }

  /**
   * Create shareable link for the letter (requires backend support)
   */
  static async createShareableLink(options: {
    letterHTML: string
    letterType: 'appointment' | 'admission'
    recipientId: string
    schoolId: string
  }): Promise<string> {
    try {
      const response = await fetch('/api/letters/create-share-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error('Failed to create share link')
      }

      const data = await response.json()
      return data.shareUrl
    } catch (error) {
      console.error('Error creating shareable link:', error)
      return ''
    }
  }

  /**
   * Copy share link to clipboard
   */
  static copyToClipboard(text: string): { success: boolean; message: string } {
    try {
      navigator.clipboard.writeText(text)
      return {
        success: true,
        message: 'Link copied to clipboard',
      }
    } catch (error) {
      console.error('Clipboard copy error:', error)
      return {
        success: false,
        message: 'Failed to copy link',
      }
    }
  }

  /**
   * Check if WhatsApp Web is available
   */
  static isWhatsAppAvailable(): boolean {
    // WhatsApp Web is available in most modern browsers
    // This is a basic check
    return typeof navigator !== 'undefined'
  }

  /**
   * Get WhatsApp installation status
   */
  static getWhatsAppInstallationInfo(): { mobile: boolean; web: boolean; desktop: boolean } {
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''

    return {
      mobile: /Android|iPhone|iPad|iPod/.test(userAgent),
      web: true, // WhatsApp Web works in all browsers
      desktop: /Windows|Mac|Linux/.test(userAgent),
    }
  }
}
