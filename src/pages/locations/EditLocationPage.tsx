import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/shared/api/httpClient';
import { getLocationDetail, updateLocation } from '@/features/location/api/location.service';
import type { LocationUpdatePayload } from '@/features/location/types/location.types';
import { MapPin, ArrowLeft, Save, MapPinned } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { PageHeader } from '@/shared/ui';
import { showToast } from '@/shared/ui/toast';
import { Button } from '@/shared/ui/Button';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';
import '@/pages/payroll/PayrollShared.css';
import './LocationForm.css';
import { isLegacyPresentationSession } from '@/shared/config/legacyPresentation';

type MineproDepartment = { id: string; name: string; code?: string };
type MineproPit = { id: string; name: string; description?: string; project_id?: string; is_active?: boolean };

const EditLocationPage = () => {
  const { id } = useParams<{ id: string }>();
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
  const [loading, setLoading] = useState(true);
  const legacyMode = isLegacyPresentationSession();


  useEffect(() => {
    const loadDetail = async () => {
      if (!id) {
        showToast('ID lokasi tidak ditemukan', 'error');
        setLoading(false);
        return;
      }

      try {
        const result = await getLocationDetail(id);
        const payload = result.payload as Record<string, any>;
        
        setFormData({
          name: payload.name || '',
          latitude: String(payload.latitude || ''),
          longitude: String(payload.longitude || ''),
          radius: String(payload.radius || '100'),
          department: payload.department || '',
          project_id: payload.project_id || '',
          location_code: payload.location_code || '',
        });
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || 'Gagal memuat data lokasi';
        showToast(message, 'error');
      } finally {
        setLoading(false);
      }
    };

    const fetchDepartments = async () => {
      if (legacyMode) {
        try {
          const response = await api.get('/presentation/legacy/master-data');
          const masterData = response.data?.data ?? {};
          setDepartments(Array.isArray(masterData.departments) ? masterData.departments : []);
          setMineproPits(Array.isArray(masterData.locations) ? masterData.locations : []);
        } catch (err) {
          console.error('Failed to fetch MINEPRO master data:', err);
        }
        return;
      }
      try {
        const response = await api.get('/organization/master-data');
        if (response.data && response.data.data && Array.isArray(response.data.data.departments)) {
          setDepartments(response.data.data.departments.map((department: string, index: number) => ({ id: String(index), name: department })));
        }
      } catch (err) {
        console.error('Failed to fetch departments:', err);
      }
    };

    void loadDetail();
    void fetchDepartments();
  }, [id, legacyMode]);

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
    if (!formData.radius || parseFloat(formData.radius) < 10) {
      showToast('Radius minimal 10 meter', 'error');
      return false;
    }
    return true;
  };

  const handleUpdateLocation = async () => {
    if (!validateForm() || !id) return;

    setLoading(true);

    try {
      const payload: LocationUpdatePayload = {
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseFloat(formData.radius),
        department: formData.department,
        project_id: formData.project_id || undefined,
        location_code: formData.location_code || undefined,
      };

      await updateLocation(id, payload);
      showToast('Lokasi berhasil diperbarui!', 'success');
      setTimeout(() => {
        navigate('/locations');
      }, 1500);
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Gagal mengupdate lokasi';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/locations');
  };

  if (loading && !formData.name) {
    return (
      <div className="crud-page">
        <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
          <div style={{ fontSize: '1.1rem', color: '#64748b', marginBottom: '1rem' }}>Memuat data lokasi...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="crud-page">
      {/* Header Card */}
      <PageHeader
        title="Edit Lokasi"
        subtitle="Perbarui informasi lokasi absensi dan parameter check-in."
        badge={{ icon: MapPinned, label: "Location Center" }}
        actions={
          <>
            <button className="btn-outline" onClick={handleCancel} disabled={loading}>
              <ArrowLeft size={16} />
              Kembali
            </button>
            <button className="btn-primary" onClick={() => void handleUpdateLocation()} disabled={loading}>
              <Save size={16} />
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </>
        }
        style={{ marginBottom: '2rem' }}
      />

      {/* Form Card */}
      <Card className="control-card" glass style={{ marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--color-primary-dark)', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
            Informasi Lokasi
          </h3>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void handleUpdateLocation(); }} style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Row 1: Nama & Departemen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                Nama Lokasi <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Contoh: Office Jakarta Pusat"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                Berikan nama deskriptif untuk lokasi ini
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                Departemen <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                }}
              >
                <option value="">Pilih Departemen</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
                <option value="All Departments">All Departments (Global)</option>
              </select>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                Departemen yang memiliki akses ke lokasi ini
              </p>
            </div>
          </div>

          {/* Row 1b: Relasi MINEPRO */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                Project ID MINEPRO
              </label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                disabled={loading}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.95rem', fontFamily: 'inherit' }}
              >
                <option value="">Pilih Project ID</option>
                {Array.from(new Set(mineproPits.map((pit) => pit.project_id).filter(Boolean))).map((projectId) => (
                  <option key={projectId} value={projectId}>{projectId}</option>
                ))}
              </select>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Relasi lokasi ke project employee di MINEPRO.</p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                Kode Lokasi MINEPRO
              </label>
              <select
                name="location_code"
                value={formData.location_code}
                onChange={handleInputChange}
                disabled={loading}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', fontSize: '0.95rem', fontFamily: 'inherit' }}
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
              <p style={{ fontSize: '0.8rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>Kode site/server untuk pencocokan otomatis.</p>
            </div>
          </div>

          {/* Row 2: GPS Coordinates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                <MapPin size={14} />
                Latitude
              </label>
              <input
                type="text"
                value={formData.latitude}
                name="latitude"
                onChange={handleInputChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                Koordinat pusat area absensi.
              </p>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                <MapPin size={14} />
                Longitude
              </label>
              <input
                type="text"
                value={formData.longitude}
                name="longitude"
                onChange={handleInputChange}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                  backgroundColor: '#f9fafb',
                  color: '#6b7280',
                }}
              />
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
                Koordinat pusat area absensi.
              </p>
            </div>
          </div>

          {/* Row 3: Radius */}
          <div style={{ maxWidth: '300px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
              Radius Absensi <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="number"
                name="radius"
                value={formData.radius}
                onChange={handleInputChange}
                placeholder="100"
                min="10"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  fontFamily: 'inherit',
                }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#6b7280' }}>meter</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem', margin: '0.25rem 0 0 0' }}>
              Jarak maksimal untuk check-in di lokasi ini
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--hero-bg-start)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
            >
              <Save size={16} />
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem 1.5rem',
                backgroundColor: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              Batal
            </button>
          </div>
        </form>
      </Card>

      {/* Info Card */}
      {formData.latitude && formData.longitude && (
        <Card className="control-card" glass>
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--color-primary-dark)', fontWeight: 700, fontSize: '1rem' }}>
              📍 Lokasi di Map
            </h3>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Latitude: {parseFloat(formData.latitude).toFixed(6)} | Longitude: {parseFloat(formData.longitude).toFixed(6)}
          </p>
          <a
            href={`https://maps.google.com/?q=${formData.latitude},${formData.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'none',
              fontWeight: '600',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Buka di Google Maps →
          </a>
        </Card>
      )}
    </div>
  );
};

export default EditLocationPage;
