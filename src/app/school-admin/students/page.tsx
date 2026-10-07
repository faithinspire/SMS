'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/services/auth.service';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

interface Student {
  id: string;
  user_id: string;
  school_id: string;
  admission_number: string;
  date_of_birth: string | null;
  photo_url: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'SUSPENDED';
  is_locked: boolean;
  locked_at: string | null;
  lock_reason: string | null;
  class_arm_combo_id: string | null;
  users?: {
    id: string;
    full_name: string;
    email: string;
    photo_url: string | null;
    phone?: string;
  };
  class_arm_combos?: {
    id: string;
    classes?: {
      id: string;
      name: string;
    };
    arms?: {
      id: string;
      name: string;
    };
  };
}

type StatusType = 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'SUSPENDED';

const StatusBadge: React.FC<{ status: StatusType; isLocked?: boolean }> = ({ status, isLocked }) => {
  const variants: Record<StatusType, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    SUSPENDED: 'bg-red-100 text-red-800',
  };

  if (isLocked) {
    return (
      <div className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
        🔒 LOCKED
      </div>
    );
  }

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${variants[status]}`}>
      {status}
    </span>
  );
};

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusType | 'ALL'>('ALL');
  const [schoolId, setSchoolId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Get authenticated school on mount
  useEffect(() => {
    const getSchoolContext = async () => {
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
        console.error('Error getting school context:', err);
        setError('Failed to load school information');
        setIsLoading(false);
      }
    };

    getSchoolContext();
  }, [router]);

  // Fetch students when school ID is available
  useEffect(() => {
    if (!schoolId) return;

    const fetchStudents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/school/students?schoolId=${schoolId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch students: ${response.status}`);
        }

        const result = await response.json();
        setStudents(result.data || []);
      } catch (err: any) {
        console.error('Error fetching students:', err);
        setError(err.message || 'Failed to load students');
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
      student.users?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.users?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || student.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white rounded-lg shadow-md p-6 m-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Students Management</h1>
          <p className="text-gray-600 mt-2">Manage all registered students in your school</p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-semibold">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Action Buttons */}
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
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search by name, email, or admission number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as StatusType | 'ALL')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <div className="px-4 py-2 bg-gray-100 rounded-lg flex items-center">
            <span className="text-gray-700 font-semibold">
              Total: {filteredStudents.length} students
            </span>
          </div>
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
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Class</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y border-gray-200">
                {filteredStudents.map((student, idx) => (
                  <tr key={student.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-3 px-4">
                      {student.users?.photo_url ? (
                        <div className="relative w-10 h-10 rounded-full overflow-hidden">
                          <Image
                            src={student.users.photo_url}
                            alt={student.users.full_name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                          {student.users?.full_name?.[0] || 'S'}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-900">
                      {student.users?.full_name || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-gray-700">{student.admission_number || '—'}</td>
                    <td className="py-3 px-4 text-gray-600 text-sm">{student.users?.email || '—'}</td>
                    <td className="py-3 px-4 text-gray-700">
                      {student.class_arm_combos?.classes?.name && student.class_arm_combos?.arms?.name
                        ? `${student.class_arm_combos.classes.name} - ${student.class_arm_combos.arms.name}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={student.status} isLocked={student.is_locked} />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => router.push(`/school-admin/students/${student.id}`)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        View
                      </button>
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
