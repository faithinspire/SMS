# Enhanced Student Registration Form Guide

## Overview

The new student registration form at `src/app/auth/student/register/page.tsx` is a professional, accessible, and internationally-compliant form that handles comprehensive student enrollment with Nigerian curriculum standards.

## Features

### 1. **Standard Registration Fields**
- **Full Name**: Text input with validation
- **Email Address**: Email input with format validation
- **Date of Birth**: Date picker with future date prevention
- **Password**: Strong password requirement (8+ chars, uppercase, lowercase, number, special character)
- **Confirm Password**: Password matching validation

### 2. **Class/Grade Selection**
- **Dropdown Selector**: All classes from Prep to SS3 (Grades 0-12)
- **Auto-populated**: Loaded from `SCHOOL_CLASSES` constant
- **Contextual Display**: Shows both class name and type (PRIMARY/SECONDARY)

```tsx
// Classes available:
- Prep, Primary 1-6
- JSS 1-3 (Junior Secondary School)
- SS 1-3 (Senior Secondary School)
```

### 3. **Department Selection (SS1-SS3 Only)**
- **Conditional Display**: Only shown for senior secondary students
- **Available Departments**:
  - Science (Physics, Chemistry, Biology)
  - Commercial (Economics, Accounting, Business Studies)
  - Humanities (History, Government, Literature)
  - Technical (Technical Drawing, Woodwork, Metalwork)
  - Vocational (Practical skills and trades)
- **Auto-populated**: Loaded from `DEPARTMENTS` constant

### 4. **Subject Selection (Multi-Select)**
- **Dynamic Population**: Subjects update based on selected class
- **Scrollable List**: Grid layout with max-height overflow for many subjects
- **Visual Indicators**: Shows selected count and subject codes
- **Minimum Requirement**: At least one subject must be selected

### 5. **Auto-Generated Admission Number**
- **Format**: `YYYY-CLASSNAME-SEQUENCE`
- **Example**: `2026-SS3-0001`
- **Display**: Non-editable preview box with description
- **Real-time Update**: Changes when class is selected

### 6. **Dark/Light Mode Toggle**
- **Header Button**: Easy toggle in top-right corner (🌙/☀️)
- **Persistent**: Theme preference saved to localStorage as `theme-mode`
- **Smooth Transitions**: CSS transitions for visual polish
- **Accessible**: Proper aria-labels for screen readers

### 7. **Form Validation**
Comprehensive client-side validation includes:
- ✅ Required field validation
- ✅ Email format validation (RFC standard)
- ✅ Date of birth cannot be in the future
- ✅ Password strength requirements
- ✅ Password match confirmation
- ✅ Minimum subject selection
- ✅ Department requirement for senior classes

### 8. **Error Handling**
- **Real-time Error Display**: Errors shown immediately below header
- **Clear Messages**: User-friendly error descriptions
- **Visual Feedback**: Red alerts with warning icon
- **Error Clearing**: Errors clear when user starts correcting form

### 9. **Success Message**
- **Post-Registration**: Success message displayed for 2 seconds
- **Auto-redirect**: Automatically navigates to `/auth/student/login` after success
- **Visual Feedback**: Green success alert with checkmark

## Component Architecture

### State Management

```tsx
const [formData, setFormData] = useState({
  fullName: '',           // Student's full name
  email: '',              // Email address
  dateOfBirth: '',        // Date in YYYY-MM-DD format
  className: '',          // Class ID (e.g., 'ss-1')
  department: '',         // Department ID (for SS1-SS3 only)
  subjects: [] as string[],// Array of selected subject IDs
  password: '',           // Strong password
  confirmPassword: '',    // Password confirmation
})

const [darkMode, setDarkMode] = useState(false)
const [showDepartment, setShowDepartment] = useState(false)
const [availableSubjects, setAvailableSubjects] = useState<any[]>([])
```

### Key Effects

1. **Theme Initialization**
   - Loads theme preference from localStorage on mount

2. **Subject Updates**
   - Refreshes available subjects when class changes
   - Uses `getSubjectsForClass()` from constants

3. **Department Visibility**
   - Shows department selection for SS1-SS3 only
   - Clears department/subjects when switching to junior classes

## Styling & Theme

### Light Mode (Default)
```
- Background: Blue gradient (blue-50 to indigo-100)
- Card: White/translucent (bg-white/90)
- Text: Dark gray (text-gray-900)
- Accents: Blue/Purple gradients
```

### Dark Mode
```
- Background: Purple/slate gradient (slate-950 to slate-900)
- Card: Slate translucent (bg-slate-800/80)
- Text: White (text-white)
- Accents: Purple/Pink gradients
```

## Accessibility & Compliance

### WCAG 2.1 AA Compliance
✅ **Semantic HTML**: Proper heading hierarchy, form labels, and structure
✅ **Keyboard Navigation**: All inputs and buttons accessible via keyboard
✅ **Screen Reader Support**: Aria-labels on all interactive elements
✅ **Color Contrast**: Meets WCAG AA minimum ratios
✅ **Focus Management**: Visible focus indicators on all inputs
✅ **Error Messages**: Descriptive, associated with input fields
✅ **Form Instructions**: Clear labels and helper text

### Accessibility Features
- `aria-label` attributes on all form inputs
- `aria-label` on toggle buttons
- Semantic form structure with proper labels
- Helper text explaining requirements
- Error messages with clear guidance
- Focus indicators visible on all elements

## Integration Guide

### Import Constants

```tsx
import {
  SCHOOL_CLASSES,           // Array of available classes
  DEPARTMENTS,               // Array of available departments
  getSubjectsForClass,       // Function to get subjects for a class
  getClassById,              // Function to get class by ID
  generateAdmissionNumber,   // Function to generate admission numbers
} from '@/constants/nigerian-subjects'
```

### API Integration (Future)

The form currently integrates with `AuthService.registerStudent()` which handles basic authentication. To extend for full student profile:

```tsx
// TODO: Extend to save additional student data:
interface StudentProfile {
  dateOfBirth: string      // ISO format date
  className: string        // Class ID
  department?: string      // Department ID (SS1-SS3 only)
  subjects: string[]       // Array of subject IDs
  admissionNumber: string  // Generated admission number
}
```

### Theme Context (Optional)

If using a global theme context:

```tsx
import { useTheme } from '@/lib/theme-provider'

const { darkMode, toggleDarkMode } = useTheme()
```

## Form Data Flow

```
User Input
    ↓
Input Handlers (handleInputChange, handleSubjectToggle)
    ↓
State Update (formData)
    ↓
Side Effects
  ├─ Update available subjects
  └─ Toggle department visibility
    ↓
Form Submit
    ↓
Validation (validateForm)
    ↓
API Call (AuthService.registerStudent)
    ↓
Success/Error Handling
```

## Error Scenarios & Messages

| Error | Message | Cause |
|-------|---------|-------|
| Empty field | "[Field] is required" | User didn't fill required field |
| Invalid email | "Please enter a valid email address" | Email doesn't match RFC standard |
| Future DOB | "Date of birth cannot be in the future" | Selected date is in future |
| Class not selected | "Class/Grade selection is required" | No class selected |
| Department missing (SS only) | "Department selection is required for senior classes" | SS1-SS3 but no department |
| No subjects | "Please select at least one subject" | Subjects list empty |
| Weak password | "Password must contain uppercase, lowercase, number, and special character" | Password doesn't meet requirements |
| Short password | "Password must be at least 8 characters long" | Password < 8 chars |
| Password mismatch | "Passwords do not match" | Confirm password doesn't match |
| Auth failure | "Registration failed. Please try again." | Server error during auth |

## Password Requirements

✅ Minimum 8 characters
✅ At least one uppercase letter (A-Z)
✅ At least one lowercase letter (a-z)
✅ At least one number (0-9)
✅ At least one special character (@$!%*?&)

## Classes & Departments Reference

### Nigerian School Classes

**Primary Education:**
- Prep (Level 0)
- Primary 1-6 (Levels 1-6)

**Secondary Education - Junior:**
- JSS 1-3 (Levels 7-9) - No department selection

**Secondary Education - Senior:**
- SS 1-3 (Levels 10-12) - Department selection required
  - Science Department
  - Commercial Department
  - Humanities Department
  - Technical Department
  - Vocational Department

### Subject Examples by Department

**Science Department:**
- Physics, Chemistry, Biology, Practical Science

**Commercial Department:**
- Economics, Accounting, Business Studies, Marketing

**Humanities Department:**
- Literature in English, Government, History, Geography

**Technical Department:**
- Technical Drawing, Metalwork, Woodwork

**Vocational Department:**
- Agricultural Science, Home Economics

## Performance Considerations

- ✅ Form data stored in React state (not localStorage during editing)
- ✅ Effects properly optimized with dependency arrays
- ✅ Subjects loaded only when class changes
- ✅ No unnecessary re-renders with memo/callback optimization
- ✅ Lazy theme loading prevents hydration mismatch

## Browser Support

Tested and supported on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

1. **Backend Integration**
   - Extend `RegisterStudentInput` interface
   - Save full student profile to database

2. **Photo Upload**
   - Add optional photo upload
   - Image validation and optimization

3. **Guardian Information**
   - Add parent/guardian contact fields
   - Multi-contact support

4. **School Selection**
   - Add school dropdown if multi-school support
   - Pre-fill from session context

5. **Email Verification**
   - Verify email before full registration
   - Resend verification email flow

6. **Phone Number**
   - Add validated phone number field
   - WhatsApp integration

7. **Document Upload**
   - Birth certificate upload
   - Previous school records

## Common Issues & Solutions

### Issue: Subject list not updating
**Solution**: Ensure `getSubjectsForClass()` is imported and working correctly

### Issue: Department not showing for SS1-SS3
**Solution**: Verify class ID includes 'ss-' prefix (ss-1, ss-2, ss-3)

### Issue: Theme not persisting
**Solution**: Check localStorage is enabled and `theme-mode` key is accessible

### Issue: Form not submitting
**Solution**: Check browser console for validation errors, verify AuthService endpoint

## Support & Questions

For issues or questions:
1. Check form validation messages
2. Review browser console for errors
3. Verify all constants are properly imported
4. Test on different browsers
5. Check network requests in DevTools

---

**Version**: 1.0.0
**Last Updated**: 2024
**Maintainer**: School Management System Team
