/**
 * API Endpoint: POST /api/admin/sync-all-schools-data
 * 
 * CRITICAL FIX: Syncs ALL schools (old and new) with canonical academic data
 * - Creates 17 academic sessions (2024-2040)
 * - Creates 51 academic terms (3 per session)
 * - Creates 12 standard classes
 * - Creates 36 arms (A, B, C per class)
 * - Creates 20 Nigerian curriculum subjects
 * - Makes data available to registration dropdowns immediately
 * 
 * This is idempotent - safe to call multiple times
 * No data loss - only adds missing data
 * 
 * Usage:
 * POST /api/admin/sync-all-schools-data
 * 
 * Response: { success: boolean, message: string, details: object }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

// Create admin client with service key for unrestricted access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function POST(req: NextRequest) {
  try {
    console.log('[Sync Schools Data API] Starting sync of all schools with canonical academic data...')

    const results = {
      sessions_created: 0,
      terms_created: 0,
      classes_created: 0,
      arms_created: 0,
      combos_created: 0,
      subjects_created: 0,
      schools_processed: 0,
      errors: [] as string[],
    }

    // ========================================================================
    // STEP 1: Get all active schools
    // ========================================================================
    console.log('[Sync Schools Data API] STEP 1: Fetching all active schools...')
    const { data: schools, error: schoolsError } = await supabaseAdmin
      .from('schools')
      .select('id, name')
      .eq('status', 'ACTIVE')

    if (schoolsError) {
      console.error('[Sync Schools Data API] Error fetching schools:', schoolsError)
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to fetch schools',
          error: schoolsError.message,
        },
        { status: 500 }
      )
    }

    if (!schools || schools.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'No schools found to sync',
          results,
        },
        { status: 200 }
      )
    }

    console.log(`[Sync Schools Data API] Found ${schools.length} active schools to sync`)
    results.schools_processed = schools.length

    // ========================================================================
    // STEP 2: For each school, create missing academic sessions
    // ========================================================================
    console.log('[Sync Schools Data API] STEP 2: Creating academic sessions (2024-2040)...')
    try {
      const sessions = []
      const currentYear = new Date().getFullYear()

      for (const school of schools) {
        for (let year = 2024; year <= 2040; year++) {
          sessions.push({
            school_id: school.id,
            session_year: `${year}/${year + 1}`,
            start_year: year,
            end_year: year + 1,
            is_active: year === currentYear,
          })
        }
      }

      const { data: createdSessions, error: sessionError } = await supabaseAdmin
        .from('academic_sessions')
        .upsert(sessions, { onConflict: 'school_id,session_year', ignoreDuplicates: true })
        .select()

      if (sessionError) {
        const msg = `Error creating sessions: ${sessionError.message}`
        console.error('[Sync Schools Data API]', msg)
        results.errors.push(msg)
      } else {
        results.sessions_created = createdSessions?.length || 0
        console.log(`[Sync Schools Data API] ✅ Created ${results.sessions_created} sessions`)
      }
    } catch (err: any) {
      const msg = `Exception creating sessions: ${err.message}`
      console.error('[Sync Schools Data API]', msg)
      results.errors.push(msg)
    }

    // ========================================================================
    // STEP 3: Fetch created sessions and create terms
    // ========================================================================
    console.log('[Sync Schools Data API] STEP 3: Creating academic terms (3 per session)...')
    try {
      const { data: allSessions, error: fetchError } = await supabaseAdmin
        .from('academic_sessions')
        .select('id, school_id, start_year')
        .eq('status', 'ACTIVE')

      if (fetchError) {
        throw fetchError
      }

      if (allSessions && allSessions.length > 0) {
        const terms = []
        for (const session of allSessions) {
          for (let termNum = 1; termNum <= 3; termNum++) {
            const startMonth = 8 + (termNum - 1) * 3
            const endMonth = 10 + (termNum - 1) * 3
            const startYear = termNum === 2 ? session.start_year + 1 : session.start_year

            terms.push({
              school_id: session.school_id,
              session_id: session.id,
              name: `Term ${termNum}`,
              term_number: termNum,
              start_date: `${startYear}-${String(startMonth).padStart(2, '0')}-01`,
              end_date: `${startYear}-${String(endMonth).padStart(2, '0')}-28`,
              is_active: termNum === 1,
            })
          }
        }

        const { data: createdTerms, error: termError } = await supabaseAdmin
          .from('academic_terms')
          .upsert(terms, { onConflict: 'school_id,session_id,term_number', ignoreDuplicates: true })
          .select()

        if (termError) {
          const msg = `Error creating terms: ${termError.message}`
          console.error('[Sync Schools Data API]', msg)
          results.errors.push(msg)
        } else {
          results.terms_created = createdTerms?.length || 0
          console.log(`[Sync Schools Data API] ✅ Created ${results.terms_created} terms`)
        }
      }
    } catch (err: any) {
      const msg = `Exception creating terms: ${err.message}`
      console.error('[Sync Schools Data API]', msg)
      results.errors.push(msg)
    }

    // ========================================================================
    // STEP 4: Create 12 standard classes for each school
    // ========================================================================
    console.log('[Sync Schools Data API] STEP 4: Creating 12 standard classes per school...')
    try {
      const classDefinitions = [
        { name: 'JSS 1', level: 1, type: 'SECONDARY' },
        { name: 'JSS 2', level: 2, type: 'SECONDARY' },
        { name: 'JSS 3', level: 3, type: 'SECONDARY' },
        { name: 'SSS 1', level: 4, type: 'SECONDARY' },
        { name: 'SSS 2', level: 5, type: 'SECONDARY' },
        { name: 'SSS 3', level: 6, type: 'SECONDARY' },
        { name: 'Primary 1', level: 7, type: 'PRIMARY' },
        { name: 'Primary 2', level: 8, type: 'PRIMARY' },
        { name: 'Primary 3', level: 9, type: 'PRIMARY' },
        { name: 'Primary 4', level: 10, type: 'PRIMARY' },
        { name: 'Primary 5', level: 11, type: 'PRIMARY' },
        { name: 'Primary 6', level: 12, type: 'PRIMARY' },
      ]

      const classes = []
      for (const school of schools) {
        for (const classDef of classDefinitions) {
          classes.push({
            school_id: school.id,
            name: classDef.name,
            level: classDef.level,
            type: classDef.type,
          })
        }
      }

      const { data: createdClasses, error: classError } = await supabaseAdmin
        .from('classes')
        .upsert(classes, { onConflict: 'school_id,name', ignoreDuplicates: true })
        .select()

      if (classError) {
        const msg = `Error creating classes: ${classError.message}`
        console.error('[Sync Schools Data API]', msg)
        results.errors.push(msg)
      } else {
        results.classes_created = createdClasses?.length || 0
        console.log(`[Sync Schools Data API] ✅ Created ${results.classes_created} classes`)
      }
    } catch (err: any) {
      const msg = `Exception creating classes: ${err.message}`
      console.error('[Sync Schools Data API]', msg)
      results.errors.push(msg)
    }

    // ========================================================================
    // STEP 5: Create arms (A, B, C) for each class
    // ========================================================================
    console.log('[Sync Schools Data API] STEP 5: Creating arms (A, B, C) for each class...')
    try {
      const { data: allClasses, error: classError } = await supabaseAdmin
        .from('classes')
        .select('id, school_id')

      if (classError) {
        throw classError
      }

      if (allClasses && allClasses.length > 0) {
        const arms = []
        for (const classItem of allClasses) {
          for (const armName of ['A', 'B', 'C']) {
            arms.push({
              school_id: classItem.school_id,
              class_id: classItem.id,
              name: armName,
              capacity: 40,
            })
          }
        }

        const { data: createdArms, error: armError } = await supabaseAdmin
          .from('arms')
          .upsert(arms, { onConflict: 'school_id,class_id,name', ignoreDuplicates: true })
          .select()

        if (armError) {
          const msg = `Error creating arms: ${armError.message}`
          console.error('[Sync Schools Data API]', msg)
          results.errors.push(msg)
        } else {
          results.arms_created = createdArms?.length || 0
          console.log(`[Sync Schools Data API] ✅ Created ${results.arms_created} arms`)
        }
      }
    } catch (err: any) {
      const msg = `Exception creating arms: ${err.message}`
      console.error('[Sync Schools Data API]', msg)
      results.errors.push(msg)
    }

    // ========================================================================
    // STEP 6: Create class-arm combos
    // ========================================================================
    console.log('[Sync Schools Data API] STEP 6: Creating class-arm combos...')
    try {
      const { data: classesWithArms, error: fetchError } = await supabaseAdmin
        .from('classes')
        .select('id, school_id')

      if (fetchError) {
        throw fetchError
      }

      if (classesWithArms && classesWithArms.length > 0) {
        // Get all arms
        const { data: allArms, error: armError } = await supabaseAdmin
          .from('arms')
          .select('id, class_id, school_id')

        if (armError) {
          throw armError
        }

        const combos = []
        for (const classItem of classesWithArms) {
          // Find all arms for this class
          const classArms = allArms?.filter(
            a => a.class_id === classItem.id && a.school_id === classItem.school_id
          )

          for (const arm of classArms || []) {
            combos.push({
              school_id: classItem.school_id,
              class_id: classItem.id,
              arm_id: arm.id,
            })
          }
        }

        const { data: createdCombos, error: comboError } = await supabaseAdmin
          .from('class_arm_combos')
          .upsert(combos, { onConflict: 'school_id,class_id,arm_id', ignoreDuplicates: true })
          .select()

        if (comboError) {
          const msg = `Error creating combos: ${comboError.message}`
          console.error('[Sync Schools Data API]', msg)
          results.errors.push(msg)
        } else {
          results.combos_created = createdCombos?.length || 0
          console.log(`[Sync Schools Data API] ✅ Created ${results.combos_created} combos`)
        }
      }
    } catch (err: any) {
      const msg = `Exception creating combos: ${err.message}`
      console.error('[Sync Schools Data API]', msg)
      results.errors.push(msg)
    }

    // ========================================================================
    // STEP 7: Create 20 standard Nigerian curriculum subjects
    // ========================================================================
    console.log('[Sync Schools Data API] STEP 7: Creating 20 standard subjects per school...')
    try {
      const standardSubjects = [
        { code: 'ENG', name: 'English Language', type: 'CORE', department: 'ACADEMICS' },
        { code: 'MATH', name: 'Mathematics', type: 'CORE', department: 'ACADEMICS' },
        { code: 'SCIENCE', name: 'Science', type: 'CORE', department: 'ACADEMICS' },
        { code: 'SS', name: 'Social Studies', type: 'CORE', department: 'ACADEMICS' },
        { code: 'ICT', name: 'Information & Communication Technology', type: 'CORE', department: 'ACADEMICS' },
        { code: 'CRS', name: 'Christian Religious Studies', type: 'CORE', department: 'ACADEMICS' },
        { code: 'ISLAMIC', name: 'Islamic Studies', type: 'CORE', department: 'ACADEMICS' },
        { code: 'BUSINESS', name: 'Business Studies', type: 'ELECTIVE', department: 'ACADEMICS' },
        { code: 'ECONOMICS', name: 'Economics', type: 'ELECTIVE', department: 'ACADEMICS' },
        { code: 'GOVT', name: 'Government', type: 'CORE', department: 'ACADEMICS' },
        { code: 'CHEMISTRY', name: 'Chemistry', type: 'CORE', department: 'SCIENCE' },
        { code: 'PHYSICS', name: 'Physics', type: 'CORE', department: 'SCIENCE' },
        { code: 'BIOLOGY', name: 'Biology', type: 'CORE', department: 'SCIENCE' },
        { code: 'LITERATURE', name: 'Literature in English', type: 'ELECTIVE', department: 'ACADEMICS' },
        { code: 'HISTORY', name: 'History', type: 'ELECTIVE', department: 'ACADEMICS' },
        { code: 'GEOGRAPHY', name: 'Geography', type: 'ELECTIVE', department: 'ACADEMICS' },
        { code: 'PE', name: 'Physical Education', type: 'CORE', department: 'SPORTS' },
        { code: 'MUSIC', name: 'Music', type: 'ELECTIVE', department: 'ARTS' },
        { code: 'ART', name: 'Visual Art', type: 'ELECTIVE', department: 'ARTS' },
        { code: 'FRENCH', name: 'French Language', type: 'ELECTIVE', department: 'LANGUAGES' },
      ]

      const subjects = []
      for (const school of schools) {
        for (const subject of standardSubjects) {
          subjects.push({
            school_id: school.id,
            code: subject.code,
            name: subject.name,
            subject_type: subject.type,
            department: subject.department,
            is_active: true,
          })
        }
      }

      const { data: createdSubjects, error: subjectError } = await supabaseAdmin
        .from('subjects')
        .upsert(subjects, { onConflict: 'school_id,code', ignoreDuplicates: true })
        .select()

      if (subjectError) {
        const msg = `Error creating subjects: ${subjectError.message}`
        console.error('[Sync Schools Data API]', msg)
        results.errors.push(msg)
      } else {
        results.subjects_created = createdSubjects?.length || 0
        console.log(`[Sync Schools Data API] ✅ Created ${results.subjects_created} subjects`)
      }
    } catch (err: any) {
      const msg = `Exception creating subjects: ${err.message}`
      console.error('[Sync Schools Data API]', msg)
      results.errors.push(msg)
    }

    // ========================================================================
    // SUCCESS
    // ========================================================================
    console.log('[Sync Schools Data API] ✨ Sync complete!')
    console.log('[Sync Schools Data API] Results:', results)

    return NextResponse.json(
      {
        success: true,
        message: 'All schools synced with canonical academic data',
        results,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[Sync Schools Data API] Fatal error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
