'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { StaffService, StaffProfile } from '@/services/staff.service'
import StaffProfileEditModal from '@/components/admin/StaffProfileEditModal'
import { LetterPreviewModal } from '@/components/admin/LetterPreviewModal'
import { toast } from 'react-hot-toast'
import { Plus, Edit2, Trash2, Mail, FileText } from 'lucide-react'

export default function StaffPage() {
  const router = useRouter()
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffProfile | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showLetterModal, setShowLetterModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Load current user and fetch staff
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        const user = await AuthService.getCurrentUser()
        if (!user) {
          router.push('/auth/login')
          return
        }

        if (!user.school_id) {
          toast.error('Account not linked to school')
          return
        }

        setSchoolId(user.school_id)

        // Fetch staff list
        const staffList = await StaffService.getStaffList(user.school_id)
        setStaff(staffList)
      } catch (error: any) {
        console.error('Load data error:', error)
        toast.error(error.message || 'Failed to load staff')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const handleEdit = (staffMember: StaffProfile) => {
    setSelectedStaff(staffMember)
    setShowEditModal(true)
  }

  const handleDelete = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) {
      return
    }

    try {
      setDeleting(staffId)
      await StaffService.deleteStaff(staffId, schoolId!)
      setStaff(staff.filter(s => s.id !== staffId))
      toast.success('Staff member deleted')
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete staff member')
    } finally {
      setDeleting(null)
    }
  }

  const handleGenerateLetter = (staffMember: StaffProfile) => {
    setSelectedStaff(staffMember)
    setShowLetterModal(true)
  }

  const handleSaveStaff = async (updated: StaffProfile) => {
    try {
      setShowEditModal(false)
      // Refresh staff list
      if (schoolId) {
        const staffList = await StaffService.getStaffList(schoolId)
        setStaff(staffList)
      }
      toast.success('Staff member updated')
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(error.message || 'Failed to save staff member')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading staff...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Management</h1>
          <p className="text-gray-600">Manage teachers, administrators, and support staff</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {staff.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No staff members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Role</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Position</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Department</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staff.map(member => (
                    <tr key={member.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm text-gray-900">{member.full_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.phone || '—'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {member.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.position || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{member.department || '—'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          member.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleGenerateLetter(member)}
                            className="p-2 text-gray-600 hover:text-blue-600 transition"
                            title="Generate Appointment Letter"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(member)}
                            className="p-2 text-gray-600 hover:text-blue-600 transition"
                            title="Edit Staff"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(member.id)}
                            disabled={deleting === member.id}
                            className="p-2 text-gray-600 hover:text-red-600 transition disabled:opacity-50"
                            title="Delete Staff"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEditModal && selectedStaff && (
        <StaffProfileEditModal
          staffId={selectedStaff.id}
          schoolId={schoolId!}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveStaff}
        />
      )}

      {showLetterModal && selectedStaff && (
        <LetterPreviewModal
          isOpen={showLetterModal}
          onClose={() => setShowLetterModal(false)}
          staffId={selectedStaff.user_id}
          schoolId={schoolId!}
          letterType="appointment"
        />
      )}
    </div>
  )
}
