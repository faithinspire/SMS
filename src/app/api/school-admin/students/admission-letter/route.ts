import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const {
      studentId,
      studentName,
      admissionNumber,
      className,
      schoolName,
      admissionDate,
      parentName,
      tuitionFee,
    } = await request.json()

    if (!studentName || !admissionNumber || !className || !schoolName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate AI-style admission letter
    const letterContent = generateAdmissionLetter({
      studentName,
      admissionNumber,
      className,
      schoolName,
      admissionDate: admissionDate || new Date().toLocaleDateString(),
      parentName: parentName || 'Parent/Guardian',
      tuitionFee: tuitionFee || 'As per fee schedule',
    })

    return NextResponse.json({
      success: true,
      letter: letterContent,
      filename: `Admission_Letter_${studentName.replace(/\s+/g, '_')}_${Date.now()}.html`,
    })
  } catch (error: any) {
    console.error('[API] Admission letter error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateAdmissionLetter(data: {
  studentName: string
  admissionNumber: string
  className: string
  schoolName: string
  admissionDate: string
  parentName: string
  tuitionFee: string
}): string {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #059669; padding-bottom: 20px; }
    .school-name { font-size: 24px; font-weight: bold; color: #059669; }
    .letter-title { font-size: 18px; font-weight: bold; margin: 30px 0 20px 0; }
    .date { margin-bottom: 20px; }
    .greeting { margin-bottom: 20px; }
    .content { margin: 20px 0; text-align: justify; }
    .signature-section { margin-top: 40px; }
    .signature-line { margin-top: 50px; border-top: 1px solid #333; width: 250px; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
    .highlight { color: #059669; font-weight: bold; }
    .info-box { background: #f0fdf4; border-left: 4px solid #059669; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="school-name">${data.schoolName}</div>
      <p style="color: #666; margin: 10px 0 0 0;">Admission Confirmation Letter</p>
    </div>

    <div class="date">
      <strong>Date:</strong> ${today}
    </div>

    <div class="greeting">
      <strong>To:</strong><br>
      <strong>${data.studentName}</strong><br>
      Admission Number: <span class="highlight">${data.admissionNumber}</span>
    </div>

    <div class="letter-title">LETTER OF ADMISSION</div>

    <div class="content">
      <p>Dear <strong>${data.studentName}</strong> and <strong>${data.parentName}</strong>,</p>

      <p>On behalf of <span class="highlight">${data.schoolName}</span>, we are delighted to confirm your admission to our institution. We welcome you to our school community and look forward to your academic journey with us.</p>

      <div class="info-box">
        <strong>Admission Details:</strong><br>
        <strong>Admission Number:</strong> ${data.admissionNumber}<br>
        <strong>Class/Form:</strong> ${data.className}<br>
        <strong>Effective Date:</strong> ${data.admissionDate}
      </div>

      <p><strong>Important Information:</strong></p>
      <ul>
        <li><strong>School Name:</strong> ${data.schoolName}</li>
        <li><strong>Academic Year:</strong> 2024/2025</li>
        <li><strong>Admission Status:</strong> Confirmed</li>
      </ul>

      <p><strong>Financial Obligations:</strong></p>
      <ul>
        <li><strong>Tuition Fee:</strong> ${data.tuitionFee}</li>
        <li>Payment details and schedules will be communicated separately</li>
        <li>Late payment may result in suspension of academic privileges</li>
      </ul>

      <p><strong>Required Documents & Actions:</strong></p>
      <ul>
        <li>Complete school registration form</li>
        <li>Provide original birth certificate or national ID</li>
        <li>Submit recent passport-sized photographs (4 copies)</li>
        <li>Complete health form and submit vaccination records</li>
        <li>Obtain and sign the school code of conduct</li>
        <li>Complete admission fees payment</li>
      </ul>

      <p><strong>School Policies:</strong></p>
      <p>As a student of ${data.schoolName}, you are expected to:</p>
      <ul>
        <li>Maintain high standards of academic performance</li>
        <li>Adhere to the school's code of conduct and discipline policy</li>
        <li>Wear the prescribed school uniform</li>
        <li>Participate in school activities and programs</li>
        <li>Respect the school's facilities and properties</li>
      </ul>

      <p>Should you have any questions or require further clarification, please contact the school administration office. We are here to support your success.</p>

      <p>Congratulations on your admission and welcome to our school family!</p>

      <p>Yours faithfully,</p>
    </div>

    <div class="signature-section">
      <div class="signature-line"></div>
      <p><strong>Principal/School Administrator</strong><br>${data.schoolName}</p>
    </div>

    <div class="footer">
      <p>This is an official document from ${data.schoolName}. Generated on ${today}</p>
    </div>
  </div>
</body>
</html>
  `
}
