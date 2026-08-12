'use client'

import { supabase } from '@/lib/supabase-client'

export interface EmploymentLetterData {
  teacherName: string
  teacherId: string
  schoolName: string
  position: string
  salary: number
  startDate: string
  employmentTerms?: string
}

export interface AdmissionLetterData {
  studentName: string
  studentId: string
  admissionNumber: string
  schoolName: string
  className: string
  department?: string
  startDate: string
}

interface GeneratedLetter {
  id: string
  type: 'EMPLOYMENT' | 'ADMISSION'
  recipientId: string
  recipientEmail: string
  recipientName: string
  content: string
  html: string
  createdAt: string
  schoolId: string
}

class LetterGenerationService {
  /**
   * Generate an employment letter for a teacher
   */
  static generateEmploymentLetter(data: EmploymentLetterData): string {
    const letterContent = `
EMPLOYMENT LETTER

Date: ${new Date().toLocaleDateString('en-GB')}

To: ${data.teacherName}

Dear ${data.teacherName},

RE: LETTER OF EMPLOYMENT

We are pleased to inform you that you have been offered employment with ${data.schoolName} in the position of ${data.position}.

EMPLOYMENT TERMS & CONDITIONS:

1. Position: ${data.position}
2. School: ${data.schoolName}
3. Start Date: ${new Date(data.startDate).toLocaleDateString('en-GB')}
4. Monthly Remuneration: ₦${this.formatCurrency(data.salary)}
5. Duration: Renewable annually subject to satisfactory performance

RESPONSIBILITIES:
- Execute assigned teaching duties with utmost professionalism
- Maintain comprehensive lesson records
- Participate in school activities and programs
- Adhere to school policies and regulations
- Maintain confidentiality of school matters
- Support the school's vision and mission

TERMS OF EMPLOYMENT:
- This is a renewable annual contract
- Performance shall be reviewed at the end of each academic session
- Absence without permission for more than 3 days may result in automatic termination
- All duties must be performed in accordance with Nigerian education standards
- Compliance with school rules and regulations is mandatory

LEAVE AND ALLOWANCES:
- Annual leave: 21 working days
- Public holidays: As declared by the Federal Government
- Health insurance benefits (as applicable)
- Professional development opportunities

Your prompt confirmation of acceptance of this offer is required by return of mail.

This letter is to confirm the commencement of your employment with our institution.

We welcome you to our team and look forward to a productive working relationship.

Yours Faithfully,

_________________________
SCHOOL PRINCIPAL
${data.schoolName}

Ref: ${data.teacherId}
Date: ${new Date().toLocaleDateString('en-GB')}
    `.trim()

    return letterContent
  }

  /**
   * Generate an admission letter for a student
   */
  static generateAdmissionLetter(data: AdmissionLetterData): string {
    const letterContent = `
ADMISSION LETTER

Date: ${new Date().toLocaleDateString('en-GB')}

To: ${data.studentName}

CONGRATULATIONS ON YOUR ADMISSION!

Dear ${data.studentName},

We are delighted to inform you that you have been successfully admitted to ${data.schoolName} for the ${new Date().getFullYear()}/${new Date().getFullYear() + 1} academic session.

ADMISSION DETAILS:

1. Student Name: ${data.studentName}
2. Admission Number: ${data.admissionNumber}
3. School: ${data.schoolName}
4. Class/Level: ${data.className}
${data.department ? `5. Department: ${data.department}\n` : ''}${data.department ? '6. ' : '5. '}Session Start Date: ${new Date(data.startDate).toLocaleDateString('en-GB')}

IMPORTANT INFORMATION:

1. REGISTRATION
   - All students must report on or before the school opening date
   - Late registration may incur an additional fee
   - Complete all registration requirements within the first week

2. SCHOOL FEES
   - Fees are due within the first two weeks of resumption
   - Payment should be made through authorized channels
   - Failure to pay may result in denial of examination privileges

3. SCHOOL UNIFORM & MATERIALS
   - Complete school uniform is compulsory
   - Obtain required textbooks and materials from the approved vendor
   - All items must be clearly labeled with the student's name

4. CONDUCT & DISCIPLINE
   - Students are expected to maintain the highest standards of conduct
   - Adherence to school rules is mandatory
   - Academic integrity is essential; any form of cheating is prohibited

5. ATTENDANCE
   - Regular attendance is compulsory
   - Absence requires a written explanation from parents/guardians
   - Poor attendance may affect academic progress and promotion

6. HEALTH & SAFETY
   - Medical examinations may be required at the beginning of the session
   - All immunizations should be up-to-date
   - Report any health issues to the school medical unit immediately

7. ACADEMIC EXCELLENCE
   - Students are encouraged to maintain high academic standards
   - Participate actively in co-curricular activities
   - Seek assistance from teachers when facing academic challenges

ORIENTATION PROGRAMME
An orientation programme will be held for all new students to familiarize you with the school environment, staff, and facilities.

PARENT/GUARDIAN SUPPORT
We encourage close collaboration between home and school. Regular communication through parent-teacher meetings and school reports ensures optimal student development.

Should you require any further information, please do not hesitate to contact the school office.

We look forward to welcoming you to ${data.schoolName}.

Yours Faithfully,

_________________________
SCHOOL PRINCIPAL
${data.schoolName}

Admission No: ${data.admissionNumber}
Date: ${new Date().toLocaleDateString('en-GB')}

NOTE: This letter should be retained by the student and produced on the school opening date.
    `.trim()

    return letterContent
  }

  /**
   * Generate HTML version of employment letter
   */
  static generateEmploymentLetterHTML(data: EmploymentLetterData): string {
    const letterContent = this.generateEmploymentLetter(data)
    return this.convertToHTML(letterContent)
  }

  /**
   * Generate HTML version of admission letter
   */
  static generateAdmissionLetterHTML(data: AdmissionLetterData): string {
    const letterContent = this.generateAdmissionLetter(data)
    return this.convertToHTML(letterContent)
  }

  /**
   * Convert plain text letter to HTML
   */
  private static convertToHTML(text: string): string {
    const lines = text.split('\n')
    let html = '<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 20px auto;">'

    for (const line of lines) {
      if (line.trim() === '') {
        html += '<br />'
      } else if (line.match(/^[A-Z]+[\s\w&]+[!:.]?$/)) {
        // Heading
        html += `<h3 style="margin-top: 20px; margin-bottom: 10px; font-weight: bold;">${this.escapeHtml(line)}</h3>`
      } else if (line.match(/^\d+\./)) {
        // Numbered list
        html += `<p style="margin-left: 20px;">${this.escapeHtml(line)}</p>`
      } else if (line.match(/^_+$/)) {
        // Signature line
        html += '<div style="margin-top: 30px; height: 50px;"></div>'
      } else {
        html += `<p>${this.escapeHtml(line)}</p>`
      }
    }

    html += '</div>'
    return html
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return text.replace(/[&<>"']/g, (char) => map[char])
  }

  /**
   * Format currency
   */
  private static formatCurrency(amount: number): string {
    return amount.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })
  }

  /**
   * Save generated letter to database
   */
  static async saveGeneratedLetter(
    letter: Omit<GeneratedLetter, 'id' | 'createdAt'> & { createdAt?: string }
  ): Promise<GeneratedLetter | null> {
    try {
      const { data, error } = await supabase
        .from('generated_letters')
        .insert({
          ...letter,
          created_at: new Date().toISOString(),
        })
        .select()

      if (error) throw error
      return data?.[0] || null
    } catch (err) {
      console.error('Error saving letter:', err)
      return null
    }
  }

  /**
   * Get generated letters for a school
   */
  static async getSchoolLetters(schoolId: string): Promise<GeneratedLetter[]> {
    try {
      const { data, error } = await supabase
        .from('generated_letters')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching letters:', err)
      return []
    }
  }

  /**
   * Get letters for a specific recipient
   */
  static async getRecipientLetters(recipientId: string): Promise<GeneratedLetter[]> {
    try {
      const { data, error } = await supabase
        .from('generated_letters')
        .select('*')
        .eq('recipient_id', recipientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching recipient letters:', err)
      return []
    }
  }

  /**
   * Download letter as text file
   */
  static downloadLetter(letterContent: string, fileName: string) {
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(letterContent))
    element.setAttribute('download', fileName)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  /**
   * Copy letter to clipboard
   */
  static async copyToClipboard(letterContent: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(letterContent)
      return true
    } catch (err) {
      console.error('Error copying to clipboard:', err)
      return false
    }
  }

  /**
   * Print letter
   */
  static printLetter(letterContent: string) {
    const printWindow = window.open('', '', 'height=600,width=800')
    if (printWindow) {
      printWindow.document.write('<pre style="font-family: Arial; padding: 20px;">')
      printWindow.document.write(this.escapeHtml(letterContent))
      printWindow.document.write('</pre>')
      printWindow.document.close()
      printWindow.print()
    }
  }
}

export { LetterGenerationService }
