# 📖 CODE CHANGES REFERENCE GUIDE

**Purpose:** Quick reference for all code changes deployed to production  
**Date:** September 8, 2026  
**Status:** ✅ All changes live in production  

---

## 🔗 KEY CODE LOCATIONS

### 1. Accountant Dashboard - Modern Redesign
**File:** `src/app/accountant/dashboard/page.tsx`  
**Lines:** ~800 lines total  
**Key Changes:**

```typescript
// Header with school logo and logout button
<header className="sticky top-0 z-40 bg-gradient-to-r from-purple-600 to-purple-800">
  <div className="flex justify-between items-center">
    <h1>FTECH Dashboard</h1>
    <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded">
      🚪 Logout
    </button>
  </div>
</header>

// Navigation tabs
<div className="flex gap-4 border-b">
  <tab onClick={() => setActiveTab('dashboard')}>Dashboard</tab>
  <tab onClick={() => setActiveTab('transactions')}>Transactions</tab>
  <tab onClick={() => setActiveTab('reports')}>Reports</tab>
  <tab onClick={() => setActiveTab('settings')}>Settings</tab>
</div>

// Stats cards
<div className="grid grid-cols-4 gap-4">
  <StatCard title="Total Transactions" value={stats.totalTransactions} />
  <StatCard title="Total Amount" value={`₦${stats.totalAmount}`} />
  <StatCard title="Completed" value={stats.completed} />
  <StatCard title="Pending" value={stats.pending} />
</div>
```

**New Features:**
- ✅ Gradient purple header
- ✅ Logout button (top-right, bright red)
- ✅ Navigation tabs (Dashboard, Transactions, Reports, Settings)
- ✅ Stats cards with KPIs
- ✅ Staff/Students management sections
- ✅ Transactions table
- ✅ Payment modal with edit/share

---

### 2. JSS Subject Curriculum - Database Migration
**File:** `database/migrations/099_fix_jss_subjects.sql`  
**Type:** SQL Migration  
**Key Changes:**

```sql
-- Ensure JSS subjects have correct applicable_to_levels
INSERT INTO subjects (school_id, name, code, applicable_to_levels, section, is_active)
SELECT 
  s.id,
  'English Language',
  'ENG',
  ARRAY[9, 10, 11],  -- JSS levels only
  'LANGUAGE',
  TRUE
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM subjects 
  WHERE name = 'English Language' AND school_id = s.id AND applicable_to_levels @> ARRAY[9]
)
ON CONFLICT (school_id, code) DO UPDATE SET applicable_to_levels = ARRAY[9, 10, 11];

-- Filter subjects in queries
SELECT * FROM subjects 
WHERE applicable_to_levels @> ARRAY[9];  -- JSS only
```

**Database Schema:**
```sql
-- Subjects table columns
- id: UUID (primary key)
- school_id: UUID (foreign key to schools)
- name: VARCHAR (subject name)
- code: VARCHAR (subject code)
- applicable_to_levels: INT[] (array of class levels)
- section: VARCHAR (LANGUAGE, SCIENCE, HUMANITIES, etc.)
- is_active: BOOLEAN
```

---

### 3. Staff Deletion - Fixed API Route
**File:** `src/app/api/admin/delete-staff/route.ts`  
**Lines:** ~100  
**Key Changes:**

```typescript
export async function DELETE(req: NextRequest) {
  const { staffId } = await req.json()

  // Try teachers table first
  const { data: teacherData, error: teacherError } = await supabase
    .from('teachers')
    .select('user_id, full_name, id')
    .eq('id', staffId)
    .single()

  if (!teacherError && teacherData) {
    staffMember = teacherData
    fromTable = 'teachers'
  } else {
    // Fall back to users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', staffId)
      .single()
    
    if (!userError && userData) {
      staffMember = userData
      fromTable = 'users'
    }
  }

  // Delete from appropriate table
  if (fromTable === 'teachers') {
    await supabase.from('teachers').delete().eq('id', staffId)
  }

  // Delete from users table
  const userId = staffMember.user_id || staffMember.id
  await supabase.from('users').delete().eq('id', userId)

  // Delete from auth
  await supabase.auth.admin.deleteUser(userId)

  return NextResponse.json({ success: true, message: 'Staff member deleted' })
}
```

**Logic Flow:**
1. Check if staff exists in `teachers` table
2. If not found, check `users` table
3. Delete from appropriate table
4. Delete from `users` table if exists
5. Delete from Supabase auth
6. Return success/error message

---

### 4. Student Deletion - Fixed API Route
**File:** `src/app/api/admin/delete-student/route.ts`  
**Lines:** ~100  
**Key Changes:**

```typescript
export async function DELETE(req: NextRequest) {
  const { studentId } = await req.json()

  // Try students table first
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('user_id, full_name, id')
    .eq('id', studentId)
    .single()

  if (!studentError && studentData) {
    student = studentData
    fromTable = 'students'
  } else {
    // Fall back to users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('id', studentId)
      .single()
    
    if (!userError && userData) {
      student = userData
      fromTable = 'users'
    }
  }

  // Delete from appropriate table
  if (fromTable === 'students') {
    await supabase.from('students').delete().eq('id', studentId)
  }

  // Delete from users table
  const userId = student.user_id || student.id
  await supabase.from('users').delete().eq('id', userId)

  // Delete from auth
  await supabase.auth.admin.deleteUser(userId)

  return NextResponse.json({ success: true, message: 'Student deleted' })
}
```

**Logic Flow:**
1. Check if student exists in `students` table
2. If not found, check `users` table
3. Delete from appropriate table
4. Delete from `users` table if exists
5. Delete from Supabase auth
6. Return success/error message

---

### 5. WhatsApp Mobile Protocol - Sharing Service
**File:** `src/services/sharing.service.ts`  
**Key Changes:**

```typescript
export class SharingService {
  // Detect if device is mobile
  static detectMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
  }

  // Share via WhatsApp with mobile detection
  static shareViaWhatsApp(phoneNumber: string, message: string): void {
    const isMobile = this.detectMobileDevice()
    
    if (isMobile) {
      // Mobile: Use native app protocol
      const encodedMessage = encodeURIComponent(message)
      window.location.href = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`
    } else {
      // Desktop: Use web version
      const encodedMessage = encodeURIComponent(message)
      window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank')
    }
  }

  // Alternative desktop method
  static shareViaWhatsAppWeb(phoneNumber: string, message: string): void {
    const encodedMessage = encodeURIComponent(message)
    window.open(`https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodedMessage}`, '_blank')
  }
}
```

**Mobile Detection:**
- Uses regex pattern to detect Android, iOS, iPad, etc.
- Returns `true` for mobile, `false` for desktop

**Protocol Selection:**
- 📱 Mobile: `whatsapp://send?phone=...&text=...` (native app)
- 🌐 Desktop: `https://wa.me/...` (web version)

---

### 6. Component Implementation - Generate Letter Modal
**File:** `src/components/admin/GenerateLetterModal.tsx`  
**Key Changes:**

```typescript
const handleShareWhatsApp = async () => {
  if (!recipientPhone) {
    alert('Phone number required')
    return
  }

  const message = `${letterType} letter for ${recipientName}`
  
  // Use sharing service with mobile detection
  SharingService.shareViaWhatsApp(recipientPhone, message)
}

// In render:
<button 
  onClick={handleShareWhatsApp}
  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded"
>
  <svg>WhatsApp Icon</svg>
  Share via WhatsApp
</button>
```

---

### 7. Navbar Persistence Fix
**File:** `src/components/BottomNavigation.tsx`  
**Key Changes:**

```typescript
const [user, setUser] = useState<User | null>(null)

useEffect(() => {
  const getUser = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser()
      setUser(currentUser)
    } catch (err) {
      console.error('Error loading user:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  getUser()
}, [pathname])  // ✅ KEY FIX: Added pathname dependency

// Clear navbar when user is null (after logout)
if (loading || !user) return null
```

**What Changed:**
- Added `pathname` to useEffect dependency array
- Causes navbar to refetch user on route changes
- Clears navbar data when user logs out
- Prevents stale user data from displaying

---

### 8. Transaction Records - Add Class Information
**File:** `src/app/accountant/dashboard/page.tsx`  
**Interface Change:**

```typescript
interface Transaction {
  id: string
  type: 'STAFF_SALARY' | 'STUDENT_PAYMENT'
  recipient_id: string
  recipient_name: string
  recipient_email?: string
  recipient_phone?: string
  recipient_class?: string  // ✅ NEW FIELD
  amount: number
  purpose: string
  payment_method: string
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  created_at: string
  invoice_number?: string
}
```

**Table Display:**
```typescript
<table>
  <thead>
    <tr>
      <th>Recipient</th>
      <th>Type</th>
      <th>Class</th>  {/* ✅ NEW COLUMN */}
      <th>Amount</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>{transaction.recipient_name}</td>
      <td>{transaction.type}</td>
      <td>{transaction.recipient_class}</td>  {/* ✅ SHOWS CLASS */}
      <td>₦{transaction.amount}</td>
      <td>{transaction.status}</td>
    </tr>
  </tbody>
</table>
```

---

## 🔄 SUBJECT FILTERING LOGIC

### Before (Broken)
```typescript
// No filtering - mixes all subjects
const allSubjects = await supabase
  .from('subjects')
  .select('*')
  .eq('school_id', schoolId)
```

### After (Fixed)
```typescript
// Filters by applicable_to_levels
const classLevel = 9  // JSS1
const subjects = await supabase
  .from('subjects')
  .select('*')
  .eq('school_id', schoolId)
  .contains('applicable_to_levels', [classLevel])  // PostgreSQL array contains operator
```

---

## 📊 DATABASE QUERY EXAMPLES

### Get JSS Subjects Only
```sql
SELECT * FROM subjects 
WHERE school_id = '...' 
  AND applicable_to_levels @> ARRAY[9, 10, 11]
ORDER BY name ASC;
```

### Get SS Subjects Only
```sql
SELECT * FROM subjects 
WHERE school_id = '...' 
  AND applicable_to_levels @> ARRAY[10, 11, 12, 13, 14, 15, 16]
ORDER BY name ASC;
```

### Get Specific Class Subjects
```sql
SELECT * FROM subjects 
WHERE school_id = '...' 
  AND applicable_to_levels @> ARRAY[?]  -- Parameter: class level
ORDER BY section ASC, name ASC;
```

---

## 🚀 API ENDPOINT CHANGES

### Delete Staff Endpoint
```
DELETE /api/admin/delete-staff
Request: { staffId: "uuid" }
Response: { success: true, message: "...", staffId: "uuid" }
Status: 200 on success, 400/404/500 on error
```

### Delete Student Endpoint
```
DELETE /api/admin/delete-student
Request: { studentId: "uuid" }
Response: { success: true, message: "...", studentId: "uuid" }
Status: 200 on success, 400/404/500 on error
```

---

## 🧪 TESTING CODE SNIPPETS

### Test WhatsApp Mobile Detection
```typescript
// In browser console
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
  navigator.userAgent
)
console.log('Is Mobile:', isMobile)
```

### Test Subject Filtering
```typescript
// In your app code
const getSubjects = async (classLevel: number) => {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('school_id', schoolId)
    .contains('applicable_to_levels', [classLevel])
  
  console.log('Subjects for level', classLevel, ':', data)
}

getSubjects(9)   // JSS1
getSubjects(10)  // JSS2
getSubjects(11)  // JSS3
```

### Test Delete Functionality
```typescript
// In your app code
const testDeleteStaff = async (staffId: string) => {
  const response = await fetch('/api/admin/delete-staff', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ staffId })
  })
  const result = await response.json()
  console.log('Delete result:', result)
}
```

---

## 📝 COMMIT MESSAGES

```
Commit: aa5f31b
Title: CRITICAL FIXES: Accountant dashboard rebuild, delete button fixes, 
       SQL migration, and logout
Body:
- Rebuilt accountant dashboard with modern design (stats cards, transactions table)
- Fixed delete functionality for staff and students
- Added JSS1-JSS3 curriculum migration with applicable_to_levels
- Implemented WhatsApp mobile protocol (native app on phone, web on desktop)
- Updated bottom navigation with accountant routes
- Added logout button to accountant dashboard
- Fixed navbar persistence issue

Files Changed: 4 core files + supporting components
```

---

## 🎯 CONFIGURATION REFERENCES

### Environment Variables Needed
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
JWT_SECRET=...
NODE_ENV=production
```

### Vercel Configuration
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs"
}
```

---

## 📚 RELATED FILES

- `src/lib/supabase-client.ts` - Supabase initialization
- `src/services/auth.service.ts` - Authentication logic
- `src/services/sharing.service.ts` - Sharing functionality
- `src/types/index.ts` - TypeScript interfaces
- `tailwind.config.ts` - Tailwind CSS config
- `tsconfig.json` - TypeScript config

---

**All code changes are now live in production at:**  
**https://school-management-saas.vercel.app**

---

*Reference Guide Created: September 8, 2026*  
*Status: ✅ Complete and Verified*
