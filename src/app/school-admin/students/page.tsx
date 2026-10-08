'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { Lock, Unlock, Edit, Eye } from 'lucide-react';

interface Student {
  id: string;
  user_id: string;
  school_id: string;
  admission_number: string;
  full_name: string;
  email: string;
  photo_url: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'SUSPENDED';
  is_locked: boolean;
  locked_at: string | null;
  lock_reason: string | null;
  class: {
    id: string | null;
    name: string;
  };
  arm: {
    id: string | null;
    name: string | null;
  };
  created_at: string;
}

const StatusBadge: React.FC<{ status: string; isLocked?: boolean }> = ({ status, isLocked }) => {
  if (isLocked) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
        🔒 LOCKED
      </span>
    );
  }

  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    SUSPENDED: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors[status] || colors.ACTIVE}`}>
      {status}
    </span>
  );
};

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterLocked, setFilterLocked] = useState<string>('ALL');
  const [schoolId, setSchoolId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Load authenticated school
  useEffect(() => {
    const loadSchool = async () => {
      try {
        const user = await AuthService.getCurrentUser();
        if (!user) {
          router.push('/auth/login');
          return;
        }

        if (!user.school_id) {
          setError('Your account is not linked to a school');
          setIsLoading(false);
          return;
        }

        setSchoolId(user.school_id);
      } catch (err) {
        console.error('Error getting school:', err);
        setError('Failed to load school information');
        setIsLoading(false);
      }
    };

    loadSchool();
  }, [router]);

  // Fetch students when school is known
  useEffect(() => {
    if (!schoolId) return;

    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        console.log('[Students Page] Fetching from:', `/api/school/students-complete?schoolId=${schoolId}`);

        const response = await fetch(`/api/school/students-complete?schoolId=${schoolId}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('[Students Page] ✅ Loaded', result.data?.length || 0, 'students');
        setStudents(result.data || []);

        if (!result.data || result.data.length === 0) {
          toast.info('No students registered yet');
        }
      } catch (err: any) {
        console.error('[Students Page] Error fetching students:', err);
        setError(err.message || 'Failed to load students');
        toast.error('Failed to load students');
        setStudents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [schoolId]);

  // Filter students
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      !searchTerm ||
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'ALL' || student.status === filterStatus;
    const matchesLocked =
      filterLocked === 'ALL' ||
      (filterLocked === 'LOCKED' && student.is_locked) ||
      (filterLocked === 'UNLOCKED' && !student.is_locked);

    return matchesSearch && matchesStatus && matchesLocked;
  });

  const handleLockStudent = async (studentId: string, shouldLock: boolean) => {
    try {
      toast.loading('Updating student lock status...');
      
      const response = await fetch(`/api/school/students/${studentId}/lock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_locked: shouldLock,
          lock_reason: shouldLock ? 'Locked by School Admin' : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      toast.dismiss();
      toast.success(shouldLock ? 'Student locked' : 'Student unlocked');

      // Update students array with server response to ensure persistence
      setStudents(students.map(s =>
        s.id === studentId
          ? { ...s, is_locked: result.data?.is_locked ?? shouldLock, locked_at: result.data?.locked_at }
          : s
      ));
    } catch (err: any) {
      toast.dismiss();
      toast.error('Failed to update lock status');
      console.error('Error locking student:', err);
    }
  };

  if (error && students.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-semibold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white rounded-lg shadow-md p-6 m-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">👥 Students Management</h1>
          <p className="text-gray-600 mt-2">Manage all registered students in your school</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-2xl font-bold text-blue-600">{students.length}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {students.filter(s => s.status === 'ACTIVE' && !s.is_locked).length}
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Locked</p>
            <p className="text-2xl font-bold text-red-600">
              {students.filter(s => s.is_locked).length}
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Filtered Results</p>
            <p className="text-2xl font-bold text-yellow-600">{filteredStudents.length}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button
            onClick={() => router.push('/auth/student/register')}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2"
          >
            ➕ Register New Student
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search by name, admission #, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            value={filterLocked}
            onChange={(e) => setFilterLocked(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Lock Status</option>
            <option value="UNLOCKED">Unlocked</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600 text-lg">
              {students.length === 0 ? 'No students registered yet' : 'No students match your filters'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b-2 border-gray-300">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Photo</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Admission #</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Class</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Arm</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">🔒 Lock</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-gray-200">
                {filteredStudents.map((student, idx) => (
                  <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4">
                      {student.photo_url ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <Image
                            src={student.photo_url}
                            alt={student.full_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                          {student.full_name?.[0] || 'S'}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {student.full_name || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{student.admission_number}</td>
                    <td className="py-3 px-4 text-gray-700 font-medium">
                      {student.class?.name || '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {student.arm?.name || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={student.status} isLocked={student.is_locked} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleLockStudent(student.id, !student.is_locked)}
                        className={`px-3 py-1 rounded font-semibold flex items-center justify-center gap-1 mx-auto text-xs ${
                          student.is_locked
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {student.is_locked ? (
                          <>
                            <Lock size={12} /> Locked
                          </>
                        ) : (
                          <>
                            <Unlock size={12} /> Unlock
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => router.push(`/school-admin/students/${student.id}`)}
                          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 flex items-center gap-1"
                        >
                          <Eye size={12} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
