import React, { useState } from 'react';
import { CheckCircle, XCircle, CreditCard, ExternalLink } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import type { ReimbursementItem } from '../types/reimbursement.types';

interface ReimbursementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ReimbursementItem | null;
  onApprove?: (id: string, note?: string) => void;
  onReject?: (id: string, note: string) => void;
  onMarkPaid?: (id: string) => void;
  canApproveLeave?: boolean;
}

export const ReimbursementDetailModal: React.FC<ReimbursementDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  onApprove,
  onReject,
  onMarkPaid,
  canApproveLeave = false
}) => {
  const [note, setNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!isOpen || !item) return null;

  const formatCurrency = (amount: number) => `Rp ${(amount || 0).toLocaleString("id-ID")}`;

  const formatDate = (dateStr: any) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const status = (item.status as string || '').toLowerCase();
  const receiptPath = String(item.receipt_path || '');
  const isImageReceipt = receiptPath.startsWith('data:image') || /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(receiptPath);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reimbursement Details"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {canApproveLeave && status === 'submitted' && !isRejecting && (
            <>
              <Button variant="danger" onClick={() => setIsRejecting(true)}>
                <XCircle size={18} style={{ marginRight: '8px' }} />
                Reject
              </Button>
              <Button variant="primary" onClick={() => onApprove?.(String(item.id), note)}>
                <CheckCircle size={18} style={{ marginRight: '8px' }} />
                Approve
              </Button>
            </>
          )}
          {canApproveLeave && status === 'submitted' && isRejecting && (
            <>
              <Button variant="ghost" onClick={() => setIsRejecting(false)}>Back</Button>
              <Button variant="danger" disabled={!note.trim()} onClick={() => onReject?.(String(item.id), note)}>
                Confirm Rejection
              </Button>
            </>
          )}
          {canApproveLeave && status === 'approved' && onMarkPaid && (
            <Button variant="primary" style={{ background: '#8b5cf6' }} onClick={() => onMarkPaid(String(item.id))}>
              <CreditCard size={18} style={{ marginRight: '8px' }} />
              Mark as Paid
            </Button>
          )}
        </>
      }
    >
      <div className="detail-list">
        <div className="detail-item">
          <span className="detail-label">Title</span>
          <span className="detail-value">{item.title as string}</span>
        </div>
        {canApproveLeave && item.employee && (
          <div className="detail-item">
            <span className="detail-label">Employee</span>
            <span className="detail-value">{(item.employee as any).full_name}</span>
          </div>
        )}
        <div className="detail-item">
          <span className="detail-label">Amount</span>
          <span className="detail-value" style={{ color: 'var(--color-primary)', fontSize: '1.1rem' }}>
            {formatCurrency(item.amount as number)}
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Category</span>
          <span className="category-tag">{item.category as string}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Expense Date</span>
          <span className="detail-value">{formatDate(item.expense_date)}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Status</span>
          <span className={`status-pill status-${status}`}>{item.status as string}</span>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label className="detail-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', color: '#334155', minHeight: '60px' }}>
            {item.description as string || 'No description provided.'}
          </div>
        </div>
        {receiptPath && (
          <div style={{ marginTop: '1rem' }}>
            <label className="detail-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Receipt Attachment</label>
            {isImageReceipt ? (
              <div className="receipt-preview">
                <img src={receiptPath} alt="Receipt" />
              </div>
            ) : (
              <div className="no-receipt">Attachment ready to open</div>
            )}
            <a href={receiptPath} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', fontSize: '0.85rem', marginTop: '0.5rem', textDecoration: 'none' }}>
              <ExternalLink size={14} /> View Full Attachment
            </a>
          </div>
        )}
        {!item.receipt_path && (
          <div className="no-receipt">No attachment provided</div>
        )}
        {item.note && (
          <div style={{ marginTop: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <label className="detail-label" style={{ display: 'block', marginBottom: '0.5rem' }}>Admin Note</label>
            <div style={{ background: '#fff7ed', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', color: '#9a3412', border: '1px solid #ffedd5' }}>
              {item.note as string}
            </div>
          </div>
        )}
        {canApproveLeave && status === 'submitted' && isRejecting && (
          <div style={{ marginTop: '1rem' }}>
            <label className="detail-label" style={{ display: 'block', marginBottom: '0.5rem', color: '#ef4444' }}>Rejection Reason (Required)</label>
            <textarea className="form-control" rows={3} placeholder="Explain why this reimbursement is rejected..."
              value={note} onChange={(e) => setNote(e.target.value)} style={{ borderColor: '#fca5a5' }}></textarea>
          </div>
        )}
      </div>
    </Modal>
  );
};
