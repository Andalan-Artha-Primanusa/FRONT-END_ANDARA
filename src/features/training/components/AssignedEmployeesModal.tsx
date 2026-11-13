import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { api } from '@/shared/api/httpClient';
import { AssessModal } from './AssessModal';

interface AssignedEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  competencyId: number;
  competencyName: string;
}

export const AssignedEmployeesModal: React.FC<AssignedEmployeesModalProps> = ({
  isOpen,
  onClose,
  competencyId,
  competencyName,
}) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [assessing, setAssessing] = useState<any>(null);

  useEffect(() => {
    if (isOpen && competencyId) {
      fetchAssignedEmployees();
    }
  }, [isOpen, competencyId]);

  const fetchAssignedEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/competencies/${competencyId}`);
      const res = response.data;
      const data = res?.data || res;
      const assigned = data?.employee_competencies || data?.employeeCompetencies || [];
      setEmployees(Array.isArray(assigned) ? assigned : []);
    } catch (err) {
      console.error('Failed to fetch assigned employees', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssess = async (assignmentId: number, level: number, notes: string) => {
    await api.post(`/competencies/assignment/${assignmentId}/assess`, {
      proficiency_level: level,
      notes,
    });
    fetchAssignedEmployees();
  };

  const getEmployeeName = (emp: any) => {
    if (emp.employee?.user?.name) return emp.employee.user.name;
    if (emp.employee?.full_name) return emp.employee.full_name;
    if (emp.user?.name) return emp.user.name;
    return `Karyawan #${emp.employee_id || emp.id}`;
  };

  const proficiencyLabels: Record<number, string> = {
    1: 'Beginner',
    2: 'Elementary',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert',
  };

  const proficiencyColors: Record<number, string> = {
    1: '#f59e0b',
    2: '#10b981',
    3: 'var(--color-primary)',
    4: '#8b5cf6',
    5: '#ec4899',
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Karyawan Ditugaskan: ${competencyName}`}
        size="lg"
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Memuat...</div>
        ) : employees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            Belum ada karyawan yang ditugaskan.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'var(--hero-bg-start)', color: '#ffffff' }}>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#ffffff', fontWeight: 700 }}>Karyawan</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#ffffff', fontWeight: 700 }}>Tingkat</th>
                  <th style={{ textAlign: 'left', padding: '0.75rem', color: '#ffffff', fontWeight: 700 }}>Tanggal</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', color: '#ffffff', fontWeight: 700 }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '0.75rem', color: '#ffffff', fontWeight: 700 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => {
                  const assessed = !!emp.assessed_at || emp.status === 'assessed';
                  const level = emp.proficiency_level || 0;
                  const color = proficiencyColors[level] || '#64748b';
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem', color: '#0f172a', fontWeight: 600 }}>{getEmployeeName(emp)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {assessed ? (
                          <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, background: `${color}15`, color }}>
                            {level} - {proficiencyLabels[level]}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#64748b' }}>{formatDate(emp.assessed_at)}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {assessed ? (
                          <span style={{ background: '#d1fae5', color: '#059669', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                            ✅ Dinilai
                          </span>
                        ) : (
                          <span style={{ background: '#fef3c7', color: '#d97706', padding: '2px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }}>
                            ⏳ Menunggu
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {!assessed ? (
                          <button
                            className="btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', height: 'auto' }}
                            onClick={() => setAssessing(emp)}
                          >
                            Nilai
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <AssessModal
        isOpen={!!assessing}
        onClose={() => setAssessing(null)}
        onAssess={handleAssess}
        employeeName={assessing ? getEmployeeName(assessing) : ''}
        competencyName={competencyName}
        assignmentId={assessing?.id || 0}
      />
    </>
  );
};
