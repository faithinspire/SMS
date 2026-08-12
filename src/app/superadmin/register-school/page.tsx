'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { User } from '@/types'

interface RegistrationForm {
  schoolName: string
  schoolEmail: string
  adminEmail: string
  adminPassword: string
  adminName: string
  phone: string
  address: string
  subscriptionPlan: string
  schoolType: 'PRIMARY' | 'SECONDARY' | 'BOTH'
  logo: File | null
}

export default function RegisterSchoolPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [credentials, setCredentials] = useState<any>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState<RegistrationForm>({
    schoolName: '',
    schoolEmail: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    phone: '',
    address: '',
    subscriptionPlan: 'basic',
    schoolType: 'BOTH',
    logo: null,
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()
        if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
          router.push('/landing')
          return
        }
        setUser(currentUser)
      } catch (err) {
        console.error('Error checking auth:', err)
        router.push('/landing')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo file must be less than 5MB')
        return
      }
      setFormData(prev => ({
        ...prev,
        logo: file,
      }))
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadLogo = async (schoolId: string): Promise<string | null> => {
    if (!formData.logo) return null

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('file', formData.logo)
      formDataToSend.append('school_id', schoolId)

      const response = await fetch('/api/upload/school-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await AuthService.getAuthToken()}`,
        },
        body: formDataToSend,
      })

      if (!response.ok) {
        console.error('Logo upload failed:', response.statusText)
        return null
      }

      const data = await response.json()
      return data.file_url || null
    } catch (err) {
      console.error('Logo upload error:', err)
      return null
    }
  }

  const validatePassword = (password: string): boolean => {
    if (password.length < 8) return false
    if (!/[a-z]/.test(password)) return false
    if (!/[A-Z]/.test(password)) return false
    if (!/[0-9]/.test(password)) return false
    if (!/[!@#$%^&*]/.test(password)) return false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // Validate password
      if (!validatePassword(formData.adminPassword)) {
        throw new Error('Password must be at least 8 characters with uppercase, lowercase, number, and special character')
      }

      // Register school via API (no auth required for basic school creation)
      const schoolResponse = await fetch('/api/superadmin/register-school', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          school_name: formData.schoolName,
          school_email: formData.schoolEmail,
          admin_email: formData.adminEmail,
          admin_password: formData.adminPassword,
          admin_name: formData.adminName,
          phone: formData.phone,
          address: formData.address,
          subscription_plan: formData.subscriptionPlan,
          school_type: formData.schoolType,
          logo_url: null, // Will be updated after upload
        }),
      })

      if (!schoolResponse.ok) {
        const errorData = await schoolResponse.json()
        throw new Error(errorData.message || 'Failed to register school')
      }

      const result = await schoolResponse.json()
      const schoolId = result.school_id

      // Upload logo if provided (optional, don't fail if it fails)
      let logoUrl = null
      if (formData.logo) {
        try {
          const token = await AuthService.getAuthToken()
          if (token) {
            logoUrl = await uploadLogo(schoolId)
            // Update school with logo URL if upload succeeded
            if (logoUrl) {
              await fetch(`/api/schools/${schoolId}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  logo_url: logoUrl,
                }),
              }).catch(err => console.warn('Logo update warning:', err))
            }
          }
        } catch (logoErr) {
          console.warn('Logo upload optional, continuing:', logoErr)
        }
      }

      setCredentials({
        school_id: schoolId,
        admin_email: formData.adminEmail,
        admin_password: formData.adminPassword,
        logo_url: logoUrl,
      })
      setSuccess(true)
      setFormData({
        schoolName: '',
        schoolEmail: '',
        adminEmail: '',
        adminPassword: '',
        adminName: '',
        phone: '',
        address: '',
        subscriptionPlan: 'basic',
        schoolType: 'BOTH',
        logo: null,
      })
      setLogoPreview(null)

      setTimeout(() => {
        router.push('/superadmin/schools')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to register school')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Register New School</h1>
          <p className="text-gray-400">Add a new school to the system with admin credentials</p>
        </div>

        {/* Success Message */}
        {success && credentials && (
          <div className="mb-6 bg-green-900 border border-green-700 rounded-lg p-6">
            <h2 className="text-green-300 font-bold mb-4">✅ School Registered Successfully!</h2>
            <div className="bg-gray-900 p-4 rounded mb-4 space-y-3">
              <div>
                <p className="text-gray-400 text-sm">School ID</p>
                <p className="text-white font-mono">{credentials.school_id}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Admin Email</p>
                <p className="text-white font-mono">{credentials.admin_email}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Admin Password</p>
                <div className="flex gap-2">
                  <p className="text-white font-mono flex-1 bg-black px-3 py-2 rounded">
                    {credentials.admin_password}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(credentials.admin_password)
                      alert('Copied to clipboard!')
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold transition"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
            <p className="text-gray-300 text-sm">Redirecting to schools list...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-900 border border-red-700 rounded-lg p-4">
            <p className="text-red-300">❌ {error}</p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            {/* Logo Upload Section */}
            <div className="mb-8 pb-8 border-b border-gray-700">
              <h3 className="text-white font-bold mb-4 text-lg">School Logo</h3>
              <div className="flex gap-6">
                {/* Logo Preview */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 rounded-lg bg-gray-900 border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center">
                        <div className="text-2xl text-gray-500">📷</div>
                        <p className="text-xs text-gray-500 mt-1">Preview</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Logo Upload Input */}
                <div className="flex-1">
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <div className="px-6 py-4 bg-gray-900 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition text-center">
                      <p className="text-blue-400 font-semibold">Click to upload logo</p>
                      <p className="text-gray-500 text-sm mt-1">PNG, JPG, GIF (max 5MB)</p>
                      {formData.logo && (
                        <p className="text-green-400 text-sm mt-2">✓ {formData.logo.name}</p>
                      )}
                    </div>
                  </label>
                  <p className="text-gray-400 text-xs mt-3">
                    The logo will appear on the dashboard and student/staff pages for this school.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* School Name */}
              <div>
                <label className="block text-white font-semibold mb-2">School Name *</label>
                <input
                  type="text"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  placeholder="e.g., Lagos Central School"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* School Email */}
              <div>
                <label className="block text-white font-semibold mb-2">School Email *</label>
                <input
                  type="email"
                  name="schoolEmail"
                  value={formData.schoolEmail}
                  onChange={handleChange}
                  placeholder="school@example.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* Admin Name */}
              <div>
                <label className="block text-white font-semibold mb-2">Admin Full Name *</label>
                <input
                  type="text"
                  name="adminName"
                  value={formData.adminName}
                  onChange={handleChange}
                  placeholder="e.g., John Okafor"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* Admin Email */}
              <div>
                <label className="block text-white font-semibold mb-2">Admin Email *</label>
                <input
                  type="email"
                  name="adminEmail"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* Admin Password */}
              <div>
                <label className="block text-white font-semibold mb-2">Admin Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="adminPassword"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    placeholder="Min 8 chars: Uppercase, lowercase, number, special char"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-white"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  Password requirements: 8+ characters, uppercase, lowercase, number, special character
                </p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-white font-semibold mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+234 8012345678"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-white font-semibold mb-2">Address *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="123 Main Street, Lagos"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>

              {/* Subscription Plan */}
              <div>
                <label className="block text-white font-semibold mb-2">Subscription Plan *</label>
                <select
                  name="subscriptionPlan"
                  value={formData.subscriptionPlan}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                >
                  <option value="basic">Basic (Free Trial)</option>
                  <option value="professional">Professional ($50/month)</option>
                  <option value="enterprise">Enterprise (Custom)</option>
                </select>
              </div>

              {/* School Type */}
              <div>
                <label className="block text-white font-semibold mb-2">School Type *</label>
                <select
                  name="schoolType"
                  value={formData.schoolType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                >
                  <option value="PRIMARY">Primary School</option>
                  <option value="SECONDARY">Secondary School</option>
                  <option value="BOTH">Both Primary & Secondary</option>
                </select>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Registering...' : 'Register School'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
