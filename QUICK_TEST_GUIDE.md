# 🚀 QUICK TEST GUIDE - SUPERADMIN FIXES

## Server Status
✅ **Running on:** http://localhost:3000

---

## 🧪 Test Scenarios

### Test 1: View All Schools (Should Fix "Failed to Fetch Schools")
1. Navigate to: `http://localhost:3000/superadmin/schools`
2. **Expected:** Schools list loads without "Failed to fetch schools" error
3. **Check:** 
   - ✅ Schools display in table
   - ✅ Logo column shows images or initials
   - ✅ No 404 errors in console
   - ✅ Search and filter work

---

### Test 2: Register New School with Logo (Should Fix Missing Logo Feature)
1. Go to: `http://localhost:3000/superadmin/schools`
2. Click: **"➕ Register School"** button
3. Fill form:
   ```
   School Name: Test Academy
   School Email: school@test.com
   Admin Name: John Admin
   Admin Email: admin@test.com
   Admin Password: SecurePass123!
   Phone: +234 8012345678
   Address: 123 Main St, Lagos
   School Type: Both
   Subscription: Professional
   ```
4. **Upload Logo:**
   - Click logo upload area
   - Select an image file (PNG/JPG)
   - Verify preview shows
5. Click: **"Register School"** button
6. **Expected:**
   - ✅ Success message appears
   - ✅ Credentials displayed
   - ✅ Redirects to schools list
   - ✅ New school appears in list **WITH LOGO**

---

### Test 3: School Details (Should Show Logo & Info)
1. In schools list, click: **👁️ (View Details)** on any school
2. **Expected:**
   - ✅ Modal opens showing school info
   - ✅ Logo visible at top if available
   - ✅ School name, email, phone displayed
   - ✅ Admin credentials shown
   - ✅ Subscription plan visible

---

### Test 4: Pause/Resume (Should Fix Status Error)
1. In schools list, click: **⏸️ (Pause)** button on active school
2. **Expected:**
   - ✅ Status changes to "PAUSED" (yellow badge)
   - ✅ Button changes to **▶️ (Resume)**
   - ✅ Success message appears
   - ✅ No 404 error

3. Click: **▶️ (Resume)** button
4. **Expected:**
   - ✅ Status back to "ACTIVE" (green badge)
   - ✅ Button back to **⏸️ (Pause)**

---

### Test 5: Share Details (Should Fix Share Error)
1. In schools list, click: **📤 (Share)** button
2. **Expected:**
   - ✅ Modal opens
   - ✅ WhatsApp and Email checkboxes visible
   - ✅ Warning message displayed

3. Check both WhatsApp and Email
4. Click: **"Share Details"** button
5. **Expected:**
   - ✅ Success message appears
   - ✅ Modal closes
   - ✅ No 404 error

---

### Test 6: Delete School (Should Fix Delete Error)
1. In schools list, click: **🗑️ (Delete)** button
2. **Expected:**
   - ✅ Confirmation modal appears
   - ✅ Warning message shown
   - ✅ "Delete" and "Cancel" buttons visible

3. Click: **"Delete"** button (or "Cancel" to skip)
4. **Expected:**
   - ✅ School removed from list (if confirmed)
   - ✅ Success message appears
   - ✅ No 404 error

---

### Test 7: Search & Filter
1. In schools list, in the search field type: school name or email
2. **Expected:**
   - ✅ List filters in real-time
   - ✅ Count updates
   - ✅ Logos still display

3. Use Status Filter dropdown
4. **Expected:**
   - ✅ Filters by ACTIVE/PAUSED/SUSPENDED
   - ✅ Count updates

---

### Test 8: Verify API Endpoints
Check browser console Network tab:

| Endpoint | Status | Should Work |
|----------|--------|---|
| GET `/api/schools` | 200 | ✅ Gets all schools |
| POST `/api/superadmin/register-school` | 201 | ✅ Creates school |
| GET `/api/superadmin/schools/[id]/stats` | 200 | ✅ Gets counts |
| PATCH `/api/superadmin/schools/[id]/status` | 200 | ✅ Updates status |
| DELETE `/api/superadmin/schools/[id]/delete` | 200 | ✅ Deletes school |
| POST `/api/upload/school-logo` | 200 | ✅ Uploads logo |

---

## 🐛 Troubleshooting

### "Failed to fetch schools"
- ✅ **FIXED:** Was calling wrong endpoint, now uses `/api/schools`
- Check: Network tab → `/api/schools` should return 200

### Logo not uploading
- Check: File size < 5MB
- Check: File type is image (PNG/JPG/GIF)
- Check: Network tab → `/api/upload/school-logo` returns 200

### 404 on delete/pause/resume
- ✅ **FIXED:** Now includes Bearer token in headers
- Check: Authorization header in Network tab

### "Unauthorized" error
- Verify: You're logged in as SUPER_ADMIN
- Check: Browser console for auth errors
- Try: Refresh and login again

---

## 📊 What Should Be Fixed

### Issue 1: "Failed to Fetch Schools" ✅
- **Was:** Calling non-existent `/api/superadmin/schools`
- **Now:** Calls `/api/schools` with proper auth
- **Result:** Schools list loads successfully

### Issue 2: 404 Errors on Buttons ✅
- **Was:** Missing Bearer token in headers
- **Now:** All requests include `Authorization: Bearer <token>`
- **Result:** All buttons work without 404

### Issue 3: No Logo Upload ✅
- **Was:** Form had no logo field
- **Now:** Complete logo upload with preview
- **Result:** Logos display on dashboard

### Issue 4: No Superadmin Registration ✅
- **Was:** No endpoint to register schools
- **Now:** New `/api/superadmin/register-school` endpoint
- **Result:** Schools register with proper auth

---

## ✅ Success Indicators

- ✅ Schools list loads in < 2 seconds
- ✅ All school logos display correctly
- ✅ Search/filter works instantly
- ✅ Pause/resume buttons work without errors
- ✅ Delete confirmation appears
- ✅ Share details opens modal
- ✅ New schools register with logo
- ✅ No 404 errors in console
- ✅ No "Failed to fetch" messages

---

## 📱 Test with Different Scenarios

### Scenario A: Empty Database
- Register 3 test schools with different logos
- Verify all display correctly
- Test search for each

### Scenario B: Multiple Schools
- Register 10+ schools
- Test pagination (if implemented)
- Test search performance
- Test filter performance

### Scenario C: Logo Variations
- Test with PNG logo
- Test with JPG logo
- Test with large file (should reject)
- Test with non-image file (should reject)

---

**Ready to test? Go to http://localhost:3000/superadmin/schools**
