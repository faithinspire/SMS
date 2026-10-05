/**
 * School Admin Staff Management Page
 * Lists all staff with edit modal matching student modal structure
 * Features: Real-time data, edit modal with personal/contact/employment/assignment sections
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { LetterGenerationService } from '@/services/letter-generation.service';
import { LetterPreviewModal } from '@/components/admin/LetterPreviewModal';

const supabase = createClient();

interface StaffMember {
  id: string;
  user_id: string;
  school_id: string;
  position: string;
  employment_date: string;
  department?: string;
  salary?: number;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE' | 'SUSPENDED';
  user: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    photo_url: string | null;
    role: string;
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

// ✅ STAFF EDIT MODAL - MATCHING STUDENT EDIT STRUCTURE
const EditStaffModal: React.FC<{
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 border-b border-purple-800">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            ✏️ Edit Staff Member
          </h3>
          <p className="text-purple-100 text-sm mt-1">Update staff information</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Personal Information Section */}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  value={formData.user.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      user: { ...formData.user, role: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              📞 Contact Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.user.phone || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      user: { ...formData.user, phone: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Employment Information Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              💼 Employment Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Employment Date</label>
                <input
                  type="date"
                  value={formData.employment_date}
                  onChange={(e) => setFormData({ ...formData, employment_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PAUSED">Paused</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Salary & Bank Information Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              🏦 Salary & Bank Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Salary</label>
                <input
                  type="number"
                  value={formData.salary || ''}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bank_name || ''}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.account_number || ''}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  value={formData.account_name || ''}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
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
              className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
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
    type: 'pause' | 'activate' | 'delete' | 'edit' | null;
    staffMember?: StaffMember;
  }>({ type: null });
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [letterModal, setLetterModal] = useState<{
    isOpen: boolean;
    staffId?: string;
  }>({ isOpen: false });

  // Get current user's school
  useEffect(() => {
    const getCurrentSchool = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userProfile, error } = await supabase
          .from('users')
          .select('school_id')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error getting user profile:', error);
          toast.error('Failed to load your school information');
          return;
        }

        if (userProfile && userProfile.school_id) {
          setSchoolId(userProfile.school_id);
        } else {
          toast.error('Your account is not linked to a school');
        }
      } catch (error) {
        console.error('Error getting school:', error);
        toast.error('Failed to load school information');
      }
    };

    getCurrentSchool();
  }, []);

  // Fetch staff from Supabase
  useEffect(() => {
    const fetchStaff = async () => {
      if (!schoolId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('staff')
          .select(`
            id,
            user_id,
            school_id,
            position,
            employment_date,
            department,
            salary,
            bank_name,
            account_number,
            account_name,
            status,
            user:user_id (
              id,
              full_name,
              email,
              phone,
              photo_url,
              role
            )
          `)
          .eq('school_id', schoolId)
          .eq('status', 'ACTIVE')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setStaff(data || []);
      } catch (error) {
        console.error('Error fetching staff:', error);
        toast.error('Failed to load staff');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStaff();
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

  // Handle edit
  const handleEditStaff = async (updates: Partial<StaffMember>) => {
    if (!modal.staffMember) return;
    try {
      setIsActionLoading(true);
      setStaff(staff.map(s =>
        s.id === modal.staffMember!.id
          ? { ...s, ...updates, user: { ...s.user, ...updates.user } }
          : s
      ));
      toast.success('Staff updated successfully');
      setModal({ type: null });
    } catch (error) {
      console.error('Error updating staff:', error);
      toast.error('Failed to update staff');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle letter generation
  const generateStaffLetter = async (staffMember: StaffMember) => {
    setLetterModal({
      isOpen: true,
      staffId: staffMember.id,
    });
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
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusType | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading staff...</p>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No staff members found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="px-6 py-3 text-left font-bold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left font-bold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left font-bold text-gray-700">Position</th>
                <th className="px-6 py-3 text-left font-bold text-gray-700">Role</th>
                <th className="px-6 py-3 text-left font-bold text-gray-700">Status</th>
                <th className="px-6 py-3 text-center font-bold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredStaff.map((member, idx) => (
                <tr key={member.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 font-semibold text-gray-700">{member.user.full_name}</td>
                  <td className="px-6 py-4 text-gray-700">{member.user.email}</td>
                  <td className="px-6 py-4 text-gray-700">{member.position}</td>
                  <td className="px-6 py-4 text-gray-700">{member.user.role}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setModal({ type: 'edit', staffMember: member })}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => generateStaffLetter(member)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Letter
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {modal.type === 'edit' && modal.staffMember && (
        <EditStaffModal
          staff={modal.staffMember}
          isOpen={true}
          onClose={() => setModal({ type: null })}
          onSave={handleEditStaff}
          isLoading={isActionLoading}
        />
      )}

      {/* Letter Preview Modal */}
      {letterModal.isOpen && letterModal.staffId && (
        <LetterPreviewModal
          isOpen={true}
          onClose={() => setLetterModal({ isOpen: false })}
          staffId={letterModal.staffId}
        />
      )}

      {/* Confirmation Modals */}
      {modal.type && ['pause', 'activate', 'delete'].includes(modal.type) && modal.staffMember && (
        <ConfirmationModal
          title={
            modal.type === 'pause' ? 'Pause Staff' :
            modal.type === 'activate' ? 'Activate Staff' :
            'Delete Staff'
          }
          message={
            modal.type === 'pause' ? `Pause ${modal.staffMember.user.full_name}?` :
            modal.type === 'activate' ? `Activate ${modal.staffMember.user.full_name}?` :
            `Delete ${modal.staffMember.user.full_name}? This cannot be undone.`
          }
          onConfirm={() => {
            // Handle confirmation
            setModal({ type: null });
          }}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
          isDangerous={modal.type === 'delete'}
        />
      )}
    </div>
  );
};

export default StaffPage;
