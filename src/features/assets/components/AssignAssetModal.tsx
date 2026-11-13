import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { getAllLocations } from '@/features/location/api/location.service';
import { User, MapPin, Calendar, FileText, Package } from 'lucide-react';

const STYLES = `
.assign-modal-body {
  padding: 0.5rem;
}

.assign-modal-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.assign-modal-desc {
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
  margin-top: -0.5rem;
}

.assign-field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.assign-field-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  display: block;
}

.assign-input-wrap {
  position: relative;
}

.assign-input-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  z-index: 1;
  pointer-events: none;
}

.assign-input-icon-top {
  position: absolute;
  left: 14px;
  top: 16px;
  color: #94a3b8;
  pointer-events: none;
}

.assign-select,
.assign-date-input {
  width: 100%;
  height: 52px;
  padding-left: 44px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 0.95rem;
  color: #0f172a;
  box-sizing: border-box;
  transition: all 0.2s;
}

.assign-select {
  appearance: none;
  cursor: pointer;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 16px center;
  background-size: 16px;
}

.assign-select:focus,
.assign-date-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(10, 122, 62, 0.1);
}

.assign-textarea {
  width: 100%;
  min-height: 100px;
  padding: 14px 14px 14px 44px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: white;
  font-size: 0.95rem;
  color: #0f172a;
  box-sizing: border-box;
  resize: vertical;
  font-family: inherit;
  transition: all 0.2s;
}

.assign-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(10, 122, 62, 0.1);
}

.assign-modal-footer {
  margin-top: 2rem;
  display: flex;
  gap: 1rem;
}
`;

export const AssignAssetModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  assets: any[];
}> = ({ isOpen, onClose, onSave, assets }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: '',
    employee_id: '',
    location_id: '',
    assignment_note: '',
    assigned_at: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      setFormData({
        asset_id: '',
        employee_id: '',
        location_id: '',
        assignment_note: '',
        assigned_at: new Date().toISOString().split('T')[0],
      });
    }
  }, [isOpen]);

  const extractArr = (res: any): any[] => {
    if (Array.isArray(res)) return res;
    if (res && typeof res === 'object') {
      if (Array.isArray(res.data)) return res.data;
      if (Array.isArray(res.items)) return res.items;
      if (Array.isArray(res.results)) return res.results;
      if (res.data && typeof res.data === 'object') {
        if (Array.isArray(res.data.data)) return res.data.data;
        if (Array.isArray(res.data.items)) return res.data.items;
      }
    }
    return [];
  };

  const loadDependencies = async () => {
    try {
      const { getAllEmployees } = await import('@/features/employee/api/employee.service');
      const empsRes = await getAllEmployees();
      setEmployees(extractArr(empsRes));

      const locsRes = await getAllLocations();
      setLocations(extractArr(locsRes));
    } catch (err) {
      console.error('Failed to load dependencies', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tugaskan Aset ke Karyawan">
      <style>{STYLES}</style>
      <div className="assign-modal-body">
        <p className="assign-modal-desc">
          Pilih aset yang tersedia dan tentukan karyawan yang akan menerima aset ini.
        </p>

        <form onSubmit={handleSubmit} className="assign-modal-form">
          <div className="assign-field-group">
            <label className="assign-field-label">Pilih Aset</label>
            <div className="assign-input-wrap">
              <Package size={18} className="assign-input-icon" />
              <select
                className="assign-select"
                value={formData.asset_id}
                onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                required
              >
                <option value="">-- Pilih Aset Tersedia --</option>
                {assets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} {asset.serial_number ? `(${asset.serial_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="assign-field-group">
            <label className="assign-field-label">Tujuan Karyawan</label>
            <div className="assign-input-wrap">
              <User size={18} className="assign-input-icon" />
              <select
                className="assign-select"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                required
              >
                <option value="">-- Pilih Karyawan --</option>
                {employees.length === 0 && <option disabled>Memuat data karyawan...</option>}
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.user?.name || emp.full_name || emp.name || `Karyawan #${emp.id}`} {emp.employee_code ? `[${emp.employee_code}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="assign-field-group">
            <label className="assign-field-label">Lokasi (opsional)</label>
            <div className="assign-input-wrap">
              <MapPin size={18} className="assign-input-icon" />
              <select
                className="assign-select"
                value={formData.location_id}
                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
              >
                <option value="">-- Pilih Lokasi (Opsional) --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.city ? `– ${loc.city}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="assign-field-group">
            <label className="assign-field-label">Tanggal Penugasan</label>
            <div className="assign-input-wrap">
              <Calendar size={18} className="assign-input-icon" />
              <input
                type="date"
                className="assign-date-input"
                value={formData.assigned_at}
                onChange={(e) => setFormData({ ...formData, assigned_at: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="assign-field-group">
            <label className="assign-field-label">Catatan Penugasan</label>
            <div className="assign-input-wrap">
              <FileText size={18} className="assign-input-icon-top" />
              <textarea
                className="assign-textarea"
                value={formData.assignment_note}
                onChange={(e) => setFormData({ ...formData, assignment_note: e.target.value })}
                placeholder="Contoh: Dipinjamkan untuk dinas luar kota selama 3 hari"
              />
            </div>
          </div>

          <div className="assign-modal-footer">
            <Button variant="ghost" onClick={onClose} type="button" disabled={loading} style={{ flex: 1, height: '52px', borderRadius: '12px' }}>
              Batal
            </Button>
            <Button variant="primary" type="submit" disabled={loading} style={{ flex: 1.5, height: '52px', borderRadius: '12px', fontWeight: 600 }}>
              {loading ? 'Memproses...' : 'Tugaskan Aset'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
