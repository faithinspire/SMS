import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 }
      )
    }

    // Get student details
    const { data: studentData, error: studentError } = await supabase
      .from('users')
      .select(
        `
        id,
        full_name,
        email,
        school_id,
        phone
        `
      )
      .eq('id', studentId)
      .eq('role', 'STUDENT')
      .single()

    if (studentError || !studentData) {
      console.error('Student query error:', studentError)
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      )
    }

    // Get student registration details
    const { data: registrationData, error: registrationError } = await supabase
      .from('students')
      .select(
        `
        id,
        admission_number,
        registration_date,
        class_arm_combo_id,
        class_arm_combos(
          id,
          class_id,
          arm_id,
          classes(name, level, type),
          arms(name)
        )
        `
      )
      .eq('user_id', studentId)
      .single()

    if (registrationError || !registrationData) {
      console.error('Registration query error:', registrationError)
      return NextResponse.json(
        { success: false, error: 'Student registration not found' },
        { status: 404 }
      )
    }

    // Get school info
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, address, phone, email, type')
      .eq('id', studentData.school_id)
      .single()

    if (schoolError || !schoolData) {
      console.error('School query error:', schoolError)
      return NextResponse.json(
        { success: false, error: 'School information not found' },
        { status: 404 }
      )
    }

    const student = studentData as any
    const school = schoolData as any
    const registration = registrationData as any
    const classInfo = registration.class_arm_combos as any

    const admissionNumber = registration.admission_number || 'TBD'
    const registrationDate = registration.registration_date
      ? new Date(registration.registration_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      : new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

    const className = classInfo
      ? `${classInfo.classes.name} ${classInfo.arms.name}`
      : 'Not assigned'

    // Generate admission letter HTML
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
        .admission-details {
          margin: 20px 0;
          padding: 15px;
          background-color: #f0f8ff;
          border-left: 4px solid #1a3a3a;
          border-radius: 4px;
        }
        .admission-details strong {
          display: block;
          margin-bottom: 10px;
        }
        .detail-row {
          margin: 8px 0;
          padding: 5px 0;
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
          ${school.email ? `<p class="school-info">Email: ${school.email}</p>` : ''}
        </div>

        <!-- Title -->
        <div class="letter-title">
          📜 Letter of Admission
        </div>

        <!-- Recipient Info -->
        <div class="recipient-info">
          <div class="info-item">
            <span class="info-label">Student Name:</span>
            <span class="info-value"><strong>${student.full_name}</strong></span>
          </div>
          <div class="info-item">
            <span class="info-label">Email Address:</span>
            <span class="info-value">${student.email || 'Not provided'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Phone Number:</span>
            <span class="info-value">${student.phone || 'Not provided'}</span>
          </div>
        </div>

        <!-- Admission Details -->
        <div class="admission-details">
          <strong>Admission Information</strong>
          <div class="detail-row">
            <span class="info-label">Admission Number:</span>
            <span class="info-value"><strong>${admissionNumber}</strong></span>
          </div>
          <div class="detail-row">
            <span class="info-label">Class/Arm Assignment:</span>
            <span class="info-value">${className}</span>
          </div>
          <div class="detail-row">
            <span class="info-label">Registration Date:</span>
            <span class="info-value">${registrationDate}</span>
          </div>
          <div class="detail-row">
            <span class="info-label">Academic Session:</span>
            <span class="info-value">2024/2025</span>
          </div>
        </div>

        <!-- Letter Content -->
        <div class="letter-content">
          <p>Dear ${student.full_name},</p>

          <p>
            On behalf of the entire management and staff of <strong>${school.name}</strong>, 
            we are pleased to welcome you to our school community. Congratulations on your admission!
          </p>

          <p>
            Your admission number is <span class="highlight">${admissionNumber}</span>. 
            Please keep this number safe as it will be used for all official school transactions and identification purposes.
          </p>

          <p>
            You have been admitted to study in <strong>${className}</strong> for the 2024/2025 academic session. 
            Your class assignment is based on your academic performance and school placement procedures.
          </p>

          <p>
            As a student of our institution, you are expected to:
          </p>
          <ul>
            <li>Maintain high standards of academic excellence and integrity</li>
            <li>Adhere strictly to the school rules and regulations</li>
            <li>Respect the rights and dignity of all members of the school community</li>
            <li>Participate actively in both academic and co-curricular activities</li>
            <li>Maintain proper conduct both within and outside the school premises</li>
            <li>Pay all required fees and levies on time</li>
            <li>Ensure regular attendance and punctuality</li>
            <li>Contribute positively to creating a conducive learning environment</li>
          </ul>

          <p>
            Please note the following important dates and information:
          </p>
          <ul>
            <li><strong>School Opening Date:</strong> Check the school website for the official resumption date</li>
            <li><strong>Reporting Time:</strong> Students should arrive at school by 7:00 AM daily</li>
            <li><strong>School Hours:</strong> Normal school hours are from 8:00 AM to 3:00 PM</li>
            <li><strong>Fees Payment:</strong> All fees must be paid through the school's designated channels</li>
          </ul>

          <p>
            A comprehensive school handbook containing detailed information about our policies, 
            curriculum, facilities, and expectations will be provided to you upon resumption. 
            Please familiarize yourself with all policies and regulations as outlined in the handbook.
          </p>

          <p>
            Should you have any questions or require further information about your admission, 
            please do not hesitate to contact the school office during working hours.
          </p>

          <p>
            We wish you a successful academic year ahead and look forward to your positive contributions 
            to the school community.
          </p>

          <p>Yours in education,</p>
        </div>

        <!-- Signature -->
        <div>
          <div class="signature-line">Principal/Director</div>
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
            © ${new Date().getFullYear()} ${school.name}. All rights reserved.
          </p>
          <p style="margin: 5px 0;">
            This is an electronically generated letter and is valid without a signature.
          </p>
        </div>
      </div>
    </body>
    </html>
    `

    // Return JSON with letter HTML
    return NextResponse.json(
      {
        success: true,
        letterHtml: letterContent,
        studentName: student.full_name,
        admissionNumber: admissionNumber,
        className: className,
        schoolName: school.name,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Admission letter error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate admission letter' },
      { status: 500 }
    )
  }
}

// POST for PDF generation (future enhancement)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { studentId } = body

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 }
      )
    }

    // Get admission letter HTML first
    const queryParams = new URLSearchParams({ studentId })
    const getReq = new NextRequest(
      new URL(`/api/documents/admission-letter?${queryParams}`, req.url)
    )
    const getResponse = await GET(getReq)
    const letterData = await getResponse.json()

    if (!letterData.success) {
      return NextResponse.json(letterData, { status: 404 })
    }

    // Return the HTML - actual PDF generation can be done client-side or with a service
    return NextResponse.json(
      {
        success: true,
        message: 'Admission letter generated successfully',
        letterHtml: letterData.letterHtml,
        studentName: letterData.studentName,
        admissionNumber: letterData.admissionNumber,
        className: letterData.className,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Letter generation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate letter' },
      { status: 500 }
    )
  }
}
