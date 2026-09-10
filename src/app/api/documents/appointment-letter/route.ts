import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'


export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const teacherId = searchParams.get('teacherId')
    const isPrincipal = searchParams.get('principal') === '1'

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    // Get user details with school info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(
        `
        id,
        full_name,
        email,
        school_id,
        role
        `
      )
      .eq('id', teacherId)
      .single()

    if (userError || !userData) {
      console.error('User query error:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Validate role
    if (!['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER', 'ACCOUNTANT'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Invalid role for appointment letter' },
        { status: 400 }
      )
    }

    // Get school info
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, address, phone, email, type')
      .eq('id', userData.school_id)
      .single()

    if (schoolError || !schoolData) {
      console.error('School query error:', schoolError)
      return NextResponse.json(
        { error: 'School information not found' },
        { status: 404 }
      )
    }

    // Get staff record if exists (for position and employment date)
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('position, employment_date')
      .eq('user_id', teacherId)
      .eq('school_id', userData.school_id)
      .single()

    let staffPosition = staffData?.position || 'Not specified'
    let employmentDate = staffData?.employment_date || new Date().toISOString().split('T')[0]

    const user = userData as any
    const school = schoolData as any

    let classes: any[] = []
    let subjects: string[] = []
    let letterType = 'Teacher'

    // For teachers, get class assignments
    if (userData.role === 'TEACHER') {
      const { data: assignments, error: assignmentsError } = await supabase
        .from('subject_teacher_assignments')
        .select(
          `
          id,
          subject_id,
          class_arm_combo_id,
          subjects(id, name, code),
          class_arm_combos(
            id,
            class_id,
            arm_id,
            classes(name, level, type),
            arms(name)
          )
          `
        )
        .eq('teacher_id', teacherId)
        .order('class_arm_combos(classes(name))', { ascending: true })

      // Group assignments by class and collect subjects
      const classMap = new Map()
      const subjectSet = new Set()

      ;(assignments || []).forEach((assignment: any) => {
        const classInfo = assignment.class_arm_combos
        const classKey = classInfo.id
        const className = `${classInfo.classes.name} ${classInfo.arms.name}`

        if (!classMap.has(classKey)) {
          classMap.set(classKey, {
            name: className,
            level: classInfo.classes.level,
            subjects: []
          })
        }

        const subject = assignment.subjects
        if (subject) {
          classMap.get(classKey).subjects.push({
            name: subject.name,
            code: subject.code
          })
          subjectSet.add(`${subject.name} (${subject.code})`)
        }
      })

      classes = Array.from(classMap.values())
      subjects = Array.from(subjectSet)
      letterType = 'Teacher'
    } else if (userData.role === 'PRINCIPAL') {
      letterType = 'Principal'
      staffPosition = 'Principal'
    } else if (userData.role === 'ACCOUNTANT') {
      letterType = 'Accountant'
      staffPosition = 'Accountant'
    }

    // Generate appointment letter
    const letterContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          margin: 0;
          padding: 20px;
          line-height: 1.6;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          border: 2px solid #333;
          padding: 40px;
          background-color: #fff;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .school-name {
          font-size: 24px;
          font-weight: bold;
          color: #1a3a3a;
          margin: 0;
        }
        .school-info {
          font-size: 12px;
          color: #666;
          margin: 5px 0;
        }
        .letter-title {
          text-align: center;
          font-size: 18px;
          font-weight: bold;
          margin: 30px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .letter-content {
          margin: 30px 0;
          text-align: justify;
        }
        .recipient-info {
          margin: 30px 0;
          line-height: 1.8;
        }
        .info-item {
          margin: 12px 0;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .info-label {
          font-weight: bold;
          display: inline-block;
          width: 150px;
        }
        .info-value {
          display: inline-block;
        }
        .assignment-table {
          width: 100%;
          margin: 20px 0;
          border-collapse: collapse;
          background-color: #f9f9f9;
        }
        .assignment-table th {
          background-color: #1a3a3a;
          color: white;
          padding: 10px;
          text-align: left;
          font-weight: bold;
          border: 1px solid #333;
        }
        .assignment-table td {
          padding: 8px 10px;
          border: 1px solid #ddd;
        }
        .assignment-table tr:hover {
          background-color: #f0f0f0;
        }
        .subjects-list {
          margin: 20px 0;
          padding: 15px;
          background-color: #f0f8ff;
          border-left: 4px solid #1a3a3a;
          border-radius: 4px;
        }
        .subjects-list ul {
          margin: 10px 0;
          padding-left: 20px;
        }
        .subjects-list li {
          margin: 5px 0;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #333;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .signature-line {
          margin-top: 50px;
          border-top: 1px solid #000;
          width: 200px;
          text-align: center;
          font-size: 12px;
        }
        .date-issued {
          margin-top: 30px;
          font-size: 14px;
        }
        .highlight {
          background-color: #ffffcc;
          padding: 2px 4px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <p class="school-name">${school.name}</p>
          <p class="school-info">${school.address || 'Address'}</p>
          ${school.phone ? `<p class="school-info">Tel: ${school.phone}</p>` : ''}
        </div>

        <!-- Title -->
        <div class="letter-title">
          ðŸ“‹ Letter of Appointment - ${letterType}
        </div>

        <!-- Recipient Info -->
        <div class="recipient-info">
          <div class="info-item">
            <span class="info-label">Name:</span>
            <span class="info-value"><strong>${user.full_name}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-label">Position:</span>
            <span class="info-value">${staffPosition}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email Address:</span>
            <span class="info-value">${user.email}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Employment Date:</span>
            <span class="info-value">${new Date(employmentDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
          </div>
        </div>

        <!-- Letter Content -->
        <div class="letter-content">
          <p>Dear ${user.full_name},</p>

          <p>
            We are delighted to formally offer you a position as <strong>${letterType}</strong> at <strong>${school.name}</strong>. 
            We believe your expertise and dedication will be a valuable addition to our academic community.
          </p>

          ${userData.role === 'TEACHER' ? `
          <p>
            You have been appointed to teach the following classes and subjects for the current academic session:
          </p>

          <!-- Class Assignments Table -->
          <table class="assignment-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Subjects</th>
              </tr>
            </thead>
            <tbody>
              ${classes.map((cls: any) => `
              <tr>
                <td><strong>${cls.name}</strong></td>
                <td>${cls.subjects.map((s: any) => `${s.name} (${s.code})`).join(', ')}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Summary of Subjects -->
          ${subjects.length > 0 ? `
          <div class="subjects-list">
            <strong>Summary of All Subjects You Will Teach:</strong>
            <ul>
              ${subjects.map((s: string) => `<li>${s}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          ` : `
          <p>
            Your role as <strong>${letterType}</strong> is crucial to the success of our institution. 
            You will be responsible for overseeing key operations and contributing to the strategic direction of the school.
          </p>
          `}

          <p>
            As a member of our ${userData.role === 'PRINCIPAL' ? 'leadership' : 'staff'}, you are expected to:
          </p>
          <ul>
            <li>Maintain high standards of professional conduct and excellence</li>
            <li>${userData.role === 'TEACHER' ? 'Prepare lesson plans and deliver engaging, effective instruction' : 'Provide strategic guidance and oversight in your area of responsibility'}</li>
            <li>${userData.role === 'TEACHER' ? 'Assess student progress and provide timely feedback' : 'Ensure compliance with school policies and regulatory requirements'}</li>
            <li>Participate actively in school activities and staff meetings</li>
            <li>Collaborate with colleagues to support our school\'s mission</li>
            <li>Adhere to all school policies, rules, and regulations</li>
            <li>Contribute to creating a positive school environment</li>
          </ul>

          <p>
            This appointment is subject to the terms and conditions outlined in your employment contract and the school's staff handbook. 
            Please ensure that you familiarize yourself with all policies and procedures at your earliest convenience.
          </p>

          <p>
            We look forward to working with you and to your contributions to our school's mission of educational excellence. 
            Should you have any questions or require further information, please contact the school administration.
          </p>

          <p>Welcome to our team!</p>

          <p>Yours in education,</p>
        </div>

        <!-- Signature -->
        <div>
          <div class="signature-line">Principal</div>
          <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
            This document was generated on ${new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p style="margin: 5px 0;">
            Â© ${new Date().getFullYear()} ${school.name}. All rights reserved.
          </p>
          <p style="margin: 5px 0;">
            This is an electronically generated letter and is valid without a signature.
          </p>
        </div>
      </div>
    </body>
    </html>
    `

    // Return HTML for display/printing
    return NextResponse.json(
      {
        success: true,
        letterHtml: letterContent,
        personName: user.full_name,
        schoolName: school.name,
        position: staffPosition,
        letterType: letterType,
        classes: classes,
        subjects: subjects,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Appointment letter error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate appointment letter' },
      { status: 500 }
    )
  }
}

// Generate PDF version (optional)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { teacherId, principal } = body

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    // Get appointment letter HTML first
    const queryParams = new URLSearchParams({
      teacherId,
      ...(principal && { principal: '1' })
    })
    const getReq = new NextRequest(
      new URL(`/api/documents/appointment-letter?${queryParams}`, req.url)
    )
    const getResponse = await GET(getReq)
    const letterData = await getResponse.json()

    if (!letterData.success) {
      return NextResponse.json(letterData, { status: 404 })
    }

    // For PDF generation, you would use a library like 'puppeteer' or 'html2pdf'
    // This is a simplified response returning the HTML
    return NextResponse.json(
      {
        success: true,
        message: 'Appointment letter generated successfully',
        letterHtml: letterData.letterHtml,
        personName: letterData.personName,
        position: letterData.position,
        letterType: letterData.letterType,
        classes: letterData.classes,
        subjects: letterData.subjects,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}

