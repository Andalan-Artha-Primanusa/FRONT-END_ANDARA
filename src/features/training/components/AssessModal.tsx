import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { api } from '@/shared/api/httpClient';
import { showToast } from '@/shared/ui/toast';

interface AssessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssess: (assignmentId: number, level: number, notes: string) => Promise<void>;
  employeeName: string;
  competencyName: string;
  assignmentId: number;
}

export const AssessModal: React.FC<AssessModalProps> = ({
  isOpen,
  onClose,
  onAssess,
  employeeName,
  competencyName,
  assignmentId,
}) => {
  const [proficiencyLevel, setProficiencyLevel] = useState(3);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setProficiencyLevel(3);
      setNotes('');
      setSaving(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onAssess(assignmentId, proficiencyLevel, notes);
      onClose();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Gagal memberi penilaian.', 'error');
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
      title={`Nilai Kompetensi: ${competencyName}`}
      size="sm"
      footer={
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Menyimpan...' : 'Simpan Penilaian'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '12px' }}>
          <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>Karyawan</p>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b', margin: '4px 0 0' }}>{employeeName}</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Tingkat Profisiensi
          </label>
          <select
            value={proficiencyLevel}
            onChange={(e) => setProficiencyLevel(Number(e.target.value))}
            className="form-input"
            autoFocus
          >
            {Object.entries(proficiencyLabels).map(([level, label]) => (
              <option key={level} value={level}>
                {level} - {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Catatan (opsional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="form-input"
            rows={2}
            placeholder="Tambahkan catatan penilaian..."
          />
        </div>
      </div>
    </Modal>
  );
};
