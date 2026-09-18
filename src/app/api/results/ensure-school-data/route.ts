import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/results/ensure-school-data?schoolId=...
 * 
 * Ensures a school has academic sessions, terms, and classes
 * Automatically creates them if they don't exist
 * Called on result page load to guarantee data availability
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    console.log('[EnsureData] Checking school data:', schoolId)

    if (!schoolId) {
      return NextResponse.json(
        { error: 'Missing schoolId parameter' },
        { status: 400 }
      )
    }

    // ========================================================================
    // STEP 1: Check if school exists
    // ========================================================================
    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name')
      .eq('id', schoolId)
      .single()

    if (schoolError || !school) {
      console.error('[EnsureData] School not found:', schoolId)
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    console.log('[EnsureData] School found:', school.name)

    // ========================================================================
    // STEP 2: Check if sessions exist, create if not
    // ========================================================================
    const { data: existingSessions } = await supabase
      .from('academic_sessions')
      .select('id')
      .eq('school_id', schoolId)

    let sessionId: string | null = null

    if (!existingSessions || existingSessions.length === 0) {
      console.log('[EnsureData] No sessions found, creating 2025/2026...')

      const { data: newSession, error: sessionError } = await supabase
        .from('academic_sessions')
        .insert({
          school_id: schoolId,
          session_year: '2025/2026',
          is_active: true,
        })
        .select('id')
        .single()

      if (sessionError) {
        console.error('[EnsureData] Error creating session:', sessionError)
        throw sessionError
      }

      sessionId = newSession.id
      console.log('[EnsureData] Session created:', sessionId)
    } else {
      sessionId = existingSessions[0].id
      console.log('[EnsureData] Session already exists:', sessionId)
    }

    // ========================================================================
    // STEP 3: Check if terms exist, create if not
    // ========================================================================
    const { data: existingTerms } = await supabase
      .from('academic_terms')
      .select('id')
      .eq('session_id', sessionId)

    if (!existingTerms || existingTerms.length === 0) {
      console.log('[EnsureData] No terms found, creating 3 terms...')

      const termData = [
        {
          session_id: sessionId,
          school_id: schoolId,
          term_name: 'First Term',
          term_order: 1,
          is_active: true,
          start_date: '2025-09-01',
          end_date: '2025-11-30',
        },
        {
          session_id: sessionId,
          school_id: schoolId,
          term_name: 'Second Term',
          term_order: 2,
          is_active: false,
          start_date: '2025-12-01',
          end_date: '2026-02-28',
        },
        {
          session_id: sessionId,
          school_id: schoolId,
          term_name: 'Third Term',
          term_order: 3,
          is_active: false,
          start_date: '2026-03-01',
          end_date: '2026-05-31',
        },
      ]

      for (const term of termData) {
        const { error: termError } = await supabase
          .from('academic_terms')
          .insert(term)

        if (termError) {
          console.error('[EnsureData] Error creating term:', termError)
          // Continue - one failure shouldn't stop others
        }
      }

      console.log('[EnsureData] Terms created')
    } else {
      console.log('[EnsureData] Terms already exist:', existingTerms.length)
    }

    // ========================================================================
    // STEP 4: Check if classes exist, create if not
    // ========================================================================
    const { data: existingClasses } = await supabase
      .from('class_arm_combos')
      .select('id')
      .eq('school_id', schoolId)

    if (!existingClasses || existingClasses.length === 0) {
      console.log('[EnsureData] No classes found, creating standard structure...')

      // Create standard classes
      const classNames = [
        'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6',
        'JSS 1', 'JSS 2', 'JSS 3',
        'SS 1', 'SS 2', 'SS 3'
      ]

      const arms = ['A', 'B', 'C']

      for (const className of classNames) {
        // Create class
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .insert({
            school_id: schoolId,
            name: className,
            level: classNames.indexOf(className) + 1,
          })
          .select('id')
          .single()

        if (classError) {
          console.error('[EnsureData] Error creating class:', classError)
          continue
        }

        const classId = classData.id

        // Create arms for each class
        for (const armName of arms) {
          const { data: armData, error: armError } = await supabase
            .from('arms')
            .insert({
              school_id: schoolId,
              class_id: classId,
              name: armName,
              capacity: 40,
            })
            .select('id')
            .single()

          if (armError) {
            console.error('[EnsureData] Error creating arm:', armError)
            continue
          }

          const armId = armData.id

          // Create class-arm combo
          const { data: comboData, error: comboError } = await supabase
            .from('class_arm_combos')
            .insert({
              school_id: schoolId,
              class_id: classId,
              arm_id: armId,
            })
            .select('id')
            .single()

          if (comboError) {
            console.error('[EnsureData] Error creating combo:', comboError)
            continue
          }

          // Auto-create 10 test students for each class-arm combo
          console.log(`[EnsureData] Creating test students for ${className} ${armName}...`)
          const classComboId = comboData.id

          for (let i = 1; i <= 10; i++) {
            const admissionNumber = `${className.replace(/\s+/g, '').toUpperCase()}${armName}${String(i).padStart(3, '0')}`

            // Create student record (simulate without full user creation for performance)
            const { error: studentError } = await supabase
              .from('students')
              .insert({
                school_id: schoolId,
                class_arm_combo_id: classComboId,
                admission_number: admissionNumber,
                date_of_birth: `${2010 + Math.floor(Math.random() * 5)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
              })

            if (studentError) {
              console.warn(`[EnsureData] Warning creating student ${admissionNumber}:`, studentError.message)
            }
          }

          console.log(`[EnsureData] Created 10 test students for ${className} ${armName}`)
        }
      }

      console.log('[EnsureData] Classes, arms, and test students created')
    } else {
      console.log('[EnsureData] Classes already exist:', existingClasses.length)
    }

    // ========================================================================
    // STEP 5: Return success
    // ========================================================================
    return NextResponse.json({
      success: true,
      message: 'School data ensured',
      school_id: schoolId,
      school_name: school.name,
    })
  } catch (error: any) {
    console.error('[EnsureData] Exception:', error)
    return NextResponse.json(
      {
        error: 'Failed to ensure school data',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
