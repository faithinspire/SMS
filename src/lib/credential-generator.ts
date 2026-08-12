/**
 * Credential Generator
 * 
 * Generates and formats login credentials for sharing via WhatsApp/Email
 * Used for School Admin, Staff, and Student credential generation
 */

interface CredentialTemplate {
  type: 'admin' | 'staff' | 'student'
  schoolName: string
  loginUrl: string
  name: string
  email?: string
  pin?: string
  tempPassword?: string
  notes?: string
}

/**
 * Generate formatted credential text for WhatsApp sharing
 */
export function generateWhatsAppCredential(cred: CredentialTemplate): string {
  const timestamp = new Date().toLocaleString()
  
  if (cred.type === 'student') {
    return `👋 Hello ${cred.name}!

Your School Management System Login Credentials:

🏫 School: ${cred.schoolName}
🔐 Login PIN: ${cred.pin}

📱 How to Login:
1. Go to: ${cred.loginUrl}
2. Select School: ${cred.schoolName}
3. Click "PIN Login"
4. Enter your PIN: ${cred.pin}
5. Click "Log In"

⚠️ IMPORTANT:
- Keep your PIN confidential
- Do not share with anyone
- Contact your school if you forget your PIN

Generated: ${timestamp}

For Support: Contact your School Admin`
  }

  if (cred.type === 'staff') {
    return `👋 Hello ${cred.name}!

Your School Management System Login Credentials:

🏫 School: ${cred.schoolName}
📧 Email: ${cred.email}
🔐 Temporary Password: ${cred.tempPassword}

📱 How to Login:
1. Go to: ${cred.loginUrl}
2. Select School: ${cred.schoolName}
3. Click "Email Login"
4. Enter Email: ${cred.email}
5. Enter Password: ${cred.tempPassword}
6. Click "Sign In"

⚠️ IMPORTANT:
1. Change your password after first login
2. Keep your credentials confidential
3. Log out after each session

Generated: ${timestamp}

For Support: Contact your School Admin`
  }

  if (cred.type === 'admin') {
    return `👋 Hello ${cred.name}!

🎉 Welcome to School Management System!

🏫 School: ${cred.schoolName}
📧 Email: ${cred.email}
🔐 Temporary Password: ${cred.tempPassword}

📱 How to Login:
1. Go to: ${cred.loginUrl}
2. Select School: ${cred.schoolName}
3. Click "Email Login"
4. Enter Email: ${cred.email}
5. Enter Password: ${cred.tempPassword}
6. Click "Sign In"

✅ You can now:
- Manage Students
- Manage Staff
- Create Classes & Subjects
- View Dashboards
- Generate Reports

⚠️ IMPORTANT:
1. ⚡ Change your password immediately after first login!
2. 🔒 Keep your credentials confidential
3. 📋 Share this message securely
4. 🚪 Log out after each session

Generated: ${timestamp}

For Setup Guide: See onboarding documentation`
  }

  return ''
}

/**
 * Generate formatted credential text for Email
 */
export function generateEmailCredential(cred: CredentialTemplate): string {
  const timestamp = new Date().toLocaleString()
  
  if (cred.type === 'student') {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px; }
    .header { background: #1e40af; color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .content { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .credential-box { background: #f0f9ff; padding: 15px; border-left: 4px solid #1e40af; margin: 10px 0; }
    .label { font-weight: bold; color: #1e40af; }
    .value { font-family: monospace; background: #fff; padding: 8px; border-radius: 4px; margin-top: 5px; }
    .note { background: #fef3c7; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 13px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>School Management System</h1>
      <p>Student Login Credentials</p>
    </div>
    
    <div class="content">
      <p>Hello <strong>${cred.name}</strong>,</p>
      
      <p>Your login credentials for <strong>${cred.schoolName}</strong> have been created.</p>
      
      <div class="credential-box">
        <div class="label">🏫 School:</div>
        <div class="value">${cred.schoolName}</div>
      </div>
      
      <div class="credential-box">
        <div class="label">🔐 Your PIN:</div>
        <div class="value">${cred.pin}</div>
      </div>
      
      <h3>How to Login:</h3>
      <ol>
        <li>Go to: <strong>${cred.loginUrl}</strong></li>
        <li>Select School: <strong>${cred.schoolName}</strong></li>
        <li>Click <strong>"PIN Login"</strong></li>
        <li>Enter your PIN: <strong>${cred.pin}</strong></li>
        <li>Click <strong>"Log In"</strong></li>
      </ol>
      
      <div class="note">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>Keep your PIN confidential</li>
          <li>Do not share with anyone</li>
          <li>Contact your school if you forget your PIN</li>
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p>Generated: ${timestamp}</p>
      <p>For support, contact your School Admin</p>
    </div>
  </div>
</body>
</html>`
  }

  if (cred.type === 'staff') {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px; }
    .header { background: #059669; color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .content { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .credential-box { background: #f0fdf4; padding: 15px; border-left: 4px solid #059669; margin: 10px 0; }
    .label { font-weight: bold; color: #059669; }
    .value { font-family: monospace; background: #fff; padding: 8px; border-radius: 4px; margin-top: 5px; }
    .note { background: #fef3c7; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 13px; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>School Management System</h1>
      <p>Staff Login Credentials</p>
    </div>
    
    <div class="content">
      <p>Hello <strong>${cred.name}</strong>,</p>
      
      <p>Your login credentials for <strong>${cred.schoolName}</strong> have been created.</p>
      
      <div class="credential-box">
        <div class="label">🏫 School:</div>
        <div class="value">${cred.schoolName}</div>
      </div>
      
      <div class="credential-box">
        <div class="label">📧 Email:</div>
        <div class="value">${cred.email}</div>
      </div>
      
      <div class="credential-box">
        <div class="label">🔐 Temporary Password:</div>
        <div class="value">${cred.tempPassword}</div>
      </div>
      
      <h3>How to Login:</h3>
      <ol>
        <li>Go to: <strong>${cred.loginUrl}</strong></li>
        <li>Select School: <strong>${cred.schoolName}</strong></li>
        <li>Click <strong>"Email Login"</strong></li>
        <li>Enter Email: <strong>${cred.email}</strong></li>
        <li>Enter Password: <strong>${cred.tempPassword}</strong></li>
        <li>Click <strong>"Sign In"</strong></li>
      </ol>
      
      <div class="note">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>⚡ Change your password immediately after first login!</li>
          <li>🔒 Keep your credentials confidential</li>
          <li>📋 Share this email securely</li>
          <li>🚪 Log out after each session</li>
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p>Generated: ${timestamp}</p>
      <p>For support, contact your School Admin</p>
    </div>
  </div>
</body>
</html>`
  }

  if (cred.type === 'admin') {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #f5f5f5; padding: 20px; border-radius: 8px; }
    .header { background: #7c3aed; color: white; padding: 20px; border-radius: 8px; text-align: center; }
    .content { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .credential-box { background: #f3e8ff; padding: 15px; border-left: 4px solid #7c3aed; margin: 10px 0; }
    .label { font-weight: bold; color: #7c3aed; }
    .value { font-family: monospace; background: #fff; padding: 8px; border-radius: 4px; margin-top: 5px; }
    .note { background: #fef3c7; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 13px; }
    .welcome { background: #dcfce7; padding: 15px; border-radius: 4px; margin: 10px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to School Management System!</h1>
      <p>School Admin Credentials</p>
    </div>
    
    <div class="welcome">
      <p>Hello <strong>${cred.name}</strong>,</p>
      <p>Your school <strong>${cred.schoolName}</strong> is now set up on our platform!</p>
    </div>
    
    <div class="content">
      <div class="credential-box">
        <div class="label">🏫 School:</div>
        <div class="value">${cred.schoolName}</div>
      </div>
      
      <div class="credential-box">
        <div class="label">📧 Email:</div>
        <div class="value">${cred.email}</div>
      </div>
      
      <div class="credential-box">
        <div class="label">🔐 Temporary Password:</div>
        <div class="value">${cred.tempPassword}</div>
      </div>
      
      <h3>How to Login:</h3>
      <ol>
        <li>Go to: <strong>${cred.loginUrl}</strong></li>
        <li>Select School: <strong>${cred.schoolName}</strong></li>
        <li>Click <strong>"Email Login"</strong></li>
        <li>Enter Email: <strong>${cred.email}</strong></li>
        <li>Enter Password: <strong>${cred.tempPassword}</strong></li>
        <li>Click <strong>"Sign In"</strong></li>
      </ol>
      
      <h3>✅ You can now:</h3>
      <ul>
        <li>📚 Manage Students</li>
        <li>👨‍🏫 Manage Staff</li>
        <li>🏫 Create Classes & Subjects</li>
        <li>📊 View Dashboards</li>
        <li>📋 Generate Reports</li>
      </ul>
      
      <div class="note">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>⚡ Change your password immediately after first login!</li>
          <li>🔒 Keep your credentials confidential</li>
          <li>📋 Save this email securely</li>
          <li>🚪 Log out after each session</li>
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p>Generated: ${timestamp}</p>
      <p>Setup Guide available in your account dashboard</p>
    </div>
  </div>
</body>
</html>`
  }

  return ''
}

/**
 * Generate credential modal content
 */
export interface CredentialModalContent {
  title: string
  subtitle: string
  credentials: {
    label: string
    value: string
    icon: string
  }[]
  instructions: string[]
  warnings: string[]
  actionText: string
}

export function generateCredentialModal(cred: CredentialTemplate): CredentialModalContent {
  if (cred.type === 'student') {
    return {
      title: '✅ Student Registered Successfully!',
      subtitle: `Welcome ${cred.name}`,
      credentials: [
        { label: 'School', value: cred.schoolName, icon: '🏫' },
        { label: 'Your PIN', value: cred.pin || '', icon: '🔐' },
      ],
      instructions: [
        'Go to the login page',
        'Select your school',
        'Click "PIN Login"',
        'Enter your PIN',
        'Click "Log In"',
      ],
      warnings: [
        '🔒 Keep your PIN confidential',
        '❌ Do not share with anyone',
        '📞 Contact your school if you forget your PIN',
      ],
      actionText: 'Copy PIN to Clipboard',
    }
  }

  if (cred.type === 'staff') {
    return {
      title: '✅ Staff Account Created Successfully!',
      subtitle: `Welcome ${cred.name}`,
      credentials: [
        { label: 'School', value: cred.schoolName, icon: '🏫' },
        { label: 'Email', value: cred.email || '', icon: '📧' },
        { label: 'Temporary Password', value: cred.tempPassword || '', icon: '🔐' },
      ],
      instructions: [
        'Go to the login page',
        'Select your school',
        'Click "Email Login"',
        'Enter your email and temporary password',
        'Change your password immediately',
      ],
      warnings: [
        '⚡ Change your password after first login!',
        '🔒 Keep your credentials confidential',
        '❌ Do not share via email',
        '📱 Share this via secure message (WhatsApp, SMS)',
      ],
      actionText: 'Share via WhatsApp',
    }
  }

  if (cred.type === 'admin') {
    return {
      title: '🎉 School Successfully Registered!',
      subtitle: `Welcome to ${cred.schoolName}`,
      credentials: [
        { label: 'School', value: cred.schoolName, icon: '🏫' },
        { label: 'Admin Email', value: cred.email || '', icon: '📧' },
        { label: 'Temporary Password', value: cred.tempPassword || '', icon: '🔐' },
      ],
      instructions: [
        'Go to the login page',
        'Select your school',
        'Click "Email Login"',
        'Enter your email and temporary password',
        'Change your password immediately',
        'Start managing your school!',
      ],
      warnings: [
        '⚡ Change your password immediately!',
        '🔒 Keep your credentials confidential',
        '❌ Do not share via email',
        '📱 Share this via secure message (WhatsApp)',
      ],
      actionText: 'Share via WhatsApp',
    }
  }

  return {
    title: 'Credentials Generated',
    subtitle: 'Login information',
    credentials: [],
    instructions: [],
    warnings: [],
    actionText: 'Continue',
  }
}

/**
 * Generate temporary password
 */
export function generateTempPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

/**
 * Format credential for display
 */
export function formatCredentialForDisplay(cred: CredentialTemplate): string {
  const lines = [
    `👤 Name: ${cred.name}`,
    `🏫 School: ${cred.schoolName}`,
  ]

  if (cred.email) lines.push(`📧 Email: ${cred.email}`)
  if (cred.pin) lines.push(`🔐 PIN: ${cred.pin}`)
  if (cred.tempPassword) lines.push(`🔑 Temp Password: ${cred.tempPassword}`)

  return lines.join('\n')
}
