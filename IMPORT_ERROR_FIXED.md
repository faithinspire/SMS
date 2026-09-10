# React Component Import Error - Fixed

## Problem

React warning in browser console:
```
Warning: React.jsx: type is invalid -- expected a string (for built-in components) 
or a class/function (for composite components) but got: undefined. 
You likely forgot to export your component from the file it's defined in, 
or you might have mixed up default and named imports.
```

This error occurred at: `src/app/school-admin/records/page.tsx:23:78` when trying to render `TeacherRegistrationModal`.

## Root Cause

**Import/Export Mismatch**:

### TeacherRegistrationModal
- **Exported as**: Named export - `export function TeacherRegistrationModal(...)`
- **Imported as**: Default import - `import TeacherRegistrationModal from ...` ❌
- **Result**: `undefined` component

### StudentRegistrationModal
- **Exported as**: Default export - `export default function StudentRegistrationModal(...)`
- **Imported as**: Named import - `import { StudentRegistrationModal } from ...` ❌
- **Result**: `undefined` component

## Solution

Fixed both imports in `src/app/school-admin/records/page.tsx`:

### Before (❌ Wrong)
```typescript
import TeacherRegistrationModal from '@/components/admin/TeacherRegistrationModal'
import { StudentRegistrationModal } from '@/components/admin/StudentRegistrationModal'
```

### After (✅ Correct)
```typescript
import { TeacherRegistrationModal } from '@/components/admin/TeacherRegistrationModal'
import StudentRegistrationModal from '@/components/admin/StudentRegistrationModal'
```

## Key Points

**Import Types**:
- **Named Import**: `import { ComponentName } from 'path'` 
  - Used when: `export function ComponentName()` or `export const ComponentName = ...`
- **Default Import**: `import ComponentName from 'path'`
  - Used when: `export default function ComponentName()` or `export default ComponentName`

**Export Statements in Code**:
```typescript
// TeacherRegistrationModal.tsx
export function TeacherRegistrationModal({...}) { }  ← Named export

// StudentRegistrationModal.tsx
export default function StudentRegistrationModal({...}) { }  ← Default export
```

## Files Changed

- `src/app/school-admin/records/page.tsx` - Lines 8-9 (imports)

## Testing

The error should now be resolved. The School Records page should load without console warnings:
1. Navigate to: **School Admin → Records**
2. Check browser console for any errors
3. Verify both modals can be opened:
   - Click "+ Register New Teacher"
   - Click "+ Register New Student"

## Prevention

When creating new components:
1. **Decide on export type**:
   - Use **named export** for utility/component files: `export function MyComponent() { }`
   - Use **default export** for page/layout files: `export default function MyPage() { }`
2. **Match import to export**:
   - Named export → Named import
   - Default export → Default import
3. **Type safety**: TypeScript will catch this if you enable strict mode

## ESLint Rule

To prevent this in the future, add this ESLint rule:
```json
{
  "rules": {
    "import/no-default-export": "warn"
  }
}
```

This forces consistency and catches import/export mismatches early.
