# 🔍 Debugging & Console Logs Guide

## How to Check If Data Is Loading Correctly

### Step 1: Open Browser Console
```
Windows/Linux: Press F12 or Ctrl+Shift+I
Mac: Press Cmd+Option+I
```

### Step 2: Go to Console Tab
Click the "Console" tab to see live logging

### Step 3: Load Accountant Dashboard
Navigate to `/accountant/dashboard`

---

## 🟢 Successful Load (GREEN)

### Expected Console Output:

```javascript
✅ Accountant logged in for school: 550e8400-e29b-41d4-a716-446655440000
✅ School loaded: Lincoln High School
🔄 Loading staff for school: 550e8400-e29b-41d4-a716-446655440000
✅ Staff loaded: 5 (5) [Array(5)]
    0: {id: '...', full_name: 'John Doe', email: 'john@school.com', role: 'TEACHER', ...}
    1: {id: '...', full_name: 'Jane Smith', email: 'jane@school.com', role: 'ACCOUNTANT', ...}
    2: {id: '...', full_name: 'Mike Johnson', email: 'mike@school.com', role: 'HEAD_TEACHER', ...}
    3: {id: '...', full_name: 'Sarah Williams', email: 'sarah@school.com', role: 'PRINCIPAL', ...}
    4: {id: '...', full_name: 'Tom Brown', email: 'tom@school.com', role: 'LIBRARIAN', ...}
🔄 Loading students for school: 550e8400-e29b-41d4-a716-446655440000
✅ Students loaded: 20 (20) [Array(20)]
    0: {id: '...', full_name: 'Alice Johnson', email: 'alice@student.com', role: 'STUDENT', ...}
    1: {id: '...', full_name: 'Bob Smith', email: 'bob@student.com', role: 'STUDENT', ...}
    ... (18 more students)
🔄 Loading transactions...
✅ Transactions loaded: 0
```

### What This Means:
- ✅ Accountant is authenticated
- ✅ School loaded successfully
- ✅ Found 5 staff members
- ✅ Found 20 students
- ✅ No transactions yet (first load)
- ✅ **Everything working correctly!**

---

## 🔴 Error Cases (RED)

### Case 1: School ID Not Found
```javascript
❌ User has no school_id assigned: {id: '...', email: 'john@school.com', role: 'ACCOUNTANT', school_id: null}
```

**Solution:**
- Ensure user has `school_id` set in database
- Go to school admin, check if accountant is assigned to school

### Case 2: Staff Not Loading
```javascript
🔄 Loading staff for school: 550e8400-e29b-41d4-a716-446655440000
❌ Error loading staff: Error: Invalid query
```

**Solution:**
- Check Supabase is connected
- Check `users` table exists
- Check staff have ACTIVE status
- Check staff have role in: TEACHER, PRINCIPAL, ACCOUNTANT, HEAD_TEACHER, STAFF

### Case 3: Students Not Loading
```javascript
🔄 Loading students for school: 550e8400-e29b-41d4-a716-446655440000
❌ Error loading students: Error: Invalid query
```

**Solution:**
- Same as Case 2
- Ensure students have role = 'STUDENT'
- Ensure students have status = 'ACTIVE'

### Case 4: Transactions Not Loading
```javascript
🔄 Loading transactions...
❌ Error loading transactions: Error: relation "transactions" does not exist
```

**Solution:**
- Create transactions table in Supabase:
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  type TEXT NOT NULL,
  recipient_id UUID,
  recipient_name TEXT,
  recipient_email TEXT,
  amount DECIMAL,
  purpose TEXT,
  payment_method TEXT,
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Case 5: Not Authenticated
```javascript
❌ Dashboard load error: Error: User not found
```

**Solution:**
- Ensure you're logged in
- Check if user has ACCOUNTANT role
- Check authentication service is working

---

## 💾 When Processing Payment

### Successful Payment:
```javascript
// User clicks "Process Payment"
💾 Saving payment: {
  school_id: '550e8400-e29b-41d4-a716-446655440000',
  recipient_id: '...',
  recipient_name: 'John Doe',
  type: 'STAFF_SALARY',
  amount: 100000,
  purpose: 'Monthly Salary',
  payment_method: 'BANK_TRANSFER',
  status: 'COMPLETED',
  created_at: '2026-08-20T10:30:00.000Z'
}
✅ Payment saved: [{id: '...', ...}]
```

### Failed Payment:
```javascript
💾 Saving payment: {...}
❌ Error saving payment: Error: Invalid insert
```

**Solution:**
- Check amount is valid (> 0)
- Check school_id is set
- Check transactions table has correct schema
- Check Supabase connection

---

## 📊 When Searching Staff

### Successful Search:
```javascript
// User types "john" in search box
// React state updates: searchStaff = "john"
// Component re-renders with filtered data

// Console shows (if you add logging):
Filtering staff: "john"
Results: 1 match (John Doe)
```

### No Results:
```javascript
// User types "xyz" (doesn't exist)
Filtering staff: "xyz"
Results: 0 matches
// UI shows: "No staff members found matching your search"
```

---

## 🔧 Additional Logging (For Developers)

### To Add More Logging:

In `src/app/accountant/dashboard/page.tsx`:

```typescript
// After loading staff
console.log('📊 Staff data:', staffList)
staffList.forEach((staff, index) => {
  console.log(`  ${index + 1}. ${staff.full_name} (${staff.role})`)
})

// After loading students
console.log('📊 Student data:', studentList)
studentList.forEach((student, index) => {
  console.log(`  ${index + 1}. ${student.full_name} (${student.email})`)
})

// When filtering
console.log('🔍 Filtering staff by:', searchStaff)
console.log('   Results:', filteredStaff.length)
```

### To See Payment Details in Console:

Add this to `StaffPaymentModal.tsx` before saving:

```typescript
console.log('📝 Payment Details:', {
  amount: parseFloat(amount),
  purpose,
  paymentMethod,
  notes
})
```

---

## 📈 Performance Checking

### Check Load Time:

```javascript
// At start of load
const startTime = performance.now()

// ... loading code ...

// At end of load
const endTime = performance.now()
console.log(`⏱️ Dashboard loaded in ${(endTime - startTime).toFixed(2)}ms`)
```

**Acceptable Performance:**
- Under 1000ms = ✅ Good
- 1000-3000ms = ⚠️ Acceptable
- Over 3000ms = ❌ Needs optimization

---

## 🔗 Database Query Debugging

### To See Actual Database Queries:

In Supabase Dashboard → SQL Editor:

```sql
-- Check staff in school
SELECT * FROM users 
WHERE school_id = '550e8400-e29b-41d4-a716-446655440000'
AND role IN ('TEACHER', 'ACCOUNTANT', 'HEAD_TEACHER', 'PRINCIPAL', 'STAFF')
AND status = 'ACTIVE'
ORDER BY created_at DESC;

-- Check students in school
SELECT * FROM users 
WHERE school_id = '550e8400-e29b-41d4-a716-446655440000'
AND role = 'STUDENT'
AND status = 'ACTIVE'
ORDER BY created_at DESC;

-- Check transactions
SELECT * FROM transactions 
WHERE school_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC
LIMIT 200;
```

---

## 🧩 Common Issues & Fixes

### Issue: "No staff members found" but staff exists
```
Check:
1. Is staff ACTIVE? (SELECT * FROM users WHERE status = 'ACTIVE')
2. Does staff have school_id set? (SELECT school_id FROM users WHERE id = '...')
3. Does staff have correct role? (SELECT role FROM users WHERE id = '...')
4. Is it your school? (school_id should match accountant's school_id)
```

### Issue: Modals won't open
```
Check console:
1. Look for React errors
2. Check if staff/student data exists (console.log in onClick)
3. Check if state is updating (look for setShowStaffModal logs)
4. Check browser DevTools for DOM errors
```

### Issue: Payments not saving
```
Check:
1. Does transactions table exist? (SELECT * FROM transactions LIMIT 1)
2. Is table schema correct? (DESCRIBE transactions)
3. Is data valid? (amount > 0, school_id set)
4. Check Supabase logs for query errors
```

---

## 📱 Mobile Debugging

### On Mobile/Tablet:

1. **Chrome DevTools Remote Debugging:**
   - Connect device via USB
   - Open `chrome://inspect` on computer
   - Click "inspect" on device

2. **Using Mobile DevTools:**
   - Open browser console in mobile
   - Try to scroll down to see logs
   - Or use external logging service

3. **Alternative - LogRocket:**
   - Install LogRocket (optional)
   - See user session replays
   - See console logs from mobile

---

## ✅ Checklist: Everything Loaded Correctly

- [ ] Console shows: `✅ Accountant logged in for school: [uuid]`
- [ ] Console shows: `✅ School loaded: [School Name]`
- [ ] Console shows: `✅ Staff loaded: [number] [Array]`
- [ ] Console shows: `✅ Students loaded: [number] [Array]`
- [ ] Console shows: `✅ Transactions loaded: [number]`
- [ ] No RED error messages (❌)
- [ ] Dashboard displays staff list
- [ ] Dashboard displays students list
- [ ] Dashboard displays transactions table

If all checked: ✅ **Dashboard is working correctly!**

---

## 🚨 Emergency Debugging

If dashboard breaks:

1. **Open Console (F12)**
2. **Look for RED errors (❌)**
3. **Copy the error message**
4. **Check this guide for that error**
5. **Follow the solution**
6. **Reload page (F5)**
7. **Check console again**

---

## 📞 Getting Help

If you're stuck:

1. **Copy console error** (right-click → Copy)
2. **Check this guide** for that error
3. **Check Supabase Dashboard** for data
4. **Check database tables** exist
5. **Check user roles** are correct
6. **Check school_id** is set correctly

---

**🎯 Console logs are your best debugging tool - use them!**
