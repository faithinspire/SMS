import { supabase } from '@/lib/supabase-client'

export interface SchoolFeePayment {
  id: string
  schoolId: string
  type: 'STAFF_SALARY' | 'STUDENT_PAYMENT'
  recipientId: string
  recipientName: string
  recipientEmail?: string
  recipientPhone?: string
  amount: number
  purpose: string
  paymentMethod: string
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  invoiceNumber?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface FeeStats {
  totalRecords: number
  completed: number
  pending: number
  failed: number
  totalAmount: number
  completedAmount: number
}

export class SchoolFeeService {
  /**
   * Get school fee payments for a school
   */
  static async getSchoolFees(
    schoolId: string,
    filters?: {
      studentId?: string
      status?: string
      type?: string
      startDate?: string
      endDate?: string
    }
  ): Promise<{ payments: SchoolFeePayment[]; stats: FeeStats }> {
    try {
      const queryParams = new URLSearchParams({ schoolId })

      if (filters?.studentId) {
        queryParams.append('studentId', filters.studentId)
      }
      if (filters?.status) {
        queryParams.append('status', filters.status)
      }
      if (filters?.type) {
        queryParams.append('type', filters.type)
      }
      if (filters?.startDate) {
        queryParams.append('startDate', filters.startDate)
      }
      if (filters?.endDate) {
        queryParams.append('endDate', filters.endDate)
      }

      const response = await fetch(`/api/school-fees?${queryParams}`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch school fees')
      }

      return {
        payments: result.data || [],
        stats: result.stats,
      }
    } catch (error) {
      console.error('Error fetching school fees:', error)
      throw error
    }
  }

  /**
   * Record a new school fee payment
   */
  static async recordPayment(
    schoolId: string,
    recipientId: string,
    recipientName: string,
    amount: number,
    purpose: string,
    paymentMethod: string,
    options?: {
      recipientEmail?: string
      recipientPhone?: string
      invoiceNumber?: string
      notes?: string
    }
  ): Promise<SchoolFeePayment> {
    try {
      const response = await fetch('/api/school-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          recipientId,
          recipientName,
          amount,
          purpose,
          paymentMethod,
          recipientEmail: options?.recipientEmail,
          recipientPhone: options?.recipientPhone,
          invoiceNumber: options?.invoiceNumber,
          notes: options?.notes,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to record payment')
      }

      return result.data
    } catch (error) {
      console.error('Error recording payment:', error)
      throw error
    }
  }

  /**
   * Update a school fee payment record
   */
  static async updatePayment(
    id: string,
    updates: {
      status?: string
      purpose?: string
      notes?: string
    }
  ): Promise<SchoolFeePayment> {
    try {
      const response = await fetch('/api/school-fees', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update payment')
      }

      return result.data
    } catch (error) {
      console.error('Error updating payment:', error)
      throw error
    }
  }

  /**
   * Delete a school fee payment record (only PENDING payments)
   */
  static async deletePayment(id: string): Promise<void> {
    try {
      const response = await fetch('/api/school-fees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete payment')
      }
    } catch (error) {
      console.error('Error deleting payment:', error)
      throw error
    }
  }

  /**
   * Get student's fee payment summary
   */
  static async getStudentFeesSummary(
    schoolId: string,
    studentId: string
  ): Promise<{
    student: any
    payments: SchoolFeePayment[]
    stats: FeeStats
    remaining: number
  }> {
    try {
      // Get student info
      const { data: student } = await supabase
        .from('users')
        .select('id, full_name, email, phone')
        .eq('id', studentId)
        .single()

      // Get fee payments
      const { payments, stats } = await this.getSchoolFees(schoolId, {
        studentId,
        type: 'STUDENT_PAYMENT',
      })

      // Calculate remaining (this is a simple example - actual fees may vary by class)
      const estimatedTotalFee = 50000 // Example: ₦50,000 per term
      const remaining = Math.max(0, estimatedTotalFee - stats.completedAmount)

      return {
        student,
        payments,
        stats,
        remaining,
      }
    } catch (error) {
      console.error('Error fetching student fee summary:', error)
      throw error
    }
  }

  /**
   * Get school's fee payment summary
   */
  static async getSchoolFeesSummary(
    schoolId: string
  ): Promise<{
    totalStudent: FeeStats
    totalStaff: FeeStats
    combined: FeeStats
  }> {
    try {
      const { payments: studentPayments, stats: studentStats } =
        await this.getSchoolFees(schoolId, { type: 'STUDENT_PAYMENT' })

      const { payments: staffPayments, stats: staffStats } = await this.getSchoolFees(
        schoolId,
        { type: 'STAFF_SALARY' }
      )

      const allPayments = [...studentPayments, ...staffPayments]
      const combined: FeeStats = {
        totalRecords: allPayments.length,
        completed: allPayments.filter(p => p.status === 'COMPLETED').length,
        pending: allPayments.filter(p => p.status === 'PENDING').length,
        failed: allPayments.filter(p => p.status === 'FAILED').length,
        totalAmount: allPayments.reduce((sum, p) => sum + p.amount, 0),
        completedAmount: allPayments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + p.amount, 0),
      }

      return {
        totalStudent: studentStats,
        totalStaff: staffStats,
        combined,
      }
    } catch (error) {
      console.error('Error fetching school fees summary:', error)
      throw error
    }
  }

  /**
   * Get monthly fee collection report
   */
  static async getMonthlyReport(
    schoolId: string,
    year: number,
    month: number
  ): Promise<{
    month: string
    year: number
    payments: SchoolFeePayment[]
    stats: FeeStats
  }> {
    try {
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString()

      const { payments, stats } = await this.getSchoolFees(schoolId, {
        startDate,
        endDate,
        type: 'STUDENT_PAYMENT',
      })

      const monthName = new Date(year, month - 1).toLocaleDateString('en-US', {
        month: 'long',
      })

      return {
        month: monthName,
        year,
        payments,
        stats,
      }
    } catch (error) {
      console.error('Error generating monthly report:', error)
      throw error
    }
  }
}
