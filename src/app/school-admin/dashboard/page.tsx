'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { SchoolService } from '@/services/school.service'
import { UserRegistrationService } from '@/services/user-registration.service'
import { User } from '@/types'
import TeacherRegistrationModal from '@/components/admin/TeacherRegistrationModal'
import StudentRegistrationModal from '@/components/admin/StudentRegistrationModal'
import StaffRegistrationModal from '@/components/admin/StaffRegistrationModal'
import EditStaffModal from '@/components/admin/EditStaffModal'
import EditStudentModal from '@/components/admin/EditStudentModal'
import GenerateLetterModal from '@/components/admin/GenerateLetterModal'

export default function SchoolAdminDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<any>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'staff' | 'students' | 'settings'>('staff')
  const [staffMembers, setStaffMembers] = useState([])
  const [students, setStudents] = useState([])
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [letterModal, setLetterModal] = useState<{
    isOpen: boolean
    type: 'EMPLOYMENT' | 'ADMISSION'
    recipientData: any
  }>({ isOpen: false, type: 'EMPLOYMENT', recipientData: null })

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    loadDashboard()
  }, [])

  useEffect(() => {
    localStorage.setItem('theme-mode', darkMode ? 'dark' : 'light')
  }, [darkMode])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || (currentUser.role !== 'SCHOOL_ADMIN' && currentUser.role !== 'ADMIN')) {
        console.log('❌ User role:', currentUser?.role)
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Load school details
      if (currentUser.schoolId) {
        const schoolData = await SchoolService.getSchoolById(currentUser.schoolId)
        setSchool(schoolData)

        // Load staff and students
        const staffList = await UserRegistrationService.getSchoolStaff(currentUser.schoolId)
        const studentList = await UserRegistrationService.getSchoolStudents(currentUser.schoolId)

        setStaffMembers(staffList)
        setStudents(studentList)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard')
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
          <p className={textClass}>Loading dashboard...</p>
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
            <h1 className={`text-4xl font-black bg-gradient-to-r ${darkMode ? 'from-purple-400 to-pink-400' : 'from-blue-600 to-purple-600'} bg-clip-text text-transparent`}>
              🏫 School Admin Dashboard
            </h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{school?.name}</p>
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
        {/* Error Message */}
        {error && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              error.includes('successfully')
                ? 'bg-green-100/20 text-green-400 border-green-500/30'
                : 'bg-red-100/20 text-red-400 border-red-500/30'
            }`}
          >
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 flex-wrap">
          {['staff', 'students', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 ${
                activeTab === tab
                  ? `bg-gradient-to-r ${darkMode ? 'from-purple-500 to-pink-500' : 'from-blue-600 to-purple-600'} text-white shadow-lg`
                  : `${cardClass} ${textClass} hover:shadow-lg`
              }`}
            >
              {tab === 'staff' && '👨‍🏫 Staff & Teachers'}
              {tab === 'students' && '👨‍🎓 Students'}
              {tab === 'settings' && '⚙️ Settings'}
            </button>
          ))}
          <button
            onClick={() => router.push('/school-admin/records')}
            className={`px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg hover:from-orange-600 hover:to-red-700`}
          >
            📋 Student Records
          </button>
        </div>

        {/* Staff Tab */}
        {activeTab === 'staff' && (
          <div>
            <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
              <h2 className={`text-2xl font-bold ${textClass}`}>Staff & Teachers Management</h2>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setShowTeacherModal(true)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-bold hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg"
                >
                  + Register Teacher
                </button>
                <button
                  onClick={() => setShowStaffModal(true)}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg"
                >
                  + Register Staff
                </button>
              </div>
            </div>

            <div className={`${cardClass} border rounded-lg shadow-xl overflow-hidden`}>
              <div className={`px-6 py-4 ${darkMode ? 'bg-slate-700/50' : 'bg-purple-100/50'} border-b`}>
                <h3 className={`text-lg font-bold ${textClass}`}>Registered Staff ({staffMembers.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`${darkMode ? 'bg-slate-700/30' : 'bg-purple-50/50'} border-b`}>
                      <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Name</th>
                      <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Email</th>
                      <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Role</th>
                      <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Status</th>
                      <th className={`px-6 py-4 text-center font-semibold ${textClass}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffMembers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`px-6 py-8 text-center ${textClass}`}>
                          No staff members registered yet
                        </td>
                      </tr>
                    ) : (
                      staffMembers.map((member: any) => (
                        <tr key={member.id} className={`border-b hover:${darkMode ? 'bg-slate-700/20' : 'bg-purple-50/30'}`}>
                          <td className={`px-6 py-4 font-semibold ${textClass}`}>{member.full_name}</td>
                          <td className={`px-6 py-4 ${textClass}`}>{member.email}</td>
                          <td className={`px-6 py-4 ${textClass}`}>{member.role}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-green-100/30 text-green-400 rounded-full text-sm font-semibold">
                              ✓ Active
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => setEditingStaffId(member.id)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-semibold transition-all"
                                title="Edit Profile"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => setLetterModal({
                                  isOpen: true,
                                  type: 'EMPLOYMENT',
                                  recipientData: member,
                                })}
                                className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm font-semibold transition-all"
                                title="Generate Employment Letter"
                              >
                                📄 Letter
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <h2 className={`text-2xl font-bold ${textClass}`}>Students Management</h2>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setShowStudentModal(true)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg font-bold hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg"
                >
                  + Register Student
                </button>
                <button
                  onClick={() => router.push('/school-admin/records')}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg"
                >
                  📋 View Records
                </button>
              </div>
            </div>

            <div className={`${cardClass} border rounded-lg shadow-xl overflow-hidden`}>
              <div className={`px-6 py-4 ${darkMode ? 'bg-slate-700/50' : 'bg-blue-100/50'} border-b`}>
                <h3 className={`text-lg font-bold ${textClass}`}>Registered Students ({students.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={`${darkMode ? 'bg-slate-700/30' : 'bg-blue-50/50'} border-b`}>
                      <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Name</th>
                      <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Email</th>
                      <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Admission #</th>
                      <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Status</th>
                      <th className={`px-6 py-4 text-center font-semibold ${textClass}`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan={5} className={`px-6 py-8 text-center ${textClass}`}>
                          No students registered yet
                        </td>
                      </tr>
                    ) : (
                      students.map((student: any) => (
                        <tr key={student.id} className={`border-b hover:${darkMode ? 'bg-slate-700/20' : 'bg-blue-50/30'}`}>
                          <td className={`px-6 py-4 font-semibold ${textClass}`}>{student.full_name}</td>
                          <td className={`px-6 py-4 ${textClass}`}>{student.email}</td>
                          <td className={`px-6 py-4 ${textClass}`}>{student.admission_number || '-'}</td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100/30 text-blue-400 rounded-full text-sm font-semibold">
                              ✓ Active
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => setEditingStudentId(student.id)}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-semibold transition-all"
                                title="Edit Profile"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                onClick={() => setLetterModal({
                                  isOpen: true,
                                  type: 'ADMISSION',
                                  recipientData: student,
                                })}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-semibold transition-all"
                                title="Generate Admission Letter"
                              >
                                🎓 Letter
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={`${cardClass} border p-8 rounded-lg shadow-xl`}>
            <h2 className={`text-2xl font-bold mb-6 ${textClass}`}>School Settings</h2>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-purple-100/30'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>School Name</p>
                <p className={`text-xl font-bold ${textClass}`}>{school?.name}</p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-purple-100/30'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>School Email</p>
                <p className={`text-xl font-bold ${textClass}`}>{school?.email || 'Not set'}</p>
              </div>
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-700/30' : 'bg-purple-100/30'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>School Type</p>
                <p className={`text-xl font-bold ${textClass}`}>{school?.type || 'Both'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Teacher Registration Modal */}
      <TeacherRegistrationModal
        schoolId={user?.schoolId || ''}
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        onSuccess={() => loadDashboard()}
      />

      {/* Student Registration Modal */}
      <StudentRegistrationModal
        schoolId={user?.schoolId || ''}
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        onSuccess={() => loadDashboard()}
      />

      {/* Staff Registration Modal */}
      <StaffRegistrationModal
        schoolId={user?.schoolId || ''}
        isOpen={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        onSuccess={() => loadDashboard()}
      />

      {/* Edit Staff Modal */}
      {editingStaffId && (
        <EditStaffModal
          staffId={editingStaffId}
          schoolId={user?.schoolId || ''}
          isOpen={!!editingStaffId}
          onClose={() => setEditingStaffId(null)}
          onSuccess={() => {
            setEditingStaffId(null)
            loadDashboard()
          }}
        />
      )}

      {/* Edit Student Modal */}
      {editingStudentId && (
        <EditStudentModal
          studentId={editingStudentId}
          schoolId={user?.schoolId || ''}
          isOpen={!!editingStudentId}
          onClose={() => setEditingStudentId(null)}
          onSuccess={() => {
            setEditingStudentId(null)
            loadDashboard()
          }}
        />
      )}

      {/* Generate Letter Modal */}
      <GenerateLetterModal
        type={letterModal.type}
        recipientData={letterModal.recipientData}
        schoolData={school}
        isOpen={letterModal.isOpen}
        onClose={() => setLetterModal({ isOpen: false, type: 'EMPLOYMENT', recipientData: null })}
      />
    </div>
  )
}
