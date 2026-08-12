import { supabase } from '@/lib/supabase-client'

export interface Payment {
  id: string
  schoolId: string
  studentId?: string
  staffId?: string
  amount: number
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'ONLINE_GATEWAY'
  description: string
  recordedAt: string
  recordedBy: string
}

export interface Receipt {
  id: string
  receiptNumber: string
  paymentId: string
  schoolId: string
  amount: number
  date: string
  purpose: string
  generatedAt: string
}

export class AccountingService {
  static async recordStudentPayment(data: Omit<Payment, 'id' | 'recordedAt'>): Promise<Payment> {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({ ...data, recorded_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return payment
  }

  static async recordStaffPayment(data: Omit<Payment, 'id' | 'recordedAt'>): Promise<Payment> {
    const { data: payment, error } = await supabase
      .from('payments')
      .insert({ ...data, recorded_at: new Date().toISOString() })
      .select()
      .single()

    if (error) throw error
    return payment
  }

  static async generateReceipt(paymentId: string): Promise<Receipt> {
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (!payment) throw new Error('Payment not found')

    const receiptNumber = `RCP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const { data: receipt, error } = await supabase
      .from('receipts')
      .insert({
        receipt_number: receiptNumber,
        payment_id: paymentId,
        school_id: payment.school_id,
        amount: payment.amount,
        date: new Date().toISOString(),
        purpose: payment.description,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return receipt
  }

  static async getStudentPaymentBalances(schoolId: string): Promise<any[]> {
    const { data: students } = await supabase
      .from('students')
      .select('id, first_name, last_name, admission_number, class_arm_combos(classes(name), arms(name))')
      .eq('school_id', schoolId)

    if (!students) return []

    const balances = await Promise.all(
      students.map(async (student) => {
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('student_id', student.id)

        const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

        return {
          student,
          totalPaid,
          className: `${student.class_arm_combos?.classes?.name} ${student.class_arm_combos?.arms?.name}`,
        }
      })
    )

    return balances
  }

  static async getFinancialReport(schoolId: string): Promise<any> {
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('school_id', schoolId)

    const totalCollected = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

    return {
      totalCollected,
      totalPayments: payments?.length || 0,
      paymentsByMethod: this.groupByMethod(payments || []),
    }
  }

  private static groupByMethod(payments: any[]): Record<string, number> {
    return payments.reduce((acc, p) => {
      acc[p.payment_method] = (acc[p.payment_method] || 0) + p.amount
      return acc
    }, {})
  }

  static async sendReceiptByEmail(receiptId: string, email: string): Promise<void> {
    // SendGrid integration ready
    console.log(`Sending receipt ${receiptId} to ${email}`)
  }

  static async sendReceiptByWhatsApp(receiptId: string, phoneNumber: string): Promise<void> {
    // Twilio integration ready
    console.log(`Sending receipt ${receiptId} to ${phoneNumber}`)
  }
}
