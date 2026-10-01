/**
 * School Seeding Service
 * Automatically creates classes, arms, and academic sessions for new schools
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
  error?: string
}

/**
 * Auto-seed a new school with standard Nigerian curriculum classes, arms, and academic sessions
 */
export async function seedSchoolCurriculum(schoolId: string): Promise<SeedingResult> {
  console.log(`🌱 Starting to seed school ${schoolId} with classes, arms, and academic sessions...`)

  try {
    let classesCreated = 0
    let armsCreated = 0
    let combosCreated = 0
    let sessionsCreated = 0

    // 1. Create default academic session first
    console.log(`📅 Creating default academic session...`)
    try {
      // Check if session already exists
      const { data: existingSession } = await supabase
        .from('academic_sessions')
        .select('id')
        .eq('school_id', schoolId)
        .eq('session_year', '2024/2025')
        .single()

      if (!existingSession) {
        const { data: newSession, error: sessionError } = await supabase
          .from('academic_sessions')
          .insert([{
            school_id: schoolId,
            session_year: '2024/2025',
            start_year: 2024,
            end_year: 2025,
            is_active: true,
          }])
          .select()
          .single()

        if (sessionError) {
          console.error(`❌ Error creating academic session:`, sessionError)
        } else {
          console.log(`✅ Created academic session: 2024/2025`)
          sessionsCreated++
        }
      } else {
        console.log(`⏭️  Academic session already exists`)
      }
    } catch (err) {
      console.error(`❌ Exception creating academic session:`, err)
    }

    // 2. Create all classes
    console.log(`📚 Creating ${SCHOOL_CLASSES.length} classes...`)
    for (const classItem of SCHOOL_CLASSES) {
      try {
        const { data: existingClass } = await supabase
          .from('classes')
          .select('id')
          .eq('school_id', schoolId)
          .eq('name', classItem.name)
          .single()

        if (existingClass) {
          console.log(`  ⏭️  Class ${classItem.name} already exists, skipping`)
          continue
        }

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
        classesCreated++

        // Create default arms (A, B, C) for each class
        const armNames = ['A', 'B', 'C']
        for (const armName of armNames) {
          try {
            const { data: existingArm } = await supabase
              .from('arms')
              .select('id')
              .eq('class_id', newClass.id)
              .eq('name', armName)
              .single()

            if (existingArm) {
              console.log(`    ⏭️  Arm ${armName} for ${classItem.name} already exists`)
              continue
            }

            const { data: newArm, error: armError } = await supabase
              .from('arms')
              .insert({
                class_id: newClass.id,
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
            armsCreated++

            // Create class_arm_combo entry
            try {
              const { error: comboError } = await supabase
                .from('class_arm_combos')
                .insert({
                  school_id: schoolId,
                  class_id: newClass.id,
                  arm_id: newArm.id,
                })

              if (comboError) {
                console.error(`    ❌ Error creating combo for ${classItem.name}-${armName}:`, comboError)
              } else {
                console.log(`    ✅ Created combo for: ${classItem.name}-${armName}`)
                combosCreated++
              }
            } catch (comboErr) {
              console.error(`    ❌ Exception creating combo:`, comboErr)
            }
          } catch (armErr) {
            console.error(`    ❌ Error creating arm ${armName}:`, armErr)
          }
        }
      } catch (err) {
        console.error(`  ❌ Error processing class ${classItem.name}:`, err)
      }
    }

    console.log(`\n✨ Seeding complete!`)
    console.log(`  📚 Classes created: ${classesCreated}`)
    console.log(`  🔗 Arms created: ${armsCreated}`)
    console.log(`  🔀 Combos created: ${combosCreated}`)
    console.log(`  📅 Academic sessions created: ${sessionsCreated}`)

    return {
      success: true,
      classesCreated,
      armsCreated,
      combosCreated,
      subjectsCreated: 0,
      sessionsCreated,
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
      error: errorMsg,
    }
  }
}
