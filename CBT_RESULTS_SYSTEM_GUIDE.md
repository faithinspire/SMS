# CBT & Results Management System Guide

## Overview

The School Management System includes a comprehensive Computer-Based Testing (CBT) system with integrated result management and parent sharing capabilities via WhatsApp and Email.

---

## 1. System Architecture

### Key Components

1. **Teacher CBT Management** (`/teacher/cbt`)
   - Create and manage CBT exams
   - Add questions (MCQ, True/False, Essay)
   - Set exam parameters (duration, marks, passing percentage)
   - View student submissions and scores

2. **Student CBT Portal** (`/student/cbt-portal`)
   - View available exams for their subjects
   - Categorized by status: Active, Upcoming, Completed, Not Attempted
   - Take exams during scheduled time window
   - View results and scores

3. **Teacher Results Management** (`/teacher/results`)
   - View all students in a class with their scores
   - Manually add/update scores for any subject
   - Share results with parents via WhatsApp or Email
   - Generate report cards
   - Export results to CSV/PDF

4. **Result Sharing Service** (`ResultSharingService`)
   - Integration with Twilio for WhatsApp
   - Integration with SendGrid for Email
   - Automatic parent contact retrieval
   - Audit trail of all shares

---

## 2. How Students Take CBT

### Step-by-step Flow

1. **Student logs in** → Dashboard
2. **Clicks "📝 CBT Portal"** → `/student/cbt-portal`
3. **Views exams categorized as:**
   - 🔴 **Active Now** - Currently happening (can start)
   - 📅 **Upcoming** - Will start later
   - ✅ **Completed** - Already taken
   - ⏳ **Not Attempted** - Missed (closed)

4. **Starts Active Exam** → Redirected to `/student/cbt-take/[examId]`
5. **Takes exam** within time limit
6. **Auto-submits** when time expires
7. **Views result** immediately with score and grade

### Exam Status Logic

```
Current Time < Exam Start Time → UPCOMING
Current Time >= Exam Start Time AND Current Time <= Exam End Time → ACTIVE
Current Time > Exam End Time AND Student submitted → COMPLETED
Current Time > Exam End Time AND Student NOT submitted → NOT ATTEMPTED
```

---

## 3. How Teachers Create and Manage CBT

### Create Exam

1. Go to **Teacher Dashboard** → Click **"📝 CBT Exams"**
2. Select subject and class
3. Fill exam details:
   - Title (e.g., "Physics Test 1")
   - Description
   - Exam type (TEST or EXAM)
   - Start/End time
   - Duration (minutes)
   - Total marks
   - Passing percentage
4. **Save exam**

### Add Questions

1. After creating exam, click **"Add Questions"**
2. For each question:
   - Enter question text
   - Select type: MCQ, True/False, or Essay
   - If MCQ: Add options and mark correct answer
   - Set marks for question
3. Questions auto-link to exam

### Auto-Score Calculation

- **MCQ/True-False**: Automatically scored based on answer key
- **Essay**: Teacher manually grades (future enhancement)
- **Scores auto-populate** score_sheets table
- **Teachers can override** scores in Results page

---

## 4. Results Management

### View Results

1. Go to **Teacher Dashboard** → Click **"📊 Results"**
2. Select class
3. System shows all students in class with:
   - Student name and admission number
   - All subject scores (from all teachers' CBT exams)
   - Class average
   - Quick actions

### Add/Update Manual Scores

1. Click **"✏️ Add Manual Score"**
2. Select student and subject
3. Enter scores:
   - Test 1, 2, 3, 4 (max 10 each)
   - Exam (max 60)
4. System calculates:
   - Total = Test1 + Test2 + Test3 + Test4 + Exam
   - Grade based on total
5. Saves to score_sheets

### Share Results

1. Click **"📤"** button on student row
2. Select share method: WhatsApp or Email
3. Select parent(s)/guardian(s)
4. System sends:
   - **WhatsApp**: Formatted text message with all scores
   - **Email**: HTML email with professional template
5. Share logged in result_shares table

---

## 5. Data Flow

### CBT Submission Flow

```
Student takes exam
         ↓
Submits answer
         ↓
CBTService.submitExam()
         ↓
Auto-calculates score
         ↓
Saves to cbt_submissions
         ↓
Updates score_sheets (test/exam scores)
         ↓
Result immediately available to teacher & student
```

### Result Sharing Flow

```
Teacher clicks "Share"
         ↓
ResultShareModal opens
         ↓
Get parent contacts from guardians table
         ↓
Teacher selects parents & method
         ↓
System calls ResultSharingService
         ↓
If WhatsApp: Send via Twilio
If Email: Send via SendGrid
         ↓
Log share in result_shares table
         ↓
Confirmation shown to teacher
```

---

## 6. Database Schema

### Key Tables

#### `cbt_exams`
```sql
- id (UUID)
- school_id, subject_id, class_arm_combo_id
- title, description
- start_time, end_time, duration_minutes
- total_marks, passing_percentage
- created_by (teacher_id)
```

#### `cbt_questions`
```sql
- id (UUID)
- exam_id
- question_text, question_type (MCQ/TRUE_FALSE/ESSAY)
- marks
- options (JSONB) - {text, isCorrect}
- correct_answer
```

#### `cbt_submissions`
```sql
- id (UUID)
- exam_id, student_id
- started_at, submitted_at
- score, total_marks, percentage, passed
- answers (JSONB) - submitted answers
```

#### `score_sheets`
```sql
- id (UUID)
- student_id, subject_id, term_id
- test1, test2, test3, test4 (max 10 each)
- exam (max 60)
- total (auto-calculated)
- grade (calculated from total)
- test1_source, test2_source... (CBT/MANUAL)
```

#### `result_shares`
```sql
- id (UUID)
- student_id, shared_by (teacher_id)
- shared_to (phone/email)
- shared_via (WHATSAPP/EMAIL)
- result_snapshot (JSONB)
- shared_at
```

#### `guardians`
```sql
- id (UUID)
- student_id
- full_name, phone, email, relationship
```

---

## 7. Integration Steps

### 1. WhatsApp Integration (Twilio)

```typescript
// In ResultSharingService
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const client = twilio(accountSid, authToken)

await client.messages.create({
  body: resultMessage,
  from: process.env.TWILIO_WHATSAPP_NUMBER, // +1234567890
  to: `whatsapp:+${parentPhone}`,
})
```

### 2. Email Integration (SendGrid)

```typescript
// In ResultSharingService
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

await sgMail.send({
  to: parentEmail,
  from: process.env.SENDGRID_FROM_EMAIL,
  subject: `Result Notification - ${studentName}`,
  html: emailHTML,
})
```

### 3. Environment Variables Required

```env
# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=+1234567890

# SendGrid
SENDGRID_API_KEY=your_api_key
SENDGRID_FROM_EMAIL=noreply@school.com

# Supabase (already configured)
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
```

---

## 8. User Roles & Permissions

### Teachers
- ✅ Create CBT exams for their subjects
- ✅ Add questions and answers
- ✅ View all student submissions
- ✅ View scores and results
- ✅ Add/update manual scores
- ✅ Share results with parents
- ✅ Generate report cards

### Students
- ✅ View exams for their subjects
- ✅ Take active exams
- ✅ View their scores
- ❌ Cannot modify results
- ❌ Cannot create exams

### Headmaster
- ✅ View all results for school
- ✅ Monitor teacher activity
- ✅ Generate school-wide reports
- ✅ View result sharing audit trail

### Accountant
- ✅ View results linked to fees (future)
- ✅ Monitor exam completion rate

---

## 9. Future Enhancements

1. **Essay Question Auto-Grading**
   - AI-powered essay scoring
   - Teacher review workflow
   - Feedback to students

2. **Advanced Analytics**
   - Class performance trends
   - Subject-wise analysis
   - Student progress tracking
   - Difficulty index per question

3. **Offline CBT Support**
   - Sync when online
   - No internet support

4. **Question Bank**
   - Reusable question library
   - Category-based organization
   - Difficulty tagging

5. **Student Performance Dashboard**
   - Personal progress tracking
   - Comparative analysis
   - Recommendations

6. **Parent Portal**
   - View child's results
   - Receive alerts
   - Communicate with teachers

---

## 10. Troubleshooting

### Issue: Student sees no exams
- ✅ Check student_subjects - student enrolled in subjects?
- ✅ Check cbt_exams - exams created for their subjects?
- ✅ Check exam start_time - is it within range?

### Issue: Scores not appearing after submission
- ✅ Check cbt_submissions - submission recorded?
- ✅ Check score_sheets - score_sheets entry created?
- ✅ Refresh page to reload data

### Issue: WhatsApp not sending
- ✅ Check Twilio credentials in .env
- ✅ Verify parent phone number format (+234...)
- ✅ Check Twilio balance

### Issue: Email not sent
- ✅ Check SendGrid API key
- ✅ Verify parent email address
- ✅ Check spam folder

---

## 11. API Reference

### CBTService

```typescript
// Create exam
await CBTService.createExam({
  schoolId, subjectId, classArmComboId,
  title, startTime, endTime, durationMinutes,
  totalMarks, passingPercentage, createdBy
})

// Add question
await CBTService.addQuestion({
  examId, questionText, questionType, marks,
  options, correctAnswer
})

// Get exam questions
const questions = await CBTService.getExamQuestions(examId)

// Start exam
const submission = await CBTService.startExam(examId, studentId)

// Submit answer
await CBTService.submitAnswer(submissionId, questionId, answer)

// Get submissions
const subs = await CBTService.getExamSubmissions(examId)
```

### ResultSharingService

```typescript
// Get parent contacts
const contacts = await ResultSharingService.getParentContacts(studentId)

// Share via WhatsApp
await ResultSharingService.shareViaWhatsApp(
  studentId, schoolId, sharedBy, phone, resultData
)

// Share via Email
await ResultSharingService.shareViaEmail(
  studentId, schoolId, sharedBy, email, resultData, schoolName
)

// Get share history
const history = await ResultSharingService.getShareHistory(studentId)
```

---

## 12. Testing Checklist

### Teacher CBT Creation
- [ ] Create exam with all fields
- [ ] Add multiple questions (MCQ, True/False)
- [ ] Set correct answers
- [ ] Edit/delete questions
- [ ] Edit/delete exams

### Student CBT Taking
- [ ] View exam in portal
- [ ] Start exam within time window
- [ ] Answer questions (select options)
- [ ] Submit before time expires
- [ ] Auto-submit when time expires
- [ ] View score immediately

### Results Management
- [ ] View class results
- [ ] Add manual score
- [ ] Update manual score
- [ ] View student details
- [ ] Export results

### Result Sharing
- [ ] Share via WhatsApp
- [ ] Share via Email
- [ ] Multiple parents selected
- [ ] Share history recorded

---

## Support & Documentation

For issues or questions:
1. Check troubleshooting section above
2. Review database schema
3. Check component files for implementation details
4. Contact development team

**Key Files:**
- Services: `/src/services/cbt.service.ts`, `/src/services/result-sharing.service.ts`
- Components: `/src/components/ResultShareModal.tsx`
- Pages: `/src/app/teacher/cbt/`, `/src/app/teacher/results/`, `/src/app/student/cbt-portal/`
- Migrations: `/database/migrations/007_add_result_sharing.sql`
