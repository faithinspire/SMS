# Code Fixes - Copy & Paste Snippets

## Issue 1: Port 3000 Error - Fix ResultShareModal Import

**File:** `/src/app/teacher/results/page.tsx`

**Line 1-10, Find and Replace:**

```typescript
// OLD:
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, School } from '@/types'

// NEW:
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User, School } from '@/types'
import ResultShareModal from '@/components/ResultShareModal'
```

---

## Issue 2: Mark Sheet Validation - Add to Score Sheet

**File:** `/src/app/teacher/results/page.tsx`

**After imports, add:**

```typescript
import { MARK_CONFIGURATION, validateScore, calculateGrade } from '@/constants/nigerian-subjects'
```

**In manual score form submission, add validation:**

```typescript
const handleAddManualScore = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    // VALIDATE SCORES
    const validation = validateScore(
      manualScoreForm.test1 ? parseFloat(manualScoreForm.test1) : undefined,
      manualScoreForm.test2 ? parseFloat(manualScoreForm.test2) : undefined,
      manualScoreForm.test3 ? parseFloat(manualScoreForm.test3) : undefined,
      manualScoreForm.test4 ? parseFloat(manualScoreForm.test4) : undefined,
      manualScoreForm.exam ? parseFloat(manualScoreForm.exam) : undefined
    )

    if (!validation.valid) {
      alert('❌ ' + validation.errors.join(', '))
      return
    }

    // ... rest of function
  }
}
```

---

## Issue 3: Nigerian Subjects in CBT Page

**File:** `/src/app/teacher/cbt/page.tsx`

**Add imports at top:**

```typescript
import { NIGERIAN_SUBJECTS, getSubjectsForSchoolType, MARK_CONFIGURATION } from '@/constants/nigerian-subjects'
```

**Replace subject selection with:**

```typescript
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Subject *
  </label>
  <select
    value={selectedSubject?.id || ''}
    onChange={(e) => {
      const subId = e.target.value
      const subj = getSubjectsForSchoolType(school?.type || 'PRIMARY').find(s => s.id === subId)
      if (subj) {
        setSelectedSubject({ id: subj.id, name: subj.name })
      }
    }}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
    required
  >
    <option value="">Select Subject</option>
    {getSubjectsForSchoolType(school?.type || 'PRIMARY').map(subject => (
      <option key={subject.id} value={subject.id}>
        {subject.name} ({subject.code})
      </option>
    ))}
  </select>
</div>
```

**Replace exam marking section with:**

```typescript
<div className="grid grid-cols-5 gap-2 mb-4">
  <div>
    <label className="block text-xs font-semibold mb-1">Test 1 (/10)</label>
    <input
      type="number"
      max="10"
      placeholder="0"
      className="w-full px-2 py-1 border border-gray-300 rounded"
    />
  </div>
  <div>
    <label className="block text-xs font-semibold mb-1">Test 2 (/10)</label>
    <input
      type="number"
      max="10"
      placeholder="0"
      className="w-full px-2 py-1 border border-gray-300 rounded"
    />
  </div>
  <div>
    <label className="block text-xs font-semibold mb-1">Test 3 (/10)</label>
    <input
      type="number"
      max="10"
      placeholder="0"
      className="w-full px-2 py-1 border border-gray-300 rounded"
    />
  </div>
  <div>
    <label className="block text-xs font-semibold mb-1">Test 4 (/10)</label>
    <input
      type="number"
      max="10"
      placeholder="0"
      className="w-full px-2 py-1 border border-gray-300 rounded"
    />
  </div>
  <div>
    <label className="block text-xs font-semibold mb-1">Exam (/60)</label>
    <input
      type="number"
      max="60"
      placeholder="0"
      className="w-full px-2 py-1 border border-gray-300 rounded"
    />
  </div>
</div>
```

---

## Issue 4: Teacher Registration - Add Class & Subject Dropdowns

**File:** `/src/app/auth/staff/register/page.tsx`

**Add state:**

```typescript
const [selectedClass, setSelectedClass] = useState('')
const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
const [classes, setClasses] = useState<any[]>([])
const [subjects, setSubjects] = useState<any[]>([])
```

**After school selection, load classes & subjects:**

```typescript
const handleSchoolChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
  const schoolId = e.target.value
  setFormData({ ...formData, schoolId })

  if (schoolId) {
    // Load classes
    const { data: classesData } = await supabase
      .from('class_arm_combos')
      .select('id, classes(name), arms(name)')
      .eq('school_id', schoolId)

    setClasses(classesData || [])

    // Load subjects
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('id, name, code')
      .eq('school_id', schoolId)

    setSubjects(subjectsData || [])
  }
}
```

**Add form fields:**

```typescript
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Class to Manage *
  </label>
  <select
    value={selectedClass}
    onChange={(e) => setSelectedClass(e.target.value)}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
    required
  >
    <option value="">Select Class</option>
    {classes.map((cls: any) => (
      <option key={cls.id} value={cls.id}>
        {cls.classes.name} {cls.arms.name}
      </option>
    ))}
  </select>
</div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Subjects to Teach (Select Multiple) *
  </label>
  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
    {subjects.map((subj: any) => (
      <label key={subj.id} className="flex items-center">
        <input
          type="checkbox"
          checked={selectedSubjects.includes(subj.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedSubjects([...selectedSubjects, subj.id])
            } else {
              setSelectedSubjects(selectedSubjects.filter((s) => s !== subj.id))
            }
          }}
          className="mr-2"
        />
        <span className="text-sm">{subj.name} ({subj.code})</span>
      </label>
    ))}
  </div>
</div>
```

---

## Issue 5: Principal Dashboard - Add Lesson Notes Tab

**File:** `/src/app/principal/dashboard/page.tsx`

**Add state:**

```typescript
const [lessonNotes, setLessonNotes] = useState<any[]>([])
const [selectedClass, setSelectedClass] = useState<string>('')
const [students, setStudents] = useState<any[]>([])
```

**Add tab buttons:**

```typescript
<button
  onClick={() => setActiveTab('lessons')}
  className="px-6 py-4 font-medium text-sm whitespace-nowrap border-b-2 border-transparent text-gray-600 hover:text-gray-900"
>
  📝 Lesson Notes
</button>

<button
  onClick={() => setActiveTab('students')}
  className="px-6 py-4 font-medium text-sm whitespace-nowrap border-b-2 border-transparent text-gray-600 hover:text-gray-900"
>
  👨‍🎓 Student Lists
</button>
```

**Load lesson notes:**

```typescript
const loadLessonNotes = async () => {
  try {
    const { data } = await supabase
      .from('lesson_notes')
      .select(`
        id, 
        title, 
        file_url,
        uploaded_at,
        teachers(full_name),
        subjects(name),
        class_arm_combos(classes(name), arms(name))
      `)
      .eq('school_id', user?.schoolId)
      .order('uploaded_at', { ascending: false })

    setLessonNotes(data || [])
  } catch (error) {
    console.error('Error loading lesson notes:', error)
  }
}
```

---

## Issue 6: Accountant Dashboard - Payment Management

**Add to accountant dashboard:**

```typescript
const handleRecordPayment = async (amount: number, method: string, type: 'student' | 'staff') => {
  try {
    const { error } = await supabase
      .from('payments')
      .insert({
        school_id: school?.id,
        ...(type === 'student' && { student_id: selectedStudent?.id }),
        ...(type === 'staff' && { staff_id: selectedStaff?.id }),
        amount,
        payment_method: method,
        status: 'COMPLETED',
        recorded_by: user?.id,
        created_at: new Date().toISOString(),
      })

    if (error) throw error

    // Generate and share receipt
    const receipt = {
      type: type === 'student' ? 'Student Payment' : 'Staff Salary',
      recipient: type === 'student' ? selectedStudent?.full_name : selectedStaff?.full_name,
      amount,
      date: new Date().toLocaleDateString(),
    }

    alert('✅ Payment recorded. Share receipt?')
    // Open share modal with receipt
  } catch (error) {
    console.error('Error recording payment:', error)
    alert('❌ Failed to record payment')
  }
}
```

---

## Issue 7: Delete Old Code

**Delete these directories if they exist:**

```bash
# Windows CMD
rmdir /s /q "c:\Users\OLU\Desktop\SMS\src\app\admin"
rmdir /s /q "c:\Users\OLU\Desktop\SMS\src\pages"

# Or using PowerShell
Remove-Item -Recurse -Force "c:\Users\OLU\Desktop\SMS\src\app\admin" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "c:\Users\OLU\Desktop\SMS\src\pages" -ErrorAction SilentlyContinue
```

---

## Issue 8: Verify Landing Page

**File:** `/src/app/landing/page.tsx`

**Should have:**

```typescript
export default function LandingPage() {
  // Should render 5 user type buttons:
  // 1. School Admin
  // 2. Headmaster
  // 3. Teacher
  // 4. Accountant
  // 5. Student

  // Each should link to correct login page
}
```

**Test URLs:**
- http://localhost:3000/landing → Should load
- http://localhost:3000/ → Should redirect to /landing

---

## Implementation Order

1. **First:** Fix imports in results page + delete old code
2. **Second:** Add constants import to CBT page
3. **Third:** Update teacher registration with dropdowns
4. **Fourth:** Add lesson notes to principal dashboard
5. **Fifth:** Complete accountant dashboard
6. **Sixth:** Test all workflows

---

## Testing Commands

```bash
# Build to find all errors
npm run build

# Run dev server
npm run dev

# Test specific pages
# - http://localhost:3000/landing
# - http://localhost:3000/auth/staff/register
# - http://localhost:3000/teacher/cbt
# - http://localhost:3000/principal/dashboard
# - http://localhost:3000/accountant/dashboard
```

---

**Total Changes:** ~15 file updates
**Time Estimate:** 2-3 hours
**Priority:** 🔴 **CRITICAL**
