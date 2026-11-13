import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { Plus, Trash2, User, GitBranch, Layers, Users } from 'lucide-react';
import { getAllRoles, getAllUsers } from "@/features/admin/api/admin.service";
import { api } from "@/shared/api/httpClient";

interface ApprovalFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editData?: any | null;
  existingFlows?: any[];
}

const MODULES = [
  { value: 'assignment_letter', label: 'Surat Tugas' },
  { value: 'leave', label: 'Pengajuan Cuti' },
  { value: 'reimbursement', label: 'Penggantian Biaya' },
  { value: 'overtime', label: 'Lembur' },
  { value: 'promotion', label: 'Pengajuan Promosi' },
  { value: 'training', label: 'Pengajuan Pelatihan' },
  { value: 'document', label: 'Dokumen Karyawan' },
  { value: 'asset_assignment', label: 'Penugasan Aset' },
  { value: 'shift_swap', label: 'Tukar Giliran Kerja' },
  { value: 'payroll', label: 'Penggajian' },
  { value: 'kpi', label: 'KPI (Indikator Kinerja Utama)' },
  { value: 'benefit_assignment', label: 'Penugasan Tunjangan' },
];

export const ApprovalFlowModal: React.FC<ApprovalFlowModalProps> = ({ isOpen, onClose, onSave, editData, existingFlows = [] }) => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [usersByRole, setUsersByRole] = useState<Record<string, any[]>>({});
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    name: '',
    module: 'assignment_letter',
    steps: [{ role_id: '', user_id: '', step_order: 1 }]
  });

  const isModuleTaken = (module: string) => !editData && existingFlows.some(
    (flow) => flow.module === module && flow.is_active !== false
  );

  const getDefaultModule = () => {
    if (editData?.module) return editData.module;
    return MODULES.find((module) => !isModuleTaken(module.value))?.value || 'assignment_letter';
  };

  const resetForm = () => {
    setFormData({
      name: '',
      module: getDefaultModule(),
      steps: [{ role_id: '', user_id: '', step_order: 1 }]
    });
    setFormError("");
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      fetchUsers();
      if (editData) {
        const mappedSteps = (editData.steps || []).map((s: any, i: number) => ({
          role_id: String(s.role_id || ''),
          user_id: String(s.user_id || s.user?.id || ''),
          step_order: i + 1,
        }));
        setFormData({
          name: editData.name || '',
          module: editData.module || 'assignment_letter',
          steps: mappedSteps,
        });
        mappedSteps.forEach((st: any) => {
          if (st.role_id) void fetchUsersForRole(st.role_id);
        });
        setFormError("");
      } else {
        resetForm();
      }
    }
  }, [isOpen, editData, existingFlows]);

  const fetchUsersForRole = async (roleIdParams: string) => {
    if (!roleIdParams || usersByRole[roleIdParams]) return;
    try {
      const res = await api.get("/admin/users", {
        params: { role: roleIdParams, per_page: 100 }
      });
      let items: any[] = [];
      const root = res.data;
      const inner = root?.data ?? root;
      
      if (Array.isArray(inner)) {
        items = inner;
      } else if (inner && typeof inner === 'object') {
        const candidates = [
          (inner as any).data,
          (inner as any).items,
          (inner as any).rows,
          root?.items,
          root?.data?.data
        ];
        for (const c of candidates) {
          if (Array.isArray(c)) {
            items = c;
            break;
          }
        }
      }
      setUsersByRole(prev => ({ ...prev, [roleIdParams]: items }));
    } catch (err) {
      console.error(`Failed to fetch users for role ${roleIdParams}`, err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await getAllRoles();
      const items = res.items || [];
      setRoles(items);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await getAllUsers(1, 200);
      const data = res as any;
      const items = Array.isArray(data) ? data : data?.items || [];
      setUsers(items);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const getFilteredUsersForStep = (roleIdStr: string) => {
    if (usersByRole[roleIdStr] && usersByRole[roleIdStr].length > 0) {
      return usersByRole[roleIdStr];
    }
    if (roleIdStr && users.length > 0) {
      const filtered = users.filter(u => {
        if (u.roles && Array.isArray(u.roles)) {
          return u.roles.some((r: any) => String(r.id) === String(roleIdStr));
        }
        return false;
      });
      if (filtered.length > 0) return filtered;
    }
    return users;
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { role_id: '', user_id: '', step_order: formData.steps.length + 1 }]
    });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, step_order: i + 1 }));
    setFormData({ ...formData, steps: newSteps });
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...formData.steps];
    (newSteps[index] as any)[field] = value;
    if (field === 'role_id' && value) {
      (newSteps[index] as any).user_id = '';
      void fetchUsersForRole(value);
    }
    setFormData({ ...formData, steps: newSteps });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setFormError("");

    if (!formData.name.trim()) {
      setFormError('Nama alur persetujuan wajib diisi.');
      return;
    }
    if (isModuleTaken(formData.module)) {
      setFormError('Modul ini sudah memiliki alur persetujuan aktif. Pilih modul lain atau ubah alur yang sudah ada.');
      return;
    }
    if (formData.steps.some(s => !s.role_id)) {
      setFormError('Pilih peran untuk semua tahap persetujuan.');
      return;
    }

    setLoading(true);
    try {
      const cleanedData = {
        ...formData,
        steps: formData.steps.map(s => ({
          step_order: s.step_order,
          role_id: Number(s.role_id),
          user_id: s.user_id ? Number(s.user_id) : undefined,
        }))
      };
      await onSave(cleanedData);
      onClose();
    } catch (err: any) {
      setFormError(err?.message || 'Gagal menyimpan alur persetujuan.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editData ? 'Ubah Alur Persetujuan' : 'Konfigurasi Alur Persetujuan'}>
      <form onSubmit={handleSubmit} style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <GitBranch size={14} color="#6366f1" /> Nama Alur
            </label>
            <input 
              type="text" 
              className="crud-input"
              placeholder="Contoh: Persetujuan standar surat tugas"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{ height: '52px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', padding: '0 16px', fontSize: '0.95rem' }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="#6366f1" /> Modul Tujuan
            </label>
            <select 
              className="crud-input"
              value={formData.module}
              onChange={(e) => setFormData({ ...formData, module: e.target.value })}
              style={{ height: '52px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', padding: '0 16px', fontSize: '0.95rem', cursor: 'pointer' }}
            >
              {MODULES.map((mod) => {
                const hasActiveFlow = !editData && existingFlows.some(
                  (f) => f.module === mod.value && f.is_active !== false
                );
                return (
                  <option key={mod.value} value={mod.value} disabled={hasActiveFlow}>
                    {mod.label} {hasActiveFlow ? '(Sudah ada)' : ''}
                  </option>
                );
              })}
            </select>
            {isModuleTaken(formData.module) && (
              <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                Modul ini sudah memiliki alur persetujuan aktif.
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={14} color="#6366f1" /> Urutan Penyetuju
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
              {formData.steps.map((step, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '32px', height: '32px', minWidth: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800,
                    boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)'
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ 
                    flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px', background: 'white', 
                    borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <select 
                      value={step.role_id} 
                      onChange={(e) => updateStep(index, 'role_id', e.target.value)}
                      required
                      style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b', outline: 'none', padding: '4px 0' }}
                    >
                      <option value="" disabled>Pilih peran...</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.display_name || role.name}</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <Users size={14} color="#94a3b8" />
                      <select 
                        value={step.user_id} 
                        onChange={(e) => updateStep(index, 'user_id', e.target.value)}
                        style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '0.8rem', color: '#64748b', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="">Pengguna mana pun dengan peran ini</option>
                        {getFilteredUsersForStep(step.role_id).map((u: any) => (
                          <option key={u.id} value={u.id}>{u.name || u.email || `Pengguna #${u.id}`}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    type="button" 
                    onClick={() => removeStep(index)}
                    disabled={formData.steps.length === 1}
                    style={{ color: '#ef4444', padding: '10px', borderRadius: '10px', background: '#fef2f2' }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              
              <Button 
                variant="ghost" 
                type="button" 
                onClick={addStep}
                style={{ 
                  alignSelf: 'center', fontSize: '0.85rem', color: '#6366f1', fontWeight: 700, 
                  background: 'rgba(99, 102, 241, 0.05)', padding: '10px 20px', borderRadius: '12px', border: '1px dashed #6366f1',
                  marginTop: '0.5rem', width: '100%'
                }}
              >
                <Plus size={16} style={{ marginRight: '8px' }} /> Tambah Tingkat Persetujuan
              </Button>
            </div>
          </div>
        </div>

        {formError && (
          <div style={{ marginTop: '1.5rem', padding: '12px 14px', borderRadius: '12px', background: '#fef2f2', color: '#b91c1c', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #fecaca' }}>
            {formError}
          </div>
        )}

        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
          <Button variant="ghost" onClick={onClose} type="button" style={{ flex: 1, height: '52px', borderRadius: '12px' }}>Batal</Button>
          <Button variant="primary" type="submit" disabled={loading} style={{ flex: 1.5, height: '52px', borderRadius: '12px', fontWeight: 700, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
            {loading ? 'Menyimpan...' : (editData ? 'Perbarui Alur' : 'Aktifkan Alur Persetujuan')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
