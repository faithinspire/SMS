'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'react-hot-toast'
import { X, Mail, Phone, Briefcase, Building2, User, CreditCard } from 'lucide-react'

interface StaffProfileViewModalProps {
  isOpen: boolean
  onClose: () => void
  staffId: string
  schoolId: string
}

interface StaffDetail {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  position?: string
  department?: string
  staff_number?: string
  user_id: string
  school_id: string
  created_at: string
  // Teacher-specific
  is_teacher?: boolean
  teaching_level?: string
  bank_name?: string
  account_number?: string
  account_name?: string
  salary?: number
  class_assignments?: Array<{
    class_name: string
    arm_name: string
  }>
  subject_assignments?: Array<{
    subject_name: string
  }>
  account_status?: string
}

export default function StaffProfileViewModal({
  isOpen,
  onClose,
  staffId,
  schoolId,
}: StaffProfileViewModalProps) {
  const [staff, setStaff] = useState<StaffDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && staffId) {
      loadStaffDetails()
    }
  }, [isOpen, staffId])

  const loadStaffDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get staff basic info
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', staffId)
        .eq('school_id', schoolId)
        .single()

      if (staffError) {
        throw new Error(staffError.message)
      }

      if (!staffData) {
        throw new Error('Staff member not found')
      }

      // Check if teacher
      let isTeacher = false
      let teacherData = null
      const { data: tData } = await supabase
        .from('teachers')
        .select('*')
        .eq('staff_id', staffId)
        .single()

      if (tData) {
        isTeacher = true
        teacherData = tData
      }

      // Get user account status
      const { data: userData } = await supabase
        .from('users')
        .select('status')
        .eq('id', staffData.user_id)
        .single()

      // Get class assignments (if teacher)
      let classAssignments: any[] = []
      if (isTeacher && tData) {
        const { data: cData } = await supabase
          .from('class_arm_combos')
          .select(`
            classes (name),
            arms (name)
          `)
          .eq('class_teacher_id', staffData.user_id)

        if (cData) {
          classAssignments = cData.map(c => ({
            class_name: (c.classes as any)?.name || 'Unknown',
            arm_name: (c.arms as any)?.name || 'Unknown',
          }))
        }
      }

      // Get subject assignments (if teacher)
      let subjectAssignments: any[] = []
      if (isTeacher && tData) {
        const { data: sData } = await supabase
          .from('subject_teacher_assignments')
          .select(`
            subjects (name)
          `)
          .eq('teacher_id', staffData.user_id)

        if (sData) {
          subjectAssignments = sData.map(s => ({
            subject_name: (s.subjects as any)?.name || 'Unknown',
          }))
        }
      }

      const detail: StaffDetail = {
        ...staffData,
        is_teacher: isTeacher,
        teaching_level: teacherData?.teaching_level,
        bank_name: teacherData?.bank_name,
        account_number: teacherData?.account_number,
        account_name: teacherData?.account_name,
        salary: teacherData?.salary,
        class_assignments: classAssignments,
        subject_assignments: subjectAssignments,
        account_status: userData?.status || 'UNKNOWN',
      }

      setStaff(detail)
    } catch (err: any) {
      console.error('Error loading staff details:', err)
      setError(err.message || 'Failed to load staff details')
      toast.error('Failed to load staff details')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading staff profile...</p>
        </div>
      </div>
    )
  }

  if (error || !staff) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Error</h2>
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 transition"
            >
              <X size={24} />
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error || 'Staff member not found'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-1">
                {staff.first_name} {staff.last_name}
              </h2>
              <p className="text-blue-100">
                {staff.position}
                {staff.is_teacher && ` • ${staff.teaching_level} Teacher`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition hover:scale-110"
              type="button"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Status Badge */}
          <div className="flex gap-4 mb-6">
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                staff.account_status === 'ACTIVE'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {staff.account_status === 'ACTIVE' ? '✓ Active' : 'Inactive'}
            </span>
            {staff.is_teacher && (
              <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                👨‍🏫 Teacher
              </span>
            )}
          </div>

          {/* Personal Information */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} /> Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">First Name</p>
                <p className="text-lg font-semibold text-gray-900">{staff.first_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Last Name</p>
                <p className="text-lg font-semibold text-gray-900">{staff.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Staff Number</p>
                <p className="text-lg font-semibold text-gray-900">
                  {staff.staff_number || '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Date Registered</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(staff.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Mail size={20} /> Contact Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-base font-semibold text-gray-900">{staff.email}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={18} className="text-blue-600 mt-1" />
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-base font-semibold text-gray-900">
                    {staff.phone || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase size={20} /> Employment Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Position</p>
                <p className="text-base font-semibold text-gray-900">{staff.position}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Department</p>
                <p className="text-base font-semibold text-gray-900">{staff.department}</p>
              </div>
            </div>
          </div>

          {/* Teacher-Specific Information */}
          {staff.is_teacher && (
            <>
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  👨‍🏫 Teaching Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Teaching Level</p>
                    <p className="text-base font-semibold text-gray-900">
                      {staff.teaching_level}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bank Information */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard size={20} /> Bank Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Bank Name</p>
                    <p className="text-base font-semibold text-gray-900">{staff.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Account Name</p>
                    <p className="text-base font-semibold text-gray-900">
                      {staff.account_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Account Number</p>
                    <p className="text-base font-semibold text-gray-900">
                      {staff.account_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Monthly Salary</p>
                    <p className="text-base font-semibold text-gray-900">
                      ₦{staff.salary?.toLocaleString('en-NG')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Class Assignments */}
              {staff.class_assignments && staff.class_assignments.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 size={20} /> Class Assignments
                  </h3>
                  <div className="space-y-2">
                    {staff.class_assignments.map((assignment, idx) => (
                      <div key={idx} className="px-4 py-2 bg-blue-50 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900">
                          {assignment.class_name} - Arm {assignment.arm_name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subject Assignments */}
              {staff.subject_assignments && staff.subject_assignments.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">📚 Subject Assignments</h3>
                  <div className="space-y-2">
                    {staff.subject_assignments.map((assignment, idx) => (
                      <div key={idx} className="px-4 py-2 bg-green-50 rounded-lg">
                        <p className="text-sm font-semibold text-green-900">
                          {assignment.subject_name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Close Button */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
