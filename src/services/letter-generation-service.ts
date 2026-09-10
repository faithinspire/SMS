/**
 * Professional Letter Generation Service
 * Generates appointment/admission letters based on user role and position
 */

import { supabase } from '@/lib/supabase-client'

export class LetterGenerationService {
  /**
   * Generate Appointment Letter for Staff based on their role/position
   */
  static generateStaffAppointmentLetter(staffData: any, schoolData: any): string {
    const {
      full_name,
      email,
      phone,
      role,
      created_at,
    } = staffData

    const { name: schoolName, address, email: schoolEmail } = schoolData

    const startDate = new Date(created_at).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const roleTitles: Record<string, string> = {
      PRINCIPAL: 'Principal',
      HEAD_TEACHER: 'Head Teacher',
      TEACHER: 'Teacher',
      ACCOUNTANT: 'Accountant',
      SCHOOL_ADMIN: 'School Administrator',
      STAFF: 'Staff Member',
      HEAD_OF_DEPARTMENT: 'Head of Department',
    }

    const roleDescriptions: Record<string, string> = {
      PRINCIPAL: `As Principal, you will be responsible for the overall management and strategic direction of ${schoolName}. Your duties include overseeing academic programs, staff supervision, student discipline, and ensuring compliance with educational standards and regulations.`,
      HEAD_TEACHER: `As Head Teacher, you will assist the Principal in managing day-to-day school operations, supervising teachers, coordinating academic activities, and ensuring quality education delivery across all classes.`,
      TEACHER: `As a Teacher, you will be responsible for delivering quality education in your assigned subject(s), assessing student progress, maintaining discipline, and contributing to the overall development of students both academically and morally.`,
      ACCOUNTANT: `As Accountant, you will manage all financial records, budgeting, accounts payable/receivable, staff payroll, and ensure transparent financial reporting in accordance with established accounting standards.`,
      SCHOOL_ADMIN: `As School Administrator, you will manage administrative functions, student records, staff documentation, coordinate with other departments, and ensure efficient school administration.`,
      STAFF: `As a Staff Member, you will perform assigned duties professionally and contribute to the smooth operation of ${schoolName}.`,
      HEAD_OF_DEPARTMENT: `As Head of Department, you will lead your department, coordinate curriculum delivery, supervise departmental staff, and ensure academic excellence in your subject area.`,
    }

    const appointmentLetter = `
═══════════════════════════════════════════════════════════════
                    LETTER OF APPOINTMENT
═══════════════════════════════════════════════════════════════

${schoolName}
${address}
${schoolEmail}

Date: ${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}

TO WHOM IT MAY CONCERN:

Dear ${full_name},

RE: LETTER OF APPOINTMENT - ${roleTitles[role] || role}

We are pleased to inform you that you have been accepted for employment with ${schoolName} in the position of **${roleTitles[role] || role}**, effective from **${startDate}**.

POSITION DETAILS:
────────────────────────────────
Position Title:     ${roleTitles[role] || role}
Appointment Date:   ${startDate}
Institution:        ${schoolName}
Email:              ${email}
Phone:              ${phone}

TERMS OF ENGAGEMENT:
────────────────────────────────
${roleDescriptions[role] || 'You will perform assigned duties professionally and contribute to the institution.'}

RESPONSIBILITIES:
────────────────────────────────
• Execute all tasks assigned to your position with professionalism and integrity
• Maintain high standards of conduct and punctuality
• Comply with all school policies and regulations
• Contribute to creating a positive learning environment
• Participate in professional development and school activities
• Maintain confidentiality of sensitive school information

COMPENSATION AND BENEFITS:
────────────────────────────────
Your compensation package will be discussed and confirmed during your induction period. All employment benefits are subject to government regulations and school policies.

PROBATION PERIOD:
────────────────────────────────
This appointment is subject to a probation period of three (3) months during which both parties may evaluate the suitability of the engagement.

CONDUCT:
────────────────────────────────
As an employee of ${schoolName}, you are expected to:
• Maintain professional behavior at all times
• Dress appropriately as per school guidelines
• Treat students, colleagues, and parents with respect
• Avoid any conduct that could bring the school into disrepute
• Report any concerns through proper channels

Please confirm your acceptance of this appointment by signing and returning a copy of this letter within seven (7) days.

We look forward to your contributions to the success of ${schoolName}.

Yours faithfully,

_____________________________
${schoolName} Management

═══════════════════════════════════════════════════════════════
This is a computer-generated document. Acceptance confirms your understanding of and agreement to all terms outlined herein.
═══════════════════════════════════════════════════════════════
`

    return appointmentLetter
  }

  /**
   * Generate Student Admission Letter with complete details
   */
  static async generateStudentAdmissionLetter(
    studentData: any,
    classData: any,
    schoolData: any,
    codeOfConduct: string = ''
  ): Promise<string> {
    const {
      full_name,
      email,
      phone,
      admission_number,
    } = studentData

    const { name: schoolName, address, email: schoolEmail, phone: schoolPhone } = schoolData

    const admissionDate = new Date().toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Fetch class and class teacher details
    let classTeacherName = 'To be assigned'
    if (classData?.class_teacher_id) {
      const { data: teacher } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', classData.class_teacher_id)
        .single()
      classTeacherName = teacher?.full_name || 'To be assigned'
    }

    // Fetch subjects for the student's class
    let subjectsText = 'As per class curriculum'
    const { data: subjects } = await supabase
      .from('student_subjects')
      .select('subject_id, subjects(name)')
      .eq('student_id', studentData.id)
      .limit(10)

    if (subjects && subjects.length > 0) {
      subjectsText = subjects.map((s: any) => s.subjects?.name || 'Subject').join(', ')
    }

    const admissionLetter = `
═══════════════════════════════════════════════════════════════════════
                      ADMISSION LETTER
═══════════════════════════════════════════════════════════════════════

${schoolName}
${address}
Tel: ${schoolPhone}
Email: ${schoolEmail}

Date: ${admissionDate}

TO WHOM IT MAY CONCERN:

Dear Parents/Guardians,

RE: ADMISSION OF ${full_name.toUpperCase()} - ADMISSION NO. ${admission_number}

Congratulations! We are pleased to inform you that ${full_name} has been provisionally admitted to ${schoolName} for the current academic session.

STUDENT INFORMATION:
────────────────────────────────────────────────────────────
Full Name:              ${full_name}
Admission Number:       ${admission_number}
Email:                  ${email}
Contact:                ${phone}
Class Placement:        ${classData?.name || 'To be determined'}

ACADEMIC DETAILS:
────────────────────────────────────────────────────────────
Class Teacher:          ${classTeacherName}
Subjects Offered:       ${subjectsText}
Academic Year:          ${new Date().getFullYear()}

SCHOOL DETAILS:
────────────────────────────────────────────────────────────
Institution:            ${schoolName}
Location:               ${address}
School Email:           ${schoolEmail}
School Phone:           ${schoolPhone}

ADMISSION REQUIREMENTS:
────────────────────────────────────────────────────────────
1. Completion of medical examination (School clinic will organize)
2. Provision of valid birth certificate and other required documents
3. Payment of school fees as per approved fee schedule
4. Uniform and school supplies as specified by the school
5. Completion of admission form with updated information

ACADEMIC EXPECTATIONS:
────────────────────────────────────────────────────────────
• Regular attendance (minimum 90% required)
• Active participation in classroom activities
• Completion of all assigned work and projects
• Adherence to examination protocols
• Submission of assignments on time

CODE OF CONDUCT:
════════════════════════════════════════════════════════════

${codeOfConduct || `
GENERAL CONDUCT:
• Maintain dignity and respect for all members of the school community
• Wear the prescribed school uniform properly and completely
• Arrive at school on time and attend all classes
• Carry approved books and materials only
• Maintain a clean and healthy environment
• Treat all persons with courtesy and respect
• Avoid using offensive language
• Refrain from all forms of bullying or harassment

ACADEMIC CONDUCT:
• Submit all work as your own (plagiarism is strictly prohibited)
• Attend classes regularly and complete assignments
• Participate actively in learning activities
• Respect intellectual property and academic integrity
• Seek help when needed through proper channels

DISCIPLINE:
• Misconduct may result in sanctions ranging from warnings to suspension
• Serious offenses may result in expulsion
• Parents will be notified of any disciplinary action
• The school reserves the right to enforce discipline impartially

PROHIBITED ITEMS:
• Weapons of any kind
• Drugs and alcohol
• Inappropriate materials
• Electronic devices (unless authorized for learning)
• Items that disrupt school activities
`}

FEES AND PAYMENT:
────────────────────────────────────────────────────────────
Fees must be paid as per the approved fee schedule. Late payment may result in withholding of academic records. Scholarship schemes and payment plans are available for qualified students.

HEALTH AND SAFETY:
────────────────────────────────────────────────────────────
• All students must have medical clearance before admission
• Health emergency contact information must be provided
• Students with medical conditions must inform the school clinic
• Vaccinations must be up-to-date as per health guidelines

REPORTING AND COMMUNICATION:
────────────────────────────────────────────────────────────
• Termly reports will be issued to parents
• Parents can contact school for progress updates
• School activities and events will be communicated regularly
• Parent-teacher meetings are held termly

IMPORTANT DATES:
────────────────────────────────────────────────────────────
• School Resumption:      First working day of term
• School Closure:         As per school calendar
• Parent-Teacher Meeting: Scheduled after each term
• Examinations:           As per academic calendar

PARENT/GUARDIAN RESPONSIBILITIES:
────────────────────────────────────────────────────────────
• Ensure regular school attendance
• Monitor academic progress
• Provide necessary learning materials
• Support discipline and code of conduct
• Pay fees as scheduled
• Communicate promptly with school on important matters
• Create conducive home learning environment

ACCEPTANCE:
────────────────────────────────────────────────────────────
This admission is provisional and is subject to:
✓ Satisfactory completion of medical examination
✓ Verification of all documents submitted
✓ Payment of required fees
✓ Adherence to school policies and code of conduct

Please accept this admission by returning a signed copy within 7 days along with the completed admission form and required documents.

If you have any questions, please do not hesitate to contact our admissions office.

We welcome ${full_name} to ${schoolName} and look forward to partnering with you in the educational development of your child.

Yours faithfully,

_____________________________
Principal / Head of School
${schoolName}

═══════════════════════════════════════════════════════════════════════
This is an official admission document. Keep it safely for future reference.
═══════════════════════════════════════════════════════════════════════
`

    return admissionLetter
  }

  /**
   * Export letter as PDF or Text file
   */
  static downloadLetter(letterContent: string, filename: string) {
    const element = document.createElement('a')
    const file = new Blob([letterContent], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = filename
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  /**
   * Send letter via email
   */
  static async sendLetterViaEmail(recipientEmail: string, letterContent: string, subject: string) {
    // This would integrate with your email service
    console.log(`Sending letter to ${recipientEmail}`)
    return true
  }
}
