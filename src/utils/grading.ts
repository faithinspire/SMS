/**
 * Grading Utility Module
 * 
 * CANONICAL SOURCE for all grade calculations in the system.
 * All components MUST import from this module.
 * 
 * Grade Scale:
 * A: 70-100
 * B: 60-69
 * C: 50-59
 * D: 40-49
 * F: 0-39
 */

export type GradeValue = 'A' | 'B' | 'C' | 'D' | 'F'

export interface GradeInfo {
  grade: GradeValue
  remark: string
  score: number
}

/**
 * Canonical grading scale - DO NOT MODIFY without school board approval
 */
export const GRADING_SCALE = [
  { minScore: 70, maxScore: 100, grade: 'A' as GradeValue, remark: 'Excellent' },
  { minScore: 60, maxScore: 69, grade: 'B' as GradeValue, remark: 'Very Good' },
  { minScore: 50, maxScore: 59, grade: 'C' as GradeValue, remark: 'Good' },
  { minScore: 40, maxScore: 49, grade: 'D' as GradeValue, remark: 'Fair' },
  { minScore: 0, maxScore: 39, grade: 'F' as GradeValue, remark: 'Poor' },
]

/**
 * Calculate grade from a total score.
 * 
 * This is the ONLY place in the codebase where grade calculation happens.
 * All components must call this function.
 * 
 * @param score - Total score (0-100)
 * @returns GradeInfo with grade letter, remark, and score
 * 
 * @example
 * const result = calculateGrade(88)
 * // { grade: 'A', remark: 'Excellent', score: 88 }
 */
export function calculateGrade(score: number): GradeInfo {
  if (score === null || score === undefined || isNaN(score)) {
    return {
      grade: 'F',
      remark: 'No Score',
      score: 0,
    }
  }

  // Ensure score is between 0 and 100
  const normalizedScore = Math.min(Math.max(Math.round(score), 0), 100)

  // Find matching grade in scale
  const gradeEntry = GRADING_SCALE.find(
    (entry) => normalizedScore >= entry.minScore && normalizedScore <= entry.maxScore
  )

  if (!gradeEntry) {
    // Fallback (should never happen with normalized score)
    return {
      grade: 'F',
      remark: 'Poor',
      score: normalizedScore,
    }
  }

  return {
    grade: gradeEntry.grade,
    remark: gradeEntry.remark,
    score: normalizedScore,
  }
}

/**
 * Get the grade for a score as a string.
 * 
 * @param score - Total score (0-100)
 * @returns Grade letter (A-F)
 */
export function getGrade(score: number): GradeValue {
  return calculateGrade(score).grade
}

/**
 * Get the remark for a score as a string.
 * 
 * @param score - Total score (0-100)
 * @returns Remark string (e.g., "Excellent", "Very Good")
 */
export function getRemark(score: number): string {
  return calculateGrade(score).remark
}

/**
 * Check if a score qualifies as a pass.
 * Pass = D or above (40+)
 * 
 * @param score - Total score (0-100)
 * @returns true if score >= 40, false otherwise
 */
export function isPassing(score: number): boolean {
  return score >= 40
}

/**
 * Check if a score qualifies as a credit.
 * Credit = C or above (50+)
 * 
 * @param score - Total score (0-100)
 * @returns true if score >= 50, false otherwise
 */
export function isCredit(score: number): boolean {
  return score >= 50
}

/**
 * Check if a score qualifies as a distinction.
 * Distinction = A or B (60+)
 * 
 * @param score - Total score (0-100)
 * @returns true if score >= 60, false otherwise
 */
export function isDistinction(score: number): boolean {
  return score >= 60
}

/**
 * Format a grade with its remark for display.
 * 
 * @param score - Total score (0-100)
 * @returns Formatted string (e.g., "A (Excellent)")
 */
export function formatGradeWithRemark(score: number): string {
  const gradeInfo = calculateGrade(score)
  return `${gradeInfo.grade} (${gradeInfo.remark})`
}

/**
 * Validate that a score is within acceptable range.
 * 
 * @param score - Score to validate
 * @param maxScore - Maximum possible score (default 100)
 * @returns true if valid, false otherwise
 */
export function isValidScore(score: number | null | undefined, maxScore = 100): boolean {
  if (score === null || score === undefined || isNaN(score)) {
    return false
  }
  return score >= 0 && score <= maxScore
}

/**
 * Clamp a score to valid range.
 * 
 * @param score - Score to clamp
 * @param maxScore - Maximum possible score (default 100)
 * @returns Clamped score
 */
export function clampScore(score: number | null | undefined, maxScore = 100): number {
  if (score === null || score === undefined || isNaN(score)) {
    return 0
  }
  return Math.min(Math.max(Math.round(score), 0), maxScore)
}
