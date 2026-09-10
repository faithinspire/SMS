'use client'

import { useState, useEffect } from 'react'
import { StaffPasswordService } from '@/services/staff-password.service'
import { supabase } from '@/lib/supabase-client'

interface StaffPasswordManagementModalProps {
  isOpen: boolean
  onClose: () => void
  schoolId: string
  schoolName: string
}

interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
  last_password_change?: string
  requires_password_change: boolean
}

export default function StaffPasswordManagementModal({
  isOpen,
  onClose,
  schoolId,
  schoolName,
}: StaffPasswordManagementModalProps) {
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [passwordHistory, setPasswordHistory] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadStaffPasswordStatus()
    }
  }, [isOpen, schoolId])

  const loadStaffPasswordStatus = async () => {
    setLoading(true)
    setError('')
    try {
      const status = await StaffPasswordService.getStaffPasswordStatus(schoolId)
      setStaffList(status)
    } catch (err: any) {
      setError('Failed to load staff password status')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (staff: StaffMember) => {
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const result = await StaffPasswordService.setTemporaryPassword(
        schoolId,
        staff.id,
        'admin',
        'Password reset by school admin'
      )

      if (result.success) {
        setGeneratedPassword(result.temporaryPassword || '')
        setSuccess(result.message)
        setSelectedStaff(null)
        await loadStaffPasswordStatus()
      } else {
        setError(result.message)
      }
    } catch (err: any) {
      setError('Error resetting password')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewHistory = async (staff: StaffMember) => {
    setError('')
    setLoading(true)

    try {
      const history = await StaffPasswordService.getPasswordHistory(schoolId, staff.id, 20)
      setPasswordHistory(history)
      setShowHistory(true)
      setSelectedStaff(staff)
    } catch (err: any) {
      setError('Failed to load password history')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess('Password copied to clipboard!')
    setTimeout(() => setSuccess(''), 3000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 flex justify-between items-center">
          <h3 className="text-2xl font-bold">🔐 Staff Password Management</h3>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:opacity-80"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 rounded text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 rounded text-green-700">
              {success}
            </div>
          )}

          {/* Generated Password Display */}
          {generatedPassword && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-400 rounded">
              <h4 className="font-bold text-yellow-800 mb-2">✅ Temporary Password Generated</h4>
              <div className="flex items-center gap-2 bg-white p-3 rounded border border-yellow-200">
                <code className="font-mono text-lg font-bold text-gray-800 flex-1">
                  {showPassword ? generatedPassword : '••••••••••••'}
                </code>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  {showPassword ? '👁️‍🗨️ Hide' : '👁️ Show'}
                </button>
                <button
                  onClick={() => copyToClipboard(generatedPassword)}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  📋 Copy
                </button>
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                ⚠️ Staff member must change this password on first login
              </p>
              <button
                onClick={() => setGeneratedPassword('')}
                className="mt-2 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Clear
              </button>
            </div>
          )}

          {/* Password History View */}
          {showHistory && selectedStaff && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-400 rounded">
              <h4 className="font-bold text-blue-800 mb-4">
                Password History: {selectedStaff.full_name}
              </h4>
              {passwordHistory.length === 0 ? (
                <p className="text-gray-600">No password change history</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-blue-200">
                        <th className="px-4 py-2 text-left">Date & Time</th>
                        <th className="px-4 py-2 text-left">Reason</th>
                        <th className="px-4 py-2 text-left">Changed By</th>
                        <th className="px-4 py-2 text-left">Force Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passwordHistory.map((record) => (
                        <tr key={record.id} className="border-b hover:bg-blue-100">
                          <td className="px-4 py-2">
                            {new Date(record.password_changed_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-2">{record.reason}</td>
                          <td className="px-4 py-2">{record.password_changed_by || 'System'}</td>
                          <td className="px-4 py-2">
                            {record.force_change_on_next_login ? (
                              <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-xs font-bold">
                                ⚠️ Yes
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs">
                                No
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <button
                onClick={() => {
                  setShowHistory(false)
                  setPasswordHistory([])
                  setSelectedStaff(null)
                }}
                className="mt-4 px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
              >
                Back
              </button>
            </div>
          )}

          {/* Staff List */}
          {!showHistory && (
            <div>
              <h4 className="font-bold text-lg mb-4 text-gray-800">Staff Members</h4>
              {loading && !staffList.length ? (
                <p className="text-gray-600">Loading staff members...</p>
              ) : staffList.length === 0 ? (
                <p className="text-gray-600">No staff members found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-200">
                        <th className="px-4 py-2 text-left font-bold">Name</th>
                        <th className="px-4 py-2 text-left font-bold">Email</th>
                        <th className="px-4 py-2 text-left font-bold">Role</th>
                        <th className="px-4 py-2 text-left font-bold">Status</th>
                        <th className="px-4 py-2 text-left font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffList.map((staff) => (
                        <tr key={staff.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-semibold">{staff.full_name}</td>
                          <td className="px-4 py-2 text-gray-600">{staff.email}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold">
                              {staff.role}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {staff.requires_password_change ? (
                              <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-bold">
                                ⚠️ Requires Change
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-bold">
                                ✅ Active
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleResetPassword(staff)}
                              disabled={loading}
                              className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 disabled:bg-gray-400 mr-2"
                            >
                              🔄 Reset
                            </button>
                            <button
                              onClick={() => handleViewHistory(staff)}
                              disabled={loading}
                              className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 disabled:bg-gray-400"
                            >
                              📋 History
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t flex gap-4 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
