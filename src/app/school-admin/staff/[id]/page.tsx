'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'react-hot-toast'
import Image from 'next/image'

interface StaffProfile {
  id: string
  user_id: string
  school_id: string
  position: string
  employment_date: string | null
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED'
  salary: number | null
  bank_name: string | null
  account_number: string | null
  account_name: string | null
  department: string | null
  qualification: string | null
  user: {
    id: string
    full_name: string
    email: string
    phone: string | null
    photo_url: string | null
    role: string
  }
}

const supabase = createClient()

export default function StaffEditPage() {
  const router = useRouter()
  const params = useParams()
  const staffId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<StaffProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [position, setPosition] = useState('')
  const [department, setDepartment] = useState('')
  const [qualification, setQualification] = useState('')
  const [employmentDate, setEmploymentDate] = useState('')
  const [salary, setSalary] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE')

  // Load staff data
  useEffect(() => {
    loadStaffData()
  }, [staffId])

  const loadStaffData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('staff')
        .select(`
          id,
          user_id,
          school_id,
          position,
          employment_date,
          status,
          salary,
          bank_name,
          account_number,
          account_name,
          department,
          qualification,
          user:user_id (
            id,
            full_name,
            email,
            phone,
            photo_url,
            role
          )
        `)
        .eq('id', staffId)
        .single()

      if (fetchError) throw fetchError
      if (!data) throw new Error('Staff record not found')

      setStaff(data as StaffProfile)
      setFullName(data.user.full_name)
      setEmail(data.user.email)
      setPhone(data.user.phone || '')
      setPosition(data.position || '')
      setDepartment(data.department || '')
      setQualification(data.qualification || '')
      setEmploymentDate(data.employment_date || '')
      setSalary(data.salary?.toString() || '')
      setBankName(data.bank_name || '')
      setAccountNumber(data.account_number || '')
      setAccountName(data.account_name || '')
      setStatus(data.status)
    } catch (err: any) {
      console.error('Error loading staff:', err)
      setError(err.message || 'Failed to load staff record')
      toast.error('Failed to load staff record')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staff) return

    if (!fullName.trim() || !email.trim()) {
      setError('Name and email are required')
      toast.error('Name and email are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
        })
        .eq('id', staff.user_id)

      if (userError) throw userError

      // Update staff record
      const { error: staffError } = await supabase
        .from('staff')
        .update({
          position: position.trim() || null,
          department: department.trim() || null,
          qualification: qualification.trim() || null,
          employment_date: employmentDate || null,
          salary: salary ? parseFloat(salary) : null,
          bank_name: bankName.trim() || null,
          account_number: accountNumber.trim() || null,
          account_name: accountName.trim() || null,
          status,
        })
        .eq('id', staffId)

      if (staffError) throw staffError

      toast.success('Staff record updated successfully')
      router.back()
    } catch (err: any) {
      console.error('Error saving staff:', err)
      const errorMsg = err.message || 'Failed to save staff record'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff record...</p>
        </div>
      </div>
    )
  }

  if (!staff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Staff record not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 mb-4 font-semibold"
          >
            ← Back to Staff
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Staff Profile</h1>
          <p className="text-gray-600 mt-2">Update staff information</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="bg-white rounded-lg shadow-md p-8 space-y-8">
          {/* Personal Information Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Employment Information Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Employment Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Position</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g., Teacher, Principal, Accountant"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g., English, Mathematics"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Qualification</label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g., B.Sc Education, M.A."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Employment Date</label>
                <input
                  type="date"
                  value={employmentDate}
                  onChange={(e) => setEmploymentDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Financial Information Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Financial Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Salary (₦)</label>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Account Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Status Section */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Status</h2>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
