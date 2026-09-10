'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthService } from '@/services/auth.service'
import { supabase } from '@/lib/supabase-client'
import StaffHeader from '@/components/StaffHeader'

export default function SchoolAdminBroadcastsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [school, setSchool] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [message, setMessage] = useState('')
  const [recipientRole, setRecipientRole] = useState<'ALL' | 'TEACHER' | 'PRINCIPAL' | 'HEAD_TEACHER' | 'ACCOUNTANT' | 'STUDENT'>('ALL')
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

      if (!currentUser || !['SCHOOL_ADMIN', 'ADMIN'].includes(currentUser.role)) {
        router.push('/landing')
        return
      }

      setUser(currentUser)

      if (currentUser.school_id) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', currentUser.school_id)
          .single()

        setSchool(schoolData)

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

      const { data: newBroadcast, error: insertError } = await supabase
        .from('broadcasts')
        .insert([
          {
            school_id: user.school_id,
            created_by: user.id,
            sender_name: user.full_name,
            title: `Notice from School Admin`,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800">
      <StaffHeader
        staffName={user?.full_name || 'Admin'}
        schoolName={school?.name || 'School'}
        section="Broadcast Messaging"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg shadow-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">📢 Send Broadcast Notice</h2>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-900/30 border border-green-700/50 rounded-lg text-green-300">
              {success}
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                Send To:
              </label>
              <select
                value={recipientRole}
                onChange={(e) => setRecipientRole(e.target.value as any)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">🌐 All Staff & Students</option>
                <option value="TEACHER">👨‍🏫 Teachers</option>
                <option value="PRINCIPAL">🎓 Principal</option>
                <option value="HEAD_TEACHER">📚 Head Teacher</option>
                <option value="ACCOUNTANT">💰 Accountant</option>
                <option value="STUDENT">👨‍🎓 Students</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-2">
                Message:
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your broadcast message here..."
                rows={6}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-2">
                Characters: {message.length}
              </p>
            </div>

            <button
              onClick={handleSendBroadcast}
              disabled={sending || !message.trim()}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sending ? '⏳ Sending...' : '📤 Send Broadcast'}
            </button>
          </div>
        </div>

        <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-lg shadow-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">📋 Recent Broadcasts</h3>

          {broadcasts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No broadcasts sent yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="p-4 border border-slate-700/50 rounded-lg hover:border-purple-500/50 transition bg-slate-700/30">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-white">{broadcast.title}</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        To: {broadcast.target_role}
                      </p>
                    </div>
                    <span className="text-xs bg-purple-900/50 border border-purple-700/50 text-purple-300 px-2 py-1 rounded">
                      {new Date(broadcast.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{broadcast.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
