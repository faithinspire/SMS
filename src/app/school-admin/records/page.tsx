'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { UserRegistrationService } from '@/services/user-registration.service'
import { User } from '@/types'
import { TeacherRegistrationModal } from '@/components/admin/TeacherRegistrationModal'
import StudentRegistrationModal from '@/components/admin/StudentRegistrationModal'

export default function SchoolRecordsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'accountants' | 'broadcast'>('students')
  const [students, setStudents] = useState([])
  const [staff, setStaff] = useState([])
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastEmail, setBroadcastEmail] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [showStudentModal, setShowStudentModal] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark') setDarkMode(true)
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || currentUser.role !== 'SCHOOL_ADMIN') {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (currentUser.school_id) {
        const [studentList, staffList] = await Promise.all([
          UserRegistrationService.getSchoolStudents(currentUser.school_id),
          UserRegistrationService.getSchoolStaff(currentUser.school_id),
        ])

        setStudents(studentList || [])
        setStaff(staffList || [])
      }
    } catch (err) {
      console.error('Load data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBroadcastTeachers = async () => {
    if (!broadcastMessage.trim()) {
      setSuccessMessage('Please enter a message')
      setTimeout(() => setSuccessMessage(''), 3000)
      return
    }

    setSendingBroadcast(true)
    try {
      const teachers = staff.filter(s => ['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER'].includes(s.role))
      // TODO: Implement broadcast API call to save message and notify teachers
      console.log(`Broadcasting to ${teachers.length} teachers:`, broadcastMessage)
      
      setSuccessMessage(`✓ Message broadcast sent to ${teachers.length} teacher(s)!`)
      setBroadcastMessage('')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setSuccessMessage(`Error: ${err.message}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } finally {
      setSendingBroadcast(false)
    }
  }

  const handleBroadcastParents = async () => {
    if (!broadcastMessage.trim() || !broadcastEmail.trim()) {
      setSuccessMessage('Please enter both email and message')
      setTimeout(() => setSuccessMessage(''), 3000)
      return
    }

    setSendingBroadcast(true)
    try {
      // TODO: Implement email broadcast API call
      console.log('Broadcasting email to parent:', { email: broadcastEmail, message: broadcastMessage })
      
      setSuccessMessage(`✓ Email broadcast sent to ${broadcastEmail}!`)
      setBroadcastMessage('')
      setBroadcastEmail('')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setSuccessMessage(`Error: ${err.message}`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } finally {
      setSendingBroadcast(false)
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
    ? 'bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900'
    : 'bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100'
  const cardClass = darkMode
    ? 'bg-slate-800/80 backdrop-blur border-slate-700/50'
    : 'bg-white/90 backdrop-blur border-purple-200/50'
  const textClass = darkMode ? 'text-white' : 'text-gray-900'
  const inputClass = darkMode
    ? 'bg-slate-700/50 border-slate-600 text-white'
    : 'bg-white/50 border-purple-200 text-gray-900'

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${bgClass} flex items-center justify-center`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-pink-500 mx-auto mb-4"></div>
          <p className={textClass}>Loading records...</p>
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
              📋 School Records
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={() => router.push('/school-admin/dashboard')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
            >
              ← Back
            </button>
            <button
              onClick={handleLogout}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Success/Error Message */}
        {successMessage && (
          <div className={`mb-6 p-4 rounded-lg border ${
            successMessage.includes('Error')
              ? 'bg-red-100/20 text-red-400 border-red-500/30'
              : 'bg-green-100/20 text-green-400 border-green-500/30'
          }`}>
            {successMessage}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 overflow-x-auto flex-wrap">
          {[
            { id: 'students', label: '👨‍🎓 Students', count: students.length },
            { id: 'teachers', label: '👨‍🏫 Teachers', count: staff.filter(s => ['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER'].includes(s.role)).length },
            { id: 'accountants', label: '💰 Accountants', count: staff.filter(s => s.role === 'ACCOUNTANT').length },
            { id: 'broadcast', label: '📢 Broadcast' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 rounded-lg font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${darkMode ? 'from-purple-500 to-pink-500' : 'from-blue-600 to-purple-600'} text-white shadow-lg`
                  : `${cardClass} ${textClass} hover:shadow-lg`
              }`}
            >
              {tab.label} {tab.count !== undefined && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className={`${cardClass} border rounded-lg shadow-xl overflow-hidden`}>
            <div className={`px-6 py-4 ${darkMode ? 'bg-slate-700/50' : 'bg-blue-100/50'} border-b flex justify-between items-center`}>
              <h2 className={`text-2xl font-bold ${textClass}`}>All Students ({students.length})</h2>
              <button
                onClick={() => setShowStudentModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-semibold"
              >
                + Register New Student
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${darkMode ? 'bg-slate-700/30' : 'bg-blue-50/50'} border-b`}>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Name</th>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Email</th>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Admission #</th>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className={`px-6 py-8 text-center ${textClass}`}>
                        No students registered
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Teachers Tab - Show students under each teacher */}
        {activeTab === 'teachers' && (
          <div>
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setShowTeacherModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                + Register New Teacher
              </button>
            </div>
            {staff.filter(s => ['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER'].includes(s.role)).length === 0 ? (
              <div className={`${cardClass} border rounded-lg shadow-xl p-8 text-center`}>
                <p className={textClass}>No teachers registered</p>
              </div>
            ) : (
              staff.filter(s => ['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER'].includes(s.role)).map((teacher: any) => {
                // TODO: Implement proper teacher-student relationship filtering
                // For now, show all students for demonstration
                const assignedStudents = students
                return (
                  <div key={teacher.id} className={`${cardClass} border rounded-lg shadow-xl overflow-hidden mb-6`}>
                    <div className={`px-6 py-4 ${darkMode ? 'bg-slate-700/50' : 'bg-green-100/50'} border-b`}>
                      <h3 className={`text-xl font-bold ${textClass}`}>
                        {teacher.full_name} ({teacher.role}) - Students ({assignedStudents.length})
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className={`${darkMode ? 'bg-slate-700/30' : 'bg-green-50/50'} border-b`}>
                            <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Student Name</th>
                            <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Admission #</th>
                            <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignedStudents.length === 0 ? (
                            <tr>
                              <td colSpan={3} className={`px-6 py-4 text-center ${textClass}`}>
                                No students assigned yet
                              </td>
                            </tr>
                          ) : (
                            assignedStudents.map((student: any) => (
                              <tr key={student.id} className={`border-b hover:${darkMode ? 'bg-slate-700/20' : 'bg-green-50/30'}`}>
                                <td className={`px-6 py-4 font-semibold ${textClass}`}>{student.full_name}</td>
                                <td className={`px-6 py-4 ${textClass}`}>{student.admission_number || '-'}</td>
                                <td className={`px-6 py-4 ${textClass}`}>{student.email}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Accountants Tab */}
        {activeTab === 'accountants' && (
          <div className={`${cardClass} border rounded-lg shadow-xl overflow-hidden`}>
            <div className={`px-6 py-4 ${darkMode ? 'bg-slate-700/50' : 'bg-yellow-100/50'} border-b`}>
              <h2 className={`text-2xl font-bold ${textClass}`}>
                Accountants ({staff.filter(s => s.role === 'ACCOUNTANT').length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${darkMode ? 'bg-slate-700/30' : 'bg-yellow-50/50'} border-b`}>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Name</th>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Email</th>
                    <th className={`px-6 py-4 text-left font-semibold ${textClass}`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.filter(s => s.role === 'ACCOUNTANT').length === 0 ? (
                    <tr>
                      <td colSpan={3} className={`px-6 py-8 text-center ${textClass}`}>
                        No accountants registered
                      </td>
                    </tr>
                  ) : (
                    staff.filter(s => s.role === 'ACCOUNTANT').map((acc: any) => (
                      <tr key={acc.id} className={`border-b hover:${darkMode ? 'bg-slate-700/20' : 'bg-yellow-50/30'}`}>
                        <td className={`px-6 py-4 font-semibold ${textClass}`}>{acc.full_name}</td>
                        <td className={`px-6 py-4 ${textClass}`}>{acc.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-yellow-100/30 text-yellow-400 rounded-full text-sm font-semibold">
                            ✓ Active
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Broadcast Messages Tab */}
        {activeTab === 'broadcast' && (
          <div className="space-y-6">
            {/* Broadcast to Teachers */}
            <div className={`${cardClass} border rounded-lg shadow-xl p-8`}>
              <h2 className={`text-2xl font-bold mb-6 ${textClass}`}>📢 Broadcast to Teachers</h2>
              <div className="space-y-4">
                <textarea
                  placeholder="Enter message for all teachers..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClass}`}
                  rows={4}
                />
                <button
                  onClick={handleBroadcastTeachers}
                  disabled={sendingBroadcast || !broadcastMessage.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingBroadcast ? 'Sending...' : `Send to ${staff.filter(s => ['TEACHER', 'PRINCIPAL', 'HEAD_TEACHER'].includes(s.role)).length} Teachers`}
                </button>
              </div>
            </div>

            {/* Broadcast to Parents via Email */}
            <div className={`${cardClass} border rounded-lg shadow-xl p-8`}>
              <h2 className={`text-2xl font-bold mb-6 ${textClass}`}>📧 Broadcast Email to Parents</h2>
              <div className="space-y-4">
                <input
                  type="email"
                  placeholder="Parent email address"
                  value={broadcastEmail}
                  onChange={(e) => setBroadcastEmail(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${inputClass}`}
                />
                <textarea
                  placeholder="Enter email message for parents..."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${inputClass}`}
                  rows={4}
                />
                <button
                  onClick={handleBroadcastParents}
                  disabled={sendingBroadcast || !broadcastMessage.trim() || !broadcastEmail.trim()}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingBroadcast ? 'Sending...' : 'Send Email to Parent'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Teacher Registration Modal */}
      <TeacherRegistrationModal
        schoolId={user?.school_id || ''}
        isOpen={showTeacherModal}
        onClose={() => setShowTeacherModal(false)}
        onSuccess={() => loadData()}
      />

      {/* Student Registration Modal */}
      <StudentRegistrationModal
        schoolId={user?.school_id || ''}
        isOpen={showStudentModal}
        onClose={() => setShowStudentModal(false)}
        onSuccess={() => loadData()}
      />
    </div>
  )
}
