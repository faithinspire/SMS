/**
 * API Endpoint: POST /api/superadmin/seed-school
 * Manually seed a school with Nigerian curriculum
 * Used to seed existing schools that don't have classes/subjects
 * 
 * Request Body: { school_id: string }
 * Response: { success, message, seeding }
 */

import { NextRequest, NextResponse } from 'next/server'
import { seedSchoolCurriculum } from '@/lib/school-seeding'
export const dynamic = 'force-dynamic'


export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { school_id } = body

    if (!school_id) {
      return NextResponse.json(
        { success: false, error: 'Missing school_id' },
        { status: 400 }
      )
    }

    console.log(`ðŸŒ± Seeding school ${school_id}...`)
    
    const result = await seedSchoolCurriculum(school_id)

    if (!result.success) {
      console.warn('Seeding had issues:', result.error)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          partial: result,
        },
        { status: 500 }
      )
    }

    console.log(`âœ… Seeding complete for ${school_id}`)

    return NextResponse.json(
      {
        success: true,
        message: 'School curriculum seeded successfully',
        seeding: result,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Seeding error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to seed school',
      },
      { status: 500 }
    )
  }
}

