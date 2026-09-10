'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

export default function SecondaryAccountantDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [school, setSchool] = useState<any>(null)
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalStaff: 0,
    totalPayments: 0,
    pendingPayments: 0,
  })
  const [students, setStudents] = useState<any[]>([])
  const [staff, setStaff] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'staff' | 'transactions'>('overview')
  const [filteredStudents, setFilteredStudents] = useState<any[]>([])
  const [filteredStaff, setFilteredStaff] = useState<any[]>([])
  const [searchStudent, setSearchStudent] = useState('')
  const [searchStaff, setSearchStaff] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    loadData()
  }, [])

  useEffect(() => {
    const filtered = students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(searchStudent.toLowerCase()) ||
        s.admission_number?.toLowerCase().includes(searchStudent.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchStudent.toLowerCase())
    )
    setFilteredStudents(filtered)
  }, [searchStudent, students])

  useEffect(() => {
    const filtered = staff.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(searchStaff.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchStaff.toLowerCase())
    )
    setFilteredStaff(filtered)
  }, [searchStaff, staff])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (
        !currentUser ||
        currentUser.role !== 'ACCOUNTANT' ||
        currentUser.school_level !== 'SECONDARY'
      ) {
        console.log('❌ User role:', currentUser?.role, 'School level:', currentUser?.school_level)
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (currentUser.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .eq('school_level', 'SECONDARY')
          .single()

        if (!schoolData) {
          throw new Error('Secondary school not found')
        }

        setSchool(schoolData)

        const { data: studentData, error: studentError } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            email,
            phone,
            school_level
          `)
          .eq('school_id', currentUser.school_id)
          .eq('role', 'STUDENT')
          .eq('school_level', 'SECONDARY')
          .order('full_name')

        if (studentError) throw studentError

        const { data: studentDetailsData } = await supabase
          .from('students')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .in(
            'user_id',
            studentData?.map((s) => s.id) || []
          )

        const enrichedStudents = (studentData || []).map((user) => {
          const details = studentDetailsData?.find((s) => s.user_id === user.id)
          return { ...user, ...details }
        })

        setStudents(enrichedStudents)

        const { data: staffData, error: staffError } = await supabase
          .from('users')
          .select('id, full_name, email, phone, role, school_level')
          .eq('school_id', currentUser.school_id)
          .in('role', ['TEACHER', 'PRINCIPAL', 'STAFF'])
          .eq('school_level', 'SECONDARY')
          .order('full_name')

        if (staffError) throw staffError

        setStaff(staffData || [])

        const { data: transactionData, error: transactionError } = await supabase
          .from('transactions')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (transactionError) throw transactionError

        setTransactions(transactionData || [])

        setStats({
          totalStudents: enrichedStudents.length,
          totalStaff: staffData?.length || 0,
          totalPayments: transactionData?.length || 0,
          pendingPayments: transactionData?.filter((t) => t.status === 'PENDING').length || 0,
        })
      }
    } catch (error) {
      console.error('Load data error:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/landing')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const bgClass = darkMode
    ? 'from-slate-950 via-blue-900 to-slate-900'
    : 'from-blue-50 via-indigo-50 to-blue-100'
  const cardClass = darkMode
    ? 'bg-slate-800/80 backdrop-blur border-slate-700/50'
    : 'bg-white/90 backdrop-blur border-blue-200/50'
  const textClass = darkMode ? 'text-white' : 'text-gray-900'

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-indigo-500 mx-auto mb-4"></div>
          <p className={textClass}>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass}`}>
      <div className={`${cardClass} border-b shadow-2xl`}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            {school?.logo_url && (
              <img src={school.logo_url} alt={school.name} className="h-12 w-12 rounded-full" />
            )}
            <div>
              <h1 className={`text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent`}>
                💰 Secondary Accountant Dashboard
              </h1>
              <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{school?.name}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Students (Secondary)', value: stats.totalStudents, icon: '👨‍🎓', color: 'from-blue-500 to-blue-600' },
            { label: 'Total Staff (Secondary)', value: stats.totalStaff, icon: '👨‍🏫', color: 'from-indigo-500 to-indigo-600' },
            { label: 'Total Transactions', value: stats.totalPayments, icon: '💳', color: 'from-purple-500 to-purple-600' },
            { label: 'Pending Payments', value: stats.pendingPayments, icon: '⏳', color: 'from-orange-500 to-orange-600' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className={`${cardClass} border rounded-lg shadow-xl p-6 transform hover:scale-105 transition-all`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</p>
                  <p className={`text-3xl font-bold ${textClass} mt-2`}>{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={`${cardClass} border rounded-lg shadow-xl mb-8`}>
          <div className="flex gap-4 p-4 border-b flex-wrap">
            {(['overview', 'students', 'staff', 'transactions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg font-semibold transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : darkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'overview' && '📊 Overview'}
                {tab === 'students' && '👨‍🎓 Students'}
                {tab === 'staff' && '👨‍🏫 Staff'}
                {tab === 'transactions' && '💳 Transactions'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="p-8">
              <div className={`${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} rounded-lg p-6`}>
                <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-600'} font-semibold mb-2`}>
                  Secondary School Accountant Portal
                </p>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                  Welcome! This dashboard shows all SECONDARY level students and staff records for your school.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="p-8">
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search by name, admission number, or email..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              {filteredStudents.length === 0 ? (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No students found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    <thead>
                      <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                        <th className="px-4 py-2 text-left font-bold">Name</th>
                        <th className="px-4 py-2 text-left font-bold">Admission #</th>
                        <th className="px-4 py-2 text-left font-bold">Email</th>
                        <th className="px-4 py-2 text-left font-bold">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr
                          key={student.id}
                          className={darkMode ? 'border-b border-gray-600 hover:bg-gray-700' : 'border-b hover:bg-gray-50'}
                        >
                          <td className="px-4 py-2">{student.full_name || 'N/A'}</td>
                          <td className="px-4 py-2">{student.admission_number || 'N/A'}</td>
                          <td className="px-4 py-2">{student.email || 'N/A'}</td>
                          <td className="px-4 py-2">{student.phone || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="p-8">
              <div className="mb-6">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchStaff}
                  onChange={(e) => setSearchStaff(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              {filteredStaff.length === 0 ? (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No staff found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    <thead>
                      <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                        <th className="px-4 py-2 text-left font-bold">Name</th>
                        <th className="px-4 py-2 text-left font-bold">Role</th>
                        <th className="px-4 py-2 text-left font-bold">Email</th>
                        <th className="px-4 py-2 text-left font-bold">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((staffMember) => (
                        <tr
                          key={staffMember.id}
                          className={darkMode ? 'border-b border-gray-600 hover:bg-gray-700' : 'border-b hover:bg-gray-50'}
                        >
                          <td className="px-4 py-2">{staffMember.full_name || 'N/A'}</td>
                          <td className="px-4 py-2">{staffMember.role}</td>
                          <td className="px-4 py-2">{staffMember.email || 'N/A'}</td>
                          <td className="px-4 py-2">{staffMember.phone || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="p-8">
              {transactions.length === 0 ? (
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>No transactions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    <thead>
                      <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                        <th className="px-4 py-2 text-left font-bold">Recipient</th>
                        <th className="px-4 py-2 text-left font-bold">Type</th>
                        <th className="px-4 py-2 text-left font-bold">Amount</th>
                        <th className="px-4 py-2 text-left font-bold">Status</th>
                        <th className="px-4 py-2 text-left font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr
                          key={txn.id}
                          className={darkMode ? 'border-b border-gray-600 hover:bg-gray-700' : 'border-b hover:bg-gray-50'}
                        >
                          <td className="px-4 py-2">{txn.recipient_name}</td>
                          <td className="px-4 py-2">{txn.type}</td>
                          <td className="px-4 py-2 font-bold">₦{txn.amount?.toLocaleString()}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-bold ${
                                txn.status === 'COMPLETED'
                                  ? 'bg-green-100 text-green-800'
                                  : txn.status === 'PENDING'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {txn.status}
                            </span>
                          </td>
                          <td className="px-4 py-2">{new Date(txn.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
