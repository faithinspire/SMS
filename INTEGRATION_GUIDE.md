# Integration Guide - Teacher & Student Registration Modals

**File to Update**: `src/app/school-admin/records/page.tsx`

---

## Step 1: Add Imports

Add these imports at the top of the file:

```typescript
import TeacherRegistrationModal from '@/components/admin/TeacherRegistrationModal'
import StudentRegistrationModal from '@/components/admin/StudentRegistrationModal'
```

---

## Step 2: Add State Variables

Add these state variables in the component:

```typescript
const [showTeacherModal, setShowTeacherModal] = useState(false)
const [showStudentModal, setShowStudentModal] = useState(false)
```

---

## Step 3: Replace Tab Content

In the existing tab content section, replace or update each tab:

### For Teachers Tab

**Replace this:**
```typescript
// Find where teachers are currently displayed and replace with:
{activeTab === 'teachers' && (
  <div className="space-y-4">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xl font-bold">👨‍🏫 Registered Teachers</h3>
      <button
        onClick={() => setShowTeacherModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
      >
        + Register New Teacher
      </button>
    </div>

    {staff.filter(s => ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL'].includes(s.role)).length === 0 ? (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No teachers registered yet</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.filter(s => ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL'].includes(s.role)).map(teacher => (
          <div key={teacher.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{teacher.full_name}</p>
                <p className="text-sm text-gray-500">{teacher.email}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded font-semibold">
                  {teacher.role}
                </span>
              </div>
              <div className="text-2xl">👨‍🏫</div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

### For Students Tab

**Replace this:**
```typescript
// Find where students are currently displayed and replace with:
{activeTab === 'students' && (
  <div className="space-y-4">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xl font-bold">👨‍🎓 Registered Students</h3>
      <button
        onClick={() => setShowStudentModal(true)}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
      >
        + Register New Student
      </button>
    </div>

    {students.length === 0 ? (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No students registered yet</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map(student => (
          <div key={student.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{student.full_name}</p>
                <p className="text-sm text-gray-500">{student.email}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-semibold">
                  Student
                </span>
              </div>
              <div className="text-2xl">👨‍🎓</div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

---

## Step 4: Add Modals to Component

Add these modals at the end of your return JSX (before the closing div):

```typescript
{/* Teacher Registration Modal */}
<TeacherRegistrationModal
  schoolId={user?.schoolId || ''}
  isOpen={showTeacherModal}
  onClose={() => setShowTeacherModal(false)}
  onSuccess={() => {
    loadData()
  }}
/>

{/* Student Registration Modal */}
<StudentRegistrationModal
  schoolId={user?.schoolId || ''}
  isOpen={showStudentModal}
  onClose={() => setShowStudentModal(false)}
  onSuccess={() => {
    loadData()
  }}
/>
```

---

## Complete Example

Here's a minimal complete example of the updated Teachers tab:

```typescript
{activeTab === 'teachers' && (
  <div className="space-y-4">
    {/* Header with Register Button */}
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xl font-bold text-gray-900">👨‍🏫 Registered Teachers</h3>
      <button
        onClick={() => setShowTeacherModal(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
      >
        + Register New Teacher
      </button>
    </div>

    {/* Empty State */}
    {staff.filter(s => ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL'].includes(s.role)).length === 0 ? (
      <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
        <div className="text-5xl mb-4">👨‍🏫</div>
        <p className="text-gray-600 font-semibold">No teachers registered yet</p>
        <p className="text-gray-500 text-sm mt-2">Click the "Register New Teacher" button to get started</p>
      </div>
    ) : (
      /* Teacher Cards Grid */
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff
          .filter(s => ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL'].includes(s.role))
          .map(teacher => (
            <div
              key={teacher.id}
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-lg">{teacher.full_name}</p>
                  <p className="text-sm text-gray-500 mt-1">{teacher.email}</p>
                  <div className="mt-3 flex gap-2">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                      {teacher.role}
                    </span>
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                      Active
                    </span>
                  </div>
                </div>
                <div className="text-4xl">👨‍🏫</div>
              </div>
            </div>
          ))}
      </div>
    )}
  </div>
)}
```

---

## How It Works

### User Flow

1. **Click "Register New Teacher"**
   ↓
2. **Modal Opens (Step 1: Basic Info)**
   - User fills in name, email, password
   - User clicks "Next"
   ↓
3. **Modal Shows Step 2: Class & Subjects**
   - User selects a class (optional)
   - User selects subjects from checkboxes
   - User clicks "Complete Registration"
   ↓
4. **Service Processes:**
   - Creates Supabase Auth user
   - Creates database user record
   - Assigns as class teacher (if selected)
   - Creates subject teacher assignments
   ↓
5. **Success!**
   - Modal closes
   - Dashboard data refreshes
   - Teacher appears in list
   ↓
6. **Auto-Linking:**
   - Students automatically see this teacher in their dashboard
   - Students in the class see teacher as their class teacher
   - Students taking teacher's subjects see teacher as their subject teacher

---

## Troubleshooting

### Issue: Modal doesn't open
**Solution**: Check that state variables are properly added:
```typescript
const [showTeacherModal, setShowTeacherModal] = useState(false)
const [showStudentModal, setShowStudentModal] = useState(false)
```

### Issue: Can't select classes/subjects
**Solution**: Make sure Supabase query in modal is working:
- Check that classes table has data
- Check that subjects table has data
- Check browser console for errors

### Issue: Registration fails with email error
**Solution**: The email validation is now built-in. Make sure:
- Email format is correct (e.g., name@example.com)
- No special characters before @
- Domain has at least one dot

### Issue: Teacher not appearing in dashboard
**Solution**: 
- Refresh the page
- Check that teacher was successfully registered (no error messages)
- Check Supabase console to verify records created

---

## Advanced: Customizing the Modals

### Change Modal Colors

**For TeacherRegistrationModal:**
Change the gradient colors in header:
```typescript
// Current: from-blue-600 to-purple-600
// Options: from-indigo-600 to-blue-600, from-emerald-600 to-teal-600
```

**For StudentRegistrationModal:**
Change the gradient colors in header:
```typescript
// Current: from-green-600 to-emerald-600
// Options: from-blue-600 to-cyan-600, from-violet-600 to-purple-600
```

### Add Photo Upload
Extend the modal to include a photo upload field:
```typescript
// In TeacherRegistrationModal Step 1:
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Photo (Optional)
  </label>
  <input
    type="file"
    accept="image/*"
    onChange={(e) => {
      // Handle photo upload to Supabase Storage
    }}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
  />
</div>
```

### Add Role Selection
For more complex scenarios, add role selection in staff registration:
```typescript
<div>
  <label className="block text-sm font-semibold text-gray-700 mb-2">
    Role *
  </label>
  <select
    value={role}
    onChange={(e) => setRole(e.target.value)}
    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
  >
    <option value="TEACHER">Teacher</option>
    <option value="PRINCIPAL">Principal</option>
    <option value="ACCOUNTANT">Accountant</option>
  </select>
</div>
```

---

## Security Considerations

✅ **Email Validation**: Prevents invalid emails from reaching Supabase
✅ **Password Validation**: Minimum 6 characters required
✅ **Multi-tenancy**: All records scoped to school_id
✅ **Foreign Keys**: Database enforces relationships
✅ **Unique Constraints**: Prevents duplicate emails per school
✅ **Input Sanitization**: Supabase handles SQL injection prevention

---

## Performance Tips

1. **Load Data on Modal Open**: Data fetches are already in `useEffect` with `[isOpen]` dependency
2. **Memoize Components**: Wrap modals in `React.memo()` for re-render optimization
3. **Debounce Input**: For text fields, consider debouncing if you add real-time validation
4. **Batch Queries**: Modal combines class and subject queries with `Promise.all()`

---

## Next Steps

After integrating these modals:

1. ✅ **Test both registration flows** (Teacher and Student)
2. ✅ **Verify auto-linking** works (students appear in teacher dashboard)
3. ⏳ **Create API endpoints** for dashboards
4. ⏳ **Implement missing dashboard methods** (getClassStudents, getSubjectStudents)
5. ⏳ **Test all 8 acceptance tests** for MVP requirements

---

**Status**: Ready for integration

**Time to integrate**: 15-20 minutes

**Testing time**: 30 minutes

**Total**: ~50 minutes to full functionality
