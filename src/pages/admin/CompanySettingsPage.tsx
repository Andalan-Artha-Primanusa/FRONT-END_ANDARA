import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, Building2, Mail, Phone, MapPin, Globe, Clock, User, Briefcase, Settings, Landmark, Info, ShieldCheck, Upload, Trash2 } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { showToast } from '@/shared/ui/toast';
import { api } from '@/shared/api/httpClient';
import { useAuthStore } from '@/app/store/auth.store';
import { RBACUtils } from '@/shared/hooks/rbac';
import { PERMISSIONS } from '@/shared/types/rbac.types';
import { PageHeader } from '@/shared/ui';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import './CompanySettingsPage.css';

const CompanySettingsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const canAccess = RBACUtils.hasPermission(user, [
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.COMPANY_UPDATE,
    PERMISSIONS.ADMIN_COMPANY_VIEW,
    PERMISSIONS.ADMIN_COMPANY_UPDATE,
  ]);
  const canUpdate = RBACUtils.hasPermission(user, [
    PERMISSIONS.COMPANY_UPDATE,
    PERMISSIONS.ADMIN_COMPANY_UPDATE,
  ]);
  const [company, setCompany] = useState({
    name: '',
    legal_name: '',
    tax_number: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    logo: '',
    code: '',
    founded_year: '',
    industry: '',
  } as Record<string, string | number>);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/company');
      const data = response.data;
      const companyData = Array.isArray(data) ? data[0] : data.data || data;
      if (companyData && companyData.id) {
        setCompanyId(companyData.id);
        setCompany({
          name: companyData.name || '',
          legal_name: companyData.legal_name || '',
          tax_number: companyData.tax_number || '',
          email: companyData.email || '',
          phone: companyData.phone || '',
          website: companyData.website || '',
          address: companyData.address || '',
          city: companyData.city || '',
          state: companyData.state || '',
          postal_code: companyData.postal_code || '',
          country: companyData.country || '',
          logo: companyData.logo || '',
          code: companyData.code || '',
          founded_year: companyData.founded_year || '',
          industry: companyData.industry || '',
        });
      }
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log('Company not found, will create on save');
        setCompanyId(null);
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [canAccess]);

  const handleSave = async () => {
    if (!canUpdate) {
      showToast('Anda tidak memiliki izin mengubah pengaturan perusahaan', 'error');
      return;
    }
    if (!company.name) {
      showToast('Nama perusahaan wajib diisi', 'error');
      return;
    }
    setSaving(true);
    try {
      // Filter out empty strings
      const dataToSend = Object.fromEntries(
        Object.entries(company).filter(([_, v]) => v !== '')
      );

      if (companyId) {
        await api.put(`/company/${companyId}`, dataToSend);
      } else {
        const response = await api.post('/company', dataToSend);
        const newData = response.data?.data || response.data;
        if (newData?.id) {
          setCompanyId(newData.id);
        }
      }
      showToast('Pengaturan perusahaan berhasil disimpan!', 'success');
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Gagal menyimpan pengaturan';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpdate) {
      showToast('Anda tidak memiliki izin mengubah logo perusahaan', 'error');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!companyId) {
      showToast('Simpan data perusahaan terlebih dahulu sebelum mengunggah logo', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setUploadingLogo(true);
    try {
      const response = await api.post(`/company/${companyId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const updatedData = response.data?.data || response.data;
      if (updatedData?.logo) {
        setCompany(prev => ({ ...prev, logo: updatedData.logo }));
        setLogoPreview(null);
      }
      showToast('Logo berhasil diunggah!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal mengunggah logo', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!canUpdate) {
      showToast('Anda tidak memiliki izin menghapus logo perusahaan', 'error');
      return;
    }
    if (!companyId) return;

    try {
      await api.delete(`/company/${companyId}/logo`);
      setCompany(prev => ({ ...prev, logo: '' }));
      setLogoPreview(null);
      showToast('Logo berhasil dihapus!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal menghapus logo', 'error');
    }
  };

  const handleLogoPreview = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setCompany(prev => ({ ...prev, [field]: value }));
  };

  const tabs = [
    { key: 'general', label: 'Info Umum', icon: Building2 },
    { key: 'contact', label: 'Detail Kontak', icon: Mail },
    { key: 'business', label: 'Bisnis & Legal', icon: Landmark },
  ];

  if (!canAccess) {
    return (
      <div className="crud-page"><PageHeader
        title="Akses Ditolak"
        subtitle="Anda tidak memiliki izin untuk mengakses halaman ini."
        badge={{ icon: ShieldCheck, label: "Admin Center" }}
      /></div>
    );
  }

  return (
    <div className="crud-page settings-page">
      <PageHeader
        title="Pengaturan Perusahaan"
        subtitle="Kelola identitas inti organisasi, informasi kontak, dan parameter bisnis."
        badge={{ icon: Settings, label: "Administrasi Sistem" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchData} disabled={loading} style={{ background: 'white' }}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Memuat...' : 'Segarkan'}
            </button>
            {canUpdate && (
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ boxShadow: '0 10px 20px rgba(10, 122, 62, 0.2)' }}>
              <Save size={16} />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            )}
          </>
        }
      />

      {/* Logo Section */}
      <PageHeader
        badge={{ icon: Upload, label: 'Logo Perusahaan' }}
        title="Perbarui Logo"
        subtitle="Unggah logo perusahaan untuk dokumen dan laporan."
        actions={
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            {(company.logo || logoPreview) && (
              <div style={{ textAlign: 'center' }}>
                <img
                  src={logoPreview || `${api.defaults.baseURL?.replace('/api', '')}/${company.logo}`}
                  alt="Logo Perusahaan"
                  style={{ maxHeight: '100px', maxWidth: '200px', objectFit: 'contain' }}
                />
              </div>
            )}
            {canUpdate && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <label className="btn-outline" style={{ cursor: 'pointer', background: 'white' }}>
                <Upload size={16} />
                {uploadingLogo ? 'Mengunggah...' : 'Unggah Logo'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => { handleLogoPreview(e); handleLogoUpload(e); }}
                  style={{ display: 'none' }}
                  disabled={uploadingLogo}
                />
              </label>
              {(company.logo || logoPreview) && (
                <button className="btn-outline" onClick={handleDeleteLogo} style={{ background: 'white' }}>
                  <Trash2 size={16} />
                  Hapus Logo
                </button>
              )}
            </div>
            )}
          </div>
        }
      />

      <div className="settings-summary-grid">
        <Card className="summary-card">
          <div className="summary-card__header">
            <div>
              <span className="summary-card__label">Identitas Perusahaan</span>
              <p className="summary-card__subtitle">Nama registrasi utama</p>
            </div>
            <span className="summary-card__icon summary-card__icon--blue">
              <Building2 size={20} />
            </span>
          </div>
          <div className="summary-card__value summary-card__value--blue">{company.name || 'Belum diisi'}</div>
          <div className="summary-card__change">{company.code || 'TANPA-KODE'} - {company.founded_year || 'Tahun belum diisi'}</div>
        </Card>

        <Card className="summary-card">
          <div className="summary-card__header">
            <div>
              <span className="summary-card__label">Sektor Industri</span>
              <p className="summary-card__subtitle">Klasifikasi bisnis</p>
            </div>
            <span className="summary-card__icon summary-card__icon--green">
              <Briefcase size={20} />
            </span>
          </div>
          <div className="summary-card__value summary-card__value--green">{company.industry || 'Belum diisi'}</div>
          <div className="summary-card__change">Jenis bisnis standar</div>
        </Card>

         <Card className="summary-card">
           <div className="summary-card__header">
             <div>
               <span className="summary-card__label">Jumlah Tenaga Kerja</span>
               <p className="summary-card__subtitle">Total personel aktif</p>
             </div>
             <span className="summary-card__icon summary-card__icon--orange">
               <User size={20} />
             </span>
           </div>
           <div className="summary-card__value summary-card__value--orange">-</div>
           <div className="summary-card__change">Data dari karyawan</div>
         </Card>
      </div>

      <Card className="settings-detail-card">
        <div className="settings-detail-header">
          <div className="settings-detail-heading">
            <div className="wuw-title-area">
              <h3>Konfigurasi Rinci</h3>
            </div>
            <div className="settings-tabs-container">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  className={`settings-nav-tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="settings-content-area">
          {loading ? (
            <div className="settings-loading-state">
              <RefreshCw size={48} className="animate-spin" color="var(--color-primary)" />
              <p>Menyinkronkan data perusahaan...</p>
            </div>
          ) : (
            <div className="settings-form-wrapper">
              {activeTab === 'general' && (
                <div className="form-grid-layout">
                  <div className="form-group-item">
                    <label>Nama Perusahaan <span className="text-danger">*</span></label>
                    <div className="input-icon-wrapper">
                      <Building2 size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Masukkan nama resmi perusahaan"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>Nama Legal</label>
                    <div className="input-icon-wrapper">
                      <Landmark size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.legal_name}
                        onChange={(e) => handleChange('legal_name', e.target.value)}
                        placeholder="PT Nama Perusahaan Anda"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>Nomor Pajak (NPWP)</label>
                    <div className="input-icon-wrapper">
                      <ShieldCheck size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.tax_number}
                        onChange={(e) => handleChange('tax_number', e.target.value)}
                        placeholder="00.000.000.0-000.000"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>URL Situs Web</label>
                    <div className="input-icon-wrapper">
                      <Globe size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.website}
                        onChange={(e) => handleChange('website', e.target.value)}
                        placeholder="https://www.company.com"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'contact' && (
                <div className="form-grid-layout">
                  <div className="form-group-item">
                    <label>Alamat Surel</label>
                    <div className="input-icon-wrapper">
                      <Mail size={18} className="field-icon" />
                      <input
                        type="email"
                        value={company.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="hello@company.com"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>Nomor Telepon</label>
                    <div className="input-icon-wrapper">
                      <Phone size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="+62 xxx"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="form-group-item full-width">
                    <label>Alamat Lengkap</label>
                    <div className="input-icon-wrapper">
                      <MapPin size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="Nama jalan, gedung, lantai..."
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>Kota</label>
                    <div className="input-icon-wrapper">
                      <MapPin size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        placeholder="Contoh: Jakarta"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>Provinsi</label>
                    <div className="input-icon-wrapper">
                      <MapPin size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.state}
                        onChange={(e) => handleChange('state', e.target.value)}
                        placeholder="Contoh: DKI Jakarta"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>Kode Pos</label>
                    <div className="input-icon-wrapper">
                      <MapPin size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.postal_code}
                        onChange={(e) => handleChange('postal_code', e.target.value)}
                        placeholder="12345"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>Negara</label>
                    <div className="input-icon-wrapper">
                      <Globe size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.country}
                        onChange={(e) => handleChange('country', e.target.value)}
                        placeholder="Contoh: Indonesia"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>URL Situs Web</label>
                    <div className="input-icon-wrapper">
                      <Globe size={18} className="field-icon" />
                      <input
                        type="text"
                        value={company.website}
                        onChange={(e) => handleChange('website', e.target.value)}
                        placeholder="https://www.company.com"
                        className="premium-input"
                        disabled={!canUpdate}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'business' && (
                <div className="form-grid-layout">
                  <div className="status-info-banner">
                    <div className="banner-icon">
                      <Info size={24} />
                    </div>
                    <div className="banner-text">
                      <h4>Verifikasi & Identitas Legal</h4>
                      <p>Informasi legal yang rinci membantu menghasilkan laporan penggajian dan dokumen kepatuhan yang akurat.</p>
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>Badan Hukum Bisnis</label>
                    <div className="input-icon-wrapper">
                      <Landmark size={18} className="field-icon" />
                      <select
                        value={company.industry}
                        onChange={(e) => handleChange('industry', e.target.value)}
                        className="premium-input"
                        disabled={!canUpdate}
                      >
                        <option value="">Pilih jenis</option>
                        <option value="pt">PT (Perseroan Terbatas)</option>
                        <option value="cv">CV (Commanditaire Vennootschap)</option>
                        <option value="individual">Usaha Perorangan</option>
                        <option value="foundation">Yayasan / LSM</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group-item">
                    <label>Awal Siklus Tahun Fiskal</label>
                    <div className="input-icon-wrapper">
                      <Clock size={18} className="field-icon" />
                      <select className="premium-input" disabled={!canUpdate}>
                        <option value="1">Januari</option>
                        <option value="4">April</option>
                        <option value="7">Juli</option>
                        <option value="10">Oktober</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CompanySettingsPage;
