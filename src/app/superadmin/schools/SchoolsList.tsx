/**
 * Super Admin Schools Management Component
 * Lists all schools with status display, pause/activate/delete actions
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

interface School {
  id: string;
  name: string;
  type: string;
  email: string;
  phone: string;
  address: string;
  logo_url: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'SUSPENDED';
  subscription_plan: string;
  created_at: string;
  updated_at: string;
}

type StatusBadgeVariant = 'ACTIVE' | 'PAUSED' | 'SUSPENDED';

const StatusBadge: React.FC<{ status: StatusBadgeVariant }> = ({ status }) => {
  const variants: Record<StatusBadgeVariant, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
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

const SchoolsList: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusBadgeVariant | 'ALL'>('ALL');
  const [modal, setModal] = useState<{
    type: 'pause' | 'activate' | 'delete' | 'share' | null;
    school?: School;
  }>({ type: null });
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [shareEmail, setShareEmail] = useState('');

  // Fetch schools
  const fetchSchools = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
      toast.error('Failed to load schools');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  // Filter schools
  const filteredSchools = schools.filter(school => {
    const matchesSearch = 
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || school.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Change school status
  const handleStatusChange = async (schoolId: string, newStatus: 'ACTIVE' | 'PAUSED') => {
    try {
      setIsActionLoading(true);
      const response = await fetch(`/api/superadmin/schools/${schoolId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      setSchools(schools.map(s =>
        s.id === schoolId ? { ...s, status: newStatus } : s
      ));
      toast.success(`School ${newStatus.toLowerCase()}`);
      setModal({ type: null });
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update school status');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Delete school
  const handleDelete = async (schoolId: string) => {
    try {
      setIsActionLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`/api/superadmin/schools/${schoolId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to delete school');

      setSchools(schools.filter(s => s.id !== schoolId));
      toast.success('School deleted successfully');
      setModal({ type: null });
    } catch (error) {
      console.error('Error deleting school:', error);
      toast.error('Failed to delete school');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Share credentials
  const handleShareCredentials = async () => {
    if (!shareEmail || !modal.school) return;

    try {
      setIsActionLoading(true);
      const response = await fetch('/api/schools/share-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: modal.school.id,
          recipient_email: shareEmail,
        }),
      });

      if (!response.ok) throw new Error('Failed to share credentials');

      toast.success(`Credentials sent to ${shareEmail}`);
      setShareEmail('');
      setModal({ type: null });
    } catch (error) {
      console.error('Error sharing credentials:', error);
      toast.error('Failed to share credentials');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Schools Management</h2>

      {/* Search and Filter */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as StatusBadgeVariant | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Schools Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading schools...</p>
        </div>
      ) : filteredSchools.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          No schools found. Try adjusting your search or filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4">Logo</th>
                <th className="text-left py-3 px-4">School Name</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Plan</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchools.map((school) => (
                <tr key={school.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {school.logo_url ? (
                      <div className="relative w-10 h-10">
                        <Image
                          src={school.logo_url}
                          alt={school.name}
                          fill
                          className="rounded object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded flex items-center justify-center text-gray-600">
                        N/A
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold">{school.name}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{school.type}</td>
                  <td className="py-3 px-4 text-sm">{school.email || 'N/A'}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={school.status as StatusBadgeVariant} />
                  </td>
                  <td className="py-3 px-4 text-sm capitalize">{school.subscription_plan}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex gap-2 justify-center flex-wrap">
                      {school.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setModal({ type: 'pause', school })}
                          className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                        >
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => setModal({ type: 'activate', school })}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => setModal({ type: 'share', school })}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                      >
                        Share
                      </button>
                      <button
                        onClick={() => setModal({ type: 'delete', school })}
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

      {/* Confirmation Modals */}
      {modal.type === 'pause' && modal.school && (
        <ConfirmationModal
          title="Pause School"
          message={`Are you sure you want to pause "${modal.school.name}"? Users will not be able to access the system.`}
          onConfirm={() => handleStatusChange(modal.school!.id, 'PAUSED')}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
        />
      )}

      {modal.type === 'activate' && modal.school && (
        <ConfirmationModal
          title="Activate School"
          message={`Activate "${modal.school.name}"? Users will regain access to the system.`}
          onConfirm={() => handleStatusChange(modal.school!.id, 'ACTIVE')}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
        />
      )}

      {modal.type === 'delete' && modal.school && (
        <ConfirmationModal
          title="Delete School"
          message={`This will permanently delete "${modal.school.name}" and all associated data. This action cannot be undone.`}
          onConfirm={() => handleDelete(modal.school!.id)}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
          isDangerous
        />
      )}

      {/* Share Credentials Modal */}
      {modal.type === 'share' && modal.school && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
            <h3 className="text-lg font-bold mb-4">Share Credentials</h3>
            <p className="text-gray-600 mb-4">Send login credentials for "{modal.school.name}"</p>
            <input
              type="email"
              placeholder="Recipient email address"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setModal({ type: null });
                  setShareEmail('');
                }}
                disabled={isActionLoading}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleShareCredentials}
                disabled={isActionLoading || !shareEmail}
                className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isActionLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolsList;
