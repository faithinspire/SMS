'use client'

interface WhatsAppShareData {
  phoneNumber: string
  message: string
  letterContent?: string
}

interface EmailShareData {
  emailAddress: string
  subject: string
  letterContent: string
  recipientName: string
  schoolName: string
}

class SharingService {
  /**
   * Share letter via WhatsApp
   * Opens WhatsApp App on mobile, or WhatsApp Web on desktop
   * Mobile detection ensures direct app opening via whatsapp:// protocol
   */
  static shareViaWhatsApp(data: WhatsAppShareData): void {
    try {
      // Format phone number: ensure it starts with country code (e.g., +234 for Nigeria)
      let phoneNumber = data.phoneNumber.replace(/\D/g, '') // Remove non-digits
      
      if (!phoneNumber.startsWith('234')) {
        if (phoneNumber.startsWith('0')) {
          phoneNumber = '234' + phoneNumber.substring(1)
        } else if (phoneNumber.length === 10) {
          phoneNumber = '234' + phoneNumber
        }
      }

      // Prepare message
      let message = data.message || 'Hello! I have attached your letter.'
      
      if (data.letterContent) {
        message += `\n\n${data.letterContent.substring(0, 200)}...`
      }

      // Detect if user is on mobile
      const isMobile = this.detectMobileDevice()

      let whatsappUrl: string

      if (isMobile) {
        // Use native WhatsApp app protocol for mobile phones
        // Format: whatsapp://send?phone=PHONE_NUMBER&text=MESSAGE
        const encodedMessage = encodeURIComponent(message)
        whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`
      } else {
        // Use WhatsApp Web for desktop
        // Format: https://wa.me/PHONE_NUMBER?text=MESSAGE
        const encodedMessage = encodeURIComponent(message)
        whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`
      }

      // Open WhatsApp
      window.open(whatsappUrl, '_blank')
    } catch (err) {
      console.error('Error sharing via WhatsApp:', err)
      throw new Error('Failed to share via WhatsApp. Please ensure the phone number is valid.')
    }
  }

  /**
   * Detect if device is mobile
   * Checks user agent for mobile/tablet indicators
   */
  private static detectMobileDevice(): boolean {
    if (typeof window === 'undefined') return false

    const userAgent = navigator.userAgent.toLowerCase()
    
    // Check common mobile and tablet indicators
    const mobileIndicators = [
      /android/i,
      /webos/i,
      /iphone/i,
      /ipad/i,
      /ipod/i,
      /blackberry/i,
      /windows phone/i,
      /opera mini/i,
      /mobile/i,
      /tablet/i,
    ]

    return mobileIndicators.some(indicator => indicator.test(userAgent))
  }

  /**
   * Share letter via Email
   * Opens email client or uses backend email service
   */
  static async shareViaEmail(data: EmailShareData): Promise<boolean> {
    try {
      // Try to send via backend API first
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: data.emailAddress,
          subject: data.subject,
          letterContent: data.letterContent,
          recipientName: data.recipientName,
          schoolName: data.schoolName,
        }),
      })

      if (response.ok) {
        return true
      }

      // Fallback: open email client
      return this.openEmailClient(data)
    } catch (err) {
      console.error('Error sharing via email:', err)
      // Fallback to opening email client
      return this.openEmailClient(data)
    }
  }

  /**
   * Open default email client with pre-filled information
   */
  private static openEmailClient(data: EmailShareData): boolean {
    try {
      const mailtoLink = `mailto:${data.emailAddress}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent(
        this.formatEmailBody(data)
      )}`

      window.location.href = mailtoLink
      return true
    } catch (err) {
      console.error('Error opening email client:', err)
      return false
    }
  }

  /**
   * Format email body
   */
  private static formatEmailBody(data: EmailShareData): string {
    return `
Dear ${data.recipientName},

Please find below your letter from ${data.schoolName}:

---

${data.letterContent}

---

Best regards,
${data.schoolName}
    `.trim()
  }

  /**
   * Get WhatsApp business API endpoint (if configured)
   * This would be used for programmatic WhatsApp sending
   */
  static async sendWhatsAppViaAPI(
    phoneNumber: string,
    message: string,
    letterContent?: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          message,
          letterContent,
        }),
      })

      return response.ok
    } catch (err) {
      console.error('Error sending WhatsApp via API:', err)
      return false
    }
  }

  /**
   * Get email sending status
   */
  static async getEmailStatus(messageId: string): Promise<any> {
    try {
      const response = await fetch(`/api/email-status/${messageId}`)
      return await response.json()
    } catch (err) {
      console.error('Error getting email status:', err)
      return null
    }
  }

  /**
   * Validate phone number
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Nigerian phone number validation
    const cleaned = phoneNumber.replace(/\D/g, '')
    return cleaned.length >= 10 && cleaned.length <= 13
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Format phone number to standard format
   */
  static formatPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '')

    if (cleaned.startsWith('234')) {
      return '+' + cleaned
    }

    if (cleaned.startsWith('0')) {
      return '+234' + cleaned.substring(1)
    }

    if (cleaned.length === 10) {
      return '+234' + cleaned
    }

    return '+' + cleaned
  }

  /**
   * Create shareable link for letter (if using a link-based system)
   */
  static generateShareLink(letterId: string, baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || ''): string {
    return `${baseUrl}/letter/${letterId}`
  }

  /**
   * Share via social media (X/Twitter, LinkedIn, etc.)
   */
  static shareViaTwitter(message: string): void {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`
    window.open(tweetUrl, '_blank')
  }

  static shareViaLinkedIn(message: string): void {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(message)}`
    window.open(linkedInUrl, '_blank')
  }

  /**
   * Copy share link to clipboard
   */
  static async copyShareLink(link: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(link)
      return true
    } catch (err) {
      console.error('Error copying link:', err)
      return false
    }
  }

  /**
   * Generate QR code for share link (would require a QR code library)
   */
  static generateQRCode(link: string): string {
    // This would integrate with a QR code library like qrcode.react
    // For now, return a placeholder
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`
  }
}

export { SharingService }
