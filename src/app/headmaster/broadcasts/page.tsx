'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import StaffHeader from '@/components/StaffHeader'

export default function HeadmasterBroadcastsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [recipientRole, setRecipientRole] = useState<'ALL' | 'TEACHER' | 'PRINCIPAL' | 'ACCOUNTANT' | 'STUDENT'>('ALL')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const currentUser = await AuthService.getCurrentUser()

      if (!currentUser || !['HEAD_TEACHER', 'PRINCIPAL'].includes(currentUser.role)) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      // Load school
      if (currentUser.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        setSchool(schoolData)

        // Load broadcasts sent by this user
        const { data: broadcastsData } = await supabase
          .from('broadcasts')
          .select('*')
          .eq('school_id', currentUser.school_id)
          .order('created_at', { ascending: false })
          .limit(50)

        setBroadcasts(broadcastsData || [])
      }
    } catch (error) {
      console.error('Load error:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSendBroadcast = async () => {
    if (!message.trim()) {
      setError('Please enter a message')
      return
    }

    try {
      setSending(true)
      setError('')
      setSuccess('')

      // Insert broadcast
      const { data: newBroadcast, error: insertError } = await supabase
        .from('broadcasts')
        .insert([
          {
            school_id: user.school_id,
            created_by: user.id,
            sender_name: user.full_name,
            title: `Broadcast from ${user.full_name}`,
            message: message,
            broadcast_type: 'ANNOUNCEMENT',
            target_role: recipientRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()

      if (insertError) {
        throw insertError
      }

      // Add to local list
      if (newBroadcast) {
        setBroadcasts([newBroadcast[0], ...broadcasts])
      }

      setMessage('')
      setSuccess('✅ Broadcast sent successfully!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      console.error('Send error:', err)
      setError(`❌ Error: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      {/* Header */}
      <StaffHeader
        staffName={user?.full_name || 'Staff'}
        schoolName={school?.name || 'School'}
        section="Broadcast Messaging"
      />

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Send Broadcast Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📢 Send Broadcast Message</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
              {success}
            </div>
          )}

          <div className="space-y-6">
            {/* Recipient Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Send To:
              </label>
              <select
                value={recipientRole}
                onChange={(e) => setRecipientRole(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">🌐 All Staff & Students</option>
                <option value="TEACHER">👨‍🏫 Teachers</option>
                <option value="PRINCIPAL">🎓 Principal</option>
                <option value="ACCOUNTANT">💰 Accountant</option>
                <option value="STUDENT">👨‍🎓 Students</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message:
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your broadcast message here..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                Characters: {message.length}
              </p>
            </div>

            {/* Send Button */}
            <button
              onClick={handleSendBroadcast}
              disabled={sending || !message.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sending ? '⏳ Sending...' : '📤 Send Broadcast'}
            </button>
          </div>
        </div>

        {/* Recent Broadcasts */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📋 Recent Broadcasts</h3>

          {broadcasts.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No broadcasts sent yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900">{broadcast.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        To: {broadcast.target_role}
                      </p>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                      {new Date(broadcast.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">{broadcast.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
