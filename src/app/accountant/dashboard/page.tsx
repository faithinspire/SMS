'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { SharingService } from '@/services/sharing.service'

interface School {
  id: string
  name: string
  logo_url: string | null
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
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
  phone?: string
}

interface Transaction {
  id: string
  type: 'STAFF_SALARY' | 'STUDENT_PAYMENT'
  recipient_id: string
  recipient_name: string
  recipient_email?: string
  recipient_phone?: string
  recipient_class?: string
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

type NavTab = 'dashboard' | 'transactions' | 'reports' | 'settings'

export default function AccountantDashboard() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [studentList, setStudentList] = useState<Student[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetails | null>(null)
  const [activeNav, setActiveNav] = useState<NavTab>('dashboard')
  const [activeTab, setActiveTab] = useState<'staff' | 'students'>('staff')
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
        router.push('/auth/login')
        return
      }

      const { data: userData, error: userErr } = await supabase
        .from('users')
        .select('id, full_name, email, role, school_id')
        .eq('id', user.id)
        .single()

      if (userErr || !userData?.school_id) {
        setError('School not found')
        return
      }

      setCurrentUser(userData)
      const sid = userData.school_id
      setSchoolId(sid)

      // Fetch school
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id, name, logo_url')
        .eq('id', sid)
        .single()

      if (schoolData) setSchool(schoolData)

      // Fetch all users
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, full_name, email, role, phone')
        .eq('school_id', sid)

      const staffRoles = ['TEACHER', 'ACCOUNTANT', 'PRINCIPAL', 'HEAD_TEACHER', 'SCHOOL_ADMIN', 'STAFF', 'HEAD_OF_DEPARTMENT']
      setStaffList(allUsers?.filter(u => staffRoles.includes(u.role)) || [])
      setStudentList(allUsers?.filter(u => u.role === 'STUDENT') || [])

      // Fetch transactions
      const { data: txnData } = await supabase
        .from('transactions')
        .select('*')
        .eq('school_id', sid)
        .order('created_at', { ascending: false })

      setTransactions(txnData || [])
    } catch (err) {
      console.error('Init error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (err) {
      setError('Failed to logout')
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

      let studentClass = 'Unknown'
      try {
        const { data: studentData } = await supabase
          .from('students')
          .select('class_arm_combo_id')
          .eq('id', student.id)
          .single()

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
      } catch (err) {
        console.log('Could not fetch class info')
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
      console.error('Error:', err)
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

      if (!finalData.amount || finalData.amount <= 0) {
        setError('Amount must be greater than 0')
        return
      }

      if (txn.id.startsWith('new-')) {
        const { error: insertErr } = await supabase
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

        if (insertErr) throw insertErr
        setSuccess('Payment recorded successfully!')
      } else {
        const { error: updateErr } = await supabase
          .from('transactions')
          .update(finalData)
          .eq('id', txn.id)

        if (updateErr) throw updateErr
        setSuccess('Payment updated successfully!')
      }

      setEditMode(false)
      setTimeout(() => {
        setSuccess(null)
        setSelectedPayment(null)
        initializeDashboard()
      }, 1500)
    } catch (err) {
      console.error('Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  const shareReceipt = async (method: 'email' | 'whatsapp') => {
    const txn = selectedPayment?.transaction
    if (!txn || !selectedPayment?.school) {
      setError('Missing details')
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
      const mailtoLink = `mailto:${selectedPayment.recipient.email}?subject=Payment Receipt&body=${encodeURIComponent(receiptContent)}`
      window.location.href = mailtoLink
    } else if (method === 'whatsapp') {
      if (!selectedPayment.recipient || !('phone' in selectedPayment.recipient)) {
        setError('No phone number available')
        return
      }

      try {
        SharingService.shareViaWhatsApp({
          phoneNumber: selectedPayment.recipient.phone || '',
          message: 'Here is your payment receipt',
          letterContent: receiptContent,
        })
      } catch (err: any) {
        setError(err.message)
      }
    }
  }

  const shareAllHistory = async (method: 'email' | 'whatsapp') => {
    if (!selectedPayment?.recipient || !selectedPayment?.school) {
      setError('Missing details')
      return
    }

    const history = selectedPayment.allTransactions
      .map(t => `${new Date(t.created_at).toLocaleDateString()} - ${t.purpose}: ₦${t.amount.toFixed(2)}`)
      .join('\n')

    const content = `
*PAYMENT HISTORY*

School: ${selectedPayment.school.name}
Name: ${selectedPayment.recipient.full_name}

${history || 'No history'}

Total: ₦${selectedPayment.allTransactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}
    `.trim()

    if (method === 'email' && selectedPayment.recipient.email) {
      const mailtoLink = `mailto:${selectedPayment.recipient.email}?subject=Payment History&body=${encodeURIComponent(content)}`
      window.location.href = mailtoLink
    } else if (method === 'whatsapp') {
      if (!('phone' in selectedPayment.recipient)) {
        setError('No phone number')
        return
      }

      try {
        SharingService.shareViaWhatsApp({
          phoneNumber: selectedPayment.recipient.phone || '',
          message: 'Here is your payment history',
          letterContent: content,
        })
      } catch (err: any) {
        setError(err.message)
      }
    }
  }

  const formatCurrency = (val: number | undefined) => `₦${(val || 0).toFixed(2)}`

  const getTransactionStats = () => {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0)
    const completed = transactions.filter(t => t.status === 'COMPLETED').length
    const pending = transactions.filter(t => t.status === 'PENDING').length
    return { total, completed, pending }
  }

  const stats = getTransactionStats()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div style={{ color: 'white', fontSize: '1.2rem' }}>⏳ Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Modern Header/Navbar */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '1.5rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {school?.logo_url && <img src={school.logo_url} alt="Logo" style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />}
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{school?.name}</h1>
              <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>💰 Accountant Portal</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={initializeDashboard} style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>🔄 Refresh</button>
            <button onClick={handleLogout} style={{ padding: '0.5rem 1rem', background: '#ef4444', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>🚪 Logout</button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', gap: '2rem' }}>
          {(['dashboard', 'transactions', 'reports', 'settings'] as NavTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveNav(tab)}
              style={{
                padding: '1rem 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontWeight: activeNav === tab ? '700' : '600',
                color: activeNav === tab ? '#667eea' : '#6b7280',
                borderBottom: activeNav === tab ? '2px solid #667eea' : 'none',
                fontSize: '1rem',
              }}
            >
              {tab === 'dashboard' && '📊 Dashboard'}
              {tab === 'transactions' && '📋 Transactions'}
              {tab === 'reports' && '📈 Reports'}
              {tab === 'settings' && '⚙️ Settings'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        {error && <div style={{ background: '#fee', color: '#c33', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>❌ {error}</div>}
        {success && <div style={{ background: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>✅ {success}</div>}

        {activeNav === 'dashboard' && (
          <>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontWeight: '500', fontSize: '0.9rem' }}>Total Transactions</p>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>{transactions.length}</p>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontWeight: '500', fontSize: '0.9rem' }}>Total Amount</p>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{formatCurrency(stats.total)}</p>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontWeight: '500', fontSize: '0.9rem' }}>Completed</p>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>{stats.completed}</p>
              </div>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 0.5rem 0', color: '#6b7280', fontWeight: '500', fontSize: '0.9rem' }}>Pending</p>
                <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.pending}</p>
              </div>
            </div>

            {/* Tabs: Staff vs Students */}
            <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
                <button
                  onClick={() => setActiveTab('staff')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: activeTab === 'staff' ? '#667eea' : '#f3f4f6',
                    color: activeTab === 'staff' ? 'white' : '#111827',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  👨‍💼 Staff ({staffList.length})
                </button>
                <button
                  onClick={() => setActiveTab('students')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: activeTab === 'students' ? '#667eea' : '#f3f4f6',
                    color: activeTab === 'students' ? 'white' : '#111827',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  👨‍🎓 Students ({studentList.length})
                </button>
              </div>

              {activeTab === 'staff' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {staffList.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No staff found</div>
                  ) : (
                    staffList.map(staff => (
                      <div
                        key={staff.id}
                        onClick={() => handleStaffClick(staff)}
                        style={{
                          background: '#f9fafb',
                          padding: '1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          border: '1px solid #e5e7eb',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{staff.full_name}</p>
                        <p style={{ margin: '0.25rem 0 0 0', color: '#667eea', fontWeight: '600', fontSize: '0.9rem' }}>{staff.role}</p>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.85rem' }}>{staff.email}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'students' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                  {studentList.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No students found</div>
                  ) : (
                    studentList.map(student => (
                      <div
                        key={student.id}
                        onClick={() => handleStudentClick(student)}
                        style={{
                          background: '#f9fafb',
                          padding: '1rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          border: '1px solid #e5e7eb',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                          e.currentTarget.style.transform = 'translateY(-2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none'
                          e.currentTarget.style.transform = 'translateY(0)'
                        }}
                      >
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '1rem' }}>{student.full_name}</p>
                        <p style={{ margin: '0.25rem 0 0 0', color: '#667eea', fontWeight: '600' }}>{student.admission_number || 'N/A'}</p>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.85rem' }}>{student.email}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeNav === 'transactions' && (
          <div style={{ background: 'white', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: '0 0 1.5rem 0' }}>📋 All Transactions</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', color: '#6b7280' }}>Recipient</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', color: '#6b7280' }}>Purpose</th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: '#6b7280' }}>Amount</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', color: '#6b7280' }}>Status</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '700', color: '#6b7280' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn, idx) => (
                    <tr
                      key={txn.id}
                      onClick={() => setSelectedPayment({ recipient: null, transaction: txn, school, allTransactions: [txn] })}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        background: idx % 2 === 0 ? '#f9fafb' : 'white',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#f9fafb' : 'white'}
                    >
                      <td style={{ padding: '1rem' }}>{txn.recipient_name}</td>
                      <td style={{ padding: '1rem' }}>{txn.purpose}</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '700', color: '#667eea' }}>{formatCurrency(txn.amount)}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          background: txn.status === 'COMPLETED' ? '#d1fae5' : txn.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                          color: txn.status === 'COMPLETED' ? '#065f46' : txn.status === 'PENDING' ? '#92400e' : '#991b1b',
                          fontWeight: '600',
                          fontSize: '0.85rem',
                        }}>
                          {txn.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>{new Date(txn.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>No transactions yet</div>
              )}
            </div>
          </div>
        )}

        {activeNav === 'reports' && (
          <div style={{ background: 'white', borderRadius: '8px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: 0 }}>📈 Financial Reports</h2>
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Coming soon: Detailed financial reports and analytics</p>
          </div>
        )}

        {activeNav === 'settings' && (
          <div style={{ background: 'white', borderRadius: '8px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ margin: 0 }}>⚙️ Settings</h2>
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ fontWeight: '600' }}>Account Information</p>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '6px', marginTop: '0.5rem' }}>
                <p style={{ margin: '0.5rem 0', color: '#6b7280' }}><strong>Name:</strong> {currentUser?.full_name}</p>
                <p style={{ margin: '0.5rem 0', color: '#6b7280' }}><strong>Email:</strong> {currentUser?.email}</p>
                <p style={{ margin: '0.5rem 0', color: '#6b7280' }}><strong>Role:</strong> {currentUser?.role}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedPayment && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setSelectedPayment(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>💳 {editMode ? 'Record Payment' : 'Payment Details'}</h2>
              <button onClick={() => { setSelectedPayment(null); setEditMode(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}>✕</button>
            </div>

            {!editMode ? (
              <>
                <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <p style={{ margin: 0, fontWeight: '700' }}>{selectedPayment.school?.name}</p>
                  <p style={{ margin: '0.5rem 0 0 0', fontWeight: '600' }}>{selectedPayment.recipient?.full_name}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#6b7280', fontSize: '0.9rem' }}>Amount</p>
                    <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>{formatCurrency(selectedPayment.transaction.amount)}</p>
                  </div>
                  <div>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#6b7280', fontSize: '0.9rem' }}>Status</p>
                    <p style={{ margin: 0, display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '4px', background: selectedPayment.transaction.status === 'COMPLETED' ? '#d1fae5' : '#fef3c7', color: selectedPayment.transaction.status === 'COMPLETED' ? '#065f46' : '#92400e', fontWeight: '600', fontSize: '0.85rem' }}>{selectedPayment.transaction.status}</p>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#6b7280' }}>Purpose</p>
                  <p style={{ margin: 0 }}>{selectedPayment.transaction.purpose}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <button onClick={() => { setEditMode(true); setEditData({}) }} style={{ padding: '0.75rem', background: '#667eea', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>✏️ Edit</button>
                  <button onClick={() => shareReceipt('email')} style={{ padding: '0.75rem', background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>📧 Email</button>
                  <button onClick={() => shareReceipt('whatsapp')} style={{ padding: '0.75rem', background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>💬 WhatsApp</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem' }}>Amount *</label>
                  <input type="number" min="0" value={editData.amount !== undefined ? editData.amount : selectedPayment.transaction.amount} onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <button onClick={savePayment} style={{ padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>💾 Save</button>
                  <button onClick={() => { setEditMode(false); setEditData({}) }} style={{ padding: '0.75rem', background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
