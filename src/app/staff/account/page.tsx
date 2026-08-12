'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import { User } from '@/types'

export default function StaffAccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [staffData, setStaffData] = useState<any>(null)
  const [bankDetails, setBankDetails] = useState<any>(null)
  const [salaryData, setSalaryData] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || (currentUser.role !== 'TEACHER' && !['ACCOUNTANT', 'STAFF', 'PRINCIPAL', 'HEAD_TEACHER'].includes(currentUser.role))) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Load staff details
      if (currentUser.id) {
        // Get staff record
        const { data: staff } = await supabase
          .from('staff')
          .select('*')
          .eq('user_id', currentUser.id)
          .single()

        setStaffData(staff)

        // Get bank details if they exist
        try {
          const { data: bank } = await supabase
            .from('staff_accounts')
            .select('*')
            .eq('user_id', currentUser.id)
            .single()

          setBankDetails(bank)
        } catch (err) {
          console.log('No bank details found')
        }

        // Get salary data
        if (staff?.id) {
          const { data: salary } = await supabase
            .from('salaries')
            .select('*')
            .eq('staff_id', staff.id)
            .order('created_at', { ascending: false })
            .limit(5)

          setSalaryData(salary || [])
        }
      }
    } catch (err: any) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      router.push('/landing')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const bgClass = darkMode
    ? 'from-slate-950 via-purple-900 to-slate-900'
    : 'from-blue-50 via-purple-50 to-indigo-100'
  const cardClass = darkMode
    ? 'bg-slate-800/80 backdrop-blur border-slate-700/50'
    : 'bg-white/90 backdrop-blur border-purple-200/50'
  const textClass = darkMode ? 'text-white' : 'text-gray-900'

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-pink-500 mx-auto mb-4"></div>
          <p className={textClass}>Loading account details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgClass} transition-all duration-300`}>
      {/* Header */}
      <div className={`${cardClass} border-b shadow-2xl`}>
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className={`text-3xl font-black bg-gradient-to-r ${darkMode ? 'from-purple-400 to-pink-400' : 'from-blue-600 to-purple-600'} bg-clip-text text-transparent`}>
              👤 My Account
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Staff Account & Payment Details</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                darkMode
                  ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                  : 'bg-blue-200/50 text-blue-700 hover:bg-blue-300/50'
              }`}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Personal Information */}
        <div className={`${cardClass} border rounded-lg shadow-xl p-8 mb-6`}>
          <h2 className={`text-2xl font-bold mb-6 ${textClass}`}>👤 Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Full Name</p>
              <p className={`text-xl font-bold ${textClass}`}>{user?.full_name}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Email</p>
              <p className={`text-xl font-bold ${textClass}`}>{user?.email}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Role</p>
              <p className={`text-xl font-bold ${textClass}`}>{user?.role}</p>
            </div>
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</p>
              <p className={`text-xl font-bold text-green-400`}>✓ Active</p>
            </div>
            {staffData?.position && (
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Position</p>
                <p className={`text-xl font-bold ${textClass}`}>{staffData.position}</p>
              </div>
            )}
            {staffData?.employment_date && (
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Employment Date</p>
                <p className={`text-xl font-bold ${textClass}`}>
                  {new Date(staffData.employment_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Bank & Payment Details */}
        {bankDetails && (
          <div className={`${cardClass} border rounded-lg shadow-xl p-8 mb-6`}>
            <h2 className={`text-2xl font-bold mb-6 ${textClass}`}>💰 Bank Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bankDetails.bank_name && (
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Bank Name</p>
                  <p className={`text-xl font-bold ${textClass}`}>{bankDetails.bank_name}</p>
                </div>
              )}
              {bankDetails.account_number && (
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Account Number</p>
                  <p className={`text-xl font-bold ${textClass}`}>{bankDetails.account_number}</p>
                </div>
              )}
              {bankDetails.account_holder_name && (
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Account Holder Name</p>
                  <p className={`text-xl font-bold ${textClass}`}>{bankDetails.account_holder_name}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Salary Information */}
        {salaryData && salaryData.length > 0 && (
          <div className={`${cardClass} border rounded-lg shadow-xl overflow-hidden`}>
            <div className={`px-6 py-4 ${darkMode ? 'bg-slate-700/50' : 'bg-blue-100/50'} border-b`}>
              <h2 className={`text-2xl font-bold ${textClass}`}>💵 Salary & Payments</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${darkMode ? 'bg-slate-700/30' : 'bg-blue-50/50'} border-b`}>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Amount</th>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Term</th>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Status</th>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Due Date</th>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Paid Date</th>
                  </tr>
                </thead>
                <tbody>
                  {salaryData.map((salary: any) => (
                    <tr key={salary.id} className={`border-b hover:${darkMode ? 'bg-slate-700/20' : 'bg-blue-50/30'}`}>
                      <td className={`px-6 py-4 font-semibold ${textClass}`}>₦{salary.amount.toLocaleString()}</td>
                      <td className={`px-6 py-4 ${textClass}`}>{salary.term_id || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          salary.payment_status === 'PAID'
                            ? 'bg-green-100/30 text-green-400'
                            : salary.payment_status === 'OVERDUE'
                            ? 'bg-red-100/30 text-red-400'
                            : 'bg-yellow-100/30 text-yellow-400'
                        }`}>
                          {salary.payment_status}
                        </span>
                      </td>
                      <td className={`px-6 py-4 ${textClass}`}>
                        {salary.due_date ? new Date(salary.due_date).toLocaleDateString() : '-'}
                      </td>
                      <td className={`px-6 py-4 ${textClass}`}>
                        {salary.paid_date ? new Date(salary.paid_date).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
