'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, Loader } from 'lucide-react';

interface StudentDetail {
  id: string;
  full_name: string;
  admission_number: string;
  email: string;
  phone?: string;
  class_name?: string;
  status: string;
  is_locked: boolean;
  date_of_birth?: string;
  photo_url?: string;
}

interface Subject {
  id: string;
  name: string;
  code?: string;
}

interface StudentDetailsModalProps {
  isOpen: boolean;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  termId?: string;
  onClose: () => void;
}

export default function StudentDetailsModal({
  isOpen,
  studentId,
  studentName,
  admissionNumber,
  termId,
  onClose,
}: StudentDetailsModalProps) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && studentId) {
      loadStudentDetails();
    }
  }, [isOpen, studentId]);

  const loadStudentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Modal] Loading student details for:', studentId);

      // Fetch student basic info
      const response = await fetch(`/api/school/students/${studentId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.data) {
        throw new Error('No student data returned');
      }
      
      console.log('[Modal] ✅ Student loaded:', result.data);
      setStudent(result.data);

      // Fetch student's subjects
      try {
        const subjectsResponse = await fetch(
          `/api/students/${studentId}/subjects`
        );
        if (subjectsResponse.ok) {
          const subjectsResult = await subjectsResponse.json();
          setSubjects(subjectsResult.data || []);
          console.log('[Modal] Subjects loaded:', subjectsResult.data?.length || 0);
        }
      } catch (err) {
        console.warn('[Modal] Could not load subjects:', err);
      }
    } catch (err: any) {
      console.error('[Modal] Error loading student details:', err);
      setError(err.message || 'Failed to load student details');
      setStudent(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex justify-between items-center p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div>
            <h2 className="text-2xl font-bold">{studentName}</h2>
            <p className="text-blue-100 text-sm">Admission: {admissionNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-blue-700 rounded-lg transition"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
              <p className="text-gray-600">Loading student details...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 font-semibold">Error Loading Details</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && student && (
            <div className="space-y-6">
              {/* Photo and Basic Info */}
              <div className="flex gap-6">
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.full_name}
                    className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                    {student.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {student.full_name}
                  </h3>
                  <div className="space-y-2">
                    <p className="text-gray-700">
                      <span className="font-semibold">Admission:</span> {student.admission_number}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Email:</span> {student.email || 'N/A'}
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">Phone:</span> {student.phone || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-semibold">Status</p>
                  <p className="text-lg font-bold text-gray-900">{student.status}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-semibold">Class</p>
                  <p className="text-lg font-bold text-gray-900">
                    {student.class_name || 'Not Assigned'}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-semibold">Date of Birth</p>
                  <p className="text-lg font-bold text-gray-900">
                    {student.date_of_birth
                      ? new Date(student.date_of_birth).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-semibold">Account Status</p>
                  <p className={`text-lg font-bold ${
                    student.is_locked
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}>
                    {student.is_locked ? '🔒 Locked' : '✓ Active'}
                  </p>
                </div>
              </div>

              {/* Subjects Section */}
              {subjects.length > 0 && (
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-3">📚 Enrolled Subjects</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subjects.map((subject) => (
                      <div
                        key={subject.id}
                        className="bg-green-50 border border-green-200 p-3 rounded-lg hover:bg-green-100 transition"
                      >
                        <p className="font-semibold text-gray-900">{subject.name}</p>
                        {subject.code && (
                          <p className="text-sm text-gray-600">{subject.code}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  ✓ Student information and subjects loaded successfully.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && !student && (
            <div className="text-center py-8">
              <p className="text-gray-600">No data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

