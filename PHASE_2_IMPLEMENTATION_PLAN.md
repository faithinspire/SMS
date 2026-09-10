# 🎯 PHASE 2: HIGH-PRIORITY DASHBOARDS - DETAILED IMPLEMENTATION PLAN

**Status**: READY TO START  
**Duration**: 6-8 hours  
**Priority**: HIGH  

---

## PHASE 2 OBJECTIVES

1. ✅ Complete Principal Dashboard (lesson notes, student lists, analytics)
2. ✅ Complete Headmaster Dashboard (same as principal + system oversight)
3. ✅ Complete Accountant Dashboard (payment recording, receipts, reports)
4. ✅ Implement Lesson Notes Upload Feature
5. ✅ Connect Broadcast Features

---

## FEATURE 2.1: COMPLETE PRINCIPAL DASHBOARD

### Current State
- Basic stats display only
- File: `/src/app/principal/dashboard/page.tsx`
- Missing: Lesson notes, student lists, analytics

### Implementation Steps

#### Step 1: Design Tab-Based Navigation
```
[📊 Overview] [📝 Lesson Notes] [👨‍🎓 Students] [📈 Analytics]
```

#### Step 2: Overview Tab
**Components**:
- School branding (logo + name)
- Key statistics:
  - Total students
  - Total teachers
  - Pending approvals (lesson notes)
  - Classes count
- Quick action buttons

#### Step 3: Lesson Notes Tab
**Functionality**:
- Table of submitted lesson notes
- Filter by status: Submitted | Approved | Returned
- Columns:
  - Teacher name
  - Subject
  - Class
  - Date submitted
  - Status badge
  - Actions (View, Approve, Return)
- Review modal:
  - Show full lesson note
  - Comments field
  - Action buttons: Approve, Return, or Close

**Database Queries**:
```sql
SELECT 
  ln.*,
  u.full_name as teacher_name,
  s.name as subject_name,
  c.name as class_name
FROM lesson_notes ln
JOIN users u ON ln.teacher_id = u.id
JOIN subjects s ON ln.subject_id = s.id
JOIN classes c ON ln.class_id = c.id
WHERE ln.school_id = $1
ORDER BY ln.created_at DESC
```

#### Step 4: Students Tab
**Functionality**:
- Dropdown: Select class
- Table with students in selected class
- Columns:
  - Photo (if available)
  - Name
  - Admission number
  - Class/Arm
  - Email
  - Status

#### Step 5: Analytics Tab
**Charts/Stats**:
- Student performance distribution (chart)
- Teacher effectiveness (chart)
- Attendance trends
- Subject-wise performance

### Files to Create/Modify
- Rebuild: `/src/app/principal/dashboard/page.tsx`
- Create: `/src/components/principal/LessonNotesTab.tsx`
- Create: `/src/components/principal/StudentsTab.tsx`
- Create: `/src/components/principal/AnalyticsTab.tsx`
- Create: `/src/components/principal/LessonNoteReviewModal.tsx`

### Time Estimate: 3-4 hours

---

## FEATURE 2.2: COMPLETE HEADMASTER DASHBOARD

### Approach
- **Copy** Principal Dashboard code
- **Extend** with system-wide features:
  - Staff management
  - School settings access
  - Archive/reports
  - System status

### New Tabs for Headmaster
1. All principal tabs +
2. Staff Management
3. School Settings
4. Reports & Archives

### Files to Create/Modify
- Rebuild: `/src/app/headmaster/dashboard/page.tsx` (extend from principal)
- Create: `/src/components/headmaster/StaffManagementTab.tsx`
- Create: `/src/components/headmaster/SchoolSettingsTab.tsx`
- Create: `/src/components/headmaster/ReportsTab.tsx`

### Time Estimate: 1-2 hours (based on principal code)

---

## FEATURE 2.3: COMPLETE ACCOUNTANT DASHBOARD

### Current State
- Forms created but minimal UI
- File: `/src/app/accountant/dashboard/page.tsx`
- Backend (payments, receipts) exists but disconnected

### Implementation Steps

#### Step 1: Dashboard Overview Tab
**Components**:
```
[💰 Total Revenue] [⏳ Pending] [✅ Cleared] [📊 This Month]
```

#### Step 2: Payment Recording Tab
**Form**:
- Student lookup (autocomplete)
- Amount paid
- Payment method (Cash, Bank Transfer, Check, etc.)
- Payment date
- Notes
- Action: "Record Payment"

**On Submit**:
1. Validate inputs
2. CREATE in payments table
3. AUTO-GENERATE receipt
4. Show receipt on screen
5. Option to share (print/email/whatsapp)

**Database Record**:
```sql
INSERT INTO payments (
  student_id,
  school_id,
  amount,
  payment_method,
  payment_date,
  notes,
  status
) VALUES (...)
```

#### Step 3: Salary Recording Tab
**Form**:
- Staff member lookup
- Salary amount
- Allowances (if any)
- Deductions
- Period (month)
- Notes
- Action: "Record Salary"

**On Submit**:
1. Calculate net pay
2. CREATE in salaries table
3. GENERATE payslip
4. Show payslip
5. Allow download/print

#### Step 4: Receipt Management Tab
**Display**:
- List of all generated receipts
- Filter by date range
- Filter by student
- Status: Printed, Emailed, Shared
- Actions:
  - View/Download PDF
  - Email to parent
  - Share via WhatsApp
  - Mark as cleared

#### Step 5: Reports Tab
**Reports Available**:
1. Daily collections (by date)
2. Student payment history
3. Outstanding payments
4. Staff salary records
5. Monthly summary

### API Endpoints Needed
- `POST /api/accountant/payments` - Record payment
- `POST /api/accountant/receipts` - Generate receipt
- `POST /api/accountant/salaries` - Record salary
- `POST /api/accountant/payslips` - Generate payslip
- `GET /api/accountant/reports/*` - Various reports

### Files to Create/Modify
- Rebuild: `/src/app/accountant/dashboard/page.tsx`
- Create: `/src/components/accountant/PaymentTab.tsx`
- Create: `/src/components/accountant/SalaryTab.tsx`
- Create: `/src/components/accountant/ReceiptTab.tsx`
- Create: `/src/components/accountant/ReportsTab.tsx`
- Create: `/src/app/api/accountant/payments/route.ts`
- Create: `/src/app/api/accountant/receipts/route.ts`
- Create: `/src/app/api/accountant/salaries/route.ts`
- Create: `/src/lib/receipt-generator.ts` (PDF generation)
- Create: `/src/lib/payslip-generator.ts` (PDF generation)

### Time Estimate: 4-5 hours

---

## FEATURE 2.4: LESSON NOTES UPLOAD

### Location
Teacher Dashboard → New Tab: "Lesson Notes"

### Implementation

1. **Upload Interface**:
   ```
   [Select Class]
   [Select Subject]
   [Select Date]
   [File Upload] 
   [Title]
   [Description/Content]
   [Upload Button]
   ```

2. **File Handling**:
   - Accept: PDF, Word (.docx), Images (PNG, JPG)
   - Max size: 10MB
   - Upload to Supabase Storage bucket: `lesson-materials`

3. **Database Save**:
   ```sql
   INSERT INTO lesson_notes (
     teacher_id,
     school_id,
     class_id,
     subject_id,
     title,
     content/description,
     file_url,
     status (SUBMITTED),
     created_at
   ) VALUES (...)
   ```

4. **Display in Principal Dashboard**:
   - Show in "Lesson Notes" tab
   - Allow download
   - Allow approval/rejection

### Files to Create
- Create: `/src/components/teacher/LessonNoteUpload.tsx`
- Create: `/src/app/api/teachers/lesson-notes/upload/route.ts`
- Modify: `/src/app/teacher/dashboard/page.tsx` (add tab)

### Time Estimate: 1.5-2 hours

---

## FEATURE 2.5: BROADCAST FEATURES

### Current Status
- 3 TODO comments in code
- Location: `/src/app/school-admin/records/page.tsx`

### Implementation

1. **Broadcast Workflow**:
   ```
   School Admin writes message
   → Select recipients (all teachers / specific group / all parents)
   → Send
   → Create notification records
   → Teachers/Parents see in dashboard
   ```

2. **Database Tables**:
   - `notifications` table (already exists)
   - `broadcasts` table (create if needed)

3. **API Endpoint**:
   - `POST /api/school-admin/broadcast`
   - Create notification records for each recipient

4. **Frontend Updates**:
   - Replace TODO code with actual broadcast function
   - Add success/error feedback
   - Show notification center in dashboards

### Files to Modify
- Create: `/src/app/api/school-admin/broadcast/route.ts`
- Modify: `/src/app/school-admin/records/page.tsx` (remove TODOs, add functions)
- Create: `/src/components/NotificationCenter.tsx`

### Time Estimate: 1-1.5 hours

---

## IMPLEMENTATION SEQUENCE

### Day 3: High-Priority Dashboards
1. **Morning (2-3 hours)**:
   - Start Principal Dashboard
   - Create Lesson Notes review tab
   - Create Students tab

2. **Afternoon (2-3 hours)**:
   - Complete Principal Dashboard
   - Finish analytics
   - Test thoroughly

3. **Evening (1-2 hours)**:
   - Start Headmaster (copy + extend)
   - Basic structure

### Day 4: Accountant & Features
1. **Morning (2-3 hours)**:
   - Finish Headmaster Dashboard
   - Start Accountant Dashboard

2. **Afternoon (2-3 hours)**:
   - Payment recording form
   - Receipt generation logic
   - Test with sample payments

3. **Evening (1-2 hours)**:
   - Lesson notes upload feature
   - Connect broadcast

---

## 📋 COMPLETION CHECKLIST

### Principal Dashboard
- [ ] Tab navigation working
- [ ] Overview tab displays stats
- [ ] Lesson notes tab loads data
- [ ] Review modal works
- [ ] Approve/Return functionality
- [ ] Students tab shows class list
- [ ] Analytics shows charts
- [ ] Responsive on mobile
- [ ] No UUIDs displayed
- [ ] Proper error handling

### Headmaster Dashboard
- [ ] Copies principal structure
- [ ] Additional tabs work
- [ ] Staff management functional
- [ ] School settings accessible
- [ ] Reports downloadable

### Accountant Dashboard
- [ ] Payment recording works
- [ ] Receipts generate correctly
- [ ] Salary recording works
- [ ] Payslips generate
- [ ] Receipt sharing works
- [ ] Reports accessible
- [ ] Filter and search functional
- [ ] Data persists correctly

### Lesson Notes
- [ ] File upload works
- [ ] Files store in Supabase
- [ ] Display in principal dashboard
- [ ] Approve/Reject works
- [ ] Comments saved

### Broadcasts
- [ ] TODO code replaced
- [ ] Broadcast sends successfully
- [ ] Notifications appear in dashboard
- [ ] Filtering by recipient type works

---

## 🧪 PHASE 2 TEST PLAN

After completing all features:

1. **Principal Test**:
   - Login as principal
   - View lesson notes
   - Review and approve one
   - View students by class
   - Check analytics

2. **Accountant Test**:
   - Login as accountant
   - Record a payment
   - Generate receipt
   - Download receipt
   - View payment report

3. **Teacher Test**:
   - Upload lesson note
   - Check status on principal dashboard

4. **School Admin Test**:
   - Send broadcast
   - Check teachers receive notification

5. **Responsive Test**:
   - Mobile: All dashboards
   - Tablet: Forms and tables
   - Desktop: Full features

---

## ⏱️ TIME BREAKDOWN

| Feature | Estimate | Notes |
|---------|----------|-------|
| Principal Dashboard | 3-4 hrs | Most complex |
| Headmaster Dashboard | 1-2 hrs | Based on principal |
| Accountant Dashboard | 4-5 hrs | API endpoints needed |
| Lesson Notes | 1.5-2 hrs | Upload + integration |
| Broadcasts | 1-1.5 hrs | Connect existing TODO |
| **TOTAL PHASE 2** | **11-14 hrs** | Spread over 2-3 days |

---

**Ready to Begin**: YES ✅  
**All prerequisites met**: YES ✅  
**Database ready**: YES ✅  
**Next Step**: Start Principal Dashboard implementation
