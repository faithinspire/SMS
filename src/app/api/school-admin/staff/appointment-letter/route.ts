import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { staffId, staffName, position, schoolName, appointmentDate, salary, duties } = await request.json()

    if (!staffName || !position || !schoolName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Generate AI-style appointment letter
    const letterContent = generateAppointmentLetter({
      staffName,
      position,
      schoolName,
      appointmentDate: appointmentDate || new Date().toLocaleDateString(),
      salary: salary || 'To be discussed',
      duties: duties || 'As per job description',
    })

    return NextResponse.json({
      success: true,
      letter: letterContent,
      filename: `Appointment_Letter_${staffName.replace(/\s+/g, '_')}_${Date.now()}.html`,
    })
  } catch (error: any) {
    console.error('[API] Appointment letter error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function generateAppointmentLetter(data: {
  staffName: string
  position: string
  schoolName: string
  appointmentDate: string
  salary: string
  duties: string
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
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
    .school-name { font-size: 24px; font-weight: bold; color: #1e40af; }
    .letter-title { font-size: 18px; font-weight: bold; margin: 30px 0 20px 0; }
    .date { margin-bottom: 20px; }
    .greeting { margin-bottom: 20px; }
    .content { margin: 20px 0; text-align: justify; }
    .signature-section { margin-top: 40px; }
    .signature-line { margin-top: 50px; border-top: 1px solid #333; width: 250px; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
    .highlight { color: #1e40af; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="school-name">${data.schoolName}</div>
      <p style="color: #666; margin: 10px 0 0 0;">Official Appointment Letter</p>
    </div>

    <div class="date">
      <strong>Date:</strong> ${today}
    </div>

    <div class="greeting">
      <strong>To:</strong><br>
      <strong>${data.staffName}</strong><br>
      Position: <span class="highlight">${data.position}</span>
    </div>

    <div class="letter-title">APPOINTMENT LETTER</div>

    <div class="content">
      <p>Dear <strong>${data.staffName}</strong>,</p>

      <p>We are pleased to offer you employment with <span class="highlight">${data.schoolName}</span> in the position of <span class="highlight">${data.position}</span>. This letter confirms our offer of appointment and outlines the key terms and conditions of your employment.</p>

      <p><strong>Terms of Employment:</strong></p>
      <ul>
        <li><strong>Position:</strong> ${data.position}</li>
        <li><strong>School:</strong> ${data.schoolName}</li>
        <li><strong>Effective Date:</strong> ${data.appointmentDate}</li>
        <li><strong>Employment Type:</strong> Full-time</li>
        <li><strong>Salary/Remuneration:</strong> ${data.salary}</li>
      </ul>

      <p><strong>Primary Responsibilities:</strong></p>
      <p>${data.duties}</p>

      <p><strong>General Terms:</strong></p>
      <ul>
        <li>You will be required to maintain professional conduct and adhere to school policies</li>
        <li>This appointment is subject to satisfactory completion of background checks and references</li>
        <li>The initial appointment period is subject to a probationary review</li>
        <li>You will be required to sign and comply with the school's code of conduct</li>
        <li>All school properties must be returned upon termination of employment</li>
      </ul>

      <p>Please confirm your acceptance of this appointment by signing and returning a copy of this letter within 7 days. If you have any questions regarding this offer, please do not hesitate to contact the administration office.</p>

      <p>We look forward to your contributions to our institution.</p>

      <p>Yours faithfully,</p>
    </div>

    <div class="signature-section">
      <div class="signature-line"></div>
      <p><strong>School Administrator</strong><br>${data.schoolName}</p>
    </div>

    <div class="footer">
      <p>This is an official document from ${data.schoolName}. Generated on ${today}</p>
    </div>
  </div>
</body>
</html>
  `
}
