'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'

export default function InsertTestDataPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const insertTestData = async () => {
    try {
      setLoading(true)
      setStatus('Getting current user...')
      
      const user = await AuthService.getCurrentUser()
      if (!user || !user.schoolId) {
        setError('User not logged in or no schoolId')
        return
      }

      setStatus(`Inserting test data for schoolId: ${user.schoolId}`)

      const response = await fetch('/api/debug/insert-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId: user.schoolId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to insert test data')
        return
      }

      setStatus('✅ Test data inserted successfully!')
      setResult(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🔧 Insert Test Data</h1>
        
        <button
          onClick={insertTestData}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Inserting...' : 'Insert Test Data Now'}
        </button>

        {status && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700">{status}</p>
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700 font-bold mb-2">✅ Data Inserted:</p>
            <ul className="text-green-600 space-y-1">
              <li>Classes: {result.classes}</li>
              <li>Arms: {result.arms}</li>
              <li>Class-Arm Combos: {result.combos}</li>
              <li>Subjects: {result.subjects}</li>
            </ul>
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">❌ Error: {error}</p>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 text-sm">
            <strong>Next:</strong> After inserting data, go back to registration and check if dropdowns show data.
          </p>
        </div>

        <button
          onClick={() => router.back()}
          className="mt-6 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
        >
          Go Back
        </button>
      </div>
    </div>
  )
}
