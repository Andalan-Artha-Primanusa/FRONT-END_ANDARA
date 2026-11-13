import React, { useState, useEffect } from 'react';
import { Upload, Save } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { isValidFileUpload } from '@/shared/utils/sanitize';
import type { ReimbursementItem } from '../types/reimbursement.types';

interface ReimbursementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void | Promise<void>;
  initialData?: ReimbursementItem | null;
  employees?: any[]; // Only for admin
  canApproveLeave?: boolean;
}

const CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'medical', label: 'Medical' },
  { value: 'office_supplies', label: 'Office Supplies' },
  { value: 'training', label: 'Training' },
  { value: 'meal', label: 'Meal' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'other', label: 'Other' },
];

export const ReimbursementModal: React.FC<ReimbursementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  employees = [],
  canApproveLeave = false
}) => {
  const formId = initialData ? `reimbursement-form-${initialData.id}` : 'reimbursement-form-new';
  const [isSaving, setIsSaving] = useState(false);
  const [fileError, setFileError] = useState('');
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    amount: '',
    category: 'other',
    expense_date: new Date().toISOString().split('T')[0],
    employee_id: '',
    receipt_path: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        amount: initialData.amount || '',
        category: initialData.category || 'other',
        expense_date: initialData.expense_date ? new Date(initialData.expense_date as string).toISOString().split('T')[0] : '',
        employee_id: initialData.employee_id || '',
        receipt_path: initialData.receipt_path || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        amount: '',
        category: 'other',
        expense_date: new Date().toISOString().split('T')[0],
        employee_id: '',
        receipt_path: '',
      });
    }
    setFileError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const validation = isValidFileUpload(file, 5, ['image/jpeg', 'image/png', 'application/pdf']);
    if (!validation.valid) {
      setFileError(validation.error || 'File bukti tidak valid.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev: any) => ({
        ...prev,
        receipt_path: typeof reader.result === 'string' ? reader.result : file.name,
        receipt_filename: file.name,
      }));
      setFileError('');
    };
    reader.onerror = () => setFileError('Gagal membaca file bukti.');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Klaim Reimbursement' : 'Klaim Reimbursement Baru'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={onClose} disabled={isSaving}>Batal</Button>
          <Button variant="primary" type="submit" form={formId} loading={isSaving}>
            <Save size={18} style={{ marginRight: '8px' }} />
            {initialData ? 'Update' : 'Simpan Draft'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit}>
        <div className="reimb-modal-body" style={{ padding: 0 }}>
          <div className="form-grid">
            {canApproveLeave && !initialData && (
              <div className="form-group full">
                <label>Karyawan</label>
                <select name="employee_id" className="form-control" value={formData.employee_id} onChange={handleChange} required>
                  <option value="">Pilih Karyawan</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group full">
              <label>Judul</label>
              <input type="text" name="title" className="form-control" placeholder="Contoh: Makan siang meeting klien" value={formData.title} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Kategori</label>
              <select name="category" className="form-control" value={formData.category} onChange={handleChange} required>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Jumlah (Rp)</label>
              <input type="text" inputMode="numeric" name="amount" className="form-control" placeholder="0"
                value={formData.amount ? Number(formData.amount).toLocaleString("id-ID") : ""}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, amount: e.target.value.replace(/\D/g, "") }))} required />
            </div>
            <div className="form-group">
              <label>Tanggal Pengeluaran</label>
              <input type="date" name="expense_date" className="form-control" value={formData.expense_date} onChange={handleChange} required />
            </div>
            <div className="form-group full">
              <label>Deskripsi</label>
              <textarea name="description" className="form-control" rows={3} placeholder="Jelaskan detail pengeluaran..." value={formData.description} onChange={handleChange}></textarea>
            </div>
            <div className="form-group full">
              <label>Bukti / Struk Pembayaran</label>
              <div className="receipt-upload-box">
                <Upload size={18} />
                <div>
                  <strong>{formData.receipt_filename || 'Pilih file bukti'}</strong>
                  <span>JPG, PNG, atau PDF maksimal 5MB</span>
                </div>
                <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={handleReceiptFileChange} />
              </div>
              {fileError && <p className="receipt-upload-error">{fileError}</p>}
              <input type="text" name="receipt_path" className="form-control" placeholder="Atau tempel URL/path bukti pembayaran"
                value={String(formData.receipt_path || '').startsWith('data:') ? formData.receipt_filename || 'File bukti dipilih' : formData.receipt_path || ''}
                onChange={handleChange} />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
