import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-client'
export const dynamic = 'force-dynamic'

/**
 * GET /api/school-fees
 * Fetch school fee payment records for a school
 * Query params:
 *   - schoolId (required): School UUID
 *   - studentId (optional): Filter by student ID
 *   - status (optional): Filter by payment status (COMPLETED, PENDING, FAILED)
 *   - type (optional): STUDENT_PAYMENT or STAFF_SALARY
 *   - startDate (optional): Filter from date
 *   - endDate (optional): Filter to date
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const schoolId = searchParams.get('schoolId')
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')
    const type = searchParams.get('type') || 'STUDENT_PAYMENT'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!schoolId) {
      return NextResponse.json(
        { success: false, error: 'schoolId is required' },
        { status: 400 }
      )
    }

    // Build query
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('school_id', schoolId)
      .eq('type', type)
      .order('created_at', { ascending: false })

    // Apply optional filters
    if (studentId) {
      query = query.eq('recipient_id', studentId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data: payments, error } = await query

    if (error) {
      console.error('Error fetching school fees:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    // Calculate statistics
    const stats = {
      totalRecords: payments?.length || 0,
      completed: payments?.filter(p => p.status === 'COMPLETED').length || 0,
      pending: payments?.filter(p => p.status === 'PENDING').length || 0,
      failed: payments?.filter(p => p.status === 'FAILED').length || 0,
      totalAmount: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
      completedAmount: payments?.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    }

    return NextResponse.json(
      {
        success: true,
        data: payments || [],
        stats,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('School fees API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/school-fees
 * Record a new school fee payment
 * Body:
 *   - schoolId (required): School UUID
 *   - recipientId (required): Student/Staff UUID
 *   - recipientName (required): Name
 *   - recipientEmail (optional)
 *   - recipientPhone (optional)
 *   - amount (required): Amount > 0
 *   - purpose (required): Purpose of payment
 *   - paymentMethod (required): e.g., "CASH", "BANK_TRANSFER", "MOBILE_MONEY"
 *   - invoiceNumber (optional)
 *   - notes (optional)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      schoolId,
      recipientId,
      recipientName,
      recipientEmail,
      recipientPhone,
      amount,
      purpose,
      paymentMethod,
      invoiceNumber,
      notes,
    } = body

    // Validate required fields
    if (!schoolId || !recipientId || !recipientName || !amount || !purpose || !paymentMethod) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Create transaction record
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        school_id: schoolId,
        type: 'STUDENT_PAYMENT',
        recipient_id: recipientId,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        recipient_phone: recipientPhone,
        amount,
        purpose,
        payment_method: paymentMethod,
        invoice_number: invoiceNumber,
        notes,
        status: 'COMPLETED',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating school fee record:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data,
        message: 'School fee payment recorded successfully',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('School fees POST error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/school-fees/[id]
 * Update a school fee payment record
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, notes, purpose } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    const updates: any = { updated_at: new Date().toISOString() }

    if (status) {
      if (!['COMPLETED', 'PENDING', 'FAILED'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status value' },
          { status: 400 }
        )
      }
      updates.status = status
    }

    if (notes !== undefined) {
      updates.notes = notes
    }

    if (purpose !== undefined) {
      updates.purpose = purpose
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating school fee:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data,
        message: 'School fee payment updated successfully',
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('School fees PATCH error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/school-fees/[id]
 * Delete a school fee payment record (admin only)
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    // Only allow deletion if status is PENDING
    const { data: existingRecord, error: fetchError } = await supabase
      .from('transactions')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      )
    }

    if (existingRecord.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete completed transactions' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting school fee:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'School fee payment deleted successfully',
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('School fees DELETE error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
