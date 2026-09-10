/**
 * Super Admin Deletion Requests Page
 * Lists pending deletion requests from teachers
 * Allows approval/rejection with audit trail
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { toast } from 'react-hot-toast';

let supabase: any = null;

function getSupabaseClient() {
  if (!supabase) {
    supabase = createClient();
  }
  return supabase;
}

interface DeletionRequest {
  id: string;
  school_id: string;
  student_id: string;
  initiated_by: string;
  reason: string;
  request_type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  expires_at: string;
  rejection_reason?: string;
  student: {
    user: {
      full_name: string;
      email: string;
    };
  };
  initiated_user: {
    full_name: string;
    email: string;
    role: string;
  };
  school: {
    name: string;
  };
}

const StatusBadge: React.FC<{ status: DeletionRequest['status'] }> = ({ status }) => {
  const variants: Record<DeletionRequest['status'], string> = {
    PENDING: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-purple-100 text-purple-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
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
  input?: string;
  inputLabel?: string;
  onInputChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDangerous?: boolean;
}> = ({
  title,
  message,
  input,
  inputLabel,
  onInputChange,
  onConfirm,
  onCancel,
  isLoading = false,
  isDangerous = false,
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{message}</p>
      {inputLabel && (
        <textarea
          placeholder={inputLabel}
          value={input || ''}
          onChange={(e) => onInputChange?.(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      )}
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

const DeletionRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<DeletionRequest['status'] | 'ALL'>('ALL');
  const [modal, setModal] = useState<{
    type: 'approve' | 'reject' | null;
    request?: DeletionRequest;
  }>({ type: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Fetch deletion requests
  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await getSupabaseClient()
        .from('deletion_requests')
        .select(`
          id,
          school_id,
          student_id,
          initiated_by,
          reason,
          request_type,
          status,
          created_at,
          expires_at,
          rejection_reason,
          student:student_id (
            user:user_id (
              full_name,
              email
            )
          ),
          initiated_user:initiated_by (
            full_name,
            email,
            role
          ),
          school:school_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to load deletion requests');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Filter requests
  const filteredRequests = requests.filter(
    req => filterStatus === 'ALL' || req.status === filterStatus
  );

  // Approve request
  const handleApprove = async (requestId: string) => {
    try {
      setIsActionLoading(true);
      const response = await fetch(`/api/superadmin/deletion-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to approve request');

      setRequests(requests.map(r =>
        r.id === requestId ? { ...r, status: 'APPROVED' as const } : r
      ));
      toast.success('Deletion request approved');
      setModal({ type: null });
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve deletion request');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Reject request
  const handleReject = async (requestId: string) => {
    try {
      setIsActionLoading(true);
      const response = await fetch(`/api/superadmin/deletion-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejection_reason: rejectionReason }),
      });

      if (!response.ok) throw new Error('Failed to reject request');

      setRequests(requests.map(r =>
        r.id === requestId ? { ...r, status: 'REJECTED' as const, rejection_reason: rejectionReason } : r
      ));
      toast.success('Deletion request rejected');
      setRejectionReason('');
      setModal({ type: null });
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject deletion request');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Deletion Requests</h2>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as DeletionRequest['status'] | 'ALL')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Requests Table */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading deletion requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          No deletion requests found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4">Student</th>
                <th className="text-left py-3 px-4">School</th>
                <th className="text-left py-3 px-4">Requested By</th>
                <th className="text-left py-3 px-4">Reason</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-center py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => (
                <tr key={req.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold">{req.student.user.full_name}</p>
                      <p className="text-sm text-gray-600">{req.student.user.email}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm">{req.school.name}</td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-semibold text-sm">{req.initiated_user.full_name}</p>
                      <p className="text-xs text-gray-600">{req.initiated_user.role}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm max-w-xs truncate">{req.reason}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="py-3 px-4 text-sm">{formatDate(req.created_at)}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex gap-2 justify-center flex-wrap">
                      {req.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => setModal({ type: 'approve', request: req })}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setModal({ type: 'reject', request: req })}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {req.status === 'REJECTED' && req.rejection_reason && (
                        <button
                          onClick={() => alert(`Reason: ${req.rejection_reason}`)}
                          className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                        >
                          View Reason
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approval Modal */}
      {modal.type === 'approve' && modal.request && (
        <ConfirmationModal
          title="Approve Deletion Request"
          message={`Approve deletion of student "${modal.request.student.user.full_name}"? This action cannot be undone. All student data will be permanently deleted.`}
          onConfirm={() => handleApprove(modal.request!.id)}
          onCancel={() => setModal({ type: null })}
          isLoading={isActionLoading}
          isDangerous
        />
      )}

      {/* Rejection Modal */}
      {modal.type === 'reject' && modal.request && (
        <ConfirmationModal
          title="Reject Deletion Request"
          message={`Reject deletion request for "${modal.request.student.user.full_name}"? Provide a reason for rejection.`}
          input={rejectionReason}
          inputLabel="Reason for rejection (optional)"
          onInputChange={setRejectionReason}
          onConfirm={() => handleReject(modal.request!.id)}
          onCancel={() => {
            setModal({ type: null });
            setRejectionReason('');
          }}
          isLoading={isActionLoading}
        />
      )}
    </div>
  );
};

export default DeletionRequestsPage;
