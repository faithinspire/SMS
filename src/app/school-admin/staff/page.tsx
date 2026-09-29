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

const StaffPage: React.FC = () => {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusType | 'ALL'>('ALL');
  const [schoolId, setSchoolId] = useState<string>('');
  const [modal, setModal] = useState<{
    type: 'pause' | 'activate' | 'inactive' | 'delete' | null;
    staff?: StaffMember;
  }>({ type: null });
  const [isActionLoading, setIsActionLoading] = useState(false);

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
          setSchoolId(userProfile.school_id);
        }
      } catch (error) {
        console.error('Error getting school:', error);
      }
    };

    getCurrentSchool();
  }, []);

  // Fetch staff - COMPLETE FIX: Query both users and staff tables with proper error handling
  const fetchStaff = useCallback(async () => {
    if (!schoolId) return;

    try {
      setIsLoading(true);
      console.log('[Staff Page] Fetching staff for school:', schoolId);

      // STEP 1: Get all STAFF users from users table
      const { data: userStaffData, error: userError } = await getSupabaseClient()
        .from('users')
        .select('*')
        .eq('school_id', schoolId)
        .eq('role', 'STAFF');

      if (userError) {
        console.error('[Staff] Users query error:', userError);
        throw userError;
      }

      console.log('[Staff Page] Found users with STAFF role:', userStaffData?.length);

      // STEP 2: Get staff employment records (optional supplementary data)
      const { data: staffRecords, error: staffError } = await getSupabaseClient()
        .from('staff')
        .select('*')
        .eq('school_id', schoolId);

      if (staffError) {
        console.warn('[Staff] Staff records query (optional) failed:', staffError);
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
      setStaff(sortedData);

      if (sortedData.length === 0) {
        toast.info('No staff found for this school');
      }
    } catch (error) {
      console.error('[Staff Page] Critical error:', error);
      toast.error('Failed to load staff: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      fetchStaff();
    }
  }, [schoolId, fetchStaff]);

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

  // Generate Appointment Letter
  const generateAppointmentLetter = async (member: StaffMember) => {
    try {
      toast.loading('Generating appointment letter...', { id: 'letter' })

      // Get school data
      const { data: schoolData } = await getSupabaseClient()
        .from('schools')
        .select('*')
        .eq('id', schoolId)
        .single()

      if (!schoolData) {
        toast.error('School information not found')
        return
      }

      // Generate the letter HTML
      const letterHTML = await LetterGenerationService.generateAppointmentLetter(
        {
          id: member.id,
          full_name: member.user.full_name,
          email: member.user.email,
          position: member.position || 'Staff Member',
          department: 'Department',
          salary: 0,
          employment_date: member.employment_date,
          qualification: 'Qualification',
        },
        {
          id: schoolData.id,
          name: schoolData.name,
          email: schoolData.email,
          phone: schoolData.phone,
          address: schoolData.address,
          logo_url: schoolData.logo_url,
        }
      )

      // Open in new window for preview and printing
      await LetterGenerationService.previewLetter(letterHTML)

      toast.success('Appointment letter generated!', { id: 'letter' })
    } catch (error) {
      console.error('Error generating letter:', error)
      toast.error('Failed to generate appointment letter', { id: 'letter' })
    }
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
                        onClick={() => router.push(`/school-admin/staff/${member.id}`)}
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
    </div>
  );
};

export default StaffPage;
