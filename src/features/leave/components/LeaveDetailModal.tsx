import React from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';

interface LeaveDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  canApproveLeave?: boolean;
}

const getNestedName = (...values: any[]) =>
  values.find((value) => typeof value === 'string' && value.trim()) || '';

const getEmployeeSubtitle = (employee: any) => {
  const departmentName = getNestedName(
    employee?.department?.name,
    employee?.departmentRel?.name,
    employee?.department_rel?.name
  );
  const positionName = getNestedName(
    employee?.position?.name,
    employee?.positionRel?.name,
    employee?.position_rel?.name
  );

  return [departmentName, positionName].filter(Boolean).join(' • ');
};

export const LeaveDetailModal: React.FC<LeaveDetailModalProps> = ({ isOpen, onClose, item, onApprove, onReject, canApproveLeave }) => {
  if (!item) return null;

  const formatDate = (date: any) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  };

  const status = String(item.status || 'pending').toLowerCase();
  const statusLabel = status === 'approved' ? 'DISETUJUI' : status === 'rejected' ? 'DITOLAK' : status === 'submitted' ? 'DIAJUKAN' : 'MENUNGGU';
  const employeeSubtitle = getEmployeeSubtitle(item.employee);

  const footer = (
    <>
      <Button variant="outline" onClick={onClose}>Tutup</Button>
      {canApproveLeave && status === 'pending' && (
        <>
          <Button variant="outline" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => onReject?.(String(item.id))}>Tolak</Button>
          <Button variant="primary" onClick={() => onApprove?.(String(item.id))}>Setujui Cuti</Button>
        </>
      )}
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detail Pengajuan Cuti" size="lg" footer={footer}>
      <div className="modal-subheader" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9' }}>
          <Calendar size={20} />
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Informasi permohonan izin karyawan</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="detail-group">
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pemohon</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <span style={{ fontWeight: 700 }}>{String(item.employee?.user?.name || item.user?.name || 'E').charAt(0)}</span>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.employee?.user?.name || item.employee?.full_name || item.user?.name || 'Tidak diketahui'}</div>
              {employeeSubtitle && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{employeeSubtitle}</div>}
            </div>
          </div>
        </div>

        <div className="detail-group">
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Status</label>
          <span className={`badge-soft badge-soft--${status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'orange'}`} style={{ borderRadius: '999px', padding: '0.25rem 0.75rem' }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {(item.approver || status === 'approved' || status === 'rejected') && (
        <div style={{ padding: '1rem', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #e0f2fe', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.70rem', color: '#0369a1', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 700, letterSpacing: '0.05em' }}>Penyetuju / Reviewer</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '1px solid #bae6fd' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{String(item.approver?.name || 'A').charAt(0)}</span>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0c4a6e' }}>{item.approver?.name || "Sistem / Admin"}</div>
              <div style={{ fontSize: '0.7rem', color: '#0ea5e9' }}>{item.approver?.employee?.position?.name || "Manager / HR"}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Mulai</label>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(item.start_date)}</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Berakhir</label>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{formatDate(item.end_date)}</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Durasi</label>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.total_days || 1} Hari Kerja</div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>Jenis Cuti</label>
            <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.leave_type?.name || item.type?.toUpperCase()}</div>
          </div>
        </div>
      </div>

      <div className="detail-group">
        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Alasan / Keperluan</label>
        <div style={{ padding: '1rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.9rem', color: '#334155', lineHeight: 1.6 }}>
          {item.reason || 'Tidak ada alasan yang disertakan.'}
        </div>
      </div>

      {(item.notes || item.rejection_reason) && (
        <div className="detail-group" style={{ marginTop: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{status === 'rejected' ? 'Alasan Penolakan' : 'Catatan Admin'}</label>
          <div style={{ padding: '0.75rem', background: status === 'rejected' ? '#fef2f2' : '#fffbeb', border: '1px solid ' + (status === 'rejected' ? '#fee2e2' : '#fef3c7'), borderRadius: '12px', fontSize: '0.85rem', color: status === 'rejected' ? '#991b1b' : '#92400e' }}>
            {item.notes || item.rejection_reason}
          </div>
        </div>
      )}
    </Modal>
  );
};
