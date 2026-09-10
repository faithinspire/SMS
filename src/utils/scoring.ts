/**
 * Scoring Utility Module
 * 
 * CANONICAL SOURCE for all score calculations in the system.
 * All components MUST import from this module.
 * 
 * Score Structure:
 * CA1: 0-10
 * CA2: 0-10
 * CA3: 0-10
 * CA4: 0-10
 * CA Total: 0-40 (sum of CA1-CA4)
 * Exam: 0-60
 * Total: 0-100 (CA Total + Exam)
 */

export interface ScoreComponents {
  ca1?: number | null
  ca2?: number | null
  ca3?: number | null
  ca4?: number | null
  exam?: number | null
}

export interface CalculatedScores extends ScoreComponents {
  caTotal: number
  total: number
}

/**
 * Maximum possible scores for each component
 */
export const MAX_SCORES = {
  CA1: 10,
  CA2: 10,
  CA3: 10,
  CA4: 10,
  CA_TOTAL: 40,
  EXAM: 60,
  TOTAL: 100,
} as const

/**
 * Calculate CA (Continuous Assessment) total from individual CA scores.
 * 
 * CA Total = CA1 + CA2 + CA3 + CA4 (max 40)
 * Null/undefined scores are treated as 0.
 * 
 * @param ca1 - CA1 score (0-10 or null)
 * @param ca2 - CA2 score (0-10 or null)
 * @param ca3 - CA3 score (0-10 or null)
 * @param ca4 - CA4 score (0-10 or null)
 * @returns CA total (0-40)
 * 
 * @example
 * calculateCATotal(8, 9, 7, 9) // returns 33
 */
export function calculateCATotal(
  ca1?: number | null,
  ca2?: number | null,
  ca3?: number | null,
  ca4?: number | null
): number {
  const sum =
    (ca1 || 0) +
    (ca2 || 0) +
    (ca3 || 0) +
    (ca4 || 0)
  
  // Ensure it doesn't exceed max
  return Math.min(sum, MAX_SCORES.CA_TOTAL)
}

/**
 * Calculate overall total score.
 * 
 * Total = CA Total + Exam (max 100)
 * 
 * @param caTotal - CA total (0-40)
 * @param exam - Exam score (0-60 or null)
 * @returns Overall total (0-100)
 * 
 * @example
 * calculateTotal(33, 55) // returns 88
 */
export function calculateTotal(caTotal: number, exam?: number | null): number {
  const examScore = exam || 0
  const sum = caTotal + examScore
  
  // Ensure it doesn't exceed max
  return Math.min(sum, MAX_SCORES.TOTAL)
}

/**
 * Calculate all scores from individual components.
 * 
 * This is the primary calculation function that computes both CA total and overall total.
 * 
 * @param components - Object with ca1, ca2, ca3, ca4, exam scores
 * @returns Object with caTotal and total (read-only fields added)
 * 
 * @example
 * const scores = calculateScores({ ca1: 8, ca2: 9, ca3: 7, ca4: 9, exam: 55 })
 * // { ca1: 8, ca2: 9, ca3: 7, ca4: 9, exam: 55, caTotal: 33, total: 88 }
 */
export function calculateScores(components: ScoreComponents): CalculatedScores {
  const caTotal = calculateCATotal(
    components.ca1,
    components.ca2,
    components.ca3,
    components.ca4
  )

  const total = calculateTotal(caTotal, components.exam)

  return {
    ca1: components.ca1,
    ca2: components.ca2,
    ca3: components.ca3,
    ca4: components.ca4,
    exam: components.exam,
    caTotal,
    total,
  }
}

/**
 * Validate individual score components against max values.
 * 
 * @param components - Scores to validate
 * @returns Object with validation results: { isValid: boolean, errors: string[] }
 * 
 * @example
 * validateScores({ ca1: 15, ca2: 9 })
 * // { isValid: false, errors: ["CA1 exceeds maximum of 10"] }
 */
export function validateScores(components: ScoreComponents): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (components.ca1 !== null && components.ca1 !== undefined) {
    if (components.ca1 < 0 || components.ca1 > MAX_SCORES.CA1) {
      errors.push(`CA1 must be between 0 and ${MAX_SCORES.CA1}`)
    }
  }

  if (components.ca2 !== null && components.ca2 !== undefined) {
    if (components.ca2 < 0 || components.ca2 > MAX_SCORES.CA2) {
      errors.push(`CA2 must be between 0 and ${MAX_SCORES.CA2}`)
    }
  }

  if (components.ca3 !== null && components.ca3 !== undefined) {
    if (components.ca3 < 0 || components.ca3 > MAX_SCORES.CA3) {
      errors.push(`CA3 must be between 0 and ${MAX_SCORES.CA3}`)
    }
  }

  if (components.ca4 !== null && components.ca4 !== undefined) {
    if (components.ca4 < 0 || components.ca4 > MAX_SCORES.CA4) {
      errors.push(`CA4 must be between 0 and ${MAX_SCORES.CA4}`)
    }
  }

  if (components.exam !== null && components.exam !== undefined) {
    if (components.exam < 0 || components.exam > MAX_SCORES.EXAM) {
      errors.push(`Exam must be between 0 and ${MAX_SCORES.EXAM}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Clamp individual score components to valid ranges.
 * 
 * @param components - Scores to clamp
 * @returns Clamped scores
 */
export function clampScores(components: ScoreComponents): ScoreComponents {
  return {
    ca1: components.ca1 !== null && components.ca1 !== undefined
      ? Math.min(Math.max(components.ca1, 0), MAX_SCORES.CA1)
      : null,
    ca2: components.ca2 !== null && components.ca2 !== undefined
      ? Math.min(Math.max(components.ca2, 0), MAX_SCORES.CA2)
      : null,
    ca3: components.ca3 !== null && components.ca3 !== undefined
      ? Math.min(Math.max(components.ca3, 0), MAX_SCORES.CA3)
      : null,
    ca4: components.ca4 !== null && components.ca4 !== undefined
      ? Math.min(Math.max(components.ca4, 0), MAX_SCORES.CA4)
      : null,
    exam: components.exam !== null && components.exam !== undefined
      ? Math.min(Math.max(components.exam, 0), MAX_SCORES.EXAM)
      : null,
  }
}

/**
 * Check if all required scores have been entered.
 * 
 * "Complete" means all CA1-CA4 and Exam have values (not null/undefined).
 * 
 * @param components - Scores to check
 * @returns true if all required scores are present
 */
export function isComplete(components: ScoreComponents): boolean {
  return (
    components.ca1 !== null &&
    components.ca1 !== undefined &&
    components.ca2 !== null &&
    components.ca2 !== undefined &&
    components.ca3 !== null &&
    components.ca3 !== undefined &&
    components.ca4 !== null &&
    components.ca4 !== undefined &&
    components.exam !== null &&
    components.exam !== undefined
  )
}

/**
 * Check if any scores have been entered.
 * 
 * @param components - Scores to check
 * @returns true if at least one score has a value
 */
export function hasAnyScores(components: ScoreComponents): boolean {
  return (
    (components.ca1 !== null && components.ca1 !== undefined) ||
    (components.ca2 !== null && components.ca2 !== undefined) ||
    (components.ca3 !== null && components.ca3 !== undefined) ||
    (components.ca4 !== null && components.ca4 !== undefined) ||
    (components.exam !== null && components.exam !== undefined)
  )
}

/**
 * Format scores for display.
 * 
 * @param components - Scores to format
 * @returns Formatted string (e.g., "CA: 8+9+7+9=33, Exam: 55, Total: 88")
 */
export function formatScores(components: CalculatedScores): string {
  const ca = `${components.ca1 || 0}+${components.ca2 || 0}+${components.ca3 || 0}+${components.ca4 || 0}=${components.caTotal}`
  const exam = `${components.exam || 0}`
  return `CA: ${ca}, Exam: ${exam}, Total: ${components.total}`
}

/**
 * Convert test1-test4 naming convention to CA1-CA4 if needed.
 * 
 * Used when reading from database that might use test1-test4 column names.
 * 
 * @param dbRecord - Database record with test1-4 or ca1-4 fields
 * @returns Normalized ScoreComponents
 */
export function normalizeScoreFormat(dbRecord: any): ScoreComponents {
  return {
    ca1: dbRecord.ca1 ?? dbRecord.test1,
    ca2: dbRecord.ca2 ?? dbRecord.test2,
    ca3: dbRecord.ca3 ?? dbRecord.test3,
    ca4: dbRecord.ca4 ?? dbRecord.test4,
    exam: dbRecord.exam,
  }
}
