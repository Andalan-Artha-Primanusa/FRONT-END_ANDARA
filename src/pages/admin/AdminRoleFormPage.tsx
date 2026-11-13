import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Shield, Tag, FileText } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { PageHeader } from '@/shared/ui';
import { showToast } from '@/shared/ui/toast';
import { createRole, updateRole, getRoleById } from '@/features/admin/api/admin.service';
import { ROLES } from '@/shared/types/rbac.types';
import '@/shared/styles/CrudPage.css';
import "../dashboard/overview/OverviewPage.css";

const AdminRoleFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (isEdit) {
      const fetchRole = async () => {
        setFetching(true);
        try {
          const res = await getRoleById(id);
          const data = (res as any).data || res;
          setFormData({
            name: (data as any).name || '',
            description: (data as any).description || ''
          });
        } catch (err: any) {
          showToast(err.message || "Gagal memuat detail peran.", "error");
        } finally {
          setFetching(false);
        }
      };
      fetchRole();
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isEdit) {
        await updateRole(id, formData);
        showToast("Peran berhasil diperbarui!", "success");
      } else {
        await createRole(formData);
        showToast("Peran baru berhasil dibuat!", "success");
      }
      setTimeout(() => navigate('/admin/roles'), 1500);
    } catch (err: any) {
      showToast(err.message || "Gagal menyimpan peran.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (fetching) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
      <Shield className="animate-pulse" size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
      <p>Memuat detail role...</p>
    </div>
  );

  return (
    <div className="crud-page">
      <PageHeader
        title={isEdit ? 'Ubah Peran' : 'Tambah Peran Baru'}
        subtitle="Konfigurasi nama dan deskripsi untuk peran pengguna dalam sistem."
        badge={{ icon: Shield, label: "Admin Center" }}
        actions={
          <button type="button" className="btn-outline" onClick={() => navigate('/admin/roles')}>
            <ArrowLeft size={16} style={{ marginRight: '8px' }} />
            Kembali
          </button>
        }
        className="mb-8"
      />

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <Card glass style={{ padding: '2.5rem', borderRadius: '32px' }}>
                 <h3 style={{ margin: '0 0 2rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                    <Tag size={24} color="var(--color-primary)" /> Informasi Peran
                 </h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Nama Peran <span style={{ color: '#ef4444' }}>*</span></label>
                       <input 
                         name="name" 
                         value={formData.name} 
                         onChange={handleChange} 
                         required 
                         placeholder="e.g. manager, hr_admin, supervisor"
                          disabled={isEdit && (formData.name === ROLES.SUPER_ADMIN)}
                         style={{ width: '100%', padding: '0 16px', height: '50px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
                       />
                       <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Gunakan huruf kecil dan garis bawah (snake_case) untuk konsistensi sistem.</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Deskripsi Peran</label>
                       <div style={{ position: 'relative' }}>
                          <FileText size={18} style={{ position: 'absolute', left: '14px', top: '16px', color: '#94a3b8' }} />
                          <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange} 
                            placeholder="Jelaskan tanggung jawab dan batasan akses untuk role ini..."
                            style={{ width: '100%', padding: '14px 16px 14px 46px', minHeight: '120px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box', resize: 'vertical' }}
                          />
                       </div>
                    </div>
                 </div>
              </Card>
           </div>

           <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <Card glass style={{ padding: '2rem', borderRadius: '28px' }}>
                 <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>Panduan</h3>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.6 }}>
                       <strong>Peran</strong> mendefinisikan kelompok izin yang diberikan kepada pengguna. Setelah membuat peran, Anda dapat:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                       <li>Menghubungkan izin ke peran ini.</li>
                       <li>Menetapkan peran ini ke satu atau lebih karyawan.</li>
                       <li>Membatasi akses ke modul tertentu berdasarkan peran.</li>
                    </ul>
                 </div>
              </Card>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <Button type="submit" variant="primary" size="lg" disabled={loading} style={{ width: '100%', height: '60px', borderRadius: '20px', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(10, 122, 62, 0.2)' }}>
                    <Save size={20} style={{ marginRight: '10px' }} />
                    {loading ? 'Menyimpan...' : (isEdit ? 'Simpan Perubahan' : 'Buat Peran Baru')}
                 </Button>
                 <Button type="button" onClick={() => navigate('/admin/roles')} style={{ width: '100%', height: '54px', borderRadius: '20px', fontWeight: 700, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                    Batalkan
                 </Button>
              </div>
           </div>
        </div>
      </form>
    </div>
  );
};

export default AdminRoleFormPage;
