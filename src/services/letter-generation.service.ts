/**
 * Professional Letter Generation Service
 * Generates appointment letters and admission letters with real school branding and data
 */

import { createClient } from '@/lib/supabase-client'

interface StaffData {
  id: string
  full_name: string
  email: string
  position: string
  department?: string
  salary?: number
  salaryFrequency?: string
  bankName?: string
  accountNumber?: string
  accountName?: string
  role?: string
  employment_date?: string
  qualification?: string
}

interface StudentData {
  id: string
  full_name: string
  admission_number: string
  email?: string
  className?: string
  session?: string
  term?: string
  subjects?: any[]
  date_of_birth?: string
  parent_name?: string
}

interface SchoolData {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  logo_url?: string
  type?: string
}

export class LetterGenerationService {
  private static supabase = createClient()

  /**
   * Fetch complete staff data with all relationships from Supabase
   */
  static async fetchStaffData(staffId: string, schoolId: string): Promise<StaffData | null> {
    try {
      const { data, error } = await this.supabase
        .from('staff')
        .select(`
          id,
          user_id,
          position,
          department,
          employment_date,
          salary,
          bank_name,
          account_number,
          account_name,
          users:user_id (
            id,
            full_name,
            email,
            phone,
            gender
          )
        `)
        .eq('id', staffId)
        .eq('school_id', schoolId)
        .single()

      if (error) throw error

      return {
        id: data.id,
        full_name: data.users?.full_name || '',
        email: data.users?.email || '',
        phone: data.users?.phone || '',
        position: data.position,
        department: data.department,
        employment_date: data.employment_date,
        salary: data.salary,
        bank_name: data.bank_name,
        account_number: data.account_number,
        account_name: data.account_name,
      }
    } catch (error) {
      console.error('Error fetching staff data:', error)
      return null
    }
  }

  /**
   * Fetch complete student data with guardians from Supabase
   */
  static async fetchStudentData(
    studentId: string,
    schoolId: string
  ): Promise<{
    student: any
    guardians: any[]
    class?: any
  } | null> {
    try {
      // ✅ HOTFIX 2026-10-02: Do NOT select 'status' column (not yet in schema)
      // Migration 163 will add this column
      const { data: student, error: studentError } = await this.supabase
        .from('students')
        .select(`
          id,
          admission_number,
          date_of_birth,
          user_id,
          class_arm_combo_id
        `)
        .eq('id', studentId)
        .eq('school_id', schoolId)
        .single()

      if (studentError) throw studentError

      // Step 2: Fetch user data separately
      let userData = null
      if (student.user_id) {
        const { data: user } = await this.supabase
          .from('users')
          .select('id, full_name, email, phone, gender')
          .eq('id', student.user_id)
          .single()
        userData = user
      }

      // Step 3: Fetch class/arm data
      let classData = null
      if (student.class_arm_combo_id) {
        const { data: classArm } = await this.supabase
          .from('class_arm_combos')
          .select(`
            id,
            class_id,
            arm_id,
            classes (id, name, level),
            arms (id, name)
          `)
          .eq('id', student.class_arm_combo_id)
          .single()
        classData = classArm
      }

      // Step 4: Fetch guardians
      const { data: guardians, error: guardiansError } = await this.supabase
        .from('guardians')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)

      if (guardiansError) throw guardiansError

      return {
        student: {
          ...student,
          user: userData,
        },
        guardians: guardians || [],
        class: classData,
      }
    } catch (error) {
      console.error('Error fetching student data:', error)
      return null
    }
  }

  /**
   * Fetch school data for letter header
   */
  static async fetchSchoolData(schoolId: string): Promise<SchoolData | null> {
    try {
      const { data, error } = await this.supabase
        .from('schools')
        .select('id, name, email, phone, address, logo_url, school_type')
        .eq('id', schoolId)
        .single()

      if (error) throw error

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        logo_url: data.logo_url,
        type: data.school_type,
      }
    } catch (error) {
      console.error('Error fetching school data:', error)
      return null
    }
  }

  /**
   * Generate a professional appointment letter for a staff member
   */
  static async generateAppointmentLetter(staffData: StaffData, schoolData: SchoolData): Promise<string> {
    const today = new Date()
    const formattedDate = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const letterDate = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    const letterContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Letter</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #003366; padding-bottom: 20px; }
        .logo-section { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 15px; }
        .school-logo { width: 80px; height: 80px; object-fit: contain; }
        .school-info h1 { color: #003366; font-size: 24px; font-weight: bold; margin: 0; }
        .school-info p { color: #666; margin: 5px 0; font-size: 12px; }
        .letter-date { text-align: right; margin-bottom: 30px; font-size: 14px; }
        .recipient { margin-bottom: 30px; }
        .recipient p { margin: 5px 0; }
        .recipient .name { font-weight: bold; }
        .content { margin: 30px 0; text-align: justify; }
        .content p { margin: 15px 0; }
        .details-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .details-table td { padding: 10px; border-bottom: 1px solid #ddd; }
        .details-table .label { font-weight: bold; width: 40%; background-color: #f5f5f5; }
        .signature-section { margin-top: 40px; }
        .signature-line { margin-top: 50px; border-top: 1px solid #333; padding-top: 5px; width: 200px; }
        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print { body { background: white; } .container { padding: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header with School Info -->
        <div class="header">
            <div class="logo-section">
                ${schoolData.logo_url ? `<img src="${schoolData.logo_url}" alt="School Logo" class="school-logo" />` : ''}
                <div class="school-info">
                    <h1>${schoolData.name}</h1>
                    ${schoolData.address ? `<p>${schoolData.address}</p>` : ''}
                    ${schoolData.phone ? `<p>Tel: ${schoolData.phone}</p>` : ''}
                    ${schoolData.email ? `<p>Email: ${schoolData.email}</p>` : ''}
                </div>
            </div>
        </div>

        <!-- Letter Date -->
        <div class="letter-date">
            <strong>${formattedDate}</strong>
        </div>

        <!-- Recipient -->
        <div class="recipient">
            <p class="name">${staffData.full_name}</p>
            <p>${staffData.email}</p>
        </div>

        <!-- Salutation -->
        <div class="content">
            <p>Dear ${staffData.full_name.split(' ')[0]},</p>

            <!-- Letter Body -->
            <p style="margin-top: 20px;">
                We are pleased to formally offer you a position of <strong>${staffData.position || 'Staff Member'}</strong> in our esteemed institution, <strong>${schoolData.name}</strong>. This letter serves as your official appointment notification.
            </p>

            <!-- Employment Details Table -->
            <table class="details-table">
                <tr>
                    <td class="label">Position:</td>
                    <td>${staffData.position || 'Not specified'}</td>
                </tr>
                <tr>
                    <td class="label">Role:</td>
                    <td>${staffData.role || 'Not specified'}</td>
                </tr>
                ${staffData.department ? `
                <tr>
                    <td class="label">Department:</td>
                    <td>${staffData.department}</td>
                </tr>
                ` : ''}
                ${staffData.employment_date ? `
                <tr>
                    <td class="label">Date of Commencement:</td>
                    <td>${new Date(staffData.employment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                ` : ''}
                ${staffData.salary ? `
                <tr>
                    <td class="label">Salary:</td>
                    <td>₦${(staffData.salary).toLocaleString('en-US', { maximumFractionDigits: 2 })} (${staffData.salaryFrequency || 'Monthly'})</td>
                </tr>
                ` : ''}
                ${staffData.salaryFrequency && !staffData.salary ? `
                <tr>
                    <td class="label">Salary Frequency:</td>
                    <td>${staffData.salaryFrequency}</td>
                </tr>
                ` : ''}
                ${staffData.qualification ? `
                <tr>
                    <td class="label">Qualification:</td>
                    <td>${staffData.qualification}</td>
                </tr>
                ` : ''}
            </table>

            ${staffData.bankName || staffData.accountNumber ? `
            <!-- Bank Details Section -->
            <p style="margin-top: 20px; font-weight: bold;">Bank Details:</p>
            <table class="details-table">
                ${staffData.bankName ? `
                <tr>
                    <td class="label">Bank Name:</td>
                    <td>${staffData.bankName}</td>
                </tr>
                ` : ''}
                ${staffData.accountName ? `
                <tr>
                    <td class="label">Account Name:</td>
                    <td>${staffData.accountName}</td>
                </tr>
                ` : ''}
                ${staffData.accountNumber ? `
                <tr>
                    <td class="label">Account Number:</td>
                    <td>${staffData.accountNumber}</td>
                </tr>
                ` : ''}
            </table>
            ` : ''}

            <!-- Terms and Conditions -->
            <p style="margin-top: 20px;">
                Your appointment is subject to the following terms and conditions:
            </p>
            <ul style="margin-left: 20px;">
                <li>Satisfactory completion of all pre-employment requirements and background checks</li>
                <li>Compliance with the school's policies and procedures</li>
                <li>Professional conduct and adherence to ethical standards</li>
                <li>Willingness to participate in staff development and training programs</li>
                <li>Availability for the required working hours and school activities</li>
            </ul>

            <!-- Closing -->
            <p style="margin-top: 20px;">
                We are confident that you will be a valuable addition to our team and contribute significantly to the academic excellence and growth of our institution. Should you have any questions or require clarification on any matter, please do not hesitate to contact our Human Resources department.
            </p>

            <p style="margin-top: 15px;">
                We look forward to welcoming you aboard.
            </p>

            <!-- Closing Salutation -->
            <p style="margin-top: 20px;">
                Yours faithfully,
            </p>

            <!-- Signature Area -->
            <div class="signature-section">
                <div class="signature-line"></div>
                <p style="margin-top: 5px; font-weight: bold;">
                    ${schoolData.name}<br />
                    School Principal/Head
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>This letter has been generated electronically and is valid without a physical signature.<br />
            Appointment Letter - ${schoolData.name} - Date: ${formattedDate}</p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return letterContent
  }

  /**
   * Generate a professional admission letter for a student
   */
  static async generateAdmissionLetter(
    studentData: any,
    schoolData: SchoolData,
    classInfo?: any
  ): Promise<string> {
    const today = new Date()
    const formattedDate = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const letterContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admission Letter</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #003366; padding-bottom: 20px; }
        .logo-section { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 15px; }
        .school-logo { width: 80px; height: 80px; object-fit: contain; }
        .school-info h1 { color: #003366; font-size: 24px; font-weight: bold; margin: 0; }
        .school-info p { color: #666; margin: 5px 0; font-size: 12px; }
        .letter-date { text-align: right; margin-bottom: 30px; font-size: 14px; }
        .recipient { margin-bottom: 30px; }
        .recipient p { margin: 5px 0; }
        .recipient .name { font-weight: bold; }
        .content { margin: 30px 0; text-align: justify; }
        .content p { margin: 15px 0; }
        .details-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .details-table td { padding: 10px; border-bottom: 1px solid #ddd; }
        .details-table .label { font-weight: bold; width: 40%; background-color: #f5f5f5; }
        .signature-section { margin-top: 40px; }
        .signature-line { margin-top: 50px; border-top: 1px solid #333; padding-top: 5px; width: 200px; }
        .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #ddd; padding-top: 20px; }
        @media print { body { background: white; } .container { padding: 0; } }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header with School Info -->
        <div class="header">
            <div class="logo-section">
                ${schoolData.logo_url ? `<img src="${schoolData.logo_url}" alt="School Logo" class="school-logo" />` : ''}
                <div class="school-info">
                    <h1>${schoolData.name}</h1>
                    ${schoolData.address ? `<p>${schoolData.address}</p>` : ''}
                    ${schoolData.phone ? `<p>Tel: ${schoolData.phone}</p>` : ''}
                    ${schoolData.email ? `<p>Email: ${schoolData.email}</p>` : ''}
                </div>
            </div>
        </div>

        <!-- Letter Date -->
        <div class="letter-date">
            <strong>${formattedDate}</strong>
        </div>

        <!-- Recipient (Parent/Guardian) -->
        <div class="recipient">
            <p>To: The Parent/Guardian</p>
            <p class="name">${studentData.parent_name || 'Parent/Guardian'}</p>
        </div>

        <!-- Salutation -->
        <div class="content">
            <p>Dear Sir/Madam,</p>

            <!-- Letter Body -->
            <p style="margin-top: 20px;">
                We are delighted to inform you that <strong>${studentData.full_name}</strong> has been successfully admitted to <strong>${schoolData.name}</strong> for the ${studentData.session || 'current'} academic session.
            </p>

            <p>
                This letter confirms the acceptance of your ward for admission into the school. We are confident that your child will benefit immensely from our high-quality educational programs and supportive learning environment.
            </p>

            <!-- Admission Details Table -->
            <table class="details-table">
                <tr>
                    <td class="label">Student Name:</td>
                    <td>${studentData.full_name}</td>
                </tr>
                <tr>
                    <td class="label">Admission Number:</td>
                    <td>${studentData.admission_number || 'TBD'}</td>
                </tr>
                ${studentData.className ? `
                <tr>
                    <td class="label">Class Assigned:</td>
                    <td>${studentData.className}</td>
                </tr>
                ` : ''}
                ${studentData.session ? `
                <tr>
                    <td class="label">Academic Session:</td>
                    <td>${studentData.session}</td>
                </tr>
                ` : ''}
                ${studentData.term ? `
                <tr>
                    <td class="label">Term:</td>
                    <td>${studentData.term}</td>
                </tr>
                ` : ''}
                ${studentData.subjects && studentData.subjects.length > 0 ? `
                <tr>
                    <td class="label">Enrolled Subjects:</td>
                    <td>${studentData.subjects.map(s => s.name || s).join(', ')}</td>
                </tr>
                ` : ''}
                ${studentData.date_of_birth ? `
                <tr>
                    <td class="label">Date of Birth:</td>
                    <td>${new Date(studentData.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                ` : ''}
            </table>

            ${studentData.subjects && studentData.subjects.length > 0 ? `
            <!-- Subjects Section -->
            <p style="margin-top: 20px; font-weight: bold;">Assigned Subjects:</p>
            <ul style="margin-left: 20px; margin-top: 10px;">
                ${studentData.subjects.map(s => `<li>${s.name || s}</li>`).join('')}
            </ul>
            ` : ''}

            <!-- Next Steps -->
            <p style="margin-top: 20px;">
                <strong>Next Steps:</strong>
            </p>
            <ul style="margin-left: 20px;">
                <li>Complete all admission formalities by the specified deadline</li>
                <li>Pay the required school fees as per the fee structure</li>
                <li>Provide all necessary documents (birth certificate, immunization records, etc.)</li>
                <li>Attend the orientation program scheduled for new students</li>
                <li>Obtain school uniform and materials as per the requirements list</li>
            </ul>

            <!-- Important Information -->
            <p style="margin-top: 20px;">
                <strong>School Information:</strong>
            </p>
            <p>
                ${schoolData.name} is committed to providing an excellent education that develops the academic, social, and personal growth of every student. We maintain high standards of discipline, professionalism, and ethical conduct.
            </p>

            <!-- Closing -->
            <p style="margin-top: 20px;">
                Should you have any questions or require additional information, please do not hesitate to contact our admissions office.
            </p>

            <p style="margin-top: 15px;">
                We look forward to welcoming ${studentData.full_name} to our school community.
            </p>

            <!-- Closing Salutation -->
            <p style="margin-top: 20px;">
                Yours faithfully,
            </p>

            <!-- Signature Area -->
            <div class="signature-section">
                <div class="signature-line"></div>
                <p style="margin-top: 5px; font-weight: bold;">
                    ${schoolData.name}<br />
                    Principal/Head of School
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>This letter has been generated electronically and is valid without a physical signature.<br />
            Admission Letter - ${schoolData.name} - Date: ${formattedDate}</p>
        </div>
    </div>
</body>
</html>
    `.trim()

    return letterContent
  }

  /**
   * Convert HTML letter to PDF (client-side using html2pdf library)
   */
  static async downloadLetterAsPDF(htmlContent: string, filename: string): Promise<void> {
    // This requires html2pdf library to be installed
    // For now, we'll provide the HTML as is
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.html`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  /**
   * Open letter in a new window for preview and printing
   */
  static async previewLetter(htmlContent: string): Promise<void> {
    const newWindow = window.open()
    if (newWindow) {
      newWindow.document.write(htmlContent)
      newWindow.document.close()
    }
  }

  /**
   * Share letter via email
   */
  static async shareViaEmail(studentEmail: string, studentName: string, letterHTML: string): Promise<void> {
    const subject = `Admission Letter - ${studentName}`
    const body = encodeURIComponent(`Dear Parent/Guardian,\n\nPlease find attached the admission letter for ${studentName}.\n\nBest regards,\nSchool Admin`)
    window.location.href = `mailto:${studentEmail}?subject=${subject}&body=${body}`
  }

  /**
   * Share letter via WhatsApp
   */
  static async shareViaWhatsApp(phoneNumber: string, studentName: string): Promise<void> {
    const message = encodeURIComponent(`Hello! Here is the admission letter for ${studentName}. Please check your email for the complete document.`)
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank')
  }

  /**
   * Download letter as HTML file
   */
  static async downloadLetter(htmlContent: string, filename: string): Promise<void> {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }
}
