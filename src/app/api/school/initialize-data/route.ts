/**
 * Initialize Complete Academic Data for New Schools
 * POST /api/school/initialize-data?schoolId=<uuid>
 * 
 * Auto-provisions a new school with:
 * - Academic sessions (2024-2040)
 * - Terms (1, 2, 3)
 * - Classes (JSS1-SS3 or Primary-SS3)
 * - Arms (A, B, C, D)
 * - Complete Nigerian curriculum subjects
 * - Score sheets for all combinations
 * 
 * Called automatically when a school registers.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const schoolId = request.nextUrl.searchParams.get('schoolId')

  try {
    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required', success: false },
        { status: 400 }
      )
    }

    console.log('[School Init API] Initializing complete data for school:', schoolId)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // STEP 1: Create Academic Sessions (2024-2040)
    console.log('[School Init API] Step 1: Creating academic sessions...')
    const sessions = []
    for (let year = 2024; year <= 2040; year++) {
      sessions.push({
        school_id: schoolId,
        session_name: `${year}/${year + 1}`,
        start_date: `${year}-09-01`,
        end_date: `${year + 1}-08-31`,
        is_current: year === new Date().getFullYear(),
        status: 'ACTIVE',
      })
    }

    const { error: sessionError } = await supabase
      .from('academic_sessions')
      .upsert(sessions, { onConflict: 'school_id,session_name' })

    if (sessionError) {
      console.warn('[School Init API] Sessions warning:', sessionError.message)
    } else {
      console.log('[School Init API] ✅ Created', sessions.length, 'academic sessions')
    }

    // Get current session ID for reference
    const { data: currentSession } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('school_id', schoolId)
      .eq('is_current', true)
      .single()

    const sessionId = currentSession?.id

    // STEP 2: Create Terms for each session
    console.log('[School Init API] Step 2: Creating terms...')
    const terms = []
    for (let year = 2024; year <= 2040; year++) {
      const { data: sess } = await supabase
        .from('academic_sessions')
        .select('id')
        .eq('school_id', schoolId)
        .eq('session_name', `${year}/${year + 1}`)
        .single()

      if (sess?.id) {
        for (let term = 1; term <= 3; term++) {
          terms.push({
            school_id: schoolId,
            session_id: sess.id,
            term_number: term,
            term_name: `Term ${term}`,
            start_date: `${year}-${9 + (term - 1) * 3}-01`,
            end_date: `${year}-${11 + (term - 1) * 3}-30`,
            status: 'ACTIVE',
          })
        }
      }
    }

    const { error: termError } = await supabase
      .from('terms')
      .upsert(terms, { onConflict: 'school_id,session_id,term_number' })

    if (termError) {
      console.warn('[School Init API] Terms warning:', termError.message)
    } else {
      console.log('[School Init API] ✅ Created', terms.length, 'terms')
    }

    // STEP 3: Create Classes (JSS1-SS3 for secondary, or adapt for mixed schools)
    console.log('[School Init API] Step 3: Creating classes...')
    const classNames = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3']
    const classes = []

    for (let i = 0; i < classNames.length; i++) {
      classes.push({
        school_id: schoolId,
        name: classNames[i],
        level: i + 1,
        type: i < 3 ? 'JUNIOR' : 'SENIOR',
        status: 'ACTIVE',
      })
    }

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .upsert(classes, { onConflict: 'school_id,name' })
      .select()

    if (classError) {
      console.warn('[School Init API] Classes warning:', classError.message)
    } else {
      console.log('[School Init API] ✅ Created', classes.length, 'classes')
    }

    // STEP 4: Create Arms (A, B, C, D) for each class
    console.log('[School Init API] Step 4: Creating arms...')
    const armLetters = ['A', 'B', 'C', 'D']
    const arms = []

    if (classData && Array.isArray(classData)) {
      for (const classRecord of classData) {
        for (const letter of armLetters) {
          arms.push({
            school_id: schoolId,
            class_id: classRecord.id,
            name: letter,
            status: 'ACTIVE',
          })
        }
      }
    }

    const { data: armData, error: armError } = await supabase
      .from('arms')
      .upsert(arms, { onConflict: 'school_id,class_id,name' })
      .select()

    if (armError) {
      console.warn('[School Init API] Arms warning:', armError.message)
    } else {
      console.log('[School Init API] ✅ Created', arms.length, 'arms')
    }

    // STEP 5: Create class-arm combos
    console.log('[School Init API] Step 5: Creating class-arm combos...')
    const combos = []

    if (classData && armData) {
      for (const classRecord of classData) {
        const classArms = armData.filter((a: any) => a.class_id === classRecord.id)
        for (const arm of classArms) {
          combos.push({
            school_id: schoolId,
            class_id: classRecord.id,
            arm_id: arm.id,
            class_teacher_id: null,
            status: 'ACTIVE',
          })
        }
      }
    }

    const { error: comboError } = await supabase
      .from('class_arm_combos')
      .upsert(combos, { onConflict: 'school_id,class_id,arm_id' })

    if (comboError) {
      console.warn('[School Init API] Combos warning:', comboError.message)
    } else {
      console.log('[School Init API] ✅ Created', combos.length, 'class-arm combos')
    }

    // STEP 6: Get or create all subjects
    console.log('[School Init API] Step 6: Ensuring subjects exist...')
    const subjectsList = [
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

    const { data: existingSubjects } = await supabase
      .from('subjects')
      .select('code')
      .eq('school_id', schoolId)

    const existingCodes = new Set(existingSubjects?.map((s: any) => s.code) || [])
    const subjectsToCreate = subjectsList.filter((s) => !existingCodes.has(s.code))

    const subjectsWithSchoolId = subjectsToCreate.map((s) => ({
      school_id: schoolId,
      ...s,
    }))

    if (subjectsWithSchoolId.length > 0) {
      const { error: subjectError } = await supabase
        .from('subjects')
        .insert(subjectsWithSchoolId)

      if (subjectError) {
        console.warn('[School Init API] Subjects warning:', subjectError.message)
      } else {
        console.log('[School Init API] ✅ Created', subjectsWithSchoolId.length, 'subjects')
      }
    } else {
      console.log('[School Init API] ✅ All subjects already exist')
    }

    // STEP 7: Create score sheets for current term
    console.log('[School Init API] Step 7: Creating score sheets...')
    if (sessionId) {
      const { data: currentTerm } = await supabase
        .from('terms')
        .select('id')
        .eq('school_id', schoolId)
        .eq('session_id', sessionId)
        .eq('term_number', 1)
        .single()

      if (currentTerm?.id && classData && armData) {
        const scoreSheets = []

        for (const classRecord of classData) {
          const classArms = armData.filter((a: any) => a.class_id === classRecord.id)
          for (const arm of classArms) {
            scoreSheets.push({
              school_id: schoolId,
              class_id: classRecord.id,
              arm_id: arm.id,
              term_id: currentTerm.id,
              session_id: sessionId,
              status: 'ACTIVE',
            })
          }
        }

        const { error: scoreError } = await supabase
          .from('score_sheets')
          .upsert(scoreSheets, { onConflict: 'school_id,class_id,arm_id,term_id' })

        if (scoreError) {
          console.warn('[School Init API] Score sheets warning:', scoreError.message)
        } else {
          console.log('[School Init API] ✅ Created', scoreSheets.length, 'score sheets')
        }
      }
    }

    const elapsed = Date.now() - startTime
    console.log(`[School Init API] ✅ Complete initialization in ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      data: {
        schoolId,
        sessionsCreated: sessions.length,
        termsCreated: terms.length,
        classesCreated: classes.length,
        armsCreated: arms.length,
        combosCreated: combos.length,
        subjectsCreated: subjectsToCreate.length,
      },
      message: 'School data initialized successfully',
    })
  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error(`[School Init API] ❌ Error after ${elapsed}ms:`, {
      message: error.message,
      stack: error.stack?.substring(0, 300),
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'School initialization failed',
      },
      { status: 500 }
    )
  }
}
