/**
 * SCHOOL CURRICULUM INITIALIZATION SERVICE
 * 
 * PURPOSE: Automatically initialize a new school's curriculum
 * with the complete Nigerian curriculum (PREP-SS3)
 * 
 * WHEN USED:
 * - Called when a new school is created (via API or admin panel)
 * - Triggered by database trigger on schools table
 * - Called manually for existing schools that need curriculum backfill
 * 
 * GUARANTEES:
 * - Every school has complete subject curriculum immediately after creation
 * - No manual admin work needed to populate subjects
 * - All registrations (teacher/student) see full subject list for their level
 * - Consistent curriculum across all schools
 */

import { supabase as serverSupabase } from '@/lib/supabase-server'
import { CanonicalSubjectService } from './canonical-subject.service'

export interface CurriculumInitResult {
  success: boolean
  schoolId: string
  subjectsCreated: number
  message: string
  errors?: string[]
}

export class SchoolCurriculumInitService {
  /**
   * Initialize curriculum for a single school
   * Creates all canonical subjects for this school if they don't exist
   */
  static async initializeSchoolCurriculum(schoolId: string): Promise<CurriculumInitResult> {
    const errors: string[] = []
    let subjectsCreated = 0

    try {
      console.log(`🎓 Initializing curriculum for school: ${schoolId}`)

      // Get all canonical subjects that should exist
      const canonicalSubjects = this.getCanonicalSubjectDefinitions()

      // For each subject, create it for this school if it doesn't exist
      for (const subjectDef of canonicalSubjects) {
        try {
          // Check if this subject already exists for this school
          const { data: existingSubject, error: checkError } = await serverSupabase
            .from('subjects')
            .select('id')
            .eq('school_id', schoolId)
            .eq('code', subjectDef.code)
            .single()

          if (existingSubject) {
            // Subject already exists, skip
            continue
          }

          if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 is "no rows returned" which is expected
            throw checkError
          }

          // Create subject for this school
          const { error: insertError } = await serverSupabase
            .from('subjects')
            .insert({
              school_id: schoolId,
              name: subjectDef.name,
              code: subjectDef.code,
              applicable_to_levels: subjectDef.levels,
              is_active: true,
              department: subjectDef.department,
              subject_type: subjectDef.subjectType,
            })

          if (insertError) {
            errors.push(`Failed to create ${subjectDef.name}: ${insertError.message}`)
            continue
          }

          subjectsCreated++
          console.log(`✅ Created subject: ${subjectDef.name}`)
        } catch (err: any) {
          errors.push(`Error processing ${subjectDef.code}: ${err.message}`)
        }
      }

      console.log(`✅ Curriculum initialization complete for school ${schoolId}: ${subjectsCreated} subjects created`)

      return {
        success: errors.length === 0,
        schoolId,
        subjectsCreated,
        message: `Successfully created ${subjectsCreated} subjects for school ${schoolId}`,
        errors: errors.length > 0 ? errors : undefined,
      }
    } catch (err: any) {
      const message = `Failed to initialize curriculum for school ${schoolId}: ${err.message}`
      console.error(`❌ ${message}`)

      return {
        success: false,
        schoolId,
        subjectsCreated,
        message,
        errors: [err.message],
      }
    }
  }

  /**
   * Backfill curriculum for ALL existing schools
   * Use when deploying complete curriculum changes
   */
  static async backfillAllSchoolsCurriculum(): Promise<{
    totalSchools: number
    successCount: number
    failureCount: number
    results: CurriculumInitResult[]
  }> {
    console.log('📚 Starting backfill of all schools curriculum')

    try {
      // Get all schools
      const { data: schools, error: schoolsError } = await serverSupabase
        .from('schools')
        .select('id')

      if (schoolsError) {
        throw new Error(`Failed to fetch schools: ${schoolsError.message}`)
      }

      if (!schools || schools.length === 0) {
        return {
          totalSchools: 0,
          successCount: 0,
          failureCount: 0,
          results: [],
        }
      }

      // Process each school
      const results: CurriculumInitResult[] = []
      let successCount = 0
      let failureCount = 0

      for (const school of schools) {
        try {
          const result = await this.initializeSchoolCurriculum(school.id)
          results.push(result)

          if (result.success) {
            successCount++
          } else {
            failureCount++
          }
        } catch (err: any) {
          failureCount++
          results.push({
            success: false,
            schoolId: school.id,
            subjectsCreated: 0,
            message: `Exception: ${err.message}`,
            errors: [err.message],
          })
        }
      }

      console.log(`✅ Backfill complete: ${successCount}/${schools.length} schools successfully processed`)

      return {
        totalSchools: schools.length,
        successCount,
        failureCount,
        results,
      }
    } catch (err: any) {
      console.error(`❌ Backfill failed: ${err.message}`)
      throw err
    }
  }

  /**
   * Verify that a school has complete curriculum
   * Returns array of missing levels
   */
  static async verifySchoolCurriculum(schoolId: string): Promise<{
    isComplete: boolean
    missingLevels: number[]
    totalSubjects: number
  }> {
    try {
      const missingLevels: number[] = []
      let totalSubjects = 0

      // Check each level (0-8 for all classes)
      for (let level = 0; level <= 8; level++) {
        const { data, error } = await serverSupabase
          .from('subjects')
          .select('id', { count: 'exact' })
          .eq('school_id', schoolId)
          .eq('is_active', true)
          .contains('applicable_to_levels', [level])

        if (error) {
          console.warn(`Warning checking level ${level}: ${error.message}`)
          missingLevels.push(level)
          continue
        }

        if (!data || data.length === 0) {
          missingLevels.push(level)
        } else {
          totalSubjects += data.length
        }
      }

      return {
        isComplete: missingLevels.length === 0,
        missingLevels,
        totalSubjects,
      }
    } catch (err: any) {
      console.error(`Error verifying curriculum: ${err.message}`)
      throw err
    }
  }

  /**
   * Get the complete canonical subject definitions
   * This is the source of truth for all subjects that should exist
   */
  private static getCanonicalSubjectDefinitions(): Array<{
    code: string
    name: string
    levels: number[]
    department: string | null
    subjectType: string
  }> {
    return [
      // PREP (Level 0)
      { code: 'PREP_LITERACY', name: 'Literacy / Early English', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_NUMERACY', name: 'Numeracy / Early Mathematics', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_PHONICS', name: 'Phonics', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_PREWRITING', name: 'Pre-Writing Skills', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_COMMS', name: 'Communication Skills', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_SCIENCE', name: 'Basic Science / Discovery', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_SOCHABITS', name: 'Social Habits', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_HEALTHHABITS', name: 'Health Habits', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_MORAL', name: 'Moral Instruction', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_RELIGION', name: 'Religious Studies', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_ARTS', name: 'Creative Arts', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_MUSIC', name: 'Music', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_RHYMES', name: 'Rhymes', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_PHYS', name: 'Physical Development', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_FINE', name: 'Fine Motor Skills', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_PRACTICAL', name: 'Practical Life Skills', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_ENV', name: 'Environmental Awareness', levels: [0], department: null, subjectType: 'CORE' },
      { code: 'PREP_COMPUTER', name: 'Computer / Digital Awareness', levels: [0], department: null, subjectType: 'CORE' },

      // KG (Level 1)
      { code: 'KG_ENGLISH', name: 'English Studies', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_MATH', name: 'Mathematics', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_PHONICS', name: 'Phonics', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_READING', name: 'Reading', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_WRITING', name: 'Writing', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_SCIENCE', name: 'Basic Science', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_SOCHABITS', name: 'Social Habits', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_MORAL', name: 'Civic / Moral Education', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_RELIGION', name: 'Religious Studies', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_ARTS', name: 'Cultural and Creative Arts', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_MUSIC', name: 'Music', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_RHYMES', name: 'Rhymes', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_PE', name: 'Physical and Health Education', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_COMPUTER', name: 'Computer / Digital Literacy', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_PRACTICAL', name: 'Home / Practical Life Skills', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_ENV', name: 'Environmental Studies', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_HANDWRITING', name: 'Handwriting', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_VERBAL', name: 'Verbal Reasoning', levels: [1], department: null, subjectType: 'CORE' },
      { code: 'KG_QUANT', name: 'Quantitative Reasoning', levels: [1], department: null, subjectType: 'CORE' },

      // NURSERY (Level 2)
      { code: 'NURSERY_ENGLISH', name: 'English Studies', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_MATH', name: 'Mathematics', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_PHONICS', name: 'Phonics', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_READING', name: 'Reading', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_WRITING', name: 'Writing', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_SCIENCE', name: 'Basic Science', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_SOCHABITS', name: 'Social Habits', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_MORAL', name: 'Civic / Moral Education', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_RELIGION', name: 'Religious Studies', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_ARTS', name: 'Cultural and Creative Arts', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_MUSIC', name: 'Music', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_RHYMES', name: 'Rhymes', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_PE', name: 'Physical and Health Education', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_COMPUTER', name: 'Computer / Digital Literacy', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_PRACTICAL', name: 'Home / Practical Life Skills', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_ENV', name: 'Environmental Studies', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_HANDWRITING', name: 'Handwriting', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_VERBAL', name: 'Verbal Reasoning', levels: [2], department: null, subjectType: 'CORE' },
      { code: 'NURSERY_QUANT', name: 'Quantitative Reasoning', levels: [2], department: null, subjectType: 'CORE' },

      // PRIMARY 1-3 (Level 3)
      { code: 'PRI13_ENGLISH', name: 'English Studies', levels: [3], department: null, subjectType: 'CORE' },
      { code: 'PRI13_MATH', name: 'Mathematics', levels: [3], department: null, subjectType: 'CORE' },
      { code: 'PRI13_NIGERIAN', name: 'Nigerian Language', levels: [3], department: null, subjectType: 'CORE' },
      { code: 'PRI13_SCIENCE', name: 'Basic Science', levels: [3], department: null, subjectType: 'CORE' },
      { code: 'PRI13_PE', name: 'Physical and Health Education', levels: [3], department: null, subjectType: 'CORE' },
      { code: 'PRI13_CRS', name: 'Christian Religious Studies', levels: [3], department: null, subjectType: 'CORE' },
      { code: 'PRI13_ISLAMIC', name: 'Islamic Studies', levels: [3], department: null, subjectType: 'CORE' },
      { code: 'PRI13_HISTORY', name: 'Nigerian History', levels: [3], department: null, subjectType: 'CORE' },
      { code: 'PRI13_SOCIAL', name: 'Social and Citizenship Studies', levels: [3], department: null, subjectType: 'CORE' },
      { code: 'PRI13_ARTS', name: 'Cultural and Creative Arts', levels: [3], department: null, subjectType: 'CORE' },
      { code: 'PRI13_ARABIC', name: 'Arabic', levels: [3], department: null, subjectType: 'ELECTIVE' },

      // PRIMARY 4-6 (Level 4)
      { code: 'PRI46_ENGLISH', name: 'English Studies', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_MATH', name: 'Mathematics', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_NIGERIAN', name: 'Nigerian Language', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_SCIENCE', name: 'Basic Science and Technology', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_PE', name: 'Physical and Health Education', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_DIGITAL', name: 'Basic Digital Literacy', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_CRS', name: 'Christian Religious Studies', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_ISLAMIC', name: 'Islamic Studies', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_HISTORY', name: 'Nigerian History', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_SOCIAL', name: 'Social and Citizenship Studies', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_ARTS', name: 'Cultural and Creative Arts', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_PREVOC', name: 'Pre-Vocational Studies', levels: [4], department: null, subjectType: 'CORE' },
      { code: 'PRI46_FRENCH', name: 'French', levels: [4], department: null, subjectType: 'ELECTIVE' },
      { code: 'PRI46_ARABIC', name: 'Arabic', levels: [4], department: null, subjectType: 'ELECTIVE' },

      // JSS 1-3 (Level 5)
      { code: 'JSS_ENGLISH', name: 'English Studies', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_MATH', name: 'Mathematics', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_NIGERIAN', name: 'Nigerian Language', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_SCIENCE', name: 'Intermediate Science', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_PE', name: 'Physical and Health Education', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_DIGITAL', name: 'Digital Technologies', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_CRS', name: 'Christian Religious Studies', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_ISLAMIC', name: 'Islamic Studies', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_HISTORY', name: 'Nigerian History', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_SOCIAL', name: 'Social and Citizenship Studies', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_ARTS', name: 'Cultural and Creative Arts', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_BUSINESS', name: 'Business Studies', levels: [5], department: null, subjectType: 'CORE' },
      { code: 'JSS_TRADE_SOLAR', name: 'Solar Photovoltaic Installation and Maintenance', levels: [5], department: null, subjectType: 'VOCATIONAL' },
      { code: 'JSS_TRADE_FASHION', name: 'Fashion Design and Garment Making', levels: [5], department: null, subjectType: 'VOCATIONAL' },
      { code: 'JSS_TRADE_LIVESTOCK', name: 'Livestock Farming', levels: [5], department: null, subjectType: 'VOCATIONAL' },
      { code: 'JSS_TRADE_BEAUTY', name: 'Beauty and Cosmetology', levels: [5], department: null, subjectType: 'VOCATIONAL' },
      { code: 'JSS_TRADE_HARDWARE', name: 'Computer Hardware and GSM Repairs', levels: [5], department: null, subjectType: 'VOCATIONAL' },
      { code: 'JSS_TRADE_HORTICULTURE', name: 'Horticulture and Crop Production', levels: [5], department: null, subjectType: 'VOCATIONAL' },
      { code: 'JSS_FRENCH', name: 'French', levels: [5], department: null, subjectType: 'ELECTIVE' },
      { code: 'JSS_ARABIC', name: 'Arabic', levels: [5], department: null, subjectType: 'ELECTIVE' },

      // SS CORE (Levels 6-8)
      { code: 'SS_ENGLISH', name: 'English Language', levels: [6, 7, 8], department: null, subjectType: 'CORE' },
      { code: 'SS_MATH', name: 'General Mathematics', levels: [6, 7, 8], department: null, subjectType: 'CORE' },
      { code: 'SS_CITIZEN', name: 'Citizenship and Heritage Studies', levels: [6, 7, 8], department: null, subjectType: 'CORE' },
      { code: 'SS_DIGITAL', name: 'Digital Technologies', levels: [6, 7, 8], department: null, subjectType: 'CORE' },

      // SS SCIENCE
      { code: 'SS_BIOLOGY', name: 'Biology', levels: [6, 7, 8], department: 'SCIENCE', subjectType: 'CORE' },
      { code: 'SS_CHEMISTRY', name: 'Chemistry', levels: [6, 7, 8], department: 'SCIENCE', subjectType: 'CORE' },
      { code: 'SS_PHYSICS', name: 'Physics', levels: [6, 7, 8], department: 'SCIENCE', subjectType: 'CORE' },
      { code: 'SS_AGRIC', name: 'Agricultural Science', levels: [6, 7, 8], department: 'SCIENCE', subjectType: 'CORE' },
      { code: 'SS_FURTHER_MATH', name: 'Further Mathematics', levels: [6, 7, 8], department: 'SCIENCE', subjectType: 'CORE' },
      { code: 'SS_TECH_DRAWING', name: 'Technical Drawing', levels: [6, 7, 8], department: 'SCIENCE', subjectType: 'CORE' },
      { code: 'SS_FOODS', name: 'Foods and Nutrition', levels: [6, 7, 8], department: 'SCIENCE', subjectType: 'CORE' },
      { code: 'SS_GEOGRAPHY', name: 'Geography', levels: [6, 7, 8], department: 'SCIENCE', subjectType: 'CORE' },
      { code: 'SS_PE_SCIENCE', name: 'Physical Education', levels: [6, 7, 8], department: 'SCIENCE', subjectType: 'CORE' },
      { code: 'SS_HEALTH', name: 'Health Education', levels: [6, 7, 8], department: 'SCIENCE', subjectType: 'CORE' },

      // SS HUMANITIES/ARTS
      { code: 'SS_HISTORY', name: 'Nigerian History', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'CORE' },
      { code: 'SS_GOVERNMENT', name: 'Government', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'CORE' },
      { code: 'SS_CRS', name: 'Christian Religious Studies', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'CORE' },
      { code: 'SS_ISLAMIC', name: 'Islamic Studies', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'CORE' },
      { code: 'SS_NIGERIAN_HUM', name: 'Nigerian Language', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'CORE' },
      { code: 'SS_FRENCH', name: 'French', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'ELECTIVE' },
      { code: 'SS_ARABIC', name: 'Arabic', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'ELECTIVE' },
      { code: 'SS_VISUAL_ARTS', name: 'Visual Arts', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'CORE' },
      { code: 'SS_MUSIC', name: 'Music', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'CORE' },
      { code: 'SS_LITERATURE', name: 'Literature in English', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'CORE' },
      { code: 'SS_HOME_MGMT', name: 'Home Management', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'CORE' },
      { code: 'SS_CATERING', name: 'Catering Craft', levels: [6, 7, 8], department: 'HUMANITIES', subjectType: 'CORE' },

      // SS BUSINESS
      { code: 'SS_ACCOUNTING', name: 'Accounting', levels: [6, 7, 8], department: 'BUSINESS', subjectType: 'CORE' },
      { code: 'SS_COMMERCE', name: 'Commerce', levels: [6, 7, 8], department: 'BUSINESS', subjectType: 'CORE' },
      { code: 'SS_MARKETING', name: 'Marketing', levels: [6, 7, 8], department: 'BUSINESS', subjectType: 'CORE' },
      { code: 'SS_ECONOMICS', name: 'Economics', levels: [6, 7, 8], department: 'BUSINESS', subjectType: 'CORE' },

      // SS TRADE
      { code: 'SS_TRADE_SOLAR', name: 'Solar Photovoltaic Installation and Maintenance', levels: [6, 7, 8], department: 'TRADE', subjectType: 'VOCATIONAL' },
      { code: 'SS_TRADE_FASHION', name: 'Fashion Design and Garment Making', levels: [6, 7, 8], department: 'TRADE', subjectType: 'VOCATIONAL' },
      { code: 'SS_TRADE_LIVESTOCK', name: 'Livestock Farming', levels: [6, 7, 8], department: 'TRADE', subjectType: 'VOCATIONAL' },
      { code: 'SS_TRADE_BEAUTY', name: 'Beauty and Cosmetology', levels: [6, 7, 8], department: 'TRADE', subjectType: 'VOCATIONAL' },
      { code: 'SS_TRADE_HARDWARE', name: 'Computer Hardware and GSM Repairs', levels: [6, 7, 8], department: 'TRADE', subjectType: 'VOCATIONAL' },
      { code: 'SS_TRADE_HORTICULTURE', name: 'Horticulture and Crop Production', levels: [6, 7, 8], department: 'TRADE', subjectType: 'VOCATIONAL' },
    ]
  }
}

export default SchoolCurriculumInitService
