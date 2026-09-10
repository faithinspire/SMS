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
  schoolLogoUrl?: string
}

// Enhanced employment letter with full position details
export interface EnhancedEmploymentLetterData extends EmploymentLetterData {
  jobDescription?: string
  qualifications?: string
  reportingManager?: string
  benefits?: string[]
  contractDuration?: string
  workingHours?: string
  leavePolicy?: string
  schoolMotto?: string
}

export interface AdmissionLetterData {
  studentName: string
  studentId: string
  admissionNumber: string
  schoolName: string
  className: string
  department?: string
  startDate: string
  schoolLogoUrl?: string
}

// Enhanced admission letter with full student and school details
export interface EnhancedAdmissionLetterData extends AdmissionLetterData {
  classTeacherName?: string
  classTeacherEmail?: string
  codeOfConductUrl?: string
  codeOfConductText?: string
  registrationDeadline?: string
  orientationDate?: string
  schoolCode?: string
  stream?: string
  guardianNames?: string[]
  schoolMotto?: string
  schoolVision?: string
  schoolMission?: string
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
   * Generate an employment letter for a teacher (standard version)
   */
  static generateEmploymentLetter(data: EmploymentLetterData | EnhancedEmploymentLetterData): string {
    const enhanced = data as EnhancedEmploymentLetterData
    
    const letterContent = `
EMPLOYMENT LETTER

Date: ${new Date().toLocaleDateString('en-GB')}

To: ${data.teacherName}

Dear ${data.teacherName},

RE: LETTER OF EMPLOYMENT - ${data.position.toUpperCase()}

We are pleased to inform you that you have been offered employment with ${data.schoolName} in the position of ${data.position}.

${enhanced.schoolMotto ? `${enhanced.schoolMotto}\n` : ''}

EMPLOYMENT TERMS & CONDITIONS:

1. Position: ${data.position}
${enhanced.jobDescription ? `2. Role Description: ${enhanced.jobDescription}\n` : ''}${enhanced.jobDescription ? '3. ' : '2. '}School: ${data.schoolName}
${enhanced.jobDescription ? '4. ' : '3. '}Start Date: ${new Date(data.startDate).toLocaleDateString('en-GB')}
${enhanced.jobDescription ? '5. ' : '4. '}Monthly Remuneration: ₦${this.formatCurrency(data.salary)}
${enhanced.jobDescription ? '6. ' : '5. '}Duration: ${enhanced.contractDuration || 'Renewable annually subject to satisfactory performance'}
${enhanced.workingHours ? `7. Working Hours: ${enhanced.workingHours}\n` : ''}${enhanced.reportingManager ? `8. Reporting Manager: ${enhanced.reportingManager}\n` : ''}

${enhanced.qualifications ? `REQUIRED QUALIFICATIONS:
${enhanced.qualifications}

` : ''}RESPONSIBILITIES:
- Execute assigned ${data.position.toLowerCase()} duties with utmost professionalism
- Maintain comprehensive lesson records and documentation
- Participate actively in school activities and programs
- Adhere to school policies, regulations and code of conduct
- Maintain confidentiality of school and student matters
- Support the school's vision and mission
${enhanced.jobDescription ? `- ${enhanced.jobDescription.split('\n').join('\n- ')}\n` : ''}

TERMS OF EMPLOYMENT:
- This is a renewable annual contract
- Performance shall be reviewed at the end of each academic session
- Absence without permission for more than 3 days may result in automatic termination
- All duties must be performed in accordance with Nigerian education standards
- Compliance with school rules and regulations is mandatory
- Professional conduct and ethical behavior are expected at all times

LEAVE AND ALLOWANCES:
${enhanced.leavePolicy ? enhanced.leavePolicy : `- Annual leave: 21 working days
- Public holidays: As declared by the Federal Government
- Health insurance benefits (as applicable)
- Professional development opportunities`}

${enhanced.benefits ? `
ADDITIONAL BENEFITS:
${enhanced.benefits.map(benefit => `- ${benefit}`).join('\n')}

` : ''}Your prompt confirmation of acceptance of this offer is required by return of mail.

This letter is to confirm the commencement of your employment with our institution.

We welcome you to our team and look forward to a productive and collaborative working relationship.

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
   * Generate an admission letter for a student (enhanced version with full details)
   */
  static generateAdmissionLetter(data: AdmissionLetterData | EnhancedAdmissionLetterData): string {
    const enhanced = data as EnhancedAdmissionLetterData
    
    const letterContent = `
ADMISSION LETTER

Date: ${new Date().toLocaleDateString('en-GB')}

To: ${data.studentName}

CONGRATULATIONS ON YOUR ADMISSION!

Dear ${data.studentName},

We are delighted to inform you that you have been successfully admitted to ${data.schoolName} for the ${new Date().getFullYear()}/${new Date().getFullYear() + 1} academic session.

${enhanced.schoolMotto ? `SCHOOL MOTTO: "${enhanced.schoolMotto}"\n` : ''}
${enhanced.schoolVision ? `SCHOOL VISION: ${enhanced.schoolVision}\n` : ''}
${enhanced.schoolMission ? `SCHOOL MISSION: ${enhanced.schoolMission}\n` : ''}

ADMISSION DETAILS:

1. Student Name: ${data.studentName}
2. Admission Number: ${data.admissionNumber}
${enhanced.schoolCode ? `3. School Code: ${enhanced.schoolCode}\n` : ''}3. School: ${data.schoolName}
4. Class/Level: ${data.className}
${data.department ? `5. Department: ${data.department}\n` : ''}${enhanced.classTeacherName ? `5. Class Teacher: ${enhanced.classTeacherName}${enhanced.classTeacherEmail ? ` (${enhanced.classTeacherEmail})` : ''}\n` : ''}${data.department ? '6. ' : enhanced.classTeacherName ? '6. ' : '5. '}Session Start Date: ${new Date(data.startDate).toLocaleDateString('en-GB')}
${enhanced.registrationDeadline ? `7. Registration Deadline: ${enhanced.registrationDeadline}\n` : ''}${enhanced.orientationDate ? `8. Orientation Programme: ${enhanced.orientationDate}\n` : ''}

IMPORTANT INFORMATION:

1. REGISTRATION
   - All students must report on or before the school opening date
   - Late registration may incur an additional fee
   - Complete all registration requirements within the first week
   - Bring this admission letter to school on the opening day

2. SCHOOL FEES
   - Fees are due within the first two weeks of resumption
   - Payment should be made through authorized channels only
   - Failure to pay may result in denial of examination privileges
   - Fees structure: Contact the school office for detailed breakdown

3. SCHOOL UNIFORM & MATERIALS
   - Complete school uniform is compulsory from day one
   - Obtain required textbooks and materials from the approved vendor only
   - All items must be clearly labeled with the student's name and admission number
   - PE kit and house uniform required for all students

4. CONDUCT & DISCIPLINE
   - Students are expected to maintain the highest standards of conduct
   - Adherence to school rules is mandatory for all students
   - Academic integrity is essential; any form of cheating is prohibited
   ${enhanced.codeOfConductUrl || enhanced.codeOfConductText ? `- School Code of Conduct: Please review carefully before resumption\n` : ''}

${enhanced.codeOfConductText ? `SCHOOL CODE OF CONDUCT HIGHLIGHTS:
${enhanced.codeOfConductText}

` : ''}5. ATTENDANCE
   - Regular attendance is compulsory (minimum 80% attendance required)
   - Absence requires a written explanation from parents/guardians
   - Poor attendance may affect academic progress and promotion
   - Medical excuses must be submitted within 3 days of return

6. HEALTH & SAFETY
   - Medical examinations may be required at the beginning of the session
   - All immunizations should be up-to-date
   - Report any health issues to the school medical unit immediately
   - Keep emergency contact numbers updated with the school

7. ACADEMIC EXCELLENCE
   - Students are encouraged to maintain high academic standards
   - Participate actively in co-curricular activities
   - Seek assistance from your class teacher when facing academic challenges
   ${enhanced.classTeacherName ? `- Your class teacher ${enhanced.classTeacherName} is here to support your learning\n` : ''}

8. EXAMINATION & ASSESSMENT
   - All students must sit for termly and final examinations
   - Practical assessment is a requirement for science and technical subjects
   - Report cards are issued at the end of each term
   - Poor performance may require remedial classes or parent conference

ORIENTATION PROGRAMME
An orientation programme will be held for all new students to familiarize you with the school environment, facilities, staff, and expectations. This is a crucial introduction to our school community.
${enhanced.orientationDate ? `Scheduled Date: ${enhanced.orientationDate}` : 'Date to be announced at registration'}

PARENT/GUARDIAN SUPPORT
We encourage close collaboration between home and school. Regular communication through parent-teacher meetings, school reports, and WhatsApp updates ensures optimal student development. ${enhanced.guardianNames ? `Please ensure that ${enhanced.guardianNames.join(' and ')} sign and return the parent consent form at registration.` : 'Parent consent forms must be completed at registration.'}

ADDITIONAL NOTES
- This letter should be retained by the student and produced on the school opening date
- Admission is conditional upon satisfactory conduct and academic performance
- Students are expected to abide by all school policies and regulations
- In case of any misconduct, disciplinary actions will be taken
${enhanced.codeOfConductUrl ? `- Full Code of Conduct available at: ${enhanced.codeOfConductUrl}` : ''}

Should you require any further information, please do not hesitate to contact the school office.

We look forward to welcoming you to ${data.schoolName}. We are committed to your academic success and personal development.

Yours Faithfully,

_________________________
SCHOOL PRINCIPAL
${data.schoolName}

Admission No: ${data.admissionNumber}
Date: ${new Date().toLocaleDateString('en-GB')}

---
NOTE: This letter should be retained by the student and must be produced on the school opening date.
Parent/Guardian Signature: _________________ Date: __________
    `.trim()

    return letterContent
  }

  /**
   * Generate HTML version of employment letter with school logo
   */
  static generateEmploymentLetterHTML(data: EmploymentLetterData | EnhancedEmploymentLetterData): string {
    const letterContent = this.generateEmploymentLetter(data)
    return this.convertToHTML(letterContent, data.schoolLogoUrl)
  }

  /**
   * Generate HTML version of admission letter with school logo
   */
  static generateAdmissionLetterHTML(data: AdmissionLetterData | EnhancedAdmissionLetterData): string {
    const letterContent = this.generateAdmissionLetter(data)
    return this.convertToHTML(letterContent, data.schoolLogoUrl)
  }

  /**
   * Convert plain text letter to HTML with school logo support
   */
  private static convertToHTML(text: string, schoolLogoUrl?: string): string {
    const lines = text.split('\n')
    let html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 900px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; background: white;">
    
    <!-- School Logo Header -->
    ${schoolLogoUrl ? `
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
      <img src="${schoolLogoUrl}" alt="School Logo" style="max-height: 80px; max-width: 150px; object-fit: contain;" />
    </div>
    ` : ''}
    
    <div style="margin-top: 20px;">`

    for (const line of lines) {
      if (line.trim() === '') {
        html += '<br />'
      } else if (line.match(/^[A-Z]+[\s\w&]+[!:.]?$/)) {
        // Heading
        html += `<h3 style="margin-top: 20px; margin-bottom: 10px; font-weight: bold; color: #333;">${this.escapeHtml(line)}</h3>`
      } else if (line.match(/^\d+\./)) {
        // Numbered list
        html += `<p style="margin-left: 20px; margin-top: 5px; margin-bottom: 5px;">${this.escapeHtml(line)}</p>`
      } else if (line.match(/^_+$/)) {
        // Signature line
        html += '<div style="margin-top: 30px; height: 50px; border-top: 1px solid #333; margin-bottom: 5px;"></div>'
      } else {
        html += `<p style="margin-top: 8px; margin-bottom: 8px;">${this.escapeHtml(line)}</p>`
      }
    }

    html += '</div></div>'
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
