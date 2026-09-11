'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface School {
  id: string
  name: string
  logo_url: string | null
}

interface Staff {
  id: string
  full_name: string
  email: string
  phone?: string
  role: string
}

interface Student {
  id: string
  full_name: string
  email: string
  admission_number?: string
}

interface Transaction {
  id: string
  type: 'STAFF_SALARY' | 'STUDENT_PAYMENT'
  recipient_id: string
  recipient_name: string
  recipient_email?: string
  recipient_phone?: string
  recipient_class?: string  // Class for students
  amount: number
  purpose: string
  payment_method: string
  status: 'COMPLETED' | 'PENDING' | 'FAILED'
  created_at: string
  invoice_number?: string
  notes?: string
}

interface PaymentDetails {
  recipient: Staff | Student | null
  transaction: Transaction
  school: School | null
  allTransactions: Transaction[]
}

export default function AccountantDashboard() {
  const [school, setSchool] = useState<School | null>(null)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [studentList, setStudentList] = useState<Student[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetails | null>(null)
  const [activeTab, setActiveTab] = useState<'staff' | 'students' | 'transactions'>('staff')
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editData, setEditData] = useState<Partial<Transaction>>({})

  useEffect(() => {
    initializeDashboard()
  }, [])

  const initializeDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not authenticated')
        return
      }

      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('school_id, role')
        .eq('id', user.id)
        .single()

      if (userErr || !userData?.school_id) {
        setError('School not found')
        return
      }

      const sid = userData.school_id
      setSchoolId(sid)

      // Fetch school
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name, logo_url')
        .eq('id', sid)
        .single()

      if (schoolData) setSchool(schoolData)

      // Fetch ALL users from the school - select only existing columns
      const { data: allUsers, error: allUsersErr } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('school_id', sid)

      console.log('All users in school:', allUsers)
      console.error('All users error:', allUsersErr)

      // Filter staff (anyone who is NOT student)
      const staffRoles = ['TEACHER', 'ACCOUNTANT', 'PRINCIPAL', 'HEAD_TEACHER', 'SCHOOL_ADMIN', 'STAFF', 'HEAD_OF_DEPARTMENT']
      const filteredStaff = (allUsers || []).filter(u => staffRoles.includes(u.role))
      
      console.log('Filtered staff:', filteredStaff)
      setStaffList(filteredStaff)

      // Filter students
      const filteredStudents = (allUsers || []).filter(u => u.role === 'STUDENT')
      console.log('Filtered students:', filteredStudents)
      setStudentList(filteredStudents)

      // Fetch transactions
      const { data: txnData, error: txnErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('school_id', sid)
        .order('created_at', { ascending: false })

      if (txnErr) {
        console.error('Transaction fetch error:', txnErr)
        setTransactions([])
      } else {
        setTransactions(txnData || [])
      }
    } catch (err) {
      console.error('Init error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleStaffClick = (staff: Staff) => {
    const staffTransactions = transactions.filter(
      t => t.recipient_id === staff.id && t.type === 'STAFF_SALARY'
    )
    
    setSelectedPayment({
      recipient: staff,
      transaction: staffTransactions[0] || {
        id: `new-${staff.id}`,
        type: 'STAFF_SALARY',
        recipient_id: staff.id,
        recipient_name: staff.full_name,
        recipient_email: staff.email,
        recipient_phone: staff.phone || '',
        amount: 0,
        purpose: 'Monthly Salary',
        payment_method: 'Bank Transfer',
        status: 'PENDING',
        created_at: new Date().toISOString(),
        invoice_number: '',
        notes: '',
      },
      school: school,
      allTransactions: staffTransactions,
    })
    setEditMode(false)
    setEditData({})
  }

  const handleStudentClick = async (student: Student) => {
    try {
      const studentTransactions = transactions.filter(
        t => t.recipient_id === student.id && t.type === 'STUDENT_PAYMENT'
      )
      
      // Fetch student class info
      const { data: studentData } = await supabase
        .from('students')
        .select('class_arm_combo_id')
        .eq('id', student.id)
        .single()
      
      let studentClass = 'Unknown'
      if (studentData?.class_arm_combo_id) {
        const { data: classData } = await supabase
          .from('class_arm_combos')
          .select('classes(name), arms(name)')
          .eq('id', studentData.class_arm_combo_id)
          .single()
        
        if (classData) {
          const className = (classData.classes as any)?.name || ''
          const armName = (classData.arms as any)?.name || ''
          studentClass = `${className}${armName ? ` ${armName}` : ''}`
        }
      }
      
      setSelectedPayment({
        recipient: student,
        transaction: studentTransactions[0] || {
          id: `new-${student.id}`,
          type: 'STUDENT_PAYMENT',
          recipient_id: student.id,
          recipient_name: student.full_name,
          recipient_email: student.email,
          recipient_class: studentClass,
          amount: 0,
          purpose: 'School Fees',
          payment_method: 'Bank Transfer',
          status: 'PENDING',
          created_at: new Date().toISOString(),
          invoice_number: '',
          notes: '',
        },
        school: school,
        allTransactions: studentTransactions,
      })
      setEditMode(false)
      setEditData({})
    } catch (err) {
      console.error('Error fetching student class:', err)
      setError('Failed to load student information')
    }
  }

  const savePayment = async () => {
    if (!selectedPayment || !schoolId) return

    try {
      setError(null)
      const txn = selectedPayment.transaction
      const finalData = {
        amount: editData.amount !== undefined ? Number(editData.amount) : Number(txn.amount),
        purpose: editData.purpose || txn.purpose,
        payment_method: editData.payment_method || txn.payment_method,
        status: editData.status || txn.status,
        notes: editData.notes || txn.notes || null,
        invoice_number: editData.invoice_number || txn.invoice_number || null,
      }

      // Validate
      if (!finalData.amount || finalData.amount <= 0) {
        setError('Amount must be greater than 0')
        return
      }

      if (txn.id.startsWith('new-')) {
        // New transaction
        const { data, error: insertErr } = await supabase
          .from('transactions')
          .insert([{
            school_id: schoolId,
            type: txn.type,
            recipient_id: txn.recipient_id,
            recipient_name: txn.recipient_name,
            recipient_email: txn.recipient_email,
            recipient_phone: txn.recipient_phone,
            amount: finalData.amount,
            purpose: finalData.purpose,
            payment_method: finalData.payment_method,
            status: finalData.status,
            invoice_number: finalData.invoice_number,
            notes: finalData.notes,
            created_at: new Date().toISOString(),
          }])
          .select()

        if (insertErr) {
          console.error('Insert error:', insertErr)
          throw insertErr
        }
        setSuccess('Payment recorded successfully!')
      } else {
        // Update existing
        const { error: updateErr } = await supabase
          .from('transactions')
          .update(finalData)
          .eq('id', txn.id)

        if (updateErr) {
          console.error('Update error:', updateErr)
          throw updateErr
        }
        setSuccess('Payment updated successfully!')
      }

      setEditMode(false)
      setTimeout(() => {
        setSuccess(null)
        setSelectedPayment(null)
        initializeDashboard()
      }, 1500)
    } catch (err) {
      console.error('Save error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save payment')
    }
  }

  const shareReceipt = async (method: 'email' | 'whatsapp') => {
    const txn = selectedPayment?.transaction
    if (!txn || !selectedPayment?.school) {
      setError('Missing payment details')
      return
    }

    const receiptContent = `
*PAYMENT RECEIPT*

School: ${selectedPayment.school.name}
Recipient: ${selectedPayment.recipient?.full_name || txn.recipient_name}
Amount: ₦${txn.amount.toFixed(2)}
Purpose: ${txn.purpose}
Date: ${new Date(txn.created_at).toLocaleDateString()}
Status: ${txn.status}

Thank you!
    `.trim()

    if (method === 'email' && selectedPayment.recipient?.email) {
      const mailtoLink = `mailto:${selectedPayment.recipient.email}?subject=Payment Receipt - ${selectedPayment.school.name}&body=${encodeURIComponent(receiptContent)}`
      window.location.href = mailtoLink
    } else if (method === 'whatsapp') {
      if (!selectedPayment.recipient || !('phone' in selectedPayment.recipient)) {
        setError('No phone number available for WhatsApp')
        return
      }

      let phone = selectedPayment.recipient.phone
      if (!phone) {
        setError('No phone number found')
        return
      }

      // Clean phone number - remove spaces, dashes, parentheses
      let cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
      
      // If phone doesn't start with +, add Nigeria country code
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '+234' + cleanPhone.substring(1)
        } else {
          cleanPhone = '+234' + cleanPhone
        }
      }

      const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(receiptContent)}`
      console.log('WhatsApp link:', whatsappLink)
      window.open(whatsappLink, '_blank')
    }
  }

  const shareAllHistory = async (method: 'email' | 'whatsapp') => {
    if (!selectedPayment?.recipient || !selectedPayment?.school) {
      setError('Missing payment details')
      return
    }

    const history = selectedPayment.allTransactions
      .map(t => `${new Date(t.created_at).toLocaleDateString()} - ${t.purpose}: ₦${t.amount.toFixed(2)} (${t.status})`)
      .join('\n')

    const content = `
*PAYMENT HISTORY*

School: ${selectedPayment.school.name}
Name: ${selectedPayment.recipient.full_name}

${history || 'No transaction history'}

Total: ₦${selectedPayment.allTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
    `.trim()

    if (method === 'email' && selectedPayment.recipient.email) {
      const mailtoLink = `mailto:${selectedPayment.recipient.email}?subject=Payment History - ${selectedPayment.school.name}&body=${encodeURIComponent(content)}`
      window.location.href = mailtoLink
    } else if (method === 'whatsapp') {
      if (!('phone' in selectedPayment.recipient)) {
        setError('No phone number available')
        return
      }

      let phone = selectedPayment.recipient.phone
      if (!phone) {
        setError('No phone number found')
        return
      }

      // Clean phone number
      let cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
      
      // Add Nigeria country code if needed
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('0')) {
          cleanPhone = '+234' + cleanPhone.substring(1)
        } else {
          cleanPhone = '+234' + cleanPhone
        }
      }

      const whatsappLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(content)}`
      window.open(whatsappLink, '_blank')
    }
  }

  const formatCurrency = (val: number | undefined) => {
    const num = typeof val === 'number' ? val : 0
    return `₦${num.toFixed(2)}`
  }

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem' } as React.CSSProperties,
    header: { background: 'white', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '1rem' } as React.CSSProperties,
    headerLeft: { display: 'flex', alignItems: 'center', gap: '1.5rem' } as React.CSSProperties,
    logo: { width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover' as const } as React.CSSProperties,
    tabContainer: { display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' as const } as React.CSSProperties,
    tab: { background: 'white', border: 'none', padding: '1rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' } as React.CSSProperties,
    card: { background: 'white', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', marginBottom: '1rem' } as React.CSSProperties,
    modal: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 } as React.CSSProperties,
    modalContent: { background: 'white', borderRadius: '12px', padding: '2rem', maxWidth: '600px', width: '90%', maxHeight: '90vh', overflowY: 'auto' as const } as React.CSSProperties,
    input: { width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' as const } as React.CSSProperties,
    button: { padding: '0.75rem 1rem', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' } as React.CSSProperties,
  }

  if (loading) {
    return <div style={styles.container}><p style={{ color: 'white' }}>Loading...</p></div>
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {school?.logo_url && <img src={school.logo_url} alt="Logo" style={styles.logo} />}
          <div>
            <h1 style={{ margin: 0, color: '#111827' }}>{school?.name}</h1>
            <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280' }}>💰 Accountant</p>
          </div>
        </div>
        <button onClick={initializeDashboard} style={{ ...styles.button, background: '#667eea', color: 'white' }}>🔄 Refresh</button>
      </div>

      {error && <div style={{ background: '#fee', color: '#c33', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>❌ {error}</div>}
      {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '8px', marginBottom: '2rem' }}>✅ {success}</div>}

      <div style={styles.tabContainer}>
        {['staff', 'students', 'transactions'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as typeof activeTab)} style={{ ...styles.tab, background: activeTab === tab ? '#667eea' : 'rgba(255, 255, 255, 0.7)', color: activeTab === tab ? 'white' : '#6b7280' }}>
            {tab === 'staff' && `👨‍💼 Staff (${staffList.length})`}
            {tab === 'students' && `👨‍🎓 Students (${studentList.length})`}
            {tab === 'transactions' && `📋 Transactions (${transactions.length})`}
          </button>
        ))}
      </div>

      {activeTab === 'staff' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {staffList.length === 0 ? (
            <div style={{ color: 'white', gridColumn: '1 / -1', padding: '2rem', textAlign: 'center' }}>📭 No staff found</div>
          ) : (
            staffList.map(staff => (
              <div key={staff.id} onClick={() => handleStaffClick(staff)} style={{ ...styles.card, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem' }}>{staff.full_name}</p>
                <p style={{ margin: '0.5rem 0 0 0', color: '#667eea', fontWeight: '600', fontSize: '0.9rem' }}>{staff.role}</p>
                <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.9rem' }}>📧 {staff.email}</p>
                {staff.phone && <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.9rem' }}>📱 {staff.phone}</p>}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'students' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {studentList.length === 0 ? (
            <div style={{ color: 'white', gridColumn: '1 / -1', padding: '2rem', textAlign: 'center' }}>📭 No students found</div>
          ) : (
            studentList.map(student => (
              <div key={student.id} onClick={() => handleStudentClick(student)} style={{ ...styles.card, cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                <p style={{ margin: 0, fontWeight: '700', fontSize: '1.1rem' }}>{student.full_name}</p>
                <p style={{ margin: '0.5rem 0 0 0', color: '#667eea', fontWeight: '600' }}>{student.admission_number || 'No admission #'}</p>
                <p style={{ margin: '0.25rem 0', color: '#6b7280', fontSize: '0.9rem' }}>📧 {student.email}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem' }}>
          {transactions.length === 0 ? (
            <p style={{ color: '#9ca3af', textAlign: 'center' }}>No transactions yet</p>
          ) : (
            transactions.map(txn => (
              <div key={txn.id} onClick={() => setSelectedPayment({ recipient: null, transaction: txn, school, allTransactions: [txn] })} style={{ ...styles.card, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: '700' }}>{txn.recipient_name}</p>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{txn.purpose}</p>
                    {txn.type === 'STUDENT_PAYMENT' && txn.recipient_class && (
                      <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.85rem' }}>📚 {txn.recipient_class}</p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: '700', color: '#667eea' }}>{formatCurrency(txn.amount)}</p>
                    <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.9rem' }}>{txn.status}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedPayment && (
        <div style={styles.modal} onClick={() => setSelectedPayment(null)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>💳 {editMode ? 'Record Payment' : 'Payment Details'}</h2>
              <button onClick={() => { setSelectedPayment(null); setEditMode(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>

            {!editMode ? (
              <>
                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontWeight: '700' }}>{selectedPayment.school?.name}</p>
                  <p style={{ margin: '0.5rem 0 0 0', fontWeight: '600' }}>{selectedPayment.recipient?.full_name}</p>
                  {selectedPayment.transaction.type === 'STUDENT_PAYMENT' && selectedPayment.transaction.recipient_class && (
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#6b7280' }}>📚 Class: {selectedPayment.transaction.recipient_class}</p>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>Amount</label>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>{formatCurrency(selectedPayment.transaction.amount)}</p>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>Status</label>
                    <p style={{ margin: 0, display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '4px', background: selectedPayment.transaction.status === 'COMPLETED' ? '#d1fae5' : '#fef3c7', color: selectedPayment.transaction.status === 'COMPLETED' ? '#065f46' : '#92400e', fontWeight: '600', fontSize: '0.875rem' }}>{selectedPayment.transaction.status}</p>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>Purpose</label>
                  <p style={{ margin: 0 }}>{selectedPayment.transaction.purpose}</p>
                </div>

                {selectedPayment.allTransactions.length > 0 && (
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                    <p style={{ margin: '0 0 0.75rem 0', fontWeight: '600', fontSize: '0.9rem' }}>📋 History ({selectedPayment.allTransactions.length})</p>
                    {selectedPayment.allTransactions.map((t, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', fontSize: '0.9rem', borderBottom: i < selectedPayment.allTransactions.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                        <span style={{ fontWeight: '600' }}>{formatCurrency(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button onClick={() => { setEditMode(true); setEditData({}) }} style={{ ...styles.button, background: '#667eea', color: 'white' }}>✏️ Edit</button>
                  <button onClick={() => shareReceipt('email')} style={{ ...styles.button, background: '#e5e7eb', color: '#111827' }}>📧 Email</button>
                  <button onClick={() => shareReceipt('whatsapp')} style={{ ...styles.button, background: '#e5e7eb', color: '#111827' }}>💬 WhatsApp</button>
                  {selectedPayment.allTransactions.length > 0 && <button onClick={() => shareAllHistory('email')} style={{ ...styles.button, background: '#e5e7eb', color: '#111827' }}>📧 History</button>}
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#111827', fontSize: '0.9rem' }}>Amount *</label>
                  <input type="number" min="0" step="0.01" value={String(editData.amount !== undefined ? editData.amount : selectedPayment.transaction.amount)} onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) || 0 })} style={styles.input} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#111827', fontSize: '0.9rem' }}>Purpose</label>
                  <input type="text" value={editData.purpose || selectedPayment.transaction.purpose} onChange={(e) => setEditData({ ...editData, purpose: e.target.value })} style={styles.input} />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#111827', fontSize: '0.9rem' }}>Status</label>
                  <select value={editData.status || selectedPayment.transaction.status} onChange={(e) => setEditData({ ...editData, status: e.target.value as any })} style={styles.input}>
                    <option>PENDING</option>
                    <option>COMPLETED</option>
                    <option>FAILED</option>
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#111827', fontSize: '0.9rem' }}>Payment Method</label>
                  <input type="text" value={editData.payment_method || selectedPayment.transaction.payment_method} onChange={(e) => setEditData({ ...editData, payment_method: e.target.value })} style={styles.input} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#111827', fontSize: '0.9rem' }}>Notes</label>
                  <textarea value={editData.notes || selectedPayment.transaction.notes || ''} onChange={(e) => setEditData({ ...editData, notes: e.target.value })} style={{ ...styles.input, minHeight: '80px' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button onClick={savePayment} style={{ ...styles.button, background: '#10b981', color: 'white', fontWeight: '700' }}>💾 Save Payment</button>
                  <button onClick={() => { setEditMode(false); setEditData({}) }} style={{ ...styles.button, background: '#e5e7eb', color: '#111827' }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
