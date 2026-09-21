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
    // STEP 2: Check if classes exist, create if not
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
            const studentName = `Student ${admissionNumber}`
            const studentEmail = `student.${admissionNumber}@school.local`

            // STEP 1: Create user account for the student
            const { data: userData, error: userError } = await supabase
              .auth.admin.createUser({
                email: studentEmail,
                password: 'TestPassword123!',
                email_confirm: true,
                user_metadata: {
                  role: 'STUDENT',
                  full_name: studentName,
                },
              })

            if (userError) {
              console.warn(`[EnsureData] Warning creating user for ${admissionNumber}:`, userError.message)
              continue
            }

            const userId = userData.user.id

            // STEP 2: Create student record with user_id
            const dateOfBirth = `${2010 + Math.floor(Math.random() * 5)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`

            const { data: studentData, error: studentError } = await supabase
              .from('students')
              .insert({
                user_id: userId,
                school_id: schoolId,
                class_arm_combo_id: classComboId,
                admission_number: admissionNumber,
                date_of_birth: dateOfBirth,
              })
              .select('id')
              .single()

            if (studentError) {
              console.warn(`[EnsureData] Warning creating student ${admissionNumber}:`, studentError.message)
              continue
            }

            const studentId = studentData.id

            // STEP 3: Enroll student in class-applicable subjects
            // Determine class level based on class name
            let classLevelNumber = 0
            if (className.includes('Primary')) {
              const primaryMatch = className.match(/\d+/)
              classLevelNumber = primaryMatch ? parseInt(primaryMatch[0]) : 0
            } else if (className.includes('JSS')) {
              const jssMatch = className.match(/\d+/)
              classLevelNumber = jssMatch ? 8 + parseInt(jssMatch[0]) : 0 // JSS1=9, JSS2=10, JSS3=11
            } else if (className.includes('SS')) {
              const ssMatch = className.match(/\d+/)
              classLevelNumber = ssMatch ? 11 + parseInt(ssMatch[0]) : 0 // SS1=12, SS2=13, SS3=14
            }

            if (classLevelNumber > 0) {
              console.log(`[EnsureData] Enrolling ${studentName} in subjects for level ${classLevelNumber}...`)

              // Fetch all subjects applicable to this level
              const { data: applicableSubjects, error: subjectsError } = await supabase
                .from('subjects')
                .select('id')
                .eq('school_id', schoolId)
                .eq('is_active', true)
                .contains('applicable_to_levels', [classLevelNumber])

              if (subjectsError) {
                console.warn(`[EnsureData] Error fetching subjects for level ${classLevelNumber}:`, subjectsError.message)
              } else if (applicableSubjects && applicableSubjects.length > 0) {
                // Enroll in all applicable subjects
                const enrollmentData = applicableSubjects.map((subject) => ({
                  student_id: studentId,
                  subject_id: subject.id,
                  school_id: schoolId,
                }))

                const { error: enrollError } = await supabase
                  .from('student_subjects')
                  .insert(enrollmentData)

                if (enrollError) {
                  console.warn(`[EnsureData] Warning enrolling ${studentName} in subjects:`, enrollError.message)
                } else {
                  console.log(`[EnsureData] ✅ ${studentName} enrolled in ${applicableSubjects.length} subjects`)
                }
              } else {
                console.warn(`[EnsureData] No subjects found for level ${classLevelNumber}`)
              }
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
    // STEP 3: Return success
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
