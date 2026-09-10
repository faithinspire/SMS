'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface Staff {
  id: string
  full_name: string
  email: string
  role: string
  password?: string
}

export default function StaffPasswordManagement() {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadStaff()
  }, [])

  const loadStaff = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('id', user.id)
        .single()

      if (userData?.school_id) {
        setSchoolId(userData.school_id)

        // Fetch all staff
        const { data: staffData } = await supabase
          .from('users')
          .select('id, full_name, email, role')
          .eq('school_id', userData.school_id)
          .in('role', ['TEACHER', 'ACCOUNTANT', 'PRINCIPAL', 'HEAD_TEACHER', 'SCHOOL_ADMIN', 'STAFF'])

        setStaffList(staffData || [])
      }
    } catch (err) {
      setError('Failed to load staff')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const generateRandomPassword = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleGeneratePassword = () => {
    const pwd = generateRandomPassword()
    setNewPassword(pwd)
  }

  const handleResetPassword = async (staff: Staff) => {
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    try {
      setError(null)

      // Update password in Supabase Auth
      const { error: authError } = await supabase.auth.admin.updateUserById(
        staff.id,
        { password: newPassword }
      )

      if (authError) throw authError

      // Create password history record
      await supabase
        .from('staff_password_history')
        .insert([{
          staff_id: staff.id,
          school_id: schoolId,
          new_password_hash: btoa(newPassword), // Simple encoding for demo
          reset_by: (await supabase.auth.getUser()).data?.user?.id,
          created_at: new Date().toISOString(),
        }])

      setSuccess(`Password reset successfully for ${staff.full_name}`)
      setEditingStaff(null)
      setNewPassword('')

      // Reset message after 3 seconds
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password')
      console.error(err)
    }
  }

  const handleAutoResetOnDeparture = async (staff: Staff) => {
    const randomPwd = generateRandomPassword()
    try {
      await supabase.auth.admin.updateUserById(staff.id, { password: randomPwd })

      // Mark staff as departed
      await supabase
        .from('users')
        .update({ status: 'INACTIVE' })
        .eq('id', staff.id)

      // Log departure
      await supabase
        .from('staff_departure_log')
        .insert([{
          staff_id: staff.id,
          school_id: schoolId,
          departure_date: new Date().toISOString(),
          new_password_hash: btoa(randomPwd),
          notes: 'Auto-reset on staff departure',
        }])

      setSuccess(`${staff.full_name}'s account has been secured (status set to INACTIVE)`)
      await loadStaff()
    } catch (err) {
      setError('Failed to process departure')
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading staff...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">🔐 Staff Password Management</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            ✅ {success}
          </div>
        )}

        {/* Staff List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-6 py-3 text-left">Staff Name</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Email</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff) => (
                  <tr key={staff.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{staff.full_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {staff.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{staff.email}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setEditingStaff(staff)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
                      >
                        🔄 Reset Password
                      </button>
                      <button
                        onClick={() => handleAutoResetOnDeparture(staff)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        👋 Mark Departed
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Password Reset Modal */}
        {editingStaff && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
              <h2 className="text-2xl font-bold mb-6">Reset Password</h2>
              <p className="text-gray-600 mb-4">
                Resetting password for: <strong>{editingStaff.full_name}</strong>
              </p>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-2">Password suggestions:</p>
                <button
                  onClick={handleGeneratePassword}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
                >
                  🎲 Generate Random Password
                </button>
                <p className="text-xs text-gray-600">
                  Password should be at least 8 characters with uppercase, lowercase, numbers, and symbols.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setEditingStaff(null)
                    setNewPassword('')
                    setError(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleResetPassword(editingStaff)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  ✅ Reset Password
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
