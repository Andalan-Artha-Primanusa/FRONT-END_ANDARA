import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { showToast } from '@/shared/ui/toast';

interface ReturnLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  employeeName?: string;
  loading?: boolean;
}

export const ReturnLeaveModal: React.FC<ReturnLeaveModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  employeeName,
  loading = false,
}) => {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Silakan masukkan alasan pengembalian', 'error');
      return;
    }
    onConfirm(reason);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kembalikan Pengajuan Cuti"
      size="sm"
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.75rem' }}>
            Anda akan mengembalikan pengajuan cuti dari <strong>{employeeName || 'Karyawan'}</strong>{' '}
            untuk direvisi. Pengajuan tidak diakhiri, karyawan dapat mengajukan ulang setelah revisi.
          </p>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.5rem' }}>
            Alasan Pengembalian <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Jelaskan bagian apa yang perlu direvisi..."
            rows={4}
            required
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.9rem',
              outline: 'none',
              resize: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
          <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            style={{ background: '#d97706', borderColor: '#d97706' }}
          >
            {loading ? 'Memproses...' : 'Kembalikan untuk Revisi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
