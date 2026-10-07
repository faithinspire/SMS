/**
 * Account Locked Page - Displayed when a student's account is locked by admin
 * Professional, informative UI showing lock reason and contact instructions
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { StudentAuthService } from '@/services/student-auth.service';
import { supabase } from '@/lib/supabase-client';

interface LockInfo {
  reason: string | null;
  lockedAt: string | null;
  adminEmail: string | null;
}

const AccountLockedPage: React.FC = () => {
  const router = useRouter();
  const [lockInfo, setLockInfo] = useState<LockInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [schoolContact, setSchoolContact] = useState<{ email?: string; phone?: string } | null>(null);

  useEffect(() => {
    const getLockInfo = async () => {
      try {
        // Get current user
        const user = await AuthService.getCurrentUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Get student lock status
        const student = await supabase
          .from('students')
          .select('id, is_locked, lock_reason, locked_at, locked_by_user_id, school_id')
          .eq('user_id', user.id)
          .eq('school_id', user.school_id)
          .single();

        if (student.error || !student.data?.is_locked) {
          // Not locked, redirect to student dashboard
          router.push('/student');
          return;
        }

        // Get admin info (who locked the student)
        let adminEmail = null;
        if (student.data.locked_by_user_id) {
          const adminUser = await supabase
            .from('users')
            .select('email')
            .eq('id', student.data.locked_by_user_id)
            .single();
          adminEmail = adminUser.data?.email || null;
        }

        // Get school contact info
        const school = await supabase
          .from('schools')
          .select('email, phone')
          .eq('id', user.school_id)
          .single();

        setLockInfo({
          reason:
            student.data.lock_reason ||
            'Your account has been temporarily locked by your school administrator.',
          lockedAt: student.data.locked_at,
          adminEmail,
        });

        setSchoolContact({
          email: school.data?.email,
          phone: school.data?.phone,
        });
      } catch (error) {
        console.error('[AccountLockedPage] Error loading lock info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getLockInfo();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const lockedDate = lockInfo?.lockedAt
    ? new Date(lockInfo.lockedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl border-l-4 border-red-600 p-8">
        {/* Icon */}
        <div className="text-center mb-6">
          <div className="inline-block bg-red-100 p-4 rounded-full">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Account Locked</h1>
        <p className="text-center text-gray-600 mb-6">
          Your account has been temporarily restricted by your school.
        </p>

        {/* Lock Details */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Lock Reason</h3>
            <p className="text-gray-700">{lockInfo?.reason}</p>
          </div>

          {lockedDate && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">Locked On</h3>
              <p className="text-gray-600 text-sm">{lockedDate}</p>
            </div>
          )}
        </div>

        {/* Contact Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            Contact Your School
          </h3>

          <div className="space-y-2 text-sm">
            {schoolContact?.email && (
              <div>
                <p className="text-gray-600">Email:</p>
                <a
                  href={`mailto:${schoolContact.email}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {schoolContact.email}
                </a>
              </div>
            )}

            {schoolContact?.phone && (
              <div>
                <p className="text-gray-600">Phone:</p>
                <a
                  href={`tel:${schoolContact.phone}`}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  {schoolContact.phone}
                </a>
              </div>
            )}

            {!schoolContact?.email && !schoolContact?.phone && (
              <p className="text-gray-600 text-sm">
                Contact your school administrator for assistance.
              </p>
            )}
          </div>
        </div>

        {/* What to Do */}
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-2">What can you do?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">→</span>
              <span>Contact your school immediately using the information above</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">→</span>
              <span>Discuss the reason for the lock with your administrator</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">→</span>
              <span>Take appropriate action to resolve the issue</span>
            </li>
          </ul>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-6">
          <p className="text-xs text-yellow-800">
            <span className="font-semibold">Important:</span> This lock was set by your school
            administrator and cannot be bypassed. You must contact your school to have it removed.
          </p>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            supabase.auth.signOut();
            router.push('/auth/login');
          }}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default AccountLockedPage;
