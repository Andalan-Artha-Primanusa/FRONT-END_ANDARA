import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';

interface CompetencyFormData {
  code: string;
  name: string;
  category: string;
  description: string;
  status: 'active' | 'inactive';
}

interface CompetencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CompetencyFormData) => Promise<void>;
  initialData?: {
    id: number | string;
    code: string;
    name: string;
    category: string | null;
    description: string | null;
    status: string;
  };
}

const generateCode = (name: string): string => {
  if (!name.trim()) return '';
  const words = name.trim().split(/\s+/).slice(0, 3);
  const prefix = words.map((w) => w.substring(0, 3).toUpperCase()).join('');
  const random = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${random}`;
};

export const CompetencyModal: React.FC<CompetencyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [formData, setFormData] = useState<CompetencyFormData>({
    code: '',
    name: '',
    category: '',
    description: '',
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CompetencyFormData, string>>>({});
  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setFormData({
        code: initialData.code,
        name: initialData.name,
        category: initialData.category || '',
        description: initialData.description || '',
        status: (initialData.status as 'active' | 'inactive') || 'active',
      });
    } else {
      setFormData({ code: '', name: '', category: '', description: '', status: 'active' });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (field: keyof CompetencyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (field === 'name' && !isEditing) {
      const generated = generateCode(value);
      if (generated) {
        setFormData((prev) => ({ ...prev, code: generated }));
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof CompetencyFormData, string>> = {};
    if (!formData.name.trim()) newErrors.name = 'Nama wajib diisi';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err: any) {
      const backendErrors = err.response?.data?.errors;
      if (backendErrors) {
        const mapped: Partial<Record<keyof CompetencyFormData, string>> = {};
        for (const [key, messages] of Object.entries(backendErrors)) {
          mapped[key as keyof CompetencyFormData] = (messages as string[])[0];
        }
        setErrors(mapped);
      } else {
        setErrors({ name: err.response?.data?.message || 'Gagal menyimpan' });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Kompetensi' : 'Tambah Kompetensi'}
      size="md"
      footer={
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>
            Batal
          </button>
          <button type="button" className="btn-primary" onClick={handleSubmit as any} disabled={saving}>
            {saving ? 'Menyimpan...' : isEditing ? 'Perbarui' : 'Buat'}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Nama Kompetensi *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="form-input"
            placeholder="Contoh: JavaScript Development"
            autoFocus
          />
          {errors.name && <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>{errors.name}</p>}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Kode
          </label>
          <input
            type="text"
            value={formData.code}
            readOnly
            className="form-input"
            style={{ background: '#f8fafc', color: '#64748b', cursor: 'default' }}
            placeholder="Otomatis dari nama"
          />
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px' }}>Kode otomatis dibuat dari nama</p>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Kategori
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="form-input"
            placeholder="Contoh: Technical, Soft Skills"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Deskripsi
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            className="form-input"
            rows={3}
            placeholder="Deskripsikan kompetensi ini..."
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="form-input"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Tidak Aktif</option>
          </select>
        </div>
      </form>
    </Modal>
  );
};
