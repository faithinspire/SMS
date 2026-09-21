import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/ensure-complete-school-data
 * 
 * Ensures a school has ALL required base data:
 * - Academic sessions (2025/2026 - 2060/2061)
 * - Academic terms (First, Second, Third)
 * - Streams (Science, Commercial, Humanities, Technical)
 * - Classes (Nursery to SS 3)
 * - Arms (A, B, C)
 * - Class-Arm Combos
 * - Subjects (23 total: Primary, Secondary, SSS)
 * 
 * This ensures new features (broadcasts, lessons, assignments, CBT) work for ALL schools.
 * 
 * REQUEST:
 * {
 *   school_id?: string (optional - if not provided, applies to all schools)
 * }
 * 
 * RESPONSE:
 * {
 *   success: boolean,
 *   schools_processed: number,
 *   sessions_created: number,
 *   terms_created: number,
 *   streams_created: number,
 *   classes_created: number,
 *   arms_created: number,
 *   combos_created: number,
 *   subjects_created: number,
 *   message: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const schoolId = body.school_id

    console.log('[EnsureSchoolData] Starting data population:', {
      schoolId: schoolId || 'ALL SCHOOLS',
      timestamp: new Date().toISOString(),
    })

    let stats = {
      schoolsProcessed: 0,
      sessionsCreated: 0,
      termsCreated: 0,
      streamsCreated: 0,
      classesCreated: 0,
      armsCreated: 0,
      combosCreated: 0,
      subjectsCreated: 0,
    }

    // ========================================================================
    // STEP 1: Get list of schools to process
    // ========================================================================
    let schoolIds: string[] = []

    if (schoolId) {
      const { data: school, error: schoolError } = await supabase
        .from('schools')
        .select('id')
        .eq('id', schoolId)
        .single()

      if (schoolError || !school) {
        return NextResponse.json(
          { error: 'School not found', school_id: schoolId },
          { status: 404 }
        )
      }

      schoolIds = [schoolId]
    } else {
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('id')

      if (schoolsError || !schools) {
        return NextResponse.json(
          { error: 'Failed to fetch schools', details: schoolsError?.message },
          { status: 500 }
        )
      }

      schoolIds = schools.map((s: any) => s.id)
    }

    stats.schoolsProcessed = schoolIds.length
    console.log('[EnsureSchoolData] Processing', schoolIds.length, 'school(s)')

    // ========================================================================
    // STEP 2: For each school, ensure it has academic sessions
    // ========================================================================
    console.log('[EnsureSchoolData] Ensuring academic sessions...')

    for (const sid of schoolIds) {
      // Check if school has sessions
      const { data: existingSessions } = await supabase
        .from('academic_sessions')
        .select('id')
        .eq('school_id', sid)

      if (!existingSessions || existingSessions.length === 0) {
        // Create sessions 2025-2060
        for (let year = 2025; year <= 2060; year++) {
          const { error: sessionError } = await supabase
            .from('academic_sessions')
            .insert({
              school_id: sid,
              session_year: `${year}/${year + 1}`,
              start_year: year,
              end_year: year + 1,
              is_active: year === 2025,
            })

          if (!sessionError) {
            stats.sessionsCreated++
          }
        }
      }
    }

    // ========================================================================
    // STEP 3: For each school, ensure it has academic terms
    // ========================================================================
    console.log('[EnsureSchoolData] Ensuring academic terms...')

    const termDefinitions = [
      { name: 'First Term', order: 1 },
      { name: 'Second Term', order: 2 },
      { name: 'Third Term', order: 3 },
    ]

    for (const sid of schoolIds) {
      const { data: sessions } = await supabase
        .from('academic_sessions')
        .select('id')
        .eq('school_id', sid)

      for (const session of sessions || []) {
        for (const term of termDefinitions) {
          const { error: termError } = await supabase
            .from('academic_terms')
            .insert({
              session_id: session.id,
              school_id: sid,
              term_name: term.name,
              term_order: term.order,
              start_date: term.order === 1 ? '2025-09-01' : term.order === 2 ? '2025-12-01' : '2026-04-01',
              end_date: term.order === 1 ? '2025-11-30' : term.order === 2 ? '2026-03-31' : '2026-07-31',
              is_active: term.order === 1,
            })

          if (!termError) {
            stats.termsCreated++
          }
        }
      }
    }

    // ========================================================================
    // STEP 4: For each school, ensure it has streams
    // ========================================================================
    console.log('[EnsureSchoolData] Ensuring streams...')

    const streamNames = ['Science', 'Commercial', 'Humanities', 'Technical']

    for (const sid of schoolIds) {
      for (const streamName of streamNames) {
        const { error: streamError } = await supabase
          .from('streams')
          .insert({
            school_id: sid,
            name: streamName,
          })

        if (!streamError) {
          stats.streamsCreated++
        }
      }
    }

    // ========================================================================
    // STEP 5: For each school, ensure it has complete class structure
    // ========================================================================
    console.log('[EnsureSchoolData] Ensuring classes and arms...')

    const classDefinitions = [
      // Primary classes
      { name: 'Nursery', level: 1, type: 'PRIMARY' },
      { name: 'Kindergarten', level: 2, type: 'PRIMARY' },
      { name: 'Primary 1', level: 3, type: 'PRIMARY' },
      { name: 'Primary 2', level: 4, type: 'PRIMARY' },
      { name: 'Primary 3', level: 5, type: 'PRIMARY' },
      { name: 'Primary 4', level: 6, type: 'PRIMARY' },
      { name: 'Primary 5', level: 7, type: 'PRIMARY' },
      { name: 'Primary 6', level: 8, type: 'PRIMARY' },
      // Secondary classes
      { name: 'JSS 1', level: 9, type: 'SECONDARY' },
      { name: 'JSS 2', level: 10, type: 'SECONDARY' },
      { name: 'JSS 3', level: 11, type: 'SECONDARY' },
      { name: 'SS 1', level: 12, type: 'SECONDARY' },
      { name: 'SS 2', level: 13, type: 'SECONDARY' },
      { name: 'SS 3', level: 14, type: 'SECONDARY' },
    ]

    const armNames = ['A', 'B', 'C']

    for (const sid of schoolIds) {
      for (const classDef of classDefinitions) {
        // Check if class already exists
        const { data: existingClass } = await supabase
          .from('classes')
          .select('id')
          .eq('school_id', sid)
          .eq('name', classDef.name)
          .single()

        let classId = existingClass?.id

        // If doesn't exist, create it
        if (!classId) {
          const { data: newClass, error: classError } = await supabase
            .from('classes')
            .insert({
              school_id: sid,
              name: classDef.name,
              level: classDef.level,
              type: classDef.type,
            })
            .select('id')
            .single()

          if (!classError && newClass) {
            classId = newClass.id
            stats.classesCreated++
          }
        }

        // Create arms for this class
        if (classId) {
          for (const armName of armNames) {
            // Check if arm already exists
            const { data: existingArm } = await supabase
              .from('arms')
              .select('id')
              .eq('class_id', classId)
              .eq('name', armName)
              .single()

            let armId = existingArm?.id

            // If doesn't exist, create it
            if (!armId) {
              const { data: newArm, error: armError } = await supabase
                .from('arms')
                .insert({
                  class_id: classId,
                  school_id: sid,
                  name: armName,
                  capacity: 40,
                })
                .select('id')
                .single()

              if (!armError && newArm) {
                armId = newArm.id
                stats.armsCreated++
              }
            }

            // Create class-arm combo
            if (armId) {
              const { error: comboError } = await supabase
                .from('class_arm_combos')
                .insert({
                  school_id: sid,
                  class_id: classId,
                  arm_id: armId,
                })

              if (!comboError) {
                stats.combosCreated++
              }
            }
          }
        }
      }
    }

    // ========================================================================
    // STEP 6: For each school, ensure it has complete subject catalog
    // ========================================================================
    console.log('[EnsureSchoolData] Ensuring subjects...')

    const subjectDefinitions = [
      // Primary subjects (1-8)
      { name: 'English Language', code: 'ENG', levels: [1, 2, 3, 4, 5, 6, 7, 8] },
      { name: 'Mathematics', code: 'MATH', levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
      { name: 'Science', code: 'SCI', levels: [1, 2, 3, 4, 5, 6, 7, 8] },
      { name: 'Social Studies', code: 'SS', levels: [1, 2, 3, 4, 5, 6, 7, 8] },
      { name: 'Civic Education', code: 'CIV', levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
      { name: 'Physical Education', code: 'PE', levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
      { name: 'Art & Craft', code: 'ART', levels: [1, 2, 3, 4, 5, 6, 7, 8] },
      { name: 'Music', code: 'MUS', levels: [1, 2, 3, 4, 5, 6, 7, 8] },
      { name: 'Home Economics', code: 'HE', levels: [1, 2, 3, 4, 5, 6, 7, 8] },
      { name: 'Information Technology', code: 'ICT', levels: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] },
      // Secondary subjects (9-11)
      { name: 'English', code: 'ENG', levels: [9, 10, 11, 12, 13, 14] },
      { name: 'Biology', code: 'BIO', levels: [9, 10, 11, 12, 13, 14] },
      { name: 'Chemistry', code: 'CHEM', levels: [9, 10, 11, 12, 13, 14] },
      { name: 'Physics', code: 'PHY', levels: [9, 10, 11, 12, 13, 14] },
      { name: 'History', code: 'HIST', levels: [9, 10, 11, 12, 13, 14] },
      { name: 'Geography', code: 'GEO', levels: [9, 10, 11, 12, 13, 14] },
      { name: 'Agricultural Science', code: 'AGR', levels: [9, 10, 11, 12, 13, 14] },
      { name: 'Technical Drawing', code: 'TD', levels: [9, 10, 11, 12, 13, 14] },
      { name: 'Computer Science', code: 'CS', levels: [9, 10, 11, 12, 13, 14] },
      // SSS subjects (12-14)
      { name: 'Economics', code: 'ECON', levels: [12, 13, 14] },
      { name: 'Accounting', code: 'ACC', levels: [12, 13, 14] },
      { name: 'Government', code: 'GOV', levels: [12, 13, 14] },
      { name: 'Literature In English', code: 'LIT', levels: [12, 13, 14] },
      { name: 'Further Mathematics', code: 'FM', levels: [12, 13, 14] },
    ]

    for (const sid of schoolIds) {
      for (const subjectDef of subjectDefinitions) {
        const { error: subjectError } = await supabase
          .from('subjects')
          .insert({
            school_id: sid,
            name: subjectDef.name,
            code: subjectDef.code,
            applicable_to_levels: subjectDef.levels,
          })

        if (!subjectError) {
          stats.subjectsCreated++
        }
      }
    }

    console.log('[EnsureSchoolData] Backfill complete:', stats)

    return NextResponse.json({
      success: true,
      ...stats,
      message: `✅ Ensured complete data for ${stats.schoolsProcessed} school(s)`,
    })
  } catch (error: any) {
    console.error('[EnsureSchoolData] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
