'use client'

import { useState } from 'react'
import { UserRegistrationService, StaffRegistrationData } from '@/services/user-registration.service'
import { supabase } from '@/lib/supabase-client'

interface StaffRegistrationModalProps {
  schoolId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function StaffRegistrationModal({
  schoolId,
  isOpen,
  onClose,
  onSuccess,
}: StaffRegistrationModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STAFF' as const,
    position: '',
    employment_date: new Date().toISOString().split('T')[0],
    // Payment details
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    salary_amount: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (!formData.full_name || !formData.email || !formData.password) {
      setError('Name, email, and password are required')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      // Register staff member
      const staffResult = await UserRegistrationService.registerStaffMember({
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        role: formData.role,
        school_id: schoolId,
      })

      console.log('✅ Staff registered:', staffResult.id)

      // Create staff record with payment details
      const { error: staffError } = await supabase
        .from('staff')
        .insert({
          user_id: staffResult.id,
          school_id: schoolId,
          position: formData.position || null,
          employment_date: formData.employment_date || null,
        })

      if (staffError) {
        console.warn('⚠️ Staff record warning:', staffError)
      } else {
        console.log('✅ Staff record created')
      }

      // Save payment/bank details in staff_accounts table if it exists, otherwise in metadata
      if (formData.bank_name || formData.account_number || formData.salary_amount) {
        try {
          // Try to insert into staff_accounts if table exists
          const { error: accountError } = await supabase
            .from('staff_accounts')
            .insert({
              user_id: staffResult.id,
              school_id: schoolId,
              bank_name: formData.bank_name || null,
              account_number: formData.account_number || null,
              account_holder_name: formData.account_holder_name || null,
            })

          if (accountError && !accountError.message.includes('does not exist')) {
            console.warn('⚠️ Account details warning:', accountError)
          } else if (!accountError) {
            console.log('✅ Bank details saved')
          }
        } catch (err) {
          console.warn('⚠️ Could not save bank details:', err)
        }

        // Save salary information
        if (formData.salary_amount) {
          try {
            // Get current term
            const { data: currentTerm } = await supabase
              .from('terms')
              .select('id')
              .eq('school_id', schoolId)
              .eq('is_current', true)
              .single()

            // First, get the staff id from the created record
            const { data: staffRecord } = await supabase
              .from('staff')
              .select('id')
              .eq('user_id', staffResult.id)
              .single()

            if (staffRecord) {
              const { error: salaryError } = await supabase
                .from('salaries')
                .insert({
                  staff_id: staffRecord.id,
                  school_id: schoolId,
                  amount: parseFloat(formData.salary_amount),
                  term_id: currentTerm?.id || null,
                  payment_status: 'PENDING',
                })

              if (salaryError) {
                console.warn('⚠️ Salary record warning:', salaryError)
              } else {
                console.log('✅ Salary recorded')
              }
            }
          } catch (err) {
            console.warn('⚠️ Could not save salary:', err)
          }
        }
      }

      setSuccess('✅ Staff member registered successfully!')
      setTimeout(() => {
        onSuccess()
        onClose()
        // Reset form
        setFormData({
          full_name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'STAFF',
          position: '',
          employment_date: new Date().toISOString().split('T')[0],
          bank_name: '',
          account_number: '',
          account_holder_name: '',
          salary_amount: '',
        })
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to register staff member')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const bgOverlay = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'
  const modalClass = 'bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'

  return (
    <div className={bgOverlay}>
      <div className={modalClass}>
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 border-b shadow-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">👤 Register Staff Member</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-all"
            >
              ✕
            </button>
          </div>
          <p className="text-purple-100 mt-2">
            Register accountants, office staff, and other non-teaching staff
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-bold text-gray-800 mb-4">👤 Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g., Mrs. Jane Okafor"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="STAFF">Office Staff</option>
                    <option value="PRINCIPAL">Principal</option>
                    <option value="HEAD_TEACHER">Head Teacher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g., jane@school.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="e.g., Finance Officer"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Employment Date</label>
                  <input
                    type="date"
                    value={formData.employment_date}
                    onChange={(e) => setFormData({ ...formData, employment_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="At least 6 characters"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password *</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">💰 Bank & Payment Details</h3>
              <p className="text-sm text-gray-600 mb-4">Save staff salary account information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="e.g., First Bank"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="e.g., 1234567890"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Account Holder Name</label>
                  <input
                    type="text"
                    value={formData.account_holder_name}
                    onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                    placeholder="Name on account"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Salary Amount</label>
                  <input
                    type="number"
                    value={formData.salary_amount}
                    onChange={(e) => setFormData({ ...formData, salary_amount: e.target.value })}
                    placeholder="e.g., 50000"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 transition-all disabled:cursor-not-allowed"
              >
                {loading ? 'Registering...' : 'Register Staff Member ✓'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
