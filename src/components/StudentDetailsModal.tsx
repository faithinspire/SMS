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

interface SubjectScore {
  subject_name: string;
  ca1?: number;
  ca2?: number;
  ca3?: number;
  ca4?: number;
  exam?: number;
  total?: number;
  grade?: string;
  remark?: string;
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
  const [scores, setScores] = useState<SubjectScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'scores'>('profile');

  useEffect(() => {
    if (isOpen && studentId) {
      loadStudentDetails();
    }
  }, [isOpen, studentId]);

  const loadStudentDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch student basic info
      const response = await fetch(`/api/school/students/${studentId}`);
      if (!response.ok) throw new Error('Failed to fetch student details');
      const result = await response.json();
      setStudent(result.data);

      // Fetch scores if termId provided
      if (termId) {
        try {
          const scoresResponse = await fetch(
            `/api/results/student-scores?studentId=${studentId}&termId=${termId}`
          );
          if (scoresResponse.ok) {
            const scoresResult = await scoresResponse.json();
            setScores(scoresResult.data || []);
          }
        } catch (err) {
          console.error('Error fetching scores:', err);
        }
      }
    } catch (err: any) {
      console.error('Error loading student details:', err);
      setError(err.message || 'Failed to load student details');
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
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-gray-600">Loading student details...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg m-4">
            <div className="flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6 pt-4">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 font-semibold transition ${
                  activeTab === 'profile'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📋 Profile
              </button>
              {scores.length > 0 && (
                <button
                  onClick={() => setActiveTab('scores')}
                  className={`px-4 py-2 font-semibold transition ${
                    activeTab === 'scores'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📊 Scores ({scores.length})
                </button>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'profile' && student && (
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
                </div>
              )}

              {activeTab === 'scores' && scores.length > 0 && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b-2 border-gray-300">
                        <tr>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">
                            Subject
                          </th>
                          <th className="px-3 py-3 text-center font-bold text-gray-700">CA1</th>
                          <th className="px-3 py-3 text-center font-bold text-gray-700">CA2</th>
                          <th className="px-3 py-3 text-center font-bold text-gray-700">CA3</th>
                          <th className="px-3 py-3 text-center font-bold text-gray-700">CA4</th>
                          <th className="px-3 py-3 text-center font-bold text-gray-700">Exam</th>
                          <th className="px-3 py-3 text-center font-bold text-gray-700">Total</th>
                          <th className="px-3 py-3 text-center font-bold text-gray-700">Grade</th>
                          <th className="px-4 py-3 text-left font-bold text-gray-700">Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {scores.map((score, idx) => (
                          <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 font-semibold text-gray-800">
                              {score.subject_name}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-700">
                              {score.ca1 ?? '-'}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-700">
                              {score.ca2 ?? '-'}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-700">
                              {score.ca3 ?? '-'}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-700">
                              {score.ca4 ?? '-'}
                            </td>
                            <td className="px-3 py-3 text-center text-gray-700">
                              {score.exam ?? '-'}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-indigo-600">
                              {score.total ?? '-'}
                            </td>
                            <td className="px-3 py-3 text-center font-bold text-blue-600">
                              {score.grade ?? '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {score.remark ?? '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'scores' && scores.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">No scores available for this term</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-semibold transition"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
