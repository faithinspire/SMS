/**
 * School Admin Staff Management Page
 * Lists all staff with filters, pause/activate/delete actions
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { LetterGenerationService } from '@/services/letter-generation.service';
import { LetterPreviewModal } from '@/components/admin/LetterPreviewModal';

let supabase: any = null;

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient();
  }
  return supabase;
}

interface StaffMember {
  id: string;
  user_id: string;
  school_id: string;
  position: string;
  employment_date: string;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED';
  department?: string;
  salary?: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    photo_url: string | null;
    role: string;
    status: string;
  };
}

type StatusType = 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED';

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

interface CompletedStaffEditModalProps {
  staff: StaffMember;
  isOpen: boolean;
  onClose: () => void;
  onSave: (staffId: string, updates: Partial<StaffMember>) => Promise<void>;
  isLoading?: boolean;
  schoolId: string;
}

/**
 * Complete Staff Profile Editor Modal
 * Sections: Personal, Contact, Employment, Academic, Class Assignment, Subject Assignment, Salary, Account
 * Built from Staff Registration Service structure to ensure consistency
 */
const StaffEditModal: React.FC<CompletedStaffEditModalProps> = ({
  staff,
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  schoolId,
}) => {
  const [formData, setFormData] = useState(staff);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedClassArm, setSelectedClassArm] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  useEffect(() => {
    setFormData(staff);
    setSelectedClassArm('');
    setSelectedSubjects([]);
  }, [staff]);

  // Load sessions, classes, and subjects on mount
  useEffect(() => {
    if (isOpen && schoolId) {
      loadLookupData();
    }
  }, [isOpen, schoolId]);

  const loadLookupData = async () => {
    try {
      setLoadingLookups(true);

      const supabaseClient = getSupabaseClient();

      // Load sessions
      const { data: sessionsData } = await supabaseClient
        .from('academic_sessions')
        .select('id, session_year')
        .eq('school_id', schoolId)
        .order('start_year', { ascending: false });

      setSessions(sessionsData || []);

      // Load classes
      const { data: classesData } = await supabaseClient
        .from('class_arm_combos')
        .select('id, classes(name), arms(name)')
        .eq('school_id', schoolId);

      setClasses(classesData || []);

      // Load subjects
      const { data: subjectsData } = await supabaseClient
        .from('subjects')
        .select('id, name')
        .eq('school_id', schoolId)
        .order('name', { ascending: true });

      setSubjects(subjectsData || []);
    } catch (error) {
      console.error('[StaffEditModal] Error loading lookup data:', error);
    } finally {
      setLoadingLookups(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(staff.id, formData);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 border-b border-blue-800">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            ✏️ Complete Staff Profile Editor
          </h3>
          <p className="text-blue-100 text-sm mt-1">Update all staff information and assignments</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* A. PERSONAL INFORMATION */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              👤 A. Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Gender</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nationality</label>
                <input
                  type="text"
                  placeholder="e.g., Nigerian"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">State of Origin</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">LGA</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* B. CONTACT INFORMATION */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📱 B. Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">State</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* C. EMPLOYMENT INFORMATION */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              💼 C. Employment Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Staff ID</label>
                <input
                  type="text"
                  value={staff.id}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Position *</label>
                <input
                  type="text"
                  value={formData.position || ''}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g., Mathematics Teacher"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Academic"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Employment Date</label>
                <input
                  type="date"
                  value={formData.employment_date ? formData.employment_date.split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, employment_date: e.target.value })}
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
                  <option value="PAUSED">Paused</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  value={formData.user.role}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed capitalize"
                />
              </div>
            </div>
          </div>

          {/* E. CLASS ASSIGNMENT (for Teachers) */}
          {['TEACHER', 'HEAD_TEACHER'].includes(formData.user.role) && (
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📚 E. Class Assignment
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Assigned Class</label>
                  <select
                    value={selectedClassArm}
                    onChange={(e) => setSelectedClassArm(e.target.value)}
                    disabled={loadingLookups}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">Select class...</option>
                    {classes.map((cls: any) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.classes?.name} {cls.arms?.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Class Teacher?</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* F. SUBJECT ASSIGNMENT (for Teachers) */}
          {['TEACHER', 'HEAD_TEACHER'].includes(formData.user.role) && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                📖 F. Subject Assignment
              </h4>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Subjects</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-white">
                  {loadingLookups ? (
                    <p className="text-gray-600">Loading subjects...</p>
                  ) : subjects.length === 0 ? (
                    <p className="text-gray-600">No subjects available</p>
                  ) : (
                    subjects.map((subject: any) => (
                      <label key={subject.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedSubjects.includes(subject.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubjects([...selectedSubjects, subject.id]);
                            } else {
                              setSelectedSubjects(selectedSubjects.filter((s) => s !== subject.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{subject.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* G. SALARY & BANK INFORMATION */}
          <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              💰 G. Salary & Bank Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Salary Amount</label>
                <input
                  type="number"
                  value={formData.salary || ''}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Enter salary amount"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="e.g., First Bank"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  value={formData.account_name || ''}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="Name on account"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.account_number || ''}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Bank account number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* H. ACCOUNT INFORMATION (Read-only) */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🔐 H. Account Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">User ID</label>
                <input
                  type="text"
                  value={staff.user_id}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Account Status</label>
                <input
                  type="text"
                  value={formData.user.status}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed capitalize"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span> Saving...
                </>
              ) : (
                <>
                  ✓ Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const StaffPage: React.FC = () => {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusType | 'ALL'>('ALL');
  const [schoolId, setSchoolId] = useState<string>('');
  const [modal, setModal] = useState<{
    type: 'edit' | 'pause' | 'activate' | 'inactive' | 'delete' | null;
    staff?: StaffMember;
  }>({ type: null });
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [letterModal, setLetterModal] = useState<{
    isOpen: boolean;
    staffId?: string;
  }>({ isOpen: false });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch staff with abort controller to prevent race conditions
  const fetchStaff = useCallback(async (school: string) => {
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
      console.log('[Staff Page] Fetching staff for school:', school);

      // Call the API endpoint instead of direct database query
      const response = await fetch(`/api/school/staff?schoolId=${school}`, {
        signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!signal.aborted) {
        setStaff(result.data || []);
        console.log('[Staff Page] Staff set in state:', result.data?.length || 0);
      }
    } catch (error) {
      if (signal.aborted) {
        console.log('[Staff Page] Request was cancelled');
        return;
      }

      console.error('[Staff Page] Critical error fetching staff:', error);
      let errorMsg = 'Failed to load staff';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMsg = 'Staff data is taking too long to load. Try again in a moment.';
        } else if (error.message.includes('cancelled')) {
          return;
        } else {
          errorMsg = error.message;
        }
      }
      toast.error(errorMsg);
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get current user's school
  useEffect(() => {
    const getCurrentSchool = async () => {
      try {
        const { data: { user } } = await getSupabaseClient().auth.getUser();
        if (!user) {
          console.log('[Staff Page] No authenticated user');
          return;
        }

        console.log('[Staff Page] Authenticated user:', user.id);

        // ✅ HOTFIX: Removed .single() to avoid PGRST116 when record doesn't exist
        const { data: userProfile, error } = await getSupabaseClient()
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('[Staff Page] Error getting user profile:', error);
          toast.error('Failed to load your school information');
          return;
        }

        if (userProfile && userProfile.school_id) {
          console.log('[Staff Page] Setting schoolId:', userProfile.school_id);
          setSchoolId(userProfile.school_id);
        } else {
          console.warn('[Staff Page] No school_id in user profile - user record may not exist yet');
          toast.error('Your account is not linked to a school');
        }
      } catch (error) {
        console.error('[Staff Page] Error getting school:', error);
        toast.error('Failed to load school information');
      }
    };

    getCurrentSchool();
  }, []);

  // Fetch staff when schoolId changes
  useEffect(() => {
    if (!schoolId) {
      console.log('[Staff Page] No schoolId, skipping fetch');
      setIsLoading(false);
      return;
    }

    console.log('[Staff Page] Effect triggered for schoolId:', schoolId);
    fetchStaff(schoolId);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [schoolId]);

  // Filter staff
  const filteredStaff = staff.filter(member => {
    const matchesSearch =
      member.user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || member.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Update staff status
  const handleStatusChange = async (staffId: string, newStatus: StatusType) => {
    try {
      setIsActionLoading(true);
      const response = await fetch(`/api/school-admin/staff/${staffId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setStaff(staff.map(s =>
        s.id === staffId ? { ...s, status: newStatus } : s
      ));
      toast.success(`Staff member ${newStatus.toLowerCase()}`);
      setModal({ type: null });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update staff status');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Update staff profile
  const handleEditSave = async (staffId: string, updates: Partial<StaffMember>) => {
    try {
      setIsActionLoading(true);
      
      // Update user data
      const { error: userError } = await getSupabaseClient()
        .from('users')
        .update({
          full_name: updates.user?.full_name,
          email: updates.user?.email,
        })
        .eq('id', updates.user_id);

      if (userError) throw userError;

      // Update staff data if position/employment_date changed
      if (updates.position || updates.employment_date) {
        const { error: staffError } = await getSupabaseClient()
          .from('staff')
          .update({
            position: updates.position,
            employment_date: updates.employment_date,
          })
          .eq('id', staffId);

        if (staffError) throw staffError;
      }

      setStaff(staff.map(s =>
        s.id === staffId ? { ...s, ...updates } : s
      ));
      toast.success('Staff member updated successfully');
      setModal({ type: null });
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error('Failed to update staff member');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete staff
  const handleDelete = async (staffId: string) => {
    try {
      setIsActionLoading(true);
      
      // Get the Supabase session token
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/school-admin/staff/${staffId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete staff');
      }

      setStaff(staff.filter(s => s.id !== staffId));
      toast.success('Staff member deleted successfully');
      setModal({ type: null });
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete staff member');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Generate Appointment Letter - Open in modal
  const generateAppointmentLetter = (member: StaffMember) => {
    setLetterModal({
      isOpen: true,
      staffId: member.id,
    })
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Staff Management</h2>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/auth/staff/register')}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2 transition-colors"
        >
          ➕ Register New Staff
        </button>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          placeholder="Search by name, email, or position..."
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
        <div className="text-sm text-gray-600 flex items-center">
          Total: {filteredStaff.length} staff members
        </div>
      </div>

      {/* Staff Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading staff...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          No staff found. Try adjusting your search or filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4">Photo</th>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Position</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => (
                <tr key={member.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {member.user.photo_url ? (
                      <div className="relative w-10 h-10">
                        <Image
                          src={member.user.photo_url}
                          alt={member.user.full_name}
                          fill
                          className="rounded-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">
                        {member.user.full_name[0]}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold">{member.user.full_name}</td>
                  <td className="py-3 px-4 text-sm">{member.user.email}</td>
                  <td className="py-3 px-4 text-sm">{member.position || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm capitalize">{member.user.role}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex gap-2 justify-center flex-wrap">
                      <button
                        onClick={() => setModal({ type: 'edit', staff: member })}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        title="Edit Staff Profile"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => generateAppointmentLetter(member)}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        title="Generate Appointment Letter"
                      >
                        📄 Letter
                      </button>
                      {member.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setModal({ type: 'pause', staff: member })}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        >
                          Pause
                        </button>
                      ) : member.status !== 'SUSPENDED' ? (
                        <button
                          onClick={() => setModal({ type: 'activate', staff: member })}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Activate
                        </button>
                      ) : null}
                      <button
                        onClick={() => setModal({ type: 'delete', staff: member })}
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
      {modal.type === 'edit' && modal.staff && (
        <StaffEditModal
          staff={modal.staff}
          isOpen={true}
          onClose={() => setModal({ type: null })}
          onSave={(staffId, updates) => handleEditSave(staffId, updates)}
          isLoading={isActionLoading}
          schoolId={schoolId}
        />
      )}

      {modal.type === 'pause' && modal.staff && (
        <ConfirmationModal
          title="Pause Staff Member"
          message={`Pause "${modal.staff.user.full_name}"? They will not be able to access the system.`}
          onConfirm={() => handleStatusChange(modal.staff!.id, 'PAUSED')}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
        />
      )}

      {modal.type === 'activate' && modal.staff && (
        <ConfirmationModal
          title="Activate Staff Member"
          message={`Activate "${modal.staff.user.full_name}"? They will regain access to the system.`}
          onConfirm={() => handleStatusChange(modal.staff!.id, 'ACTIVE')}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
        />
      )}

      {modal.type === 'delete' && modal.staff && (
        <ConfirmationModal
          title="Delete Staff Member"
          message={`Delete "${modal.staff.user.full_name}"? This action cannot be undone.`}
          onConfirm={() => handleDelete(modal.staff!.id)}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
          isDangerous
        />
      )}

      {/* Letter Preview Modal */}
      {letterModal.isOpen && letterModal.staffId && (
        <LetterPreviewModal
          isOpen={letterModal.isOpen}
          onClose={() => setLetterModal({ isOpen: false })}
          letterType="appointment"
          recipientId={letterModal.staffId}
          schoolId={schoolId}
          recipientEmail={staff.find((s) => s.id === letterModal.staffId)?.user?.email}
          recipientPhone={staff.find((s) => s.id === letterModal.staffId)?.user?.phone || ''}
        />
      )}
    </div>
  );
};

export default StaffPage;
