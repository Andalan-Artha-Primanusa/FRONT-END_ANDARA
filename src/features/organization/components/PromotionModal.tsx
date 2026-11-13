import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { getAllEmployees } from '@/features/employee/api/employee.service';
import { showToast } from '@/shared/ui/toast';
import { User, ArrowUpRight, Calendar, Building2, AlignLeft } from 'lucide-react';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({ isOpen, onClose, onSave }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const [formData, setFormData] = useState({
    employee_id: '',
    new_position: '',
    new_department: '',
    new_salary: '',
    reason: '',
    effective_date: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      setFormData({ employee_id: '', new_position: '', new_department: '', new_salary: '', reason: '', effective_date: '' });
      setSelectedEmployee(null);
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
      }
    }
    return [];
  };

  const fetchEmployees = async () => {
    try {
      const data = await getAllEmployees();
      setEmployees(extractArr(data));
    } catch (err) {
      console.error(err);
    }
  };

  const handleEmployeeSelect = (empId: string) => {
    const emp = employees.find((e) => String(e.id) === empId);
    setSelectedEmployee(emp);
    setFormData({ ...formData, employee_id: empId, new_department: emp?.department || '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        ...formData,
        new_salary: formData.new_salary ? Number(formData.new_salary) : undefined,
      });
      onClose();
    } catch (error: any) {
      console.error(error);
      showToast(error?.response?.data?.message || error?.message || 'Gagal menyimpan promosi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatIDR = (value: string) => {
    if (!value) return '';
    const num = value.replace(/\D/g, '');
    return Number(num).toLocaleString("id-ID");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajukan Promosi Karyawan">
      <div style={{ padding: '0.5rem' }}>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem', marginTop: '-0.5rem' }}>
          Ajukan kenaikan jabatan untuk karyawan yang berprestasi.
        </p>

        <form onSubmit={handleSubmit} className="crud-form">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Karyawan</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                <select
                  className="crud-input"
                  value={formData.employee_id}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  required
                  style={{ paddingLeft: '44px', height: '52px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}
                >
                  <option value="">Pilih Karyawan...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.user?.name || emp.full_name || emp.name || `Employee #${emp.id}`} {emp.employee_code ? `[${emp.employee_code}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedEmployee && (
              <div style={{ padding: '12px 16px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Jabatan Saat Ini</div>
                <div style={{ fontWeight: 600, color: '#0369a1', fontSize: '0.95rem' }}>
                  <ArrowUpRight size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {selectedEmployee.position || 'Belum ditentukan'}
                </div>
                {selectedEmployee.department && (
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                    Departemen: {selectedEmployee.department}
                  </div>
                )}
              </div>
            )}

            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Jabatan Baru</label>
              <div style={{ position: 'relative' }}>
                <ArrowUpRight size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                <input
                  type="text"
                  className="crud-input"
                  value={formData.new_position}
                  onChange={(e) => setFormData({ ...formData, new_position: e.target.value })}
                  required
                  placeholder="e.g. Senior Software Engineer"
                  style={{ paddingLeft: '44px', height: '52px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Departemen Baru (opsional)</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                <input
                  type="text"
                  className="crud-input"
                  value={formData.new_department}
                  onChange={(e) => setFormData({ ...formData, new_department: e.target.value })}
                  placeholder="e.g. Engineering"
                  style={{ paddingLeft: '44px', height: '52px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Gaji Baru (opsional)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', zIndex: 1, fontWeight: 700, fontSize: '0.9rem' }}>Rp</span>
                <input
                  type="text"
                  className="crud-input"
                  value={formatIDR(formData.new_salary)}
                  onChange={(e) => setFormData({ ...formData, new_salary: e.target.value.replace(/\D/g, '') })}
                  placeholder="e.g. 15000000"
                  style={{ paddingLeft: '44px', height: '52px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Tanggal Efektif</label>
              <div style={{ position: 'relative' }}>
                <Calendar size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', zIndex: 1 }} />
                <input
                  type="date"
                  className="crud-input"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  required
                  style={{ paddingLeft: '44px', height: '52px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px', display: 'block' }}>Alasan Promosi</label>
              <div style={{ position: 'relative' }}>
                <AlignLeft size={18} style={{ position: 'absolute', left: '14px', top: '16px', color: '#94a3b8' }} />
                <textarea
                  className="crud-input"
                  style={{ paddingLeft: '44px', minHeight: '100px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', paddingTop: '14px' }}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  placeholder="Jelaskan alasan promosi, pencapaian karyawan, dll..."
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
            <Button variant="ghost" onClick={onClose} type="button" disabled={loading} style={{ flex: 1, height: '52px', borderRadius: '12px' }}>
              Batal
            </Button>
            <Button variant="primary" type="submit" disabled={loading} style={{ flex: 1.5, height: '52px', borderRadius: '12px', fontWeight: 600 }}>
              {loading ? 'Mengajukan...' : 'Ajukan Promosi'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
