/**
 * Nigerian Curriculum Subjects & Classes
 * Standard subjects taught in Nigerian schools following international standards
 */

// Class/Grade levels from Prep to SS3
export const SCHOOL_CLASSES = [
  { id: 'prep', name: 'Prep', level: 0, type: 'PRIMARY', description: 'Preparatory' },
  { id: 'primary-1', name: 'Primary 1', level: 1, type: 'PRIMARY', description: 'Grade 1' },
  { id: 'primary-2', name: 'Primary 2', level: 2, type: 'PRIMARY', description: 'Grade 2' },
  { id: 'primary-3', name: 'Primary 3', level: 3, type: 'PRIMARY', description: 'Grade 3' },
  { id: 'primary-4', name: 'Primary 4', level: 4, type: 'PRIMARY', description: 'Grade 4' },
  { id: 'primary-5', name: 'Primary 5', level: 5, type: 'PRIMARY', description: 'Grade 5' },
  { id: 'primary-6', name: 'Primary 6', level: 6, type: 'PRIMARY', description: 'Grade 6' },
  { id: 'jss-1', name: 'JSS 1', level: 7, type: 'SECONDARY', description: 'Grade 7 / Junior Secondary School 1' },
  { id: 'jss-2', name: 'JSS 2', level: 8, type: 'SECONDARY', description: 'Grade 8 / Junior Secondary School 2' },
  { id: 'jss-3', name: 'JSS 3', level: 9, type: 'SECONDARY', description: 'Grade 9 / Junior Secondary School 3' },
  { id: 'ss-1', name: 'SS 1', level: 10, type: 'SECONDARY', description: 'Grade 10 / Senior Secondary School 1' },
  { id: 'ss-2', name: 'SS 2', level: 11, type: 'SECONDARY', description: 'Grade 11 / Senior Secondary School 2' },
  { id: 'ss-3', name: 'SS 3', level: 12, type: 'SECONDARY', description: 'Grade 12 / Senior Secondary School 3' },
]

// Departments/Streams for Senior Classes
export const DEPARTMENTS = [
  { id: 'science', name: 'Science', code: 'SCI', description: 'Physics, Chemistry, Biology' },
  { id: 'commercial', name: 'Commercial', code: 'COM', description: 'Economics, Accounting, Business Studies' },
  { id: 'humanities', name: 'Humanities', code: 'HUM', description: 'History, Government, Literature' },
  { id: 'technical', name: 'Technical', code: 'TEC', description: 'Technical Drawing, Woodwork, Metalwork' },
  { id: 'vocational', name: 'Vocational', code: 'VOC', description: 'Practical skills and trades' },
]

export const NIGERIAN_SUBJECTS = {
  PRIMARY: [
    // Language & Communication
    { id: 'english', name: 'English Language', code: 'ENG', type: 'PRIMARY', department: null },
    { id: 'hausa', name: 'Hausa Language', code: 'HAU', type: 'PRIMARY', department: null },
    { id: 'igbo', name: 'Igbo Language', code: 'IGO', type: 'PRIMARY', department: null },
    { id: 'yoruba', name: 'Yoruba Language', code: 'YOR', type: 'PRIMARY', department: null },

    // Mathematics & Sciences
    { id: 'mathematics', name: 'Mathematics', code: 'MATH', type: 'PRIMARY', department: null },
    { id: 'science', name: 'General Science', code: 'SCI', type: 'PRIMARY', department: null },
    { id: 'health-education', name: 'Health Education', code: 'HLTH', type: 'PRIMARY', department: null },

    // Social Sciences
    { id: 'social-studies', name: 'Social Studies', code: 'SS', type: 'PRIMARY', department: null },
    { id: 'history', name: 'History', code: 'HIST', type: 'PRIMARY', department: null },
    { id: 'civics', name: 'Civics', code: 'CIV', type: 'PRIMARY', department: null },
    { id: 'geography', name: 'Geography', code: 'GEOG', type: 'PRIMARY', department: null },

    // Arts & Practical
    { id: 'physical-education', name: 'Physical Education', code: 'PE', type: 'PRIMARY', department: null },
    { id: 'music', name: 'Music', code: 'MUS', type: 'PRIMARY', department: null },
    { id: 'art', name: 'Visual Art', code: 'ART', type: 'PRIMARY', department: null },
    { id: 'computer-studies', name: 'Computer Studies', code: 'COMP', type: 'PRIMARY', department: null },
  ],

  SECONDARY: {
    COMMON: [
      // Core Subjects
      { id: 'english', name: 'English Language', code: 'ENG', type: 'SECONDARY', department: null },
      { id: 'mathematics', name: 'Mathematics', code: 'MATH', type: 'SECONDARY', department: null },
      { id: 'integrated-science', name: 'Integrated Science', code: 'ISCI', type: 'SECONDARY', department: null },

      // Social Sciences
      { id: 'social-studies', name: 'Social Studies', code: 'SS', type: 'SECONDARY', department: null },
      { id: 'civics', name: 'Civics', code: 'CIV', type: 'SECONDARY', department: null },

      // Physical Development
      { id: 'physical-education', name: 'Physical Education & Health', code: 'PE', type: 'SECONDARY', department: null },

      // Arts
      { id: 'music', name: 'Music', code: 'MUS', type: 'SECONDARY', department: null },
      { id: 'visual-art', name: 'Visual Art', code: 'ART', type: 'SECONDARY', department: null },
      { id: 'computer-science', name: 'Computer Science', code: 'COMP', type: 'SECONDARY', department: null },
    ],

    SCIENCES: [
      { id: 'physics', name: 'Physics', code: 'PHY', type: 'SECONDARY', department: 'science' },
      { id: 'chemistry', name: 'Chemistry', code: 'CHM', type: 'SECONDARY', department: 'science' },
      { id: 'biology', name: 'Biology', code: 'BIO', type: 'SECONDARY', department: 'science' },
      { id: 'practical-science', name: 'Practical Science', code: 'PSCI', type: 'SECONDARY', department: 'science' },
    ],

    COMMERCIAL: [
      { id: 'economics', name: 'Economics', code: 'ECON', type: 'SECONDARY', department: 'commercial' },
      { id: 'accounting', name: 'Accounting', code: 'ACC', type: 'SECONDARY', department: 'commercial' },
      { id: 'business-studies', name: 'Business Studies', code: 'BUS', type: 'SECONDARY', department: 'commercial' },
      { id: 'marketing', name: 'Marketing', code: 'MKT', type: 'SECONDARY', department: 'commercial' },
    ],

    HUMANITIES: [
      { id: 'literature', name: 'Literature in English', code: 'LIT', type: 'SECONDARY', department: 'humanities' },
      { id: 'government', name: 'Government', code: 'GOV', type: 'SECONDARY', department: 'humanities' },
      { id: 'history', name: 'History', code: 'HIST', type: 'SECONDARY', department: 'humanities' },
      { id: 'geography', name: 'Geography', code: 'GEOG', type: 'SECONDARY', department: 'humanities' },
    ],

    LANGUAGES: [
      { id: 'hausa', name: 'Hausa Language', code: 'HAU', type: 'SECONDARY', department: null },
      { id: 'igbo', name: 'Igbo Language', code: 'IGO', type: 'SECONDARY', department: null },
      { id: 'yoruba', name: 'Yoruba Language', code: 'YOR', type: 'SECONDARY', department: null },
      { id: 'french', name: 'French Language', code: 'FRE', type: 'SECONDARY', department: null },
      { id: 'arabic', name: 'Arabic Language', code: 'ARA', type: 'SECONDARY', department: null },
    ],

    TECHNICAL: [
      { id: 'technical-drawing', name: 'Technical Drawing', code: 'TD', type: 'SECONDARY', department: 'technical' },
      { id: 'metalwork', name: 'Metalwork', code: 'MW', type: 'SECONDARY', department: 'technical' },
      { id: 'woodwork', name: 'Woodwork', code: 'WW', type: 'SECONDARY', department: 'technical' },
      { id: 'agric-science', name: 'Agricultural Science', code: 'AGRIC', type: 'SECONDARY', department: 'vocational' },
      { id: 'home-economics', name: 'Home Economics', code: 'HOME', type: 'SECONDARY', department: 'vocational' },
    ],
  },
}

/**
 * Get all classes
 */
export function getAllClasses() {
  return SCHOOL_CLASSES
}

/**
 * Get class by ID
 */
export function getClassById(id: string) {
  return SCHOOL_CLASSES.find((c) => c.id === id)
}

/**
 * Get all departments
 */
export function getAllDepartments() {
  return DEPARTMENTS
}

/**
 * Get department by ID
 */
export function getDepartmentById(id: string) {
  return DEPARTMENTS.find((d) => d.id === id)
}

/**
 * Get all subjects for a school type
 */
export function getSubjectsForSchoolType(
  schoolType: 'PRIMARY' | 'SECONDARY',
  classLevel?: number
): any[] {
  if (schoolType === 'PRIMARY') {
    return NIGERIAN_SUBJECTS.PRIMARY
  }

  // For secondary, combine common subjects with optional streams
  return [
    ...NIGERIAN_SUBJECTS.SECONDARY.COMMON,
    ...NIGERIAN_SUBJECTS.SECONDARY.SCIENCES,
    ...NIGERIAN_SUBJECTS.SECONDARY.COMMERCIAL,
    ...NIGERIAN_SUBJECTS.SECONDARY.HUMANITIES,
    ...NIGERIAN_SUBJECTS.SECONDARY.LANGUAGES,
    ...NIGERIAN_SUBJECTS.SECONDARY.TECHNICAL,
  ]
}

/**
 * Get subjects for a specific class
 */
export function getSubjectsForClass(classId: string) {
  const classInfo = getClassById(classId)
  if (!classInfo) return []
  return getSubjectsForSchoolType(classInfo.type as 'PRIMARY' | 'SECONDARY')
}

/**
 * Get subjects by department
 */
export function getSubjectsByDepartment(departmentId: string) {
  const allSubjects = [
    ...NIGERIAN_SUBJECTS.SECONDARY.COMMON,
    ...NIGERIAN_SUBJECTS.SECONDARY.SCIENCES,
    ...NIGERIAN_SUBJECTS.SECONDARY.COMMERCIAL,
    ...NIGERIAN_SUBJECTS.SECONDARY.HUMANITIES,
    ...NIGERIAN_SUBJECTS.SECONDARY.LANGUAGES,
    ...NIGERIAN_SUBJECTS.SECONDARY.TECHNICAL,
  ]
  return allSubjects.filter((s) => s.department === departmentId)
}

/**
 * Get subject by ID
 */
export function getSubjectById(id: string): any {
  const allSubjects = [
    ...NIGERIAN_SUBJECTS.PRIMARY,
    ...NIGERIAN_SUBJECTS.SECONDARY.COMMON,
    ...NIGERIAN_SUBJECTS.SECONDARY.SCIENCES,
    ...NIGERIAN_SUBJECTS.SECONDARY.COMMERCIAL,
    ...NIGERIAN_SUBJECTS.SECONDARY.HUMANITIES,
    ...NIGERIAN_SUBJECTS.SECONDARY.LANGUAGES,
    ...NIGERIAN_SUBJECTS.SECONDARY.TECHNICAL,
  ]

  return allSubjects.find((s) => s.id === id)
}

/**
 * Get subject name by ID
 */
export function getSubjectNameById(id: string): string {
  const subject = getSubjectById(id)
  return subject?.name || 'Unknown Subject'
}

/**
 * Generate admission number
 * Format: YYYY-CLASSNAME-SEQUENCE
 * Example: 2026-SS3-0001
 */
export function generateAdmissionNumber(classId: string, sequence: number): string {
  const year = new Date().getFullYear()
  const classInfo = getClassById(classId)
  const className = classInfo?.name.replace(/\s+/g, '') || 'UNK'
  const seq = String(sequence).padStart(4, '0')
  return `${year}-${className}-${seq}`
}


/**
 * Mark Scoring Configuration
 * Nigerian standard: 4 tests of 10 marks + 1 exam of 60 marks = 100 marks total
 */
export const MARK_CONFIGURATION = {
  TEST_1_MAX: 10,
  TEST_2_MAX: 10,
  TEST_3_MAX: 10,
  TEST_4_MAX: 10,
  EXAM_MAX: 60,
  TOTAL_MAX: 100,

  // Grading scale (Nigerian standard)
  GRADES: [
    { min: 90, max: 100, grade: 'A1', description: 'Excellent' },
    { min: 80, max: 89, grade: 'B2', description: 'Very Good' },
    { min: 70, max: 79, grade: 'B3', description: 'Good' },
    { min: 60, max: 69, grade: 'C4', description: 'Credit' },
    { min: 50, max: 59, grade: 'C5', description: 'Credit' },
    { min: 40, max: 49, grade: 'D7', description: 'Pass' },
    { min: 0, max: 39, grade: 'F9', description: 'Fail' },
  ],

  // Default passing percentage
  PASSING_PERCENTAGE: 40,
}

/**
 * Calculate grade from total score
 */
export function calculateGrade(totalScore: number): string {
  for (const gradeRange of MARK_CONFIGURATION.GRADES) {
    if (totalScore >= gradeRange.min && totalScore <= gradeRange.max) {
      return gradeRange.grade
    }
  }
  return 'F9' // Default to fail
}

/**
 * Validate score against configuration
 */
export function validateScore(
  test1?: number,
  test2?: number,
  test3?: number,
  test4?: number,
  exam?: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (test1 !== undefined && (test1 < 0 || test1 > 10)) {
    errors.push('Test 1 must be between 0 and 10')
  }
  if (test2 !== undefined && (test2 < 0 || test2 > 10)) {
    errors.push('Test 2 must be between 0 and 10')
  }
  if (test3 !== undefined && (test3 < 0 || test3 > 10)) {
    errors.push('Test 3 must be between 0 and 10')
  }
  if (test4 !== undefined && (test4 < 0 || test4 > 10)) {
    errors.push('Test 4 must be between 0 and 10')
  }
  if (exam !== undefined && (exam < 0 || exam > 60)) {
    errors.push('Exam must be between 0 and 60')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
