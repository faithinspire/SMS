# Manual Testing Snippets

Use these JavaScript snippets in your browser console to manually test the StudentRegistrationModal functionality.

---

## Getting Started

1. **Open DevTools:** Press `F12`
2. **Go to Console tab**
3. **Paste code snippets below**
4. **Press Enter to execute**

---

## Snippet 1: Check if Supabase Client Exists

```javascript
// Check if supabase is accessible
console.log('Testing Supabase import...');

// This will fail because supabase-client is a module
// But we can test the connection via API calls

// Instead, make a direct API call to check connection:
fetch(
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/tables?limit=1`,
  {
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`,
    }
  }
)
.then(r => r.json())
.then(d => console.log('✓ Supabase connection OK:', d))
.catch(e => console.error('✗ Supabase connection failed:', e))
```

---

## Snippet 2: Check Current User's School ID

```javascript
// Get current school ID
const getSchoolId = () => {
  // Try from localStorage
  const user = JSON.parse(localStorage.getItem('sb-auth-token') || '{}');
  console.log('Auth token:', user);
  
  // Try from session storage
  const userSession = JSON.parse(sessionStorage.getItem('user') || '{}');
  console.log('User session:', userSession);
  
  return userSession.schoolId || user.schoolId;
};

const schoolId = getSchoolId();
console.log('Current School ID:', schoolId);

// If empty, check database directly
if (!schoolId) {
  console.warn('No school ID found! User might not be logged in or role is incorrect.');
}
```

---

## Snippet 3: Manually Fetch Classes (Simulating Modal Query)

```javascript
// This simulates what StudentRegistrationModal does
const testFetchClasses = async () => {
  const schoolId = 'YOUR_SCHOOL_ID'; // Replace with actual school ID
  const supabaseUrl = 'https://YOUR_PROJECT.supabase.co'; // From .env
  const anonKey = 'YOUR_ANON_KEY'; // From .env
  
  console.log('📚 Fetching classes for school:', schoolId);
  
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/class_arm_combos?select=id,classes(id,name,level,type),arms(name)&school_id=eq.${schoolId}&order=classes(level)`,
      {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('Response Status:', response.status);
    
    const data = await response.json();
    console.log('✅ Classes loaded:', data);
    console.log('Count:', data.length);
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching classes:', error);
  }
};

await testFetchClasses();
```

---

## Snippet 4: Manually Fetch Subjects

```javascript
// This simulates fetching subjects
const testFetchSubjects = async () => {
  const schoolId = 'YOUR_SCHOOL_ID'; // Replace with actual school ID
  const supabaseUrl = 'https://YOUR_PROJECT.supabase.co'; // From .env
  const anonKey = 'YOUR_ANON_KEY'; // From .env
  
  console.log('📚 Fetching subjects for school:', schoolId);
  
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/subjects?select=id,name,code,applicable_to_levels&school_id=eq.${schoolId}&order=name`,
      {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${localStorage.getItem('sb-access-token')}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('Response Status:', response.status);
    
    const data = await response.json();
    console.log('✅ Subjects loaded:', data);
    console.log('Count:', data.length);
    
    return data;
  } catch (error) {
    console.error('❌ Error fetching subjects:', error);
  }
};

await testFetchSubjects();
```

---

## Snippet 5: Check Session/Authentication Status

```javascript
// Check authentication status
const checkAuth = async () => {
  console.log('🔐 Checking authentication...');
  
  // Check localStorage
  console.log('localStorage keys:', Object.keys(localStorage));
  
  // Check for auth token
  const token = localStorage.getItem('sb-access-token');
  console.log('Has auth token:', !!token);
  
  // Check for session
  const session = localStorage.getItem('sb-auth-token');
  console.log('Has session:', !!session);
  
  // Parse and show user info
  if (session) {
    try {
      const parsed = JSON.parse(session);
      console.log('Session user:', parsed.user);
      console.log('Session user role:', parsed.user?.role);
    } catch (e) {
      console.error('Could not parse session:', e);
    }
  }
  
  // Check if still authenticated
  const response = await fetch(
    `https://YOUR_PROJECT.supabase.co/auth/v1/user`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': 'YOUR_ANON_KEY',
      }
    }
  );
  
  console.log('Auth status check:', response.status);
  const user = await response.json();
  console.log('Current user:', user);
};

await checkAuth();
```

---

## Snippet 6: Check Modal's Component Props

```javascript
// Requires React DevTools extension installed
// If available, inspect the StudentRegistrationModal component

const checkModalProps = () => {
  // This is a React debugging technique
  console.log('📋 Checking StudentRegistrationModal props...');
  
  // Method 1: Look at console messages (already logged by modal)
  console.log('Check console above for "📚 Loading classes..." messages');
  
  // Method 2: Check if modal is visible in DOM
  const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
  if (modal) {
    console.log('✓ Modal element found in DOM');
    console.log('Modal HTML:', modal.outerHTML.substring(0, 200));
  } else {
    console.log('✗ Modal not found in DOM');
  }
  
  // Method 3: Check if buttons exist
  const registerBtn = Array.from(document.querySelectorAll('button')).find(b => 
    b.textContent.includes('Register Student')
  );
  console.log('Register button exists:', !!registerBtn);
};

checkModalProps();
```

---

## Snippet 7: Check Env Variables

```javascript
// Check what env variables are loaded
const checkEnv = () => {
  console.log('🔧 Environment Variables Check:');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', 
    process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET ✓' : 'NOT SET ✗');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET ✓' : 'NOT SET ✗');
  
  // Show partial values (safe to see first 20 chars)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...');
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20) + '...');
  }
};

checkEnv();
```

---

## Snippet 8: Simulate Modal Data Load (Full Test)

```javascript
// Complete test of modal loading flow
const fullModalTest = async () => {
  console.log('🧪 Running full modal load test...\n');
  
  // Step 1: Get school ID
  console.log('Step 1: Get school ID');
  const userJson = localStorage.getItem('user');
  if (!userJson) {
    console.error('No user data in localStorage. Not logged in?');
    return;
  }
  
  const user = JSON.parse(userJson);
  const schoolId = user.schoolId;
  console.log('School ID:', schoolId);
  
  if (!schoolId) {
    console.error('User has no school ID. Role issue?');
    return;
  }
  
  // Step 2: Get auth token
  console.log('\nStep 2: Check auth token');
  const token = localStorage.getItem('sb-access-token');
  console.log('Has auth token:', !!token);
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    console.error('Missing Supabase config');
    return;
  }
  
  // Step 3: Fetch classes
  console.log('\nStep 3: Fetch classes');
  try {
    const classRes = await fetch(
      `${url}/rest/v1/class_arm_combos?select=id,classes(id,name,level,type),arms(name)&school_id=eq.${schoolId}&order=classes(level)`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('Classes response status:', classRes.status);
    const classes = await classRes.json();
    console.log('Classes count:', classes.length);
    console.log('Classes data:', classes);
  } catch (e) {
    console.error('Classes fetch error:', e);
  }
  
  // Step 4: Fetch subjects
  console.log('\nStep 4: Fetch subjects');
  try {
    const subjRes = await fetch(
      `${url}/rest/v1/subjects?select=id,name,code,applicable_to_levels&school_id=eq.${schoolId}&order=name`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log('Subjects response status:', subjRes.status);
    const subjects = await subjRes.json();
    console.log('Subjects count:', subjects.length);
    console.log('Subjects data:', subjects);
  } catch (e) {
    console.error('Subjects fetch error:', e);
  }
  
  console.log('\n✓ Test complete. Check logs above for issues.');
};

await fullModalTest();
```

---

## Snippet 9: Test RLS Policy Directly

```javascript
// Test if RLS is blocking queries
const testRLS = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = localStorage.getItem('sb-access-token');
  
  console.log('🔐 Testing RLS Policies...\n');
  
  // Test without authentication (should fail if RLS enabled)
  console.log('Test 1: Without auth token');
  const res1 = await fetch(`${url}/rest/v1/class_arm_combos?limit=1`, {
    headers: { 'apikey': key }
  });
  console.log('Status:', res1.status, res1.status === 403 ? '(403=RLS blocking)' : '');
  
  // Test with authentication (should work if RLS configured correctly)
  console.log('\nTest 2: With auth token');
  const res2 = await fetch(`${url}/rest/v1/class_arm_combos?limit=1`, {
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${token}`
    }
  });
  console.log('Status:', res2.status, res2.status === 200 ? '(200=OK)' : '(NOT OK)');
  const data = await res2.json();
  console.log('Response sample:', typeof data === 'string' ? data : JSON.stringify(data).substring(0, 100));
};

await testRLS();
```

---

## Snippet 10: Monitor Console for Modal Logs

```javascript
// Create a listener to capture all console messages related to modal
const originalLog = console.log;
const originalError = console.error;

const logs = [];

console.log = function(...args) {
  const message = args.join(' ');
  if (message.includes('Loading') || message.includes('Loaded') || message.includes('Error')) {
    logs.push({ type: 'log', message, time: new Date().toLocaleTimeString() });
  }
  originalLog.apply(console, args);
};

console.error = function(...args) {
  const message = args.join(' ');
  logs.push({ type: 'error', message, time: new Date().toLocaleTimeString() });
  originalError.apply(console, args);
};

// Now open modal and check:
console.log('🎯 Monitoring console. Open the modal now...');
console.log('After modal opens, run: logs.forEach(l => console.log(`[${l.time}] ${l.type}: ${l.message}`))');
```

---

## Snippet 11: Check Network Requests in Console

```javascript
// Log all fetch requests (requires page reload)
const originalFetch = window.fetch;

window.fetch = async function(...args) {
  const [resource, config] = args;
  console.log('📡 Fetch:', resource.substring(0, 80));
  
  const response = await originalFetch.apply(this, args);
  console.log('   Status:', response.status);
  
  return response;
};

console.log('✓ Network logging enabled. Open modal now and watch console.');
```

---

## Snippet 12: Quick Status Report

```javascript
// Get a quick summary of everything
const statusReport = () => {
  console.log('=== QUICK STATUS REPORT ===\n');
  
  // 1. Login status
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('1. Login Status:');
  console.log('   Logged in:', !!user.id);
  console.log('   User role:', user.role);
  console.log('   School ID:', user.schoolId);
  
  // 2. Environment
  console.log('\n2. Environment:');
  console.log('   Supabase URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('   Supabase Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  // 3. Authentication
  console.log('\n3. Authentication:');
  console.log('   Auth token:', !!localStorage.getItem('sb-access-token'));
  console.log('   Session:', !!localStorage.getItem('sb-auth-token'));
  
  // 4. Modal visibility
  console.log('\n4. Modal:');
  const modal = document.querySelector('[class*="fixed"][class*="inset-0"]');
  console.log('   Visible:', !!modal);
  
  console.log('\n=== END REPORT ===');
};

statusReport();
```

---

## How to Use These Snippets

### Scenario 1: Nothing Loads
1. Run **Snippet 2** to get school ID
2. Run **Snippet 8** to do full test with that school ID
3. Check output for where it fails

### Scenario 2: 403 Errors
1. Run **Snippet 9** to test RLS policies
2. If Test 2 fails → RLS issue

### Scenario 3: No Auth
1. Run **Snippet 5** to check session
2. If no token → Need to login

### Scenario 4: Modal Opens But No Data
1. Run **Snippet 1** to test Supabase connection
2. Run **Snippet 12** for status report
3. Run **Snippet 8** for full test

---

## Troubleshooting Snippet Errors

If a snippet fails:

1. **"process is not defined"**
   - You're in console during build
   - Just use `.env.local` values directly

2. **"localStorage is not defined"**
   - Only works in browser console
   - Reload page and try again

3. **"Unexpected token <"**
   - Pasted HTML instead of JS
   - Copy exact JavaScript code

4. **"Fetch failed"**
   - Check SUPABASE_URL format
   - Should start with `https://`
   - Should end with `.supabase.co`

---
