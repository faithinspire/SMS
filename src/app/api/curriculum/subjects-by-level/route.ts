/**
 * GET /api/curriculum/subjects-by-level
 * 
 * Get subjects filtered by class level (JSS1-3 or SS1-3)
 * 
 * Query Parameters:
 *  - school_id: UUID (required)
 *  - level: number 9-14 (required) - 9-11 for JSS, 12-14 for SS
 *  - class_name: string (alternative to level) - e.g., "JSS1", "SS2"
 *  - type: "all" | "core" | "elective" (optional, default: "all")
 *  - category: string (optional) - e.g., "SCIENCE", "LANGUAGE_OPTION"
 * 
 * Response:
 *  {
 *    success: boolean
 *    subjects: Subject[]
 *    count: number
 *    level_type: "JSS" | "SS"
 *    level_year: 1 | 2 | 3
 *  }
 */

import { NextRequest, NextResponse } from 'next/server'
import { CurriculumService } from '@/services/curriculum.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('school_id')
    let level = request.nextUrl.searchParams.get('level')
    const className = request.nextUrl.searchParams.get('class_name')
    const type = request.nextUrl.searchParams.get('type') || 'all'
    const category = request.nextUrl.searchParams.get('category')

    // Validate school_id
    if (!schoolId) {
      return NextResponse.json(
        { error: 'school_id is required' },
        { status: 400 }
      )
    }

    // Get level from class_name if not provided
    if (!level && className) {
      const classLevel = CurriculumService.getClassLevel(className)
      if (!classLevel) {
        return NextResponse.json(
          { error: `Unknown class name: ${className}` },
          { status: 400 }
        )
      }
      level = String(classLevel.level)
    }

    // Validate level
    if (!level) {
      return NextResponse.json(
        { error: 'level or class_name is required' },
        { status: 400 }
      )
    }

    const levelNum = parseInt(level, 10)
    if (isNaN(levelNum) || levelNum < 9 || levelNum > 14) {
      return NextResponse.json(
        { error: 'level must be between 9 and 14 (JSS1-3 or SS1-3)' },
        { status: 400 }
      )
    }

    let subjects

    // Fetch subjects based on type
    if (category) {
      subjects = await CurriculumService.getSubjectsByCategory(
        schoolId,
        levelNum,
        category
      )
    } else if (type === 'core') {
      subjects = await CurriculumService.getCoreSubjectsByLevel(
        schoolId,
        levelNum
      )
    } else if (type === 'elective') {
      subjects = await CurriculumService.getElectiveSubjectsByLevel(
        schoolId,
        levelNum
      )
    } else {
      subjects = await CurriculumService.getSubjectsByLevel(
        schoolId,
        levelNum
      )
    }

    const levelType = CurriculumService.getLevelType(levelNum)
    const levelYear = CurriculumService.getLevelYear(levelNum)

    return NextResponse.json(
      {
        success: true,
        subjects,
        count: subjects.length,
        level_type: levelType,
        level_year: levelYear,
        filters: {
          school_id: schoolId,
          level: levelNum,
          type,
          category: category || null,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching subjects by level:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subjects' },
      { status: 500 }
    )
  }
}
