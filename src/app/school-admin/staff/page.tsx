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

const EditModal: React.FC<{
  staff: StaffMember;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<StaffMember>) => Promise<void>;
  isLoading?: boolean;
}> = ({ staff, isOpen, onClose, onSave, isLoading = false }) => {
  const [formData, setFormData] = useState(staff);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData(staff);
  }, [staff]);

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">Edit Staff Member</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Position</label>
            <input
              type="text"
              value={formData.position || ''}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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
          <div className="flex gap-3 justify-end pt-4">
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
              disabled={isSubmitting || isLoading}
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
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

      // Add 15 second timeout for queries
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Staff query timeout after 15s')), 15000)
      );

      const queryPromise = (async (): Promise<StaffMember[]> => {
        // STEP 1: Get all STAFF users from users table
        const { data: userStaffData, error: userError } = await getSupabaseClient()
          .from('users')
          .select('*')
          .eq('school_id', school)
          .in('role', ['TEACHER', 'HEAD_TEACHER', 'PRINCIPAL', 'ACCOUNTANT', 'STAFF']);

        if (signal.aborted) throw new Error('Request was cancelled');
        if (userError) {
          console.error('[Staff Page] User query error:', userError);
          throw userError;
        }
        console.log('[Staff Page] Found users with STAFF role:', userStaffData?.length);

        // STEP 2: Get staff employment records (optional supplementary data)
        const { data: staffRecords, error: staffError } = await getSupabaseClient()
          .from('staff')
          .select('*')
          .eq('school_id', school);

        if (signal.aborted) throw new Error('Request was cancelled');
        if (staffError) {
          console.error('[Staff Page] Staff records query error:', staffError);
          // Non-fatal error - proceed with users only
        }
        console.log('[Staff Page] Found staff records:', staffRecords?.length);

        // STEP 3: Merge data - users table is source of truth, staff table augments
        const mergedStaff = (userStaffData || []).map((user: any) => {
          const staffRecord = staffRecords?.find((s: any) => s.user_id === user.id);
          return {
            id: staffRecord?.id || `staff_${user.id}`,
            user_id: user.id,
            school_id: user.school_id,
            position: staffRecord?.position || 'Staff',
            employment_date: staffRecord?.employment_date || null,
            status: staffRecord?.status || 'ACTIVE',
            user: {
              id: user.id,
              full_name: user.full_name || 'Unknown Staff',
              email: user.email || 'no-email@school.local',
              photo_url: user.photo_url,
              role: user.role,
              status: user.status,
            },
          };
        });

        // STEP 4: Sort in application layer
        const sortedData = mergedStaff.sort((a, b) =>
          (a.user?.full_name || '').localeCompare(b.user?.full_name || '')
        );

        console.log('[Staff Page] Final merged staff count:', sortedData.length);
        return sortedData;
      })();

      // Race between query and timeout
      const staffData = await Promise.race([queryPromise, timeoutPromise]);
      
      if (!signal.aborted) {
        setStaff(staffData);
        console.log('[Staff Page] Staff set in state:', staffData.length);
        if (staffData.length === 0) {
          console.warn('[Staff Page] No staff found - database may be empty for this school');
        }
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
      // CRITICAL: Always set loading to false, regardless of abort status
      setIsLoading(false);
    }
  }, []);

  // Get current user's school
  useEffect(() => {
    const getCurrentSchool = async () => {
      try {
        const { data: { user } } = await getSupabaseClient().auth.getUser();
        if (!user) return;

        const { data: userProfile } = await getSupabaseClient()
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .single();

        if (userProfile) {
          console.log('[Staff Page] Setting schoolId:', userProfile.school_id);
          setSchoolId(userProfile.school_id);
        }
      } catch (error) {
        console.error('[Staff Page] Error getting school:', error);
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
        <EditModal
          staff={modal.staff}
          isOpen={true}
          onClose={() => setModal({ type: null })}
          onSave={(updates) => handleEditSave(modal.staff!.id, updates)}
          isLoading={isActionLoading}
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
