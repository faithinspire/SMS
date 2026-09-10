import { supabase } from '@/lib/supabase-client'

export interface Payment {
  id: string
  school_id: string
  student_id?: string
  amount: number
  fee_type: string
  invoice_number?: string
  payment_method: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'ONLINE' | 'CHEQUE'
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  receipt_generated: boolean
  receipt_url?: string
  created_at: string
}

export interface Receipt {
  id: string
  school_id: string
  payment_id?: string
  receipt_number: string
  student_name: string
  student_id?: string
  amount: number
  fee_type: string
  payment_date: string
  issued_by: string
  issued_at: string
  pdf_url?: string
  sent_at?: string
}

export interface Salary {
  id: string
  school_id: string
  staff_id: string
  amount: number
  payment_period: string
  payment_date?: string
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED'
  approved_by?: string
  approved_at?: string
  paid_at?: string
  notes?: string
  created_at: string
}

export interface Payslip {
  id: string
  school_id: string
  salary_id: string
  staff_id: string
  gross_amount: number
  deductions: number
  net_amount: number
  payment_method?: string
  generated_at: string
  sent_to_staff_at?: string
  notes?: string
}

export class PaymentService {
  /**
   * Record a student payment
   */
  static async recordStudentPayment(
    schoolId: string,
    studentId: string,
    amount: number,
    paymentMethod: string,
    feeType: string = 'TUITION',
    invoiceNumber?: string
  ): Promise<Payment> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          school_id: schoolId,
          student_id: studentId,
          amount,
          payment_method: paymentMethod,
          fee_type: feeType,
          invoice_number: invoiceNumber,
          status: 'COMPLETED',
          receipt_generated: false,
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error recording student payment:', error)
      throw error
    }
  }

  /**
   * Get payments by school
   */
  static async getPaymentsBySchool(
    schoolId: string,
    limit: number = 100
  ): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching payments:', error)
      throw error
    }
  }

  /**
   * Get payments by student
   */
  static async getPaymentsByStudent(
    studentId: string,
    schoolId: string
  ): Promise<Payment[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching student payments:', error)
      throw error
    }
  }

  /**
   * Generate receipt for payment
   */
  static async generateReceipt(
    schoolId: string,
    paymentId: string,
    studentName: string,
    studentId: string,
    issuedBy: string
  ): Promise<Receipt> {
    try {
      const payment = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single()

      if (payment.error) throw payment.error

      const receiptNumber = `RCP-${Date.now()}`

      const { data, error } = await supabase
        .from('receipts')
        .insert({
          school_id: schoolId,
          payment_id: paymentId,
          receipt_number: receiptNumber,
          student_name: studentName,
          student_id: studentId,
          amount: payment.data.amount,
          fee_type: payment.data.fee_type,
          payment_date: new Date().toISOString().split('T')[0],
          issued_by: issuedBy,
          issued_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      // Mark payment as having receipt generated
      await supabase
        .from('payments')
        .update({ receipt_generated: true })
        .eq('id', paymentId)

      return data
    } catch (error) {
      console.error('Error generating receipt:', error)
      throw error
    }
  }

  /**
   * Get receipt by payment
   */
  static async getReceiptByPayment(paymentId: string): Promise<Receipt | null> {
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('payment_id', paymentId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      return data || null
    } catch (error) {
      console.error('Error fetching receipt:', error)
      throw error
    }
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats(schoolId: string): Promise<{
    totalRevenue: number
    pendingPayments: number
    completedPayments: number
    totalTransactions: number
  }> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('school_id', schoolId)

      if (error) throw error

      const payments = data || []
      return {
        totalRevenue: payments
          .filter((p: any) => p.status === 'COMPLETED')
          .reduce((sum: number, p: any) => sum + p.amount, 0),
        pendingPayments: payments
          .filter((p: any) => p.status === 'PENDING')
          .reduce((sum: number, p: any) => sum + p.amount, 0),
        completedPayments: payments.filter((p: any) => p.status === 'COMPLETED').length,
        totalTransactions: payments.length,
      }
    } catch (error) {
      console.error('Error getting payment stats:', error)
      throw error
    }
  }
}

export class SalaryService {
  /**
   * Record staff salary
   */
  static async recordSalary(
    schoolId: string,
    staffId: string,
    amount: number,
    paymentPeriod: string,
    notes?: string
  ): Promise<Salary> {
    try {
      const { data, error } = await supabase
        .from('salaries')
        .insert({
          school_id: schoolId,
          staff_id: staffId,
          amount,
          payment_period: paymentPeriod,
          status: 'PENDING',
          notes,
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error recording salary:', error)
      throw error
    }
  }

  /**
   * Get salaries by school
   */
  static async getSalariesBySchool(
    schoolId: string,
    status?: string
  ): Promise<Salary[]> {
    try {
      let query = supabase
        .from('salaries')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching salaries:', error)
      throw error
    }
  }

  /**
   * Get salaries by staff member
   */
  static async getSalariesByStaff(
    staffId: string,
    schoolId: string
  ): Promise<Salary[]> {
    try {
      const { data, error } = await supabase
        .from('salaries')
        .select('*')
        .eq('staff_id', staffId)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching staff salaries:', error)
      throw error
    }
  }

  /**
   * Approve a salary
   */
  static async approveSalary(
    salaryId: string,
    approvedBy: string
  ): Promise<Salary> {
    try {
      const { data, error } = await supabase
        .from('salaries')
        .update({
          status: 'APPROVED',
          approved_by: approvedBy,
          approved_at: new Date().toISOString(),
        })
        .eq('id', salaryId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error approving salary:', error)
      throw error
    }
  }

  /**
   * Mark salary as paid
   */
  static async markSalaryAsPaid(salaryId: string): Promise<Salary> {
    try {
      const { data, error } = await supabase
        .from('salaries')
        .update({
          status: 'PAID',
          paid_at: new Date().toISOString(),
        })
        .eq('id', salaryId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error marking salary as paid:', error)
      throw error
    }
  }

  /**
   * Generate payslip
   */
  static async generatePayslip(
    schoolId: string,
    salaryId: string,
    staffId: string,
    grossAmount: number,
    deductions: number = 0,
    paymentMethod?: string
  ): Promise<Payslip> {
    try {
      const netAmount = grossAmount - deductions

      const { data, error } = await supabase
        .from('payslips')
        .insert({
          school_id: schoolId,
          salary_id: salaryId,
          staff_id: staffId,
          gross_amount: grossAmount,
          deductions,
          net_amount: netAmount,
          payment_method: paymentMethod,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error generating payslip:', error)
      throw error
    }
  }

  /**
   * Get salary statistics
   */
  static async getSalaryStats(schoolId: string): Promise<{
    totalPayable: number
    pendingSalaries: number
    paidSalaries: number
    averageSalary: number
  }> {
    try {
      const { data, error } = await supabase
        .from('salaries')
        .select('*')
        .eq('school_id', schoolId)

      if (error) throw error

      const salaries = data || []
      const totalPayable = salaries.reduce((sum: number, s: any) => sum + s.amount, 0)

      return {
        totalPayable,
        pendingSalaries: salaries.filter((s: any) => s.status === 'PENDING').length,
        paidSalaries: salaries.filter((s: any) => s.status === 'PAID').length,
        averageSalary: salaries.length > 0 ? totalPayable / salaries.length : 0,
      }
    } catch (error) {
      console.error('Error getting salary stats:', error)
      throw error
    }
  }
}
