/**
 * School Seeding Service
 * Automatically creates classes, arms, academic sessions, terms, and subjects for new schools
 * 
 * This service ensures every new school receives complete academic data:
 * - 17 academic sessions (2024-2040)
 * - 51 terms (3 per session)
 * - 12 classes (Primary 1-6, JSS 1-3, SSS 1-3)
 * - 36 arms (3 per class: A, B, C)
 * - 36 class-arm combos
 * - 20 standard Nigerian curriculum subjects
 */

import { createClient } from '@/lib/supabase-client'

// Standard Nigerian school classes
const SCHOOL_CLASSES = [
  { name: 'Primary 1', level: 'Primary', type: 'Primary' },
  { name: 'Primary 2', level: 'Primary', type: 'Primary' },
  { name: 'Primary 3', level: 'Primary', type: 'Primary' },
  { name: 'Primary 4', level: 'Primary', type: 'Primary' },
  { name: 'Primary 5', level: 'Primary', type: 'Primary' },
  { name: 'Primary 6', level: 'Primary', type: 'Primary' },
  { name: 'JSS 1', level: 'JSS', type: 'JSS' },
  { name: 'JSS 2', level: 'JSS', type: 'JSS' },
  { name: 'JSS 3', level: 'JSS', type: 'JSS' },
  { name: 'SSS 1', level: 'SSS', type: 'SSS' },
  { name: 'SSS 2', level: 'SSS', type: 'SSS' },
  { name: 'SSS 3', level: 'SSS', type: 'SSS' },
]

// Standard Nigerian curriculum subjects
const STANDARD_SUBJECTS = [
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

// Use service key for seeding to ensure write permissions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export interface SeedingResult {
  success: boolean
  classesCreated: number
  armsCreated: number
  combosCreated: number
  subjectsCreated: number
  sessionsCreated: number
  termsCreated: number
  error?: string
}

/**
 * Auto-seed a new school with complete Nigerian curriculum:
 * - 17 academic sessions (2024-2040)
 * - 51 terms (3 per session)
 * - 12 classes
 * - 36 arms (A, B, C per class)
 * - 36 class-arm combos
 * - 20 standard subjects
 */
export async function seedSchoolCurriculum(schoolId: string): Promise<SeedingResult> {
  console.log(`🌱 Starting complete seeding for school ${schoolId}...`)

  try {
    let classesCreated = 0
    let armsCreated = 0
    let combosCreated = 0
    let sessionsCreated = 0
    let termsCreated = 0
    let subjectsCreated = 0

    // ==========================================
    // STEP 1: Create academic sessions (2024-2040, 17 total)
    // ==========================================
    console.log(`📅 Creating academic sessions (2024-2040)...`)
    try {
      const sessions = []
      for (let year = 2024; year <= 2040; year++) {
        sessions.push({
          school_id: schoolId,
          session_year: `${year}/${year + 1}`,
          start_year: year,
          end_year: year + 1,
          is_active: year === new Date().getFullYear(),
        })
      }

      // Insert all sessions with ignore on conflict
      const { data: insertedSessions, error: sessionError } = await supabase
        .from('academic_sessions')
        .upsert(sessions, { onConflict: 'school_id,session_year', ignoreDuplicates: true })
        .select()

      if (sessionError) {
        console.error(`❌ Error creating academic sessions:`, sessionError)
      } else {
        sessionsCreated = insertedSessions?.length || 0
        console.log(`✅ Created ${sessionsCreated} academic sessions`)
      }
    } catch (err) {
      console.error(`❌ Exception during session creation:`, err)
    }

    // ==========================================
    // STEP 2: Fetch sessions to create terms
    // ==========================================
    console.log(`📋 Fetching sessions to create terms...`)
    const { data: allSessions, error: fetchSessionsError } = await supabase
      .from('academic_sessions')
      .select('id, session_year, start_year')
      .eq('school_id', schoolId)

    if (fetchSessionsError) {
      console.error(`❌ Error fetching sessions:`, fetchSessionsError)
      return {
        success: false,
        classesCreated,
        armsCreated,
        combosCreated,
        subjectsCreated,
        sessionsCreated,
        termsCreated,
        error: `Failed to fetch sessions: ${fetchSessionsError.message}`,
      }
    }

    // ==========================================
    // STEP 3: Create terms (3 per session, 51 total)
    // ==========================================
    console.log(`📚 Creating terms (3 per session)...`)
    try {
      const terms = []
      if (allSessions && allSessions.length > 0) {
        for (const session of allSessions) {
          const startYear = session.start_year
          for (let termNum = 1; termNum <= 3; termNum++) {
            const startMonth = 8 + (termNum - 1) * 3 // Sept, Dec, Mar
            const endMonth = 10 + (termNum - 1) * 3 // Nov, Feb, May

            terms.push({
              school_id: schoolId,
              session_id: session.id,
              term_number: termNum,
              term_name: `Term ${termNum}`,
              start_date: `${startYear}-${String(startMonth).padStart(2, '0')}-01`,
              end_date: `${startYear}-${String(endMonth).padStart(2, '0')}-28`,
              is_active: termNum === 1,
            })
          }
        }
      }

      if (terms.length > 0) {
        const { data: insertedTerms, error: termError } = await supabase
          .from('terms')
          .upsert(terms, { onConflict: 'school_id,session_id,term_number', ignoreDuplicates: true })
          .select()

        if (termError) {
          console.error(`❌ Error creating terms:`, termError)
        } else {
          termsCreated = insertedTerms?.length || 0
          console.log(`✅ Created ${termsCreated} terms`)
        }
      }
    } catch (err) {
      console.error(`❌ Exception during term creation:`, err)
    }

    // ==========================================
    // STEP 4: Create all classes
    // ==========================================
    console.log(`📚 Creating ${SCHOOL_CLASSES.length} classes...`)
    const classMap: Record<string, string> = {} // Map class name to ID

    for (const classItem of SCHOOL_CLASSES) {
      try {
        const { data: existingClass } = await supabase
          .from('classes')
          .select('id')
          .eq('school_id', schoolId)
          .eq('name', classItem.name)
          .maybeSingle()

        let classId: string
        if (existingClass) {
          console.log(`  ⏭️  Class ${classItem.name} already exists`)
          classId = existingClass.id
        } else {
          const { data: newClass, error: createError } = await supabase
            .from('classes')
            .insert({
              school_id: schoolId,
              name: classItem.name,
              level: classItem.level,
              type: classItem.type,
            })
            .select()
            .single()

          if (createError) {
            console.error(`  ❌ Error creating class ${classItem.name}:`, createError)
            continue
          }

          console.log(`  ✅ Created class: ${classItem.name}`)
          classId = newClass.id
          classesCreated++
        }

        classMap[classItem.name] = classId

        // ==========================================
        // STEP 5: Create arms (A, B, C) for each class
        // ==========================================
        const armNames = ['A', 'B', 'C']
        const classArms: Record<string, string> = {} // Map arm name to ID

        for (const armName of armNames) {
          try {
            const { data: existingArm } = await supabase
              .from('arms')
              .select('id')
              .eq('class_id', classId)
              .eq('name', armName)
              .maybeSingle()

            let armId: string
            if (existingArm) {
              console.log(`    ⏭️  Arm ${armName} already exists`)
              armId = existingArm.id
            } else {
              const { data: newArm, error: armError } = await supabase
                .from('arms')
                .insert({
                  class_id: classId,
                  school_id: schoolId,
                  name: armName,
                  capacity: 40,
                })
                .select()
                .single()

              if (armError) {
                console.error(`    ❌ Error creating arm ${armName}:`, armError)
                continue
              }

              console.log(`    ✅ Created arm: ${classItem.name}-${armName}`)
              armId = newArm.id
              armsCreated++
            }

            classArms[armName] = armId

            // ==========================================
            // STEP 6: Create class-arm combo
            // ==========================================
            try {
              const { data: existingCombo } = await supabase
                .from('class_arm_combos')
                .select('id')
                .eq('school_id', schoolId)
                .eq('class_id', classId)
                .eq('arm_id', armId)
                .maybeSingle()

              if (existingCombo) {
                console.log(`    ⏭️  Combo for ${classItem.name}-${armName} already exists`)
              } else {
                const { error: comboError } = await supabase
                  .from('class_arm_combos')
                  .insert({
                    school_id: schoolId,
                    class_id: classId,
                    arm_id: armId,
                  })

                if (comboError) {
                  console.error(`    ❌ Error creating combo:`, comboError)
                } else {
                  console.log(`    ✅ Created combo: ${classItem.name}-${armName}`)
                  combosCreated++
                }
              }
            } catch (comboErr) {
              console.error(`    ❌ Exception creating combo:`, comboErr)
            }
          } catch (armErr) {
            console.error(`    ❌ Exception creating arm ${armName}:`, armErr)
          }
        }
      } catch (err) {
        console.error(`  ❌ Error processing class ${classItem.name}:`, err)
      }
    }

    // ==========================================
    // STEP 7: Create standard subjects (20 total)
    // ==========================================
    console.log(`📖 Creating ${STANDARD_SUBJECTS.length} standard subjects...`)
    try {
      const subjects = STANDARD_SUBJECTS.map(subject => ({
        school_id: schoolId,
        code: subject.code,
        name: subject.name,
        subject_type: subject.type,
        department: subject.department,
        is_active: true,
      }))

      const { data: insertedSubjects, error: subjectError } = await supabase
        .from('subjects')
        .upsert(subjects, { onConflict: 'school_id,code', ignoreDuplicates: true })
        .select()

      if (subjectError) {
        console.error(`❌ Error creating subjects:`, subjectError)
      } else {
        subjectsCreated = insertedSubjects?.length || 0
        console.log(`✅ Created ${subjectsCreated} subjects`)
      }
    } catch (err) {
      console.error(`❌ Exception during subject creation:`, err)
    }

    console.log(`\n✨ Seeding complete!`)
    console.log(`  📅 Academic sessions: ${sessionsCreated}`)
    console.log(`  📋 Terms: ${termsCreated}`)
    console.log(`  📚 Classes: ${classesCreated}`)
    console.log(`  🔗 Arms: ${armsCreated}`)
    console.log(`  🔀 Class-arm combos: ${combosCreated}`)
    console.log(`  📖 Subjects: ${subjectsCreated}`)

    return {
      success: true,
      classesCreated,
      armsCreated,
      combosCreated,
      subjectsCreated,
      sessionsCreated,
      termsCreated,
    }
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error during seeding'
    console.error(`❌ Error seeding school: ${errorMsg}`)
    return {
      success: false,
      classesCreated: 0,
      armsCreated: 0,
      combosCreated: 0,
      subjectsCreated: 0,
      sessionsCreated: 0,
      termsCreated: 0,
      error: errorMsg,
    }
  }
}
