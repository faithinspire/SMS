/**
 * School Seeding Service
 * Automatically creates classes, arms, and subjects for new schools
 */

import { createClient } from '@supabase/supabase-js'
import { SCHOOL_CLASSES, NIGERIAN_SUBJECTS, DEPARTMENTS } from '@/constants/nigerian-subjects'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface SeedingResult {
  success: boolean
  classesCreated: number
  armsCreated: number
  subjectsCreated: number
  error?: string
}

/**
 * Auto-seed a new school with standard Nigerian curriculum classes and subjects
 */
export async function seedSchoolCurriculum(schoolId: string): Promise<SeedingResult> {
  console.log(`🌱 Starting to seed school ${schoolId} with Nigerian curriculum...`)

  try {
    let classesCreated = 0
    let armsCreated = 0
    let subjectsCreated = 0

    // 1. Create all classes
    console.log(`📚 Creating ${SCHOOL_CLASSES.length} classes...`)
    for (const classItem of SCHOOL_CLASSES) {
      try {
        const { data: existingClass, error: checkError } = await supabase
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
            const { data: existingArm, error: checkArmError } = await supabase
              .from('arms')
              .select('id')
              .eq('class_id', newClass.id)
              .eq('name', armName)
              .single()

            if (existingArm) {
              console.log(`    ⏭️  Arm ${armName} for ${classItem.name} already exists`)
              continue
            }

            const { error: armError } = await supabase
              .from('arms')
              .insert({
                class_id: newClass.id,
                school_id: schoolId,
                name: armName,
                capacity: 40,
              })

            if (armError) {
              console.error(`    ❌ Error creating arm ${armName}:`, armError)
              continue
            }

            console.log(`    ✅ Created arm: ${classItem.name}-${armName}`)
            armsCreated++
          } catch (armErr) {
            console.error(`    ❌ Error creating arm ${armName}:`, armErr)
          }
        }
      } catch (err) {
        console.error(`  ❌ Error processing class ${classItem.name}:`, err)
      }
    }

    // 2. Create all subjects
    console.log(`📖 Creating subjects...`)

    // Get all primary subjects
    const primarySubjects = NIGERIAN_SUBJECTS.PRIMARY || []
    for (const subject of primarySubjects) {
      try {
        const { data: existingSubject, error: checkError } = await supabase
          .from('subjects')
          .select('id')
          .eq('school_id', schoolId)
          .eq('name', subject.name)
          .single()

        if (existingSubject) {
          console.log(`  ⏭️  Subject ${subject.name} already exists`)
          continue
        }

        // Find applicable levels for this subject (1-6 for primary)
        const applicableLevels = [1, 2, 3, 4, 5, 6]

        const { error: createError } = await supabase
          .from('subjects')
          .insert({
            school_id: schoolId,
            name: subject.name,
            code: subject.code,
            applicable_to_levels: applicableLevels,
          })

        if (createError) {
          console.error(`  ❌ Error creating subject ${subject.name}:`, createError)
          continue
        }

        console.log(`  ✅ Created subject: ${subject.name}`)
        subjectsCreated++
      } catch (err) {
        console.error(`  ❌ Error creating subject ${subject.name}:`, err)
      }
    }

    // Get all secondary subjects (from all categories)
    const secondarySubjects = [
      ...NIGERIAN_SUBJECTS.SECONDARY.COMMON,
      ...NIGERIAN_SUBJECTS.SECONDARY.SCIENCES,
      ...NIGERIAN_SUBJECTS.SECONDARY.COMMERCIAL,
      ...NIGERIAN_SUBJECTS.SECONDARY.HUMANITIES,
      ...NIGERIAN_SUBJECTS.SECONDARY.LANGUAGES,
      ...NIGERIAN_SUBJECTS.SECONDARY.TECHNICAL,
    ]

    for (const subject of secondarySubjects) {
      try {
        const { data: existingSubject, error: checkError } = await supabase
          .from('subjects')
          .select('id')
          .eq('school_id', schoolId)
          .eq('name', subject.name)
          .single()

        if (existingSubject) {
          console.log(`  ⏭️  Subject ${subject.name} already exists`)
          continue
        }

        // Find applicable levels for this subject (7-12 for secondary: JSS1-SS3)
        const applicableLevels = [7, 8, 9, 10, 11, 12]

        const { error: createError } = await supabase
          .from('subjects')
          .insert({
            school_id: schoolId,
            name: subject.name,
            code: subject.code,
            applicable_to_levels: applicableLevels,
          })

        if (createError) {
          console.error(`  ❌ Error creating subject ${subject.name}:`, createError)
          continue
        }

        console.log(`  ✅ Created subject: ${subject.name}`)
        subjectsCreated++
      } catch (err) {
        console.error(`  ❌ Error creating subject ${subject.name}:`, err)
      }
    }

    console.log(`\n✨ Seeding complete!`)
    console.log(`  📚 Classes created: ${classesCreated}`)
    console.log(`  🔗 Arms created: ${armsCreated}`)
    console.log(`  📖 Subjects created: ${subjectsCreated}`)

    return {
      success: true,
      classesCreated,
      armsCreated,
      subjectsCreated,
    }
  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error during seeding'
    console.error(`❌ Error seeding school: ${errorMsg}`)
    return {
      success: false,
      classesCreated: 0,
      armsCreated: 0,
      subjectsCreated: 0,
      error: errorMsg,
    }
  }
}
