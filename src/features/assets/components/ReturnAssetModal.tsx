import React, { useState } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { FileText, Calendar, ShieldCheck } from 'lucide-react';

interface ReturnAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { return_note: string; returned_at: string; condition: string }) => void;
  assetName?: string;
  loading?: boolean;
}

export const ReturnAssetModal: React.FC<ReturnAssetModalProps> = ({
  isOpen, onClose, onConfirm, assetName, loading = false
}) => {
  const [formData, setFormData] = useState({
    return_note: '',
    returned_at: new Date().toISOString().split('T')[0],
    condition: 'good',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Asset Return">
      <div style={{ padding: '0.5rem' }}>
        {assetName && (
          <div style={{ 
            background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px',
            padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <ShieldCheck size={18} color="#0284c7" />
            <span style={{ fontSize: '0.9rem', color: '#0284c7', fontWeight: 600 }}>
              Returning: <span style={{ color: '#1e293b' }}>{assetName}</span>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>
                Condition After Return
              </label>
              <select
                className="crud-input"
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                required
                style={{ height: '52px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', padding: '0 16px' }}
              >
                <option value="new">🆕 New – Like brand new</option>
                <option value="good">✅ Good – Minor wear, fully functional</option>
                <option value="fair">🟡 Fair – Visible wear, functional</option>
                <option value="damaged">⚠️ Damaged – Needs repair</option>
                <option value="retired">🛑 Retired – Cannot be used anymore</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>
                Return Date
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="date"
                  value={formData.returned_at}
                  onChange={(e) => setFormData({ ...formData, returned_at: e.target.value })}
                  required
                  style={{ paddingLeft: '44px', height: '52px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>
                Return Note
              </label>
              <div style={{ position: 'relative' }}>
                <FileText size={18} style={{ position: 'absolute', left: '14px', top: '16px', color: '#94a3b8' }} />
                <textarea
                  className="crud-input"
                  value={formData.return_note}
                  onChange={(e) => setFormData({ ...formData, return_note: e.target.value })}
                  placeholder="e.g. Dikembalikan dalam kondisi baik, bensin full."
                  style={{ 
                    paddingLeft: '44px', paddingTop: '14px',
                    minHeight: '90px', borderRadius: '12px', 
                    border: '1px solid #e2e8f0', width: '100%' 
                  }}
                />
              </div>
            </div>

          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
            <Button variant="ghost" onClick={onClose} type="button" disabled={loading} style={{ flex: 1, height: '52px', borderRadius: '12px' }}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading} style={{ flex: 1.5, height: '52px', borderRadius: '12px', fontWeight: 600 }}>
              {loading ? 'Processing...' : 'Confirm Return'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
