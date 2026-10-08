'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { supabase } from '@/lib/supabase-client';

export default function AccountLockedAdminPage() {
  const router = useRouter();
  const [lockInfo, setLockInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLockStatus = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        if (!user) {
          router.push('/auth/student/login');
          return;
        }

        const { data: student } = await supabase
          .from('students')
          .select('is_locked, locked_at, lock_reason, status')
          .eq('user_id', user.id)
          .single();

        if (student?.is_locked !== true) {
          router.push('/student/dashboard');
          return;
        }

        setLockInfo(student);
        setLoading(false);
      } catch (err) {
        console.error('Error checking lock status:', err);
        setLoading(false);
      }
    };

    checkLockStatus();
  }, [router]);

  const handleLogout = async () => {
    await AuthService.logout();
    router.push('/auth/student/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-red-500 border-t-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-bold text-red-600 mb-2">Account Locked</h1>
        <p className="text-gray-600 mb-6">
          Your account has been locked by the school administrator.
        </p>

        {lockInfo?.lock_reason && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-yellow-800">Reason:</p>
            <p className="text-sm text-yellow-700">{lockInfo.lock_reason}</p>
          </div>
        )}

        {lockInfo?.locked_at && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-blue-800">Locked Since:</p>
            <p className="text-sm text-blue-700">
              {new Date(lockInfo.locked_at).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Please contact your school administrator to unlock your account.
          </p>
          <button
            onClick={handleLogout}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
