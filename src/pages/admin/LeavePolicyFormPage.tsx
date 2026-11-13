import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { api } from '@/shared/api/httpClient';
import { showToast } from '@/shared/ui/toast';
import { PageHeader } from '@/shared/ui';
import { 
  Save, 
  ArrowLeft, 
  ShieldCheck, 
  RefreshCw,
  Info,
  Settings
} from 'lucide-react';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import './AdminLeavePages.css';

const generatePolicyCode = (name: string) => {
  const lettersOnly = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = lettersOnly.slice(0, 3);
  return prefix ? `${prefix}1` : '';
};

const LeavePolicyFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    policy_code: '',
    year: new Date().getFullYear().toString(),
    annual_allowance: '12',
    carry_over_allowance: '0',
    max_carryover_days: '5',
    entitlement_type: 'fixed',
    entitlement_value: '12',
    is_paid: 'true',
    active: 'true'
  });

  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await api.get('/leave-types');
        let list: any[] = [];
        const d = res.data;
        if (d?.data && Array.isArray(d.data)) list = d.data;
        else if (d?.items && Array.isArray(d.items)) list = d.items;
        else if (Array.isArray(d)) list = d;
        setLeaveTypes(list);
      } catch (err) {
        console.error('Failed to fetch leave types', err);
      }
    };
    void fetchTypes();
  }, []);

  const handleTypeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const typeIdVal = e.target.value;
    setSelectedTypeId(typeIdVal);
    if (!typeIdVal) return;

    const found = leaveTypes.find(t => String(t.id) === String(typeIdVal));
    if (found) {
      const yearStr = formData.year || new Date().getFullYear().toString();
      const generatedName = `Kebijakan ${String(found.name)} ${yearStr}`;
      setFormData(prev => ({
        ...prev,
        name: generatedName,
        policy_code: generatePolicyCode(generatedName),
        is_paid: String(found.is_paid ?? true)
      }));
    }
  };

  useEffect(() => {
    if (isEdit) {
      const fetchDetail = async () => {
        try {
          const res = await api.get(`/leave-policies/${id}`);
          const data = res.data?.data || res.data;
          setFormData({
            name: data.name || '',
            policy_code: data.policy_code || '',
            year: String(data.year || new Date().getFullYear()),
            annual_allowance: String(data.annual_allowance || '0'),
            carry_over_allowance: String(data.carry_over_allowance || '0'),
            max_carryover_days: String(data.max_carryover_days || '0'),
            entitlement_type: data.entitlement_type || 'fixed',
            entitlement_value: String(data.entitlement_value || '0'),
            is_paid: String(data.is_paid),
            active: String(data.active)
          });
        } catch (err) {
          console.error('Error fetching detail:', err);
          showToast('Gagal memuat data detail.', 'error');
        } finally {
          setFetching(false);
        }
      };
      void fetchDetail();
    }
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (name === 'name' && !isEdit) {
        return {
          ...prev,
          name: value,
          policy_code: generatePolicyCode(value),
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      year: parseInt(formData.year),
      annual_allowance: parseInt(formData.annual_allowance),
      carry_over_allowance: parseInt(formData.carry_over_allowance),
      max_carryover_days: parseInt(formData.max_carryover_days),
      entitlement_value: parseInt(formData.entitlement_value),
      is_paid: formData.is_paid === 'true',
      active: formData.active === 'true'
    };

    try {
      if (isEdit) {
        await api.put(`/leave-policies/${id}`, payload);
        showToast('Kebijakan cuti berhasil diperbarui!', 'success');
        setTimeout(() => navigate('/leave/policy'), 2000);
      } else {
        await api.post('/leave-policies', payload);
        showToast('Kebijakan baru berhasil ditambahkan!', 'success');
        setTimeout(() => navigate('/leave/policy'), 2000);
      }
    } catch (err: any) {
      console.error('Error saving leave policy:', err);
      const errorData = err.response?.data;
      if (errorData?.errors) {
        const firstError = Object.values(errorData.errors)[0];
        showToast(`${Array.isArray(firstError) ? firstError[0] : firstError}`, 'error');
      } else {
        showToast(errorData?.message || 'Terjadi kesalahan saat menyimpan data.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="crud-page" style={{ textAlign: 'center', padding: '5rem' }}>
        <Settings className="animate-spin" size={48} color="#7c3aed" />
        <p>Memuat konfigurasi kebijakan...</p>
      </div>
    );
  }

  return (
    <div className="crud-page">
      <PageHeader
        title={isEdit ? 'Edit Kebijakan Cuti' : 'Buat Kebijakan Cuti Baru'}
        subtitle="Tentukan aturan jatah, akumulasi, dan batasan carry-forward."
        badge={{ icon: ShieldCheck, label: "Governance" }}
        actions={
          <>
            <button className="btn-outline" onClick={() => navigate('/leave/policy')}>
              <ArrowLeft size={16} />
              Kembali
            </button>
            <button className="btn-primary" type="submit" form="leave-policy-form" disabled={loading}>
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Kebijakan')}
            </button>
          </>
        }
      />

      <form id="leave-policy-form" onSubmit={handleSubmit} style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div>
          <Card glass style={{ padding: '2.5rem', borderRadius: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div style={{ padding: '10px', borderRadius: '12px', background: '#f5f3ff', color: '#7c3aed' }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ margin: 0 }}>Parameter Kebijakan</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1.5rem' }}>
              <div style={{ gridColumn: 'span 6', background: '#faf5ff', padding: '16px', borderRadius: '16px', border: '1px solid #e9d5ff' }}>
                <label style={{ color: '#6b21a8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <ShieldCheck size={16} /> Relasikan dengan Jenis Cuti (Smart Auto-Fill)
                </label>
                <select 
                  value={selectedTypeId} 
                  onChange={handleTypeSelect}
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '12px', border: '1px solid #d8b4fe', fontSize: '1rem', color: '#581c87', background: '#fff', cursor: 'pointer', fontWeight: 600, boxSizing: 'border-box' }}
                >
                  <option value="">-- Pilih Jenis Cuti untuk Mengisi Form Otomatis --</option>
                  {leaveTypes.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) — {t.is_paid ? 'Paid' : 'Unpaid'}
                    </option>
                  ))}
                </select>
                <small style={{ color: '#7e22ce', display: 'block', marginTop: '6px' }}>
                  Memilih jenis cuti akan otomatis merumuskan Nama Kebijakan, Kode, dan Status Pembayaran yang selaras.
                </small>
              </div>

              <div style={{ gridColumn: 'span 4' }}>
                <label>Nama Kebijakan</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                  placeholder="Contoh: Kebijakan Cuti Tahunan 2026"
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label>Kode Kebijakan</label>
                <input
                  type="text"
                  name="policy_code"
                  value={formData.policy_code}
                  required
                  readOnly
                  placeholder="Otomatis dari Nama Kebijakan"
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                />
                <small style={{ color: '#64748b', display: 'block', marginTop: '0.5rem' }}>
                  Kode otomatis dari 3 huruf awal nama kebijakan + 1.
                </small>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label>Tahun Berlaku</label>
                <input 
                  type="number" 
                  name="year" 
                  value={formData.year} 
                  onChange={handleChange} 
                  required 
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label>Jatah Hari Dasar</label>
                <input 
                  type="number" 
                  name="entitlement_value" 
                  value={formData.entitlement_value} 
                  onChange={handleChange} 
                  required 
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label>Max Carryover</label>
                <input 
                  type="number" 
                  name="max_carryover_days" 
                  value={formData.max_carryover_days} 
                  onChange={handleChange} 
                  required 
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label>Tipe Jatah</label>
                <select 
                  name="entitlement_type" 
                  value={formData.entitlement_type} 
                  onChange={handleChange} 
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                >
                  <option value="fixed">Tetap</option>
                  <option value="accrual">Bertahap</option>
                  <option value="unlimited">Tidak Terbatas</option>
                </select>
              </div>

              <div>
                <label>Status Pembayaran</label>
                <select 
                  name="is_paid" 
                  value={formData.is_paid} 
                  onChange={handleChange} 
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                >
                  <option value="true">Paid</option>
                  <option value="false">Tidak Berbayar</option>
                </select>
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label>Status Kebijakan</label>
                <select 
                  name="active" 
                  value={formData.active} 
                  onChange={handleChange} 
                  style={{ width: '100%', height: '50px', padding: '0 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                >
                  <option value="true">Aktif</option>
                  <option value="false">Non-Aktif</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
               <Button variant="ghost" type="button" onClick={() => navigate('/leave/policy')} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '12px', height: '48px', padding: '0 24px', fontWeight: 600 }}>
                 Batal
               </Button>
               <Button variant="primary" type="submit" disabled={loading} style={{ background: '#7c3aed', height: '48px', padding: '0 24px', borderRadius: '12px', fontWeight: 700, gap: '8px' }}>
                 {loading ? 'Processing...' : (
                   <>
                     <Save size={18} />
                     {isEdit ? 'Save Policy Changes' : 'Publish New Policy'}
                   </>
                 )}
               </Button>
            </div>
          </Card>

          <div style={{ marginTop: '2rem' }}>
            <Card glass style={{ padding: '1.5rem', borderLeft: '4px solid #7c3aed' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Info size={20} color="#7c3aed" />
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>Policy Compliance</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5 }}>
                    Setiap perubahan kebijakan akan direkam dalam log audit. Pastikan "Jatah Hari Dasar" sudah sesuai dengan regulasi ketenagakerjaan yang berlaku.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default LeavePolicyFormPage;
