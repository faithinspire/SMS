'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase-client'

interface StaffPaymentModalProps {
  staff: any
  school: any
  isOpen: boolean
  onClose: () => void
  onPaymentSuccess?: () => void
}

export default function StaffPaymentModal({ staff, school, isOpen, onClose }: StaffPaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER')
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('Monthly Salary')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [shareMode, setShareMode] = useState<'email' | 'whatsapp' | null>(null)

  const formatDate = () =>
    new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

  const generatePaymentSlip = () => {
    const invoiceNumber = `INV-${Date.now()}`
    return `
╔════════════════════════════════════════════╗
║        STAFF SALARY PAYMENT SLIP            ║
╚════════════════════════════════════════════╝

📍 SCHOOL INFORMATION
School Name: ${school?.name || 'School Name'}
${school?.email ? `Email: ${school.email}` : ''}
${school?.phone ? `Phone: ${school.phone}` : ''}

👤 STAFF DETAILS
Name: ${staff.full_name}
Position: ${staff.role?.replace(/_/g, ' ') || 'Staff Member'}
Email: ${staff.email}
${staff.phone ? `Phone: ${staff.phone}` : ''}

💳 PAYMENT DETAILS
Invoice Number: ${invoiceNumber}
Amount: ₦${parseInt(amount || '0').toLocaleString()}
Purpose: ${purpose}
Payment Method: ${paymentMethod}
${notes ? `Notes: ${notes}` : ''}

📅 DATES
Payment Date: ${formatDate()}
Status: ✓ COMPLETED

${school?.website ? `🌐 ${school.website}` : ''}

════════════════════════════════════════════
Thank you for this payment.
This is an automated payment notification.
Please keep this receipt for your records.
    `.trim()
  }

  const handleProcessPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setProcessing(true)
    setError('')
    setSuccess('')

    try {
      const paymentData = {
        school_id: school?.id,
        recipient_id: staff.id,
        recipient_name: staff.full_name,
        recipient_email: staff.email,
        type: 'STAFF_SALARY',
        amount: parseFloat(amount),
        purpose,
        payment_method: paymentMethod,
        notes,
        status: 'COMPLETED',
        created_at: new Date().toISOString(),
      }

      console.log('💾 Saving payment:', paymentData)

      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert([paymentData])
        .select()

      if (insertError) throw insertError

      console.log('✅ Payment saved:', data)

      setSuccess('✅ Payment processed successfully!')
      
      // Call the success callback if provided
      if (onPaymentSuccess) {
        onPaymentSuccess()
      }
      
      setShareMode('email')
    } catch (err: any) {
      console.error('❌ Error saving payment:', err)
      setError(err.message || 'Failed to process payment')
    } finally {
      setProcessing(false)
    }
  }

  const handleShareViaEmail = async () => {
    try {
      setProcessing(true)
      const subject = `Salary Payment Slip - ${staff.full_name}`
      const body = generatePaymentSlip()

      window.location.href = `mailto:${staff.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

      setSuccess('📧 Email opened successfully!')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to open email')
    } finally {
      setProcessing(false)
    }
  }

  const handleShareViaWhatsApp = async () => {
    try {
      // For WhatsApp, we would need phone number from staff
      const message = encodeURIComponent(generatePaymentSlip())
      // Open WhatsApp Web or app
      window.open(`https://web.whatsapp.com/send?text=${message}`, '_blank')

      setSuccess('💬 WhatsApp opened successfully!')
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to open WhatsApp')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 border-b shadow-lg flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">💳 Staff Salary Payment</h2>
            <p className="text-blue-100 mt-1">{staff.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-all text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {success && !shareMode && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {/* Staff Information */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-bold text-blue-900 mb-4">📋 Staff Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700 font-semibold">Name</p>
                <p className="font-bold text-gray-900">{staff.full_name}</p>
              </div>
              <div>
                <p className="text-blue-700 font-semibold">Position</p>
                <p className="font-bold text-gray-900">{staff.role?.replace(/_/g, ' ') || 'Staff'}</p>
              </div>
              <div>
                <p className="text-blue-700 font-semibold">Email</p>
                <p className="font-bold text-gray-900 break-all">{staff.email}</p>
              </div>
              <div>
                <p className="text-blue-700 font-semibold">Status</p>
                <p className="font-bold text-green-600">✓ Active</p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₦) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-bold"
                placeholder="Enter salary amount"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Purpose</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Monthly Salary"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHEQUE">Cheque</option>
                <option value="MOBILE_MONEY">Mobile Money</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>

          {/* Payment Summary */}
          {amount && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <p className="text-gray-700 font-semibold">Total Amount:</p>
                <p className="text-3xl font-bold text-blue-600">₦{parseInt(amount || '0').toLocaleString()}</p>
              </div>
              <p className="text-sm text-gray-600 mt-2">Date: {formatDate()}</p>
            </div>
          )}

          {/* Share Mode */}
          {!shareMode ? (
            <div className="flex gap-3">
              <button
                onClick={handleProcessPayment}
                disabled={processing}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition"
              >
                {processing ? '⏳ Processing...' : '✓ Process Payment'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={handleShareViaEmail}
                disabled={processing}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <span className="text-xl">📧</span>
                {processing ? 'Opening Email...' : 'Share via Email'}
              </button>
              <button
                onClick={handleShareViaWhatsApp}
                disabled={processing}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <span className="text-xl">💬</span>
                {processing ? 'Opening WhatsApp...' : 'Share via WhatsApp'}
              </button>
              <button
                onClick={onClose}
                className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 transition"
              >
                ← Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
