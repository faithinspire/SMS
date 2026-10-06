'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthService } from '@/services/auth.service';

export default function AccountLockedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const reason = searchParams.get('reason') || 'Your account has been temporarily locked by your school administrator.';

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      router.push('/landing');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/landing');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8 text-center">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">🔒</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-red-900 mb-2">Account Locked</h1>

        {/* Message */}
        <p className="text-gray-700 mb-6 leading-relaxed">
          {reason}
        </p>

        {/* Sub-message */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <p className="text-sm text-blue-800">
            <strong>📧 Contact your school administrator:</strong> They can unlock your account when you're ready to return.
          </p>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={isLoading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold"
        >
          {isLoading ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </div>
  );
}
