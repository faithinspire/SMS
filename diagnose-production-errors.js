#!/usr/bin/env node

/**
 * Diagnose production errors by querying actual database records
 * - Does staff record exist for the failing ID?
 * - What school_id is it associated with?
 * - Can the class-combos query execute without errors?
 */

const https = require('https')

const SUPABASE_URL = 'https://egdreueuspmuxhezdpqm.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NjA0MzksImV4cCI6MjA5NzUzNjQzOX0.egM1RzKJ6ThUy6xrz_Os3OYsy_p5Oyyr0RxL9N1tbGI'

const staffIdFromError = '6fb05d56-e04c-4e5a-bf94-cde457ce2327'
const schoolIdFromError = '9f9bda71-dc25-488f-8283-02eb5a931681'

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL)
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
      },
    }

    const req = https.request(`${SUPABASE_URL}${path}`, options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: data ? JSON.parse(data) : null,
            headers: res.headers,
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: data,
            headers: res.headers,
          })
        }
      })
    })

    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function diagnose() {
  console.log('🔍 PRODUCTION ERROR DIAGNOSIS\n')
  console.log(`Staff ID: ${staffIdFromError}`)
  console.log(`School ID: ${schoolIdFromError}\n`)

  // Phase 1: Check if staff exists
  console.log('=== PHASE 1: CHECK IF STAFF RECORD EXISTS ===')
  const staffPath = `/rest/v1/staff?id=eq.${staffIdFromError}&school_id=eq.${schoolIdFromError}`
  console.log(`Query: GET ${staffPath}`)

  const staffRes = await makeRequest('GET', staffPath)
  console.log(`Status: ${staffRes.status}`)
  console.log(`Response:`, JSON.stringify(staffRes.body, null, 2))

  if (staffRes.status === 200 && Array.isArray(staffRes.body) && staffRes.body.length > 0) {
    console.log('\n✅ STAFF RECORD EXISTS')
    console.log(JSON.stringify(staffRes.body[0], null, 2))
  } else if (staffRes.status === 200 && (!Array.isArray(staffRes.body) || staffRes.body.length === 0)) {
    console.log('\n❌ STAFF RECORD NOT FOUND for this ID+school combination')

    // Try to find ANY staff with this ID (different school?)
    console.log('\n--- Searching for ANY staff with ID (any school) ---')
    const anyStaffPath = `/rest/v1/staff?id=eq.${staffIdFromError}`
    const anyRes = await makeRequest('GET', anyStaffPath)
    console.log(`Status: ${anyRes.status}`)
    if (anyRes.status === 200 && Array.isArray(anyRes.body) && anyRes.body.length > 0) {
      console.log('Found in different school:')
      console.log(JSON.stringify(anyRes.body, null, 2))
    } else {
      console.log('ID does not exist in ANY school')
    }
  } else {
    console.log('\n❌ ERROR:', staffRes.body?.message || staffRes.body)
  }

  // Phase 2: List all staff in this school
  console.log('\n=== PHASE 2: LIST ALL STAFF IN THIS SCHOOL ===')
  const listPath = `/rest/v1/staff?school_id=eq.${schoolIdFromError}&select=id,user_id,first_name,last_name,position`
  console.log(`Query: GET ${listPath}`)

  const listRes = await makeRequest('GET', listPath)
  console.log(`Status: ${listRes.status}`)
  if (listRes.status === 200 && Array.isArray(listRes.body)) {
    console.log(`Found ${listRes.body.length} staff members:`)
    listRes.body.slice(0, 5).forEach(s => {
      console.log(`  - ${s.id}: ${s.first_name} ${s.last_name} (${s.position})`)
    })
    if (listRes.body.length > 5) console.log(`  ... and ${listRes.body.length - 5} more`)
  }

  // Phase 3: Check class-combos for this school
  console.log('\n=== PHASE 3: CHECK CLASS-COMBOS FOR THIS SCHOOL ===')
  const combosPath = `/rest/v1/class_arm_combos?school_id=eq.${schoolIdFromError}&select=id,class_id,arm_id,classes(name,school_level),arms(name)`
  console.log(`Query: GET ${combosPath}`)

  const combosRes = await makeRequest('GET', combosPath)
  console.log(`Status: ${combosRes.status}`)
  if (combosRes.status === 200 && Array.isArray(combosRes.body)) {
    console.log(`Found ${combosRes.body.length} class-arm combos`)
    combosRes.body.slice(0, 3).forEach(c => {
      const cls = Array.isArray(c.classes) ? c.classes[0] : c.classes
      const arm = Array.isArray(c.arms) ? c.arms[0] : c.arms
      console.log(`  - ${cls?.name || '?'} Arm ${arm?.name || '?'} (school_level: ${cls?.school_level || '?'})`)
    })
  } else {
    console.log(`Error: ${combosRes.body?.message || combosRes.status}`)
  }

  // Phase 4: Test subject assignments query
  console.log('\n=== PHASE 4: CHECK SUBJECT-TEACHER ASSIGNMENTS TABLE ===')
  const subjectsPath = `/rest/v1/subject_teacher_assignments?school_id=eq.${schoolIdFromError}&limit=1`
  console.log(`Query: GET ${subjectsPath}`)

  const subjectsRes = await makeRequest('GET', subjectsPath)
  console.log(`Status: ${subjectsRes.status}`)
  if (subjectsRes.status === 200) {
    console.log(`Table is accessible, exists and is queryable`)
  } else {
    console.log(`Error: ${subjectsRes.body?.message || subjectsRes.status}`)
  }

  console.log('\n=== DIAGNOSIS COMPLETE ===')
}

diagnose().catch(console.error)
