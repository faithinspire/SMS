import { supabase } from '@/lib/supabase-client'

export interface ResultShare {
  id: string
  schoolId: string
  studentId: string
  sharedBy: string // teacher/staff who shared
  sharedTo: string // parent phone/email
  sharedVia: 'WHATSAPP' | 'EMAIL'
  sharedAt: string
  resultSnapshot?: any
}

export interface ParentContact {
  name: string
  phone?: string
  email?: string
  relationship: string
}

export class ResultSharingService {
  /**
   * Get guardians/parents for a student
   */
  static async getParentContacts(studentId: string): Promise<ParentContact[]> {
    try {
      const { data, error } = await supabase
        .from('guardians')
        .select('full_name, phone, email, relationship')
        .eq('student_id', studentId)

      if (error) throw error
      return (data || []).map((g: any) => ({
        name: g.full_name,
        phone: g.phone,
        email: g.email,
        relationship: g.relationship,
      }))
    } catch (error) {
      console.error('Get parent contacts error:', error)
      return []
    }
  }

  /**
   * Share result via WhatsApp
   */
  static async shareViaWhatsApp(
    studentId: string,
    schoolId: string,
    sharedBy: string,
    parentPhone: string,
    resultData: any
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Format result data into a readable message
      const message = this.formatResultMessage(resultData)

      // Log the share action
      const { error: logError } = await supabase.from('result_shares').insert({
        school_id: schoolId,
        student_id: studentId,
        shared_by: sharedBy,
        shared_to: parentPhone,
        shared_via: 'WHATSAPP',
        result_snapshot: resultData,
        shared_at: new Date().toISOString(),
      })

      if (logError) throw logError

      // TODO: Integrate with Twilio WhatsApp API
      // This is a placeholder for the actual WhatsApp integration
      console.log(`📱 WhatsApp message to ${parentPhone}:`, message)

      return {
        success: true,
        message: `✅ Result shared via WhatsApp to ${parentPhone}`,
      }
    } catch (error: any) {
      console.error('WhatsApp share error:', error)
      return {
        success: false,
        message: `❌ Failed to share via WhatsApp: ${error.message}`,
      }
    }
  }

  /**
   * Share result via Email
   */
  static async shareViaEmail(
    studentId: string,
    schoolId: string,
    sharedBy: string,
    parentEmail: string,
    resultData: any,
    schoolName: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Log the share action
      const { error: logError } = await supabase.from('result_shares').insert({
        school_id: schoolId,
        student_id: studentId,
        shared_by: sharedBy,
        shared_to: parentEmail,
        shared_via: 'EMAIL',
        result_snapshot: resultData,
        shared_at: new Date().toISOString(),
      })

      if (logError) throw logError

      // TODO: Integrate with SendGrid or Postmark
      // This is a placeholder for actual email integration
      const emailContent = this.generateEmailHTML(resultData, schoolName)
      console.log(`📧 Email to ${parentEmail}:`, emailContent)

      return {
        success: true,
        message: `✅ Result shared via Email to ${parentEmail}`,
      }
    } catch (error: any) {
      console.error('Email share error:', error)
      return {
        success: false,
        message: `❌ Failed to share via Email: ${error.message}`,
      }
    }
  }

  /**
   * Format result data into WhatsApp message
   */
  private static formatResultMessage(resultData: any): string {
    const { studentName, admissionNumber, classDetails, scores } = resultData

    let message = `📊 *RESULT NOTIFICATION*\n\n`
    message += `🎓 Student: ${studentName}\n`
    message += `📚 Admission No: ${admissionNumber}\n`
    message += `🏫 Class: ${classDetails.className}\n`
    message += `📅 Generated: ${new Date().toLocaleDateString()}\n\n`
    message += `*SUBJECT SCORES*\n`
    message += `━━━━━━━━━━━━━━━━━\n`

    Object.entries(scores).forEach(([subject, data]: [string, any]) => {
      message += `${subject}\n`
      message += `  Test: ${data.test1 || 0} + ${data.test2 || 0} + ${data.test3 || 0} + ${data.test4 || 0}\n`
      message += `  Exam: ${data.exam || 0}\n`
      message += `  Total: ${data.total} | Grade: ${data.grade || 'N/A'}\n\n`
    })

    message += `For more details, visit your school portal.`
    return message
  }

  /**
   * Generate email HTML template
   */
  private static generateEmailHTML(resultData: any, schoolName: string): string {
    const { studentName, admissionNumber, classDetails, scores } = resultData

    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #667eea, #764ba2); color: white; padding: 20px; border-radius: 8px; }
            .student-info { margin: 20px 0; }
            .student-info h2 { color: #667eea; }
            .score-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .score-table th { background: #667eea; color: white; padding: 10px; text-align: left; }
            .score-table td { border: 1px solid #ddd; padding: 10px; }
            .score-table tr:nth-child(even) { background: #f9f9f9; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Result Notification</h1>
              <p>School: ${schoolName}</p>
            </div>
            
            <div class="student-info">
              <h2>${studentName}</h2>
              <p><strong>Admission Number:</strong> ${admissionNumber}</p>
              <p><strong>Class:</strong> ${classDetails.className}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <table class="score-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Test 1</th>
                  <th>Test 2</th>
                  <th>Test 3</th>
                  <th>Test 4</th>
                  <th>Exam</th>
                  <th>Total</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
    `

    Object.entries(scores).forEach(([subject, data]: [string, any]) => {
      html += `
                <tr>
                  <td><strong>${subject}</strong></td>
                  <td>${data.test1 || '-'}</td>
                  <td>${data.test2 || '-'}</td>
                  <td>${data.test3 || '-'}</td>
                  <td>${data.test4 || '-'}</td>
                  <td>${data.exam || '-'}</td>
                  <td><strong>${data.total}</strong></td>
                  <td><strong>${data.grade || 'N/A'}</strong></td>
                </tr>
      `
    })

    html += `
              </tbody>
            </table>

            <div class="footer">
              <p>This is an automated message from ${schoolName}. Please do not reply to this email.</p>
              <p>For enquiries, contact the school administration.</p>
            </div>
          </div>
        </body>
      </html>
    `

    return html
  }

  /**
   * Get share history for a student
   */
  static async getShareHistory(studentId: string): Promise<ResultShare[]> {
    try {
      const { data, error } = await supabase
        .from('result_shares')
        .select('*')
        .eq('student_id', studentId)
        .order('shared_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Get share history error:', error)
      return []
    }
  }
}
