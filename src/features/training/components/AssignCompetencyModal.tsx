import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { api } from '@/shared/api/httpClient';
import { showToast } from '@/shared/ui/toast';

interface AssignCompetencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (competencyId: string | number, employeeId: number, data: { proficiency_level?: number; notes?: string }) => Promise<void>;
  competencyId?: string | number;
  competencyName?: string;
}

export const AssignCompetencyModal: React.FC<AssignCompetencyModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  competencyId,
  competencyName,
}) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [assessNow, setAssessNow] = useState(false);
  const [proficiencyLevel, setProficiencyLevel] = useState(3);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedEmployeeId('');
      setAssessNow(false);
      setProficiencyLevel(3);
      setNotes('');
      fetchEmployees();
    }
  }, [isOpen]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await api.get('/employees', { params: { per_page: 500 } });
      const res = response.data;
      let data = [];
      if (res?.data?.data && Array.isArray(res.data.data)) {
        data = res.data.data;
      } else if (res?.data && Array.isArray(res.data)) {
        data = res.data;
      } else if (Array.isArray(res)) {
        data = res;
      }
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (emp: any) => {
    if (emp.user?.name) return emp.user.name;
    if (emp.full_name) return emp.full_name;
    return `Employee #${emp.id}`;
  };

  const handleSubmit = async () => {
    if (!selectedEmployeeId || !competencyId) return;
    setSaving(true);
    try {
      await onAssign(competencyId, Number(selectedEmployeeId), {
        proficiency_level: assessNow ? proficiencyLevel : undefined,
        notes: notes || undefined,
      });
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal menetapkan kompetensi.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const proficiencyLabels: Record<number, string> = {
    1: 'Beginner',
    2: 'Elementary',
    3: 'Intermediate',
    4: 'Advanced',
    5: 'Expert',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Kompetensi: ${competencyName || ''}`}
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!selectedEmployeeId || saving}
          >
            {saving ? 'Menyimpan...' : 'Assign'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Pilih Karyawan
          </label>
          {loading ? (
            <div style={{ padding: '0.75rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>Memuat...</div>
          ) : (
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(Number(e.target.value) || '')}
              className="form-input"
              autoFocus
            >
              <option value="">-- Pilih Karyawan --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {getEmployeeName(emp)} {emp.employee_code ? `(${emp.employee_code})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={assessNow}
              onChange={(e) => setAssessNow(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Langsung beri penilaian sekarang
            </span>
          </label>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 26px' }}>
            Jika tidak dicentang, status akan menjadi "Menunggu Penilaian"
          </p>
        </div>

        {assessNow && (
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Tingkat Profisiensi
            </label>
            <select
              value={proficiencyLevel}
              onChange={(e) => setProficiencyLevel(Number(e.target.value))}
              className="form-input"
            >
              {Object.entries(proficiencyLabels).map(([level, label]) => (
                <option key={level} value={level}>
                  {level} - {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Catatan (opsional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input"
            rows={2}
            placeholder="Tambahkan catatan..."
          />
        </div>
      </div>
    </Modal>
  );
};
