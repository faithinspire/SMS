/**
 * GET /api/curriculum/available-streams
 * 
 * Get available subject streams for a given level
 * Useful for SS (Senior Secondary) where students choose Science/Humanities/Business
 * 
 * Query Parameters:
 *  - school_id: UUID (required)
 *  - level: number 12-14 (required for SS) - SS levels only
 * 
 * Response:
 *  {
 *    success: boolean
 *    streams: string[] - Stream category names like "SCIENCE_STREAM", "BUSINESS_STREAM"
 *    count: number
 *  }
 */

import { NextRequest, NextResponse } from 'next/server'
import { CurriculumService } from '@/services/curriculum.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const schoolId = request.nextUrl.searchParams.get('school_id')
    const level = request.nextUrl.searchParams.get('level')

    // Validate school_id
    if (!schoolId) {
      return NextResponse.json(
        { error: 'school_id is required' },
        { status: 400 }
      )
    }

    // Validate level
    if (!level) {
      return NextResponse.json(
        { error: 'level is required' },
        { status: 400 }
      )
    }

    const levelNum = parseInt(level, 10)
    
    // Streams are only meaningful for SS (Senior Secondary)
    if (levelNum < 12 || levelNum > 14) {
      return NextResponse.json(
        { 
          success: true,
          streams: [], 
          count: 0,
          message: 'Streams are only available for Senior Secondary (SS1-3)'
        },
        { status: 200 }
      )
    }

    const streams = await CurriculumService.getAvailableStreams(
      schoolId,
      levelNum
    )

    return NextResponse.json(
      {
        success: true,
        streams,
        count: streams.length,
        level: levelNum,
        school_id: schoolId,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Error fetching available streams:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch streams' },
      { status: 500 }
    )
  }
}
