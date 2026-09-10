import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    // Step 1: Get student details
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, admission_number, class_arm_combo_id, school_id, user_id')
      .eq('id', studentId)
      .single()

    if (studentError || !studentData) {
      console.error('Student query error:', studentError)
      return NextResponse.json(
        { error: 'Student not found', details: studentError?.message },
        { status: 404 }
      )
    }

    // Step 2: Get user details separately
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name, email')
      .eq('id', studentData.user_id)
      .single()

    if (userError || !userData) {
      console.error('User query error:', userError)
      return NextResponse.json(
        { error: 'User information not found' },
        { status: 404 }
      )
    }

    // Step 3: Get class_arm_combo details
    const { data: classComboData, error: classComboError } = await supabase
      .from('class_arm_combos')
      .select('id, class_id, arm_id, school_id')
      .eq('id', studentData.class_arm_combo_id)
      .single()

    if (classComboError || !classComboData) {
      console.error('Class combo query error:', classComboError)
      return NextResponse.json(
        { error: 'Class information not found' },
        { status: 404 }
      )
    }

    // Step 4: Get class details
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name, level, type')
      .eq('id', classComboData.class_id)
      .single()

    if (classError || !classData) {
      console.error('Class query error:', classError)
      return NextResponse.json(
        { error: 'Class information not found' },
        { status: 404 }
      )
    }

    // Step 5: Get arm details
    const { data: armData, error: armError } = await supabase
      .from('arms')
      .select('id, name')
      .eq('id', classComboData.arm_id)
      .single()

    if (armError || !armData) {
      console.error('Arm query error:', armError)
      return NextResponse.json(
        { error: 'Class arm information not found' },
        { status: 404 }
      )
    }

    // Combine data into a single object
    const student = {
      ...studentData,
      users: userData,
      class_arm_combos: {
        ...classComboData,
        classes: classData,
        arms: armData,
      },
    } as any

    // Get school info separately
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, address, phone, email, type')
      .eq('id', studentData.school_id)
      .single()

    if (schoolError || !schoolData) {
      console.error('School query error:', schoolError)
      return NextResponse.json(
        { error: 'School information not found' },
        { status: 404 }
      )
    }

    const school = schoolData as any
    const { data: studentSubjects, error: subjectsError } = await supabase
      .from('student_subjects')
      .select(
        `
        id,
        subject_id,
        subjects(id, name, code)
        `
      )
      .eq('student_id', studentId)
      .order('subjects(name)', { ascending: true })

    const subjects = (studentSubjects || []).map((ss: any) => ({
      name: ss.subjects?.name || 'Unknown',
      code: ss.subjects?.code || ''
    }))
    const classInfo = student.class_arm_combos
    const className = `${classInfo.classes.name} ${classInfo.arms.name}`
    const user = student.users

    // Generate admission letter
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
          📜 Letter of Admission
        </div>

        <!-- Recipient Info -->
        <div class="recipient-info">
          <div class="info-item">
            <span class="info-label">Student Name:</span>
            <span class="info-value">${user.full_name}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Admission Number:</span>
            <span class="info-value">${student.admission_number}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email Address:</span>
            <span class="info-value">${user.email}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Class Assigned:</span>
            <span class="info-value"><span class="highlight">${className}</span></span>
          </div>
          ${subjects.length > 0 ? `
          <div class="info-item">
            <span class="info-label">Subjects Enrolled:</span>
            <span class="info-value">
              ${subjects.map((s: any) => `<strong>${s.name}</strong> (${s.code})`).join(' • ')}
            </span>
          </div>
          ` : ''}
        </div>

        <!-- Letter Content -->
        <div class="letter-content">
          <p>Dear ${user.full_name},</p>

          <p>
            Congratulations! We are pleased to inform you that you have been selected for admission to 
            <strong>${school.name}</strong>. We are delighted to welcome you to our academic community.
          </p>

          <p>
            You have been <span class="highlight">admitted to ${className}</span> for the current academic session. 
            This class placement is based on your performance, aptitude, and the school's assessment procedures.
          </p>

          ${subjects.length > 0 ? `
          <p>
            Your subjects for this session are:
            <br><br>
            ${subjects.map((s: any, i: number) => `${i + 1}. ${s.name} (${s.code})`).join('<br>')}
          </p>
          ` : ''}

          <p>
            We trust that you will make the most of the excellent educational opportunities available at our school. 
            Our dedicated faculty and staff are committed to fostering academic excellence, character development, and 
            holistic growth.
          </p>

          <p>
            Please note that this admission is subject to the terms and conditions outlined in the school's admission policy. 
            You are expected to abide by all school rules and regulations and to maintain high standards of conduct and academic 
            performance throughout your stay with us.
          </p>

          <p>
            Should you have any questions or require further information, please do not hesitate to contact the school administration.
          </p>

          <p>Welcome to our school family!</p>

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

    // Return HTML for display/printing
    return NextResponse.json(
      {
        success: true,
        letterHtml: letterContent,
        studentName: user.full_name,
        admissionNumber: student.admission_number,
        className: className,
        schoolName: school.name,
        subjects: subjects,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Admission letter error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate admission letter' },
      { status: 500 }
    )
  }
}

// Generate PDF version (optional)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { studentId } = body

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    // Get admission letter HTML first
    const getReq = new NextRequest(
      new URL(`/api/documents/admission-letter?studentId=${studentId}`, req.url)
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
        message: 'Admission letter generated successfully',
        letterHtml: letterData.letterHtml,
        studentName: letterData.studentName,
        admissionNumber: letterData.admissionNumber,
        className: letterData.className,
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
