'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase-client'
import { toast } from 'react-hot-toast'

interface StudentProfileEditModalProps {
  studentId: string
  schoolId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const RELATIONSHIPS = ['Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Grandfather', 'Grandmother', 'Brother', 'Sister', 'Other']
const STATES = ['Lagos', 'Abuja', 'Ogun', 'Kwara', 'Kano', 'Kaduna', 'Oyo', 'Rivers', 'Plateau', 'Akwa Ibom', 'Cross River', 'Enugu', 'Imo', 'Ebonyi', 'Abia', 'Anambra', 'Delta', 'Edo', 'Bayelsa', 'Taraba', 'Adamawa', 'Borno', 'Yobe', 'Jigawa', 'Katsina', 'Kebbi', 'Sokoto', 'Zamfara', 'Nasarawa', 'Ekiti', 'Osun', 'Ondo']

export default function StudentProfileEditModal({
  studentId,
  schoolId,
  isOpen,
  onClose,
  onSuccess,
}: StudentProfileEditModalProps) {
  if (!isOpen) return null

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'personal' | 'admission' | 'class' | 'guardian' | 'contact'>('personal')
  
  // Personal Information
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [lastName, setLastName] = useState('')
  const [gender, setGender] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  // Admission Information
  const [admissionNumber, setAdmissionNumber] = useState('')
  const [admissionDate, setAdmissionDate] = useState('')
  const [studentStatus, setStudentStatus] = useState<'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED'>('ACTIVE')

  // Class Information
  const [selectedClassComboId, setSelectedClassComboId] = useState('')
  const [classArmCombos, setClassArmCombos] = useState<any[]>([])

  // Guardian Information
  const [guardians, setGuardians] = useState<any[]>([])
  const [editingGuardianId, setEditingGuardianId] = useState<string | null>(null)
  const [guardianForm, setGuardianForm] = useState({ full_name: '', relationship: '', phone: '', email: '' })

  // Contact Information
  const [address, setAddress] = useState('')
  const [state, setState] = useState('')
  const [lga, setLga] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [student, setStudent] = useState<any>(null)

  useEffect(() => {
    if (isOpen && studentId) {
      loadStudentData()
    }
  }, [isOpen, studentId])

  const loadStudentData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch student record
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select(`
          id, admission_number, date_of_birth, status, 
          class_arm_combo_id, user_id, school_id
        `)
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError
      setStudent(studentRecord)

      // Fetch user profile
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email, phone, gender')
        .eq('id', studentRecord.user_id)
        .single()

      if (userError) throw userError

      // Parse name
      const nameParts = userProfile.full_name.split(' ')
      setFirstName(nameParts[0] || '')
      setMiddleName(nameParts.slice(1, -1).join(' ') || '')
      setLastName(nameParts[nameParts.length - 1] || '')

      setEmail(userProfile.email || '')
      setPhone(userProfile.phone || '')
      setGender(userProfile.gender || '')
      setAdmissionNumber(studentRecord.admission_number)
      setDateOfBirth(studentRecord.date_of_birth || '')
      setStudentStatus(studentRecord.status || 'ACTIVE')
      setSelectedClassComboId(studentRecord.class_arm_combo_id || '')

      // Fetch class/arm combos
      const { data: combos, error: combosError } = await supabase
        .from('class_arm_combos')
        .select(`
          id, 
          class:class_id (id, name),
          arm:arm_id (id, name)
        `)
        .eq('school_id', schoolId)
        .order('created_at')

      if (!combosError && combos) {
        setClassArmCombos(combos)
      }

      // Fetch guardians
      const { data: guardiansData, error: guardiansError } = await supabase
        .from('guardians')
        .select('id, full_name, relationship, phone, email')
        .eq('student_id', studentId)
        .order('created_at')

      if (!guardiansError && guardiansData) {
        setGuardians(guardiansData)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load student data')
      toast.error('Failed to load student data')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePersonalInfo = async () => {
    try {
      setSaving(true)
      const fullName = `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, ' ')

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          email,
          phone,
          gender,
        })
        .eq('id', student.user_id)

      if (updateError) throw updateError

      toast.success('✅ Personal information saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save personal information')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAdmissionInfo = async () => {
    try {
      setSaving(true)

      const { error: updateError } = await supabase
        .from('students')
        .update({
          date_of_birth: dateOfBirth || null,
          status: studentStatus,
        })
        .eq('id', studentId)

      if (updateError) throw updateError

      toast.success('✅ Admission information saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save admission information')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveClassInfo = async () => {
    try {
      if (!selectedClassComboId) {
        toast.error('Please select a class')
        return
      }

      setSaving(true)

      const { error: updateError } = await supabase
        .from('students')
        .update({
          class_arm_combo_id: selectedClassComboId,
        })
        .eq('id', studentId)

      if (updateError) throw updateError

      toast.success('✅ Class information saved')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save class information')
    } finally {
      setSaving(false)
    }
  }

  const handleAddGuardian = async () => {
    try {
      if (!guardianForm.full_name || !guardianForm.relationship) {
        toast.error('Name and relationship are required')
        return
      }

      setSaving(true)

      const { error: insertError } = await supabase
        .from('guardians')
        .insert({
          student_id: studentId,
          school_id: schoolId,
          full_name: guardianForm.full_name,
          relationship: guardianForm.relationship,
          phone: guardianForm.phone || null,
          email: guardianForm.email || null,
        })

      if (insertError) throw insertError

      setGuardianForm({ full_name: '', relationship: '', phone: '', email: '' })
      await loadStudentData()
      toast.success('✅ Guardian added')
    } catch (err: any) {
      toast.error(err.message || 'Failed to add guardian')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateGuardian = async () => {
    try {
      if (!editingGuardianId) return

      setSaving(true)

      const { error: updateError } = await supabase
        .from('guardians')
        .update({
          full_name: guardianForm.full_name,
          relationship: guardianForm.relationship,
          phone: guardianForm.phone || null,
          email: guardianForm.email || null,
        })
        .eq('id', editingGuardianId)

      if (updateError) throw updateError

      setEditingGuardianId(null)
      setGuardianForm({ full_name: '', relationship: '', phone: '', email: '' })
      await loadStudentData()
      toast.success('✅ Guardian updated')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update guardian')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGuardian = async (guardianId: string) => {
    try {
      if (!confirm('Are you sure you want to delete this guardian?')) return

      setSaving(true)

      const { error: deleteError } = await supabase
        .from('guardians')
        .delete()
        .eq('id', guardianId)

      if (deleteError) throw deleteError

      await loadStudentData()
      toast.success('✅ Guardian deleted')
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete guardian')
    } finally {
      setSaving(false)
    }
  }

  const handleEditGuardian = (guardian: any) => {
    setEditingGuardianId(guardian.id)
    setGuardianForm({
      full_name: guardian.full_name,
      relationship: guardian.relationship,
      phone: guardian.phone,
      email: guardian.email,
    })
  }

  const currentClass = classArmCombos.find(c => c.id === selectedClassComboId)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold">📝 Edit Student Profile</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 w-10 h-10 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 overflow-x-auto">
          {['personal', 'admission', 'class', 'guardian', 'contact'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-3 font-semibold text-sm whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab === 'personal' && '👤 Personal'}
              {tab === 'admission' && '📋 Admission'}
              {tab === 'class' && '🏫 Class'}
              {tab === 'guardian' && '👨‍👩‍👧 Guardian'}
              {tab === 'contact' && '📍 Contact'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* PERSONAL TAB */}
              {activeTab === 'personal' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Middle Name</label>
                      <input
                        type="text"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Gender</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePersonalInfo}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* ADMISSION TAB */}
              {activeTab === 'admission' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Admission Number</label>
                    <input
                      type="text"
                      value={admissionNumber}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                    <select
                      value={studentStatus}
                      onChange={(e) => setStudentStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PAUSED">Paused</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAdmissionInfo}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* CLASS TAB */}
              {activeTab === 'class' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Class *</label>
                    <select
                      value={selectedClassComboId}
                      onChange={(e) => setSelectedClassComboId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Class</option>
                      {classArmCombos.map((combo) => (
                        <option key={combo.id} value={combo.id}>
                          {combo.class.name} {combo.arm.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {currentClass && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-blue-900">Currently Selected:</p>
                      <p className="text-sm text-blue-800 mt-1">
                        {currentClass.class.name} {currentClass.arm.name}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveClassInfo}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* GUARDIAN TAB */}
              {activeTab === 'guardian' && (
                <div className="space-y-6">
                  {/* Existing Guardians */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Guardians ({guardians.length})</h3>
                    {guardians.length === 0 ? (
                      <p className="text-sm text-gray-500">No guardians added yet</p>
                    ) : (
                      <div className="space-y-2">
                        {guardians.map((guardian) => (
                          <div
                            key={guardian.id}
                            className="p-3 border border-gray-300 rounded-lg flex justify-between items-start"
                          >
                            <div>
                              <p className="font-semibold text-gray-900">{guardian.full_name}</p>
                              <p className="text-sm text-gray-600">{guardian.relationship}</p>
                              {guardian.phone && <p className="text-sm text-gray-600">{guardian.phone}</p>}
                              {guardian.email && <p className="text-sm text-gray-600">{guardian.email}</p>}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditGuardian(guardian)}
                                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteGuardian(guardian.id)}
                                className="text-red-600 hover:text-red-700 text-sm font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add/Edit Guardian Form */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">
                      {editingGuardianId ? 'Edit Guardian' : 'Add New Guardian'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                        <input
                          type="text"
                          value={guardianForm.full_name}
                          onChange={(e) => setGuardianForm({ ...guardianForm, full_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Relationship *</label>
                        <select
                          value={guardianForm.relationship}
                          onChange={(e) => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Select Relationship</option>
                          {RELATIONSHIPS.map((rel) => (
                            <option key={rel} value={rel}>
                              {rel}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                          <input
                            type="tel"
                            value={guardianForm.phone}
                            onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={guardianForm.email}
                            onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        {editingGuardianId && (
                          <button
                            onClick={() => {
                              setEditingGuardianId(null)
                              setGuardianForm({ full_name: '', relationship: '', phone: '', email: '' })
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            Cancel Edit
                          </button>
                        )}
                        <button
                          onClick={editingGuardianId ? handleUpdateGuardian : handleAddGuardian}
                          disabled={saving}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : editingGuardianId ? 'Update Guardian' : 'Add Guardian'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTACT TAB */}
              {activeTab === 'contact' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select State</option>
                        {STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">LGA</label>
                      <input
                        type="text"
                        value={lga}
                        onChange={(e) => setLga(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
