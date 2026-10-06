/**
 * School Admin Students Management Page with Letter Preview and Share
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, createClient } from '@/lib/supabase-client';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { LetterGenerationService } from '@/services/letter-generation.service';
import { LetterPreviewModal as LetterPreviewModalComponent } from '@/components/admin/LetterPreviewModal';

// Helper to get fresh Supabase client
let supabaseClient: any = null;
function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient();
  }
  return supabaseClient;
}

interface Student {
  id: string;
  user_id: string;
  school_id: string;
  admission_number: string;
  date_of_birth: string | null;
  photo_url: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'PAUSED' | 'SUSPENDED';
  class_arm_combo_id: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    photo_url: string | null;
    status: string;
    phone?: string;
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

// ✅ HOTFIX: Add EditStudentModal component
const EditStudentModal: React.FC<{
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Student>) => Promise<void>;
  isLoading?: boolean;
}> = ({ student, isOpen, onClose, onSave, isLoading = false }) => {
  const [formData, setFormData] = useState(student);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(student);
  }, [student]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 border-b border-blue-800">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            ✏️ Edit Student
          </h3>
          <p className="text-blue-100 text-sm mt-1">Update student information</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              👤 Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.user.full_name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      user: { ...formData.user, full_name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.user.email}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      user: { ...formData.user, email: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Admission Number</label>
                <input
                  type="text"
                  value={formData.admission_number}
                  onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="PAUSED">Paused</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end border-t pt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StudentsPage: React.FC = () => {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusType | 'ALL'>('ALL');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [schoolId, setSchoolId] = useState<string>('');
  const [modal, setModal] = useState<{
    type: 'pause' | 'activate' | 'delete' | 'edit' | null;
    student?: Student;
  }>({ type: null });
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [letterModal, setLetterModal] = useState<{
    isOpen: boolean;
    studentId?: string;
  }>({ isOpen: false });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch students with abort controller to prevent race conditions
  const fetchStudents = useCallback(async (school: string) => {
    if (!school) {
      setIsLoading(false);
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      setIsLoading(true);
      console.log('[Students Page] Fetching students for school:', school);

      // Call the API endpoint instead of direct database query
      const response = await fetch(`/api/school/students?schoolId=${school}`, {
        signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!signal.aborted) {
        setStudents(result.data || []);
        console.log('[Students Page] Students set in state:', result.data?.length || 0);
      }
    } catch (error) {
      if (signal.aborted) {
        console.log('[Students Page] Request was cancelled');
        return;
      }

      console.error('[Students Page] Critical error fetching students:', error);
      let errorMsg = 'Failed to load students';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMsg = 'Student data is taking too long to load. Try again in a moment.';
        } else if (error.message.includes('cancelled')) {
          return;
        } else {
          errorMsg = error.message;
        }
      }
      toast.error(errorMsg);
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get current user's school
  useEffect(() => {
    const getCurrentSchool = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.log('[Students Page] No authenticated user');
          return;
        }

        console.log('[Students Page] Authenticated user:', user.id);

        // ✅ HOTFIX: Use .maybeSingle() instead of .single() to handle missing user records gracefully
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[Students Page] Error getting user profile:', error);
          toast.error('Failed to load your school information');
          return;
        }

        if (userProfile && userProfile.school_id) {
          console.log('[Students Page] Setting schoolId:', userProfile.school_id);
          setSchoolId(userProfile.school_id);
        } else {
          console.warn('[Students Page] No school_id in user profile - user record may not exist yet');
          toast.error('Your account is not linked to a school');
        }
      } catch (error) {
        console.error('[Students Page] Error getting school:', error);
        toast.error('Failed to load school information');
      }
    };

    getCurrentSchool();
  }, []);

  // Fetch classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (!schoolId) return;
      try {
        const { data, error } = await getSupabaseClient()
          .from('classes')
          .select('id, name')
          .eq('school_id', schoolId)
          .order('name', { ascending: true });

        if (error) throw error;
        setClasses(data || []);
      } catch (error) {
        console.error('[Students Page] Error fetching classes:', error);
      }
    };

    fetchClasses();
  }, [schoolId]);

  // Fetch students when schoolId changes
  useEffect(() => {
    if (!schoolId) {
      console.log('[Students Page] No schoolId, skipping fetch');
      setIsLoading(false);
      return;
    }

    console.log('[Students Page] Effect triggered for schoolId:', schoolId);
    fetchStudents(schoolId);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [schoolId, fetchStudents]);

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || student.status === filterStatus;
    const matchesClass = filterClass === 'ALL' || student.class_arm_combo?.class?.name === filterClass;
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
      
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/school-admin/students/${studentId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete student');
      }

      setStudents(students.filter(s => s.id !== studentId));
      toast.success('Student deleted successfully');
      setModal({ type: null });
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete student');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Generate Admission Letter - Open in modal
  const generateAdmissionLetter = async (student: Student) => {
    setLetterModal({
      isOpen: true,
      studentId: student.id,
    });
  };

  // ✅ HOTFIX: Handle edit for students
  const handleEditStudent = async (updates: Partial<Student>) => {
    if (!modal.student) return;
    try {
      setIsActionLoading(true);
      setStudents(students.map(s => 
        s.id === modal.student!.id 
          ? { ...s, ...updates, user: { ...s.user, ...updates.user } }
          : s
      ));
      toast.success('Student updated successfully');
      setModal({ type: null });
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update student');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Students Management</h2>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/auth/student/register')}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2 transition-colors"
        >
          ➕ Register New Student
        </button>
      </div>

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
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Admission #</th>
                <th className="text-left py-3 px-4">Class</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {student.user.photo_url ? (
                      <div className="relative w-10 h-10">
                        <Image
                          src={student.user.photo_url}
                          alt={student.user.full_name}
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm font-bold">
                        {student.user.full_name?.[0] || 'S'}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold text-gray-900">{student.user.full_name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{student.user.email}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{student.admission_number}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {student.class_arm_combo?.class?.name} {student.class_arm_combo?.arm?.name}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex gap-2 justify-center flex-wrap">
                      <button
                        onClick={() => setModal({ type: 'edit', student })}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        title="Edit Student"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => generateAdmissionLetter(student)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                      >
                        📄 Letter
                      </button>
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
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
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

      {/* Letter Preview Modal */}
      {letterModal.isOpen && letterModal.studentId && (
        <LetterPreviewModalComponent
          isOpen={letterModal.isOpen}
          onClose={() => setLetterModal({ isOpen: false })}
          letterType="admission"
          recipientId={letterModal.studentId}
          schoolId={schoolId}
          recipientEmail={students.find((s) => s.id === letterModal.studentId)?.user?.email}
          recipientPhone={students.find((s) => s.id === letterModal.studentId)?.user?.phone}
        />
      )}

      {/* Confirmation Modals */}
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

      {/* Edit Student Modal */}
      {modal.type === 'edit' && modal.student && (
        <EditStudentModal
          student={modal.student}
          isOpen={true}
          onClose={() => setModal({ type: null })}
          onSave={handleEditStudent}
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
