/**
 * School Admin Students Management Page
 * Lists all students with filters by class, pause/activate/delete actions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Student {
  id: string;
  user_id: string;
  school_id: string;
  admission_number: string;
  date_of_birth: string;
  photo_url: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'SUSPENDED';
  class_arm_combo_id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    photo_url: string | null;
    status: string;
  };
  class_arm_combo: {
    id: string;
    class: {
      name: string;
    };
    arm: {
      name: string;
    };
  };
}

interface Class {
  id: string;
  name: string;
}

type StatusType = 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'SUSPENDED';

const StatusBadge: React.FC<{ status: StatusType }> = ({ status }) => {
  const variants: Record<StatusType, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    SUSPENDED: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${variants[status]}`}>
      {status}
    </span>
  );
};

const ConfirmationModal: React.FC<{
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDangerous?: boolean;
}> = ({ title, message, onConfirm, onCancel, isLoading = false, isDangerous = false }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-4 py-2 text-white rounded ${
            isDangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {isLoading ? 'Processing...' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
);

const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusType | 'ALL'>('ALL');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [schoolId, setSchoolId] = useState<string>('');
  const [modal, setModal] = useState<{
    type: 'pause' | 'activate' | 'delete' | null;
    student?: Student;
  }>({ type: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Get current user's school
  useEffect(() => {
    const getCurrentSchool = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userProfile } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .single();

        if (userProfile) {
          setSchoolId(userProfile.school_id);
        }
      } catch (error) {
        console.error('Error getting school:', error);
      }
    };

    getCurrentSchool();
  }, []);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!schoolId) return;
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('id, name')
          .eq('school_id', schoolId)
          .order('name', { ascending: true });

        if (error) throw error;
        setClasses(data || []);
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, [schoolId]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          school_id,
          admission_number,
          date_of_birth,
          photo_url,
          status,
          class_arm_combo_id,
          user:user_id (
            id,
            full_name,
            email,
            photo_url,
            status
          ),
          class_arm_combo:class_arm_combo_id (
            id,
            class:class_id (
              name
            ),
            arm:arm_id (
              name
            )
          )
        `)
        .eq('school_id', schoolId)
        .order('user.full_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      fetchStudents();
    }
  }, [schoolId, fetchStudents]);

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || student.status === filterStatus;
    const matchesClass = filterClass === 'ALL' || student.class_arm_combo.class.name === filterClass;
    return matchesSearch && matchesStatus && matchesClass;
  });

  // Update student status
  const handleStatusChange = async (studentId: string, newStatus: StatusType) => {
    try {
      setIsActionLoading(true);
      const response = await fetch(`/api/school-admin/students/${studentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setStudents(students.map(s =>
        s.id === studentId ? { ...s, status: newStatus } : s
      ));
      toast.success(`Student ${newStatus.toLowerCase()}`);
      setModal({ type: null });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update student status');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete student
  const handleDelete = async (studentId: string) => {
    try {
      setIsActionLoading(true);
      const response = await fetch(`/api/school-admin/students/${studentId}/delete`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete student');

      setStudents(students.filter(s => s.id !== studentId));
      toast.success('Student deleted successfully');
      setModal({ type: null });
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Failed to delete student');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Students Management</h2>

      {/* Search and Filter */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Search by name, email, or admission..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Classes</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.name}>{cls.name}</option>
          ))}
        </select>
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
        <div className="text-sm text-gray-600 flex items-center">
          Total: {filteredStudents.length} students
        </div>
      </div>

      {/* Students Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading students...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          No students found. Try adjusting your search or filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4">Photo</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Admission</th>
                <th className="text-left py-3 px-4">Class</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {student.photo_url ? (
                      <div className="relative w-10 h-10">
                        <Image
                          src={student.photo_url}
                          alt={student.user.full_name}
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm">
                        {student.user.full_name[0]}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold">{student.user.full_name}</td>
                  <td className="py-3 px-4 text-sm">{student.admission_number}</td>
                  <td className="py-3 px-4 text-sm">
                    {student.class_arm_combo.class.name} {student.class_arm_combo.arm.name}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex gap-2 justify-center flex-wrap">
                      {student.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setModal({ type: 'pause', student })}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        >
                          Pause
                        </button>
                      ) : student.status !== 'SUSPENDED' ? (
                        <button
                          onClick={() => setModal({ type: 'activate', student })}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          Activate
                        </button>
                      ) : null}
                      <button
                        onClick={() => setModal({ type: 'delete', student })}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modal.type === 'pause' && modal.student && (
        <ConfirmationModal
          title="Pause Student"
          message={`Pause "${modal.student.user.full_name}"? They will not be able to access the system.`}
          onConfirm={() => handleStatusChange(modal.student!.id, 'PAUSED')}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
        />
      )}

      {modal.type === 'activate' && modal.student && (
        <ConfirmationModal
          title="Activate Student"
          message={`Activate "${modal.student.user.full_name}"? They will regain access to the system.`}
          onConfirm={() => handleStatusChange(modal.student!.id, 'ACTIVE')}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
        />
      )}

      {modal.type === 'delete' && modal.student && (
        <ConfirmationModal
          title="Delete Student"
          message={`Delete "${modal.student.user.full_name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(modal.student!.id)}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
          isDangerous
        />
      )}
    </div>
  );
};

export default StudentsPage;
