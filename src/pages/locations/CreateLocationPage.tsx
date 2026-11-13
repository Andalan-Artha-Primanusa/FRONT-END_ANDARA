import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/shared/api/httpClient';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui';
import { Button } from '@/shared/ui/Button';
import { showToast } from '@/shared/ui/toast';
import { createLocation } from '@/features/location/api/location.service';
import { MapPin, ArrowLeft, Save, MapPinned } from 'lucide-react';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import './LocationForm.css';
import { isLegacyPresentationSession } from '@/shared/config/legacyPresentation';

type MineproDepartment = { id: string; name: string; code?: string };
type MineproPit = { id: string; name: string; description?: string; project_id?: string; is_active?: boolean };

const CreateLocationPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius: '100',
    department: '',
    project_id: '',
    location_code: '',
  });
  const [departments, setDepartments] = useState<MineproDepartment[]>([]);
  const [mineproPits, setMineproPits] = useState<MineproPit[]>([]);
  const [loading, setLoading] = useState(false);

  const [locationDetected, setLocationDetected] = useState(false);
  const legacyMode = isLegacyPresentationSession();

  useEffect(() => {
    // Detect GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          }));
          setLocationDetected(true);
        },
        (err) => {
          showToast(`Gagal mendeteksi lokasi: ${err.message}`, 'error');
          setLocationDetected(false);
        }
      );
    } else {
      showToast('Geolocation tidak didukung oleh browser ini', 'error');
      setLocationDetected(false);
    }

    // Fetch Departments for selection
    const fetchDepartments = async () => {
      if (legacyMode) {
        try {
          const response = await api.get('/presentation/legacy/master-data');
          const masterData = response.data?.data ?? {};
          setDepartments(Array.isArray(masterData.departments) ? masterData.departments : []);
          setMineproPits(Array.isArray(masterData.locations) ? masterData.locations : []);
          setFormData(prev => ({ ...prev, department: prev.department || 'All Departments' }));
        } catch (err) {
          console.error('Failed to fetch MINEPRO master data:', err);
        }
        return;
      }
      try {
        const response = await api.get('/organization/master-data');
        if (response.data && response.data.data && Array.isArray(response.data.data.departments)) {
          setDepartments(response.data.data.departments.map((department: string, index: number) => ({ id: String(index), name: department })));
          if (response.data.data.departments.length > 0) {
            setFormData(prev => ({ ...prev, department: response.data.data.departments[0] }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };

    void fetchDepartments();
  }, [legacyMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      showToast('Nama lokasi wajib diisi', 'error');
      return false;
    }
    if (!legacyMode && !formData.department) {
      showToast('Departemen wajib dipilih', 'error');
      return false;
    }
    if (!formData.latitude) {
      showToast('Latitude (garis lintang) wajib diisi', 'error');
      return false;
    }
    if (!formData.longitude) {
      showToast('Longitude (garis bujur) wajib diisi', 'error');
      return false;
    }
    if (!formData.radius || parseFloat(formData.radius) < 10) {
      showToast('Radius minimal 10 meter', 'error');
      return false;
    }
    return true;
  };

  const handleCreateLocation = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      await createLocation({
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseFloat(formData.radius),
        department: formData.department,
        project_id: formData.project_id || undefined,
        location_code: formData.location_code || undefined,
      });

      showToast('Lokasi berhasil dibuat!', 'success');
      setTimeout(() => {
        navigate('/locations');
      }, 1500);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Gagal membuat lokasi';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/locations');
  };

  return (
    <div className="crud-page location-create-page">
      <PageHeader
        title="Buat Lokasi Baru"
        subtitle="Tambahkan lokasi absensi dengan koordinat GPS dan radius."
        badge={{ icon: MapPinned, label: "Location Center" }}
        actions={
          <button type="button" className="btn-outline" onClick={handleCancel} disabled={loading}>
            <ArrowLeft size={16} style={{ marginRight: '8px' }} />
            Kembali
          </button>
        }
        style={{ marginBottom: '2rem' }}
      />

      <form onSubmit={(e) => { e.preventDefault(); void handleCreateLocation(); }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* Left Column - Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Card glass style={{ padding: '2.5rem', borderRadius: '32px' }}>
              <h3 style={{ margin: '0 0 2rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>
                 <MapPin size={24} color="var(--color-primary)" /> Detail Lokasi
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Nama Lokasi */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    Nama Lokasi <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Contoh: Office Jakarta Pusat, Warehouse Bandung"
                    required
                    disabled={loading}
                    style={{ width: '100%', padding: '0 16px', height: '50px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Berikan nama yang deskriptif untuk lokasi ini</span>
                </div>

                {/* Departemen */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    Departemen <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    style={{ width: '100%', padding: '0 16px', height: '50px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
                  >
                    <option value="">Pilih Departemen</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                    <option value="All Departments">All Departments (Global)</option>
                  </select>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Pilih departemen yang memiliki akses ke lokasi ini</span>
                </div>

                {/* Project dan kode lokasi MINEPRO */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    Project ID MINEPRO
                  </label>
                  <select
                    name="project_id"
                    value={formData.project_id}
                    onChange={handleInputChange}
                    disabled={loading}
                    style={{ width: '100%', padding: '0 16px', height: '50px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                  >
                    <option value="">Pilih Project ID</option>
                    {Array.from(new Set(mineproPits.map((pit) => pit.project_id).filter(Boolean))).map((projectId) => (
                      <option key={projectId} value={projectId}>{projectId}</option>
                    ))}
                  </select>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Dipakai untuk mencocokkan lokasi dengan data employee.</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    Kode Lokasi MINEPRO
                  </label>
                  <select
                    name="location_code"
                    value={formData.location_code}
                    onChange={handleInputChange}
                    disabled={loading}
                    style={{ width: '100%', padding: '0 16px', height: '50px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                  >
                    <option value="">Pilih PIT / lokasi MINEPRO</option>
                    {mineproPits
                      .filter((pit) => !formData.project_id || pit.project_id === formData.project_id)
                      .map((pit) => (
                        <option key={pit.id} value={pit.name}>
                          {pit.name}{pit.project_id ? ` — ${pit.project_id}` : ''}
                        </option>
                      ))}
                  </select>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Opsional, misalnya kode server atau site.</span>
                </div>

                {/* Latitude */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} /> Latitude <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      name="latitude"
                      value={formData.latitude}
                      onChange={handleInputChange}
                      placeholder="-6.200000"
                      disabled
                      style={{ width: '100%', padding: '0 16px', height: '50px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    />
                    {locationDetected && (
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                        Terdeteksi
                      </span>
                    )}
                  </div>
                </div>

                {/* Longitude */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={16} /> Longitude <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      name="longitude"
                      value={formData.longitude}
                      onChange={handleInputChange}
                      placeholder="106.816666"
                      disabled
                      style={{ width: '100%', padding: '0 16px', height: '50px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    />
                    {locationDetected && (
                      <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                        Terdeteksi
                      </span>
                    )}
                  </div>
                </div>

                {/* Radius */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                    Radius Absensi <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type="number"
                      name="radius"
                      value={formData.radius}
                      onChange={handleInputChange}
                      placeholder="100"
                      min="10"
                      required
                      disabled={loading}
                      style={{ flex: 1, padding: '0 16px', height: '50px', borderRadius: '12px 0 0 12px', border: '1px solid #cbd5e1', borderRight: 'none', background: '#fff', fontSize: '1rem', color: '#0f172a', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    />
                    <div style={{ height: '50px', display: 'flex', alignItems: 'center', padding: '0 20px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0 12px 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#475569', boxSizing: 'border-box' }}>
                      meter
                    </div>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Jarak maksimal karyawan dari lokasi untuk check-in</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Preview & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Card glass style={{ padding: '2rem', borderRadius: '28px' }}>
              <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>Preview Lokasi</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Nama</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{formData.name || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Departemen</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{formData.department || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Latitude</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>{formData.latitude ? parseFloat(formData.latitude).toFixed(6) : '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Longitude</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1e293b' }}>{formData.longitude ? parseFloat(formData.longitude).toFixed(6) : '—'}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Radius</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{formData.radius} m</div>
                </div>
              </div>

              {formData.latitude && formData.longitude && (
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
                  <a
                    href={`https://maps.google.com/?q=${formData.latitude},${formData.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: '#eff6ff', color: 'var(--color-primary)', borderRadius: '12px', fontWeight: 700, textDecoration: 'none' }}
                  >
                    Buka di Google Maps →
                  </a>
                </div>
              )}
            </Card>

            <div className="location-create-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <Button type="submit" variant="primary" size="lg" className="location-submit-button" disabled={loading} style={{ width: '100%', height: '60px', borderRadius: '20px', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 10px 20px rgba(10, 122, 62, 0.2)' }}>
                  <Save size={20} style={{ marginRight: '10px' }} />
                  {loading ? 'Menyimpan...' : 'Buat Lokasi'}
               </Button>
               <Button type="button" onClick={handleCancel} style={{ width: '100%', height: '54px', borderRadius: '20px', fontWeight: 700, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                  Batalkan
               </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateLocationPage;
