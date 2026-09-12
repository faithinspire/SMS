'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import CreateCBTForm from './CreateCBT'

interface Exam {
  id: string
  title: string
  description?: string
  examType: 'TEST' | 'EXAM'
  testNumber?: number
  startTime: string
  endTime: string
  durationMinutes: number
  totalMarks?: number
  passingPercentage?: number
  questionCount?: number
  createdAt: string
}

interface SubjectClass {
  subjectId: string
  subjectName: string
  classArmComboId: string
  className: string
}

export default function CBTExamsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser()

        if (!currentUser || currentUser.role !== 'TEACHER') {
          router.push('/landing')
          return
        }

        setUser(currentUser)

        // Load school data
        if (currentUser.school_id) {
          const { data: schoolData } = await supabase
            .from('schools')
            .select('*')
            .eq('id', currentUser.school_id)
            .single()
          setSchool(schoolData)
        }

        setLoading(false)
      } catch (err) {
        console.error('Error checking auth:', err)
        router.push('/landing')
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading CBT Management...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">💻 CBT Management</h1>
          <p className="text-gray-600">Create and manage computer-based tests</p>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Toggle Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {showForm ? '✕ Cancel' : '+ Create New Exam'}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6 border border-gray-200">
            <CreateCBTForm />
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-700">
          <p><strong>Note:</strong> Use the form above to create exams with full question management. The CBT system supports CA1-4 continuous assessments and final EXAM submissions.</p>
        </div>
      </div>
    </div>
  )
}
